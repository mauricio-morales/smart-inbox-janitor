using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using TrashMailPanda.Models;
using TrashMailPanda.Shared.Base;
using TrashMailPanda.Shared.Security;

namespace TrashMailPanda.Services;

/// <summary>
/// Service for managing onboarding state and guiding users through provider setup
/// </summary>
public class OnboardingService : IOnboardingService
{
    private readonly IProviderBridgeService _providerBridge;
    private readonly IProviderStatusService _providerStatusService;
    private readonly ISecureStorageManager _secureStorage;
    private readonly ILogger<OnboardingService> _logger;

    // Storage key for onboarding state persistence
    private const string OnboardingStateKey = "onboarding_state";

    // Cache for current state to avoid repeated database calls
    private OnboardingState? _cachedState;
    private DateTime _cacheTimestamp = DateTime.MinValue;
    private readonly TimeSpan _cacheExpiry = TimeSpan.FromMinutes(5);
    private readonly object _cacheLock = new();

    public event EventHandler<OnboardingStateChangedEventArgs>? OnboardingStateChanged;

    public OnboardingService(
        IProviderBridgeService providerBridge,
        IProviderStatusService providerStatusService,
        ISecureStorageManager secureStorage,
        ILogger<OnboardingService> logger)
    {
        _providerBridge = providerBridge ?? throw new ArgumentNullException(nameof(providerBridge));
        _providerStatusService = providerStatusService ?? throw new ArgumentNullException(nameof(providerStatusService));
        _secureStorage = secureStorage ?? throw new ArgumentNullException(nameof(secureStorage));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));

        // Subscribe to provider status changes to update onboarding state accordingly
        _providerStatusService.ProviderStatusChanged += OnProviderStatusChanged;
    }

    public async Task<Result<OnboardingState>> GetOnboardingStateAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            // Check cache first
            lock (_cacheLock)
            {
                if (_cachedState != null && DateTime.UtcNow - _cacheTimestamp < _cacheExpiry)
                {
                    return Result<OnboardingState>.Success(_cachedState);
                }
            }

            // Load from storage or create new state
            var storedStateResult = await LoadStoredStateAsync(cancellationToken);
            OnboardingState state;

            if (storedStateResult.IsSuccess && storedStateResult.Value != null)
            {
                state = storedStateResult.Value;
                _logger.LogDebug("Loaded onboarding state from storage");
            }
            else
            {
                state = await CreateInitialStateAsync(cancellationToken);
                _logger.LogDebug("Created initial onboarding state");
            }

            // Update state with current provider statuses
            var refreshResult = await UpdateStateWithProviderStatusAsync(state, cancellationToken);
            if (!refreshResult.IsSuccess)
            {
                _logger.LogWarning("Failed to refresh state with provider status: {Error}", refreshResult.Error?.Message);
            }

            // Cache the state
            lock (_cacheLock)
            {
                _cachedState = state;
                _cacheTimestamp = DateTime.UtcNow;
            }

            return Result<OnboardingState>.Success(state);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception getting onboarding state");
            return Result<OnboardingState>.Failure(ex.ToProviderError("Failed to get onboarding state"));
        }
    }

    public async Task<Result<List<OnboardingProviderInfo>>> GetOnboardingProvidersAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            var providers = new List<OnboardingProviderInfo>();
            var displayInfo = _providerBridge.GetProviderDisplayInfo();
            var allStatuses = await _providerStatusService.GetAllProviderStatusAsync();

            foreach (var providerInfo in displayInfo.Values.OrderBy(p => p.Type))
            {
                var status = allStatuses.TryGetValue(providerInfo.Name, out var providerStatus)
                    ? providerStatus
                    : new ProviderStatus { Name = providerInfo.Name, Status = "Unknown", IsHealthy = false };

                var onboardingProvider = new OnboardingProviderInfo
                {
                    ProviderName = providerInfo.Name,
                    DisplayName = providerInfo.DisplayName,
                    Description = providerInfo.Description,
                    Status = status,
                    IsRequired = providerInfo.IsRequired,
                    IconName = providerInfo.Icon,
                    DisplayOrder = GetDisplayOrder(providerInfo.Type),
                    SetupInstructions = GetSetupInstructions(providerInfo.Name),
                    SetupAttempted = !status.IsHealthy && !string.IsNullOrEmpty(status.ErrorMessage),
                    LastSetupAttempt = status.LastCheck == DateTime.MinValue ? null : status.LastCheck,
                    SetupErrorMessage = status.ErrorMessage
                };

                providers.Add(onboardingProvider);
            }

            return Result<List<OnboardingProviderInfo>>.Success(providers);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception getting onboarding providers");
            return Result<List<OnboardingProviderInfo>>.Failure(ex.ToProviderError("Failed to get onboarding providers"));
        }
    }

    public async Task<Result<bool>> MarkWelcomeCompleteAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            var stateResult = await GetOnboardingStateAsync(cancellationToken);
            if (!stateResult.IsSuccess)
            {
                return Result<bool>.Failure(stateResult.Error!);
            }

            var state = stateResult.Value!;
            var previousPhase = state.CurrentPhase;

            state.IsWelcomeComplete = true;
            state.CurrentPhase = OnboardingPhase.ProviderSetup;
            state.LastUpdated = DateTime.UtcNow;

            var saveResult = await SaveStateAsync(state, cancellationToken);
            if (!saveResult.IsSuccess)
            {
                return saveResult;
            }

            // Fire state change event
            OnOnboardingStateChanged(state, previousPhase, "Welcome screen completed");

            _logger.LogInformation("Welcome screen marked as complete");
            return Result<bool>.Success(true);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception marking welcome complete");
            return Result<bool>.Failure(ex.ToProviderError("Failed to mark welcome complete"));
        }
    }

    public async Task<Result<bool>> MarkProviderSetupCompleteAsync(string providerName, CancellationToken cancellationToken = default)
    {
        try
        {
            if (string.IsNullOrEmpty(providerName))
            {
                return Result<bool>.Failure(new ValidationError("Provider name cannot be empty"));
            }

            var stateResult = await GetOnboardingStateAsync(cancellationToken);
            if (!stateResult.IsSuccess)
            {
                return Result<bool>.Failure(stateResult.Error!);
            }

            var state = stateResult.Value!;
            var previousPhase = state.CurrentPhase;

            state.ProviderSetupComplete[providerName] = true;
            state.LastUpdated = DateTime.UtcNow;

            // Update completion flags
            await UpdateCompletionFlagsAsync(state, cancellationToken);

            var saveResult = await SaveStateAsync(state, cancellationToken);
            if (!saveResult.IsSuccess)
            {
                return saveResult;
            }

            // Fire state change event
            OnOnboardingStateChanged(state, previousPhase, $"Provider {providerName} setup completed");

            _logger.LogInformation("Provider {Provider} setup marked as complete", providerName);
            return Result<bool>.Success(true);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception marking provider setup complete for {Provider}", providerName);
            return Result<bool>.Failure(ex.ToProviderError("Failed to mark provider setup complete"));
        }
    }

    public async Task<Result<bool>> IsOnboardingCompleteAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            var stateResult = await GetOnboardingStateAsync(cancellationToken);
            if (!stateResult.IsSuccess)
            {
                return Result<bool>.Failure(stateResult.Error!);
            }

            return Result<bool>.Success(stateResult.Value!.IsOnboardingComplete);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception checking if onboarding is complete");
            return Result<bool>.Failure(ex.ToProviderError("Failed to check onboarding completion"));
        }
    }

    public async Task<Result<bool>> CanAccessMainApplicationAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            var stateResult = await GetOnboardingStateAsync(cancellationToken);
            if (!stateResult.IsSuccess)
            {
                return Result<bool>.Failure(stateResult.Error!);
            }

            return Result<bool>.Success(stateResult.Value!.CanAccessMainApplication);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception checking main application access");
            return Result<bool>.Failure(ex.ToProviderError("Failed to check main application access"));
        }
    }

    public async Task<Result<bool>> ResetOnboardingAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            var newState = await CreateInitialStateAsync(cancellationToken);
            var saveResult = await SaveStateAsync(newState, cancellationToken);

            if (!saveResult.IsSuccess)
            {
                return saveResult;
            }

            // Clear cache
            lock (_cacheLock)
            {
                _cachedState = null;
                _cacheTimestamp = DateTime.MinValue;
            }

            // Fire state change event
            OnOnboardingStateChanged(newState, OnboardingPhase.Completed, "Onboarding reset to initial state");

            _logger.LogInformation("Onboarding state has been reset");
            return Result<bool>.Success(true);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception resetting onboarding");
            return Result<bool>.Failure(ex.ToProviderError("Failed to reset onboarding"));
        }
    }

    public async Task<Result<bool>> UpdateOnboardingPhaseAsync(OnboardingPhase phase, CancellationToken cancellationToken = default)
    {
        try
        {
            var stateResult = await GetOnboardingStateAsync(cancellationToken);
            if (!stateResult.IsSuccess)
            {
                return Result<bool>.Failure(stateResult.Error!);
            }

            var state = stateResult.Value!;
            var previousPhase = state.CurrentPhase;

            if (previousPhase == phase)
            {
                return Result<bool>.Success(true); // No change needed
            }

            state.CurrentPhase = phase;
            state.LastUpdated = DateTime.UtcNow;

            var saveResult = await SaveStateAsync(state, cancellationToken);
            if (!saveResult.IsSuccess)
            {
                return saveResult;
            }

            // Fire state change event
            OnOnboardingStateChanged(state, previousPhase, $"Phase updated from {previousPhase} to {phase}");

            _logger.LogInformation("Onboarding phase updated from {PreviousPhase} to {NewPhase}", previousPhase, phase);
            return Result<bool>.Success(true);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception updating onboarding phase to {Phase}", phase);
            return Result<bool>.Failure(ex.ToProviderError("Failed to update onboarding phase"));
        }
    }

    public async Task<Result<bool>> RecordProviderSetupAttemptAsync(string providerName, bool success, string? errorMessage = null, CancellationToken cancellationToken = default)
    {
        try
        {
            if (string.IsNullOrEmpty(providerName))
            {
                return Result<bool>.Failure(new ValidationError("Provider name cannot be empty"));
            }

            var stateResult = await GetOnboardingStateAsync(cancellationToken);
            if (!stateResult.IsSuccess)
            {
                return Result<bool>.Failure(stateResult.Error!);
            }

            var state = stateResult.Value!;

            // Update the provider setup status if successful
            if (success)
            {
                state.ProviderSetupComplete[providerName] = true;
            }

            state.LastUpdated = DateTime.UtcNow;

            // Update completion flags
            await UpdateCompletionFlagsAsync(state, cancellationToken);

            var saveResult = await SaveStateAsync(state, cancellationToken);
            if (!saveResult.IsSuccess)
            {
                return saveResult;
            }

            _logger.LogInformation("Provider {Provider} setup attempt recorded: Success={Success}, Error={Error}",
                providerName, success, errorMessage);

            return Result<bool>.Success(true);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception recording provider setup attempt for {Provider}", providerName);
            return Result<bool>.Failure(ex.ToProviderError("Failed to record provider setup attempt"));
        }
    }

    public async Task<Result<OnboardingState>> RefreshOnboardingStateAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            // Clear cache to force fresh load
            lock (_cacheLock)
            {
                _cachedState = null;
                _cacheTimestamp = DateTime.MinValue;
            }

            var stateResult = await GetOnboardingStateAsync(cancellationToken);
            if (!stateResult.IsSuccess)
            {
                return stateResult;
            }

            _logger.LogDebug("Onboarding state refreshed");
            return stateResult;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception refreshing onboarding state");
            return Result<OnboardingState>.Failure(ex.ToProviderError("Failed to refresh onboarding state"));
        }
    }

    private async Task<Result<OnboardingState?>> LoadStoredStateAsync(CancellationToken cancellationToken)
    {
        try
        {
            var result = await _secureStorage.RetrieveCredentialAsync(OnboardingStateKey);
            if (!result.IsSuccess || string.IsNullOrEmpty(result.Value))
            {
                return Result<OnboardingState?>.Success(null);
            }

            var state = System.Text.Json.JsonSerializer.Deserialize<OnboardingState>(result.Value);
            return Result<OnboardingState?>.Success(state);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to load stored onboarding state");
            return Result<OnboardingState?>.Success(null); // Return null instead of failing
        }
    }

    private async Task<Result<bool>> SaveStateAsync(OnboardingState state, CancellationToken cancellationToken)
    {
        try
        {
            var json = System.Text.Json.JsonSerializer.Serialize(state);
            var result = await _secureStorage.StoreCredentialAsync(OnboardingStateKey, json);

            if (result.IsSuccess)
            {
                // Update cache
                lock (_cacheLock)
                {
                    _cachedState = state;
                    _cacheTimestamp = DateTime.UtcNow;
                }
            }

            return result.IsSuccess
                ? Result<bool>.Success(true)
                : Result<bool>.Failure(new StorageError(result.ErrorMessage ?? "Failed to save state"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception saving onboarding state");
            return Result<bool>.Failure(ex.ToProviderError("Failed to save onboarding state"));
        }
    }

    private async Task<OnboardingState> CreateInitialStateAsync(CancellationToken cancellationToken)
    {
        var state = new OnboardingState
        {
            IsWelcomeComplete = false,
            CurrentPhase = OnboardingPhase.Welcome,
            LastUpdated = DateTime.UtcNow,
            ProviderSetupComplete = new Dictionary<string, bool>()
        };

        // Initialize provider completion status
        var displayInfo = _providerBridge.GetProviderDisplayInfo();
        foreach (var provider in displayInfo.Keys)
        {
            state.ProviderSetupComplete[provider] = false;
        }

        await UpdateCompletionFlagsAsync(state, cancellationToken);
        return state;
    }

    private async Task<Result<bool>> UpdateStateWithProviderStatusAsync(OnboardingState state, CancellationToken cancellationToken)
    {
        try
        {
            await UpdateCompletionFlagsAsync(state, cancellationToken);
            return Result<bool>.Success(true);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception updating state with provider status");
            return Result<bool>.Failure(ex.ToProviderError("Failed to update state"));
        }
    }

    private async Task UpdateCompletionFlagsAsync(OnboardingState state, CancellationToken cancellationToken)
    {
        try
        {
            var allStatuses = await _providerStatusService.GetAllProviderStatusAsync();
            var displayInfo = _providerBridge.GetProviderDisplayInfo();

            // Check if at least one provider is working
            state.HasAnyWorkingProvider = allStatuses.Values.Any(s => s.IsHealthy);

            // Check if all required providers are set up
            var requiredProviders = displayInfo.Values.Where(p => p.IsRequired).Select(p => p.Name);
            state.HasRequiredProvidersSetup = requiredProviders.All(provider =>
                state.ProviderSetupComplete.TryGetValue(provider, out var isComplete) && isComplete &&
                allStatuses.TryGetValue(provider, out var status) && status.IsHealthy);

            // Determine if main application can be accessed
            state.CanAccessMainApplication = state.HasAnyWorkingProvider; // Allow partial functionality

            // Update phase based on completion
            if (state.HasRequiredProvidersSetup && state.IsWelcomeComplete)
            {
                state.CurrentPhase = OnboardingPhase.Completed;
            }
            else if (state.IsWelcomeComplete)
            {
                state.CurrentPhase = OnboardingPhase.ProviderSetup;
            }
            else
            {
                state.CurrentPhase = OnboardingPhase.Welcome;
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception updating completion flags");
        }
    }

    private void OnProviderStatusChanged(object? sender, ProviderStatusChangedEventArgs e)
    {
        try
        {
            // Clear cache when provider status changes to ensure fresh state
            lock (_cacheLock)
            {
                _cachedState = null;
                _cacheTimestamp = DateTime.MinValue;
            }

            _logger.LogDebug("Clearing onboarding state cache due to provider status change for {Provider}", e.ProviderName);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception handling provider status change for {Provider}", e.ProviderName);
        }
    }

    private void OnOnboardingStateChanged(OnboardingState state, OnboardingPhase? previousPhase, string changeDescription)
    {
        try
        {
            var eventArgs = new OnboardingStateChangedEventArgs
            {
                OnboardingState = state,
                PreviousPhase = previousPhase,
                ChangeDescription = changeDescription,
                Context = new Dictionary<string, object>
                {
                    { "timestamp", DateTime.UtcNow },
                    { "current_phase", state.CurrentPhase },
                    { "can_access_main_app", state.CanAccessMainApplication }
                }
            };

            OnboardingStateChanged?.Invoke(this, eventArgs);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception firing onboarding state changed event");
        }
    }

    private static int GetDisplayOrder(ProviderType type) => type switch
    {
        ProviderType.Email => 1,
        ProviderType.LLM => 2,
        ProviderType.Storage => 3,
        _ => 999
    };

    private static string GetSetupInstructions(string providerName) => providerName switch
    {
        "Gmail" => "Sign in with your Gmail account. No technical setup required - just use your existing credentials.",
        "OpenAI" => "Enter your OpenAI API key. You can get one from platform.openai.com/api-keys.",
        "SQLite" => "Local storage is automatically configured. No action needed.",
        _ => "Follow the setup wizard for this provider."
    };
}