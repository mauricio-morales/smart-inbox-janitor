using System;
using System.Collections.ObjectModel;
using System.Linq;
using System.Threading.Tasks;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using Microsoft.Extensions.Logging;
using TrashMailPanda.Models;
using TrashMailPanda.Services;

namespace TrashMailPanda.ViewModels;

/// <summary>
/// ViewModel for the onboarding dashboard that shows provider setup status
/// Focuses on guiding users through independent provider configuration
/// </summary>
public partial class OnboardingDashboardViewModel : ViewModelBase
{
    private readonly IOnboardingService _onboardingService;
    private readonly IProviderStatusService _providerStatusService;
    private readonly ILogger<OnboardingDashboardViewModel> _logger;

    // Provider information for onboarding
    [ObservableProperty]
    private ObservableCollection<OnboardingProviderInfo> _providers = new();

    // Overall dashboard state
    [ObservableProperty]
    private string _title = "Set Up Your Providers";

    [ObservableProperty]
    private string _subtitle = "Configure the services TrashMail Panda needs to work effectively";

    [ObservableProperty]
    private bool _isLoading = true;

    [ObservableProperty]
    private string _statusMessage = "Loading provider information...";

    [ObservableProperty]
    private bool _hasError = false;

    [ObservableProperty]
    private string? _errorMessage;

    // Progress and completion state
    [ObservableProperty]
    private int _completedProviders = 0;

    [ObservableProperty]
    private int _totalProviders = 0;

    [ObservableProperty]
    private double _progressValue = 0.0;

    [ObservableProperty]
    private string _progressText = "0 of 0 providers ready";

    [ObservableProperty]
    private bool _canAccessMainApp = false;

    [ObservableProperty]
    private bool _allRequiredProvidersReady = false;

    [ObservableProperty]
    private bool _hasOptionalProviders = false;

    // Action buttons
    [ObservableProperty]
    private string _continueButtonText = "Continue to App →";

    [ObservableProperty]
    private bool _canContinue = false;

    [ObservableProperty]
    private string _refreshButtonText = "Refresh Status";

    [ObservableProperty]
    private bool _isRefreshing = false;

    [ObservableProperty]
    private DateTime _lastRefresh = DateTime.MinValue;

    // Navigation events
    public event EventHandler? OnboardingCompleted;
    public event EventHandler<string>? ProviderSetupRequested;
    public event EventHandler<string>? ErrorOccurred;

    public OnboardingDashboardViewModel(
        IOnboardingService onboardingService,
        IProviderStatusService providerStatusService,
        ILogger<OnboardingDashboardViewModel> logger)
    {
        _onboardingService = onboardingService ?? throw new ArgumentNullException(nameof(onboardingService));
        _providerStatusService = providerStatusService ?? throw new ArgumentNullException(nameof(providerStatusService));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));

        // Subscribe to state changes
        _onboardingService.OnboardingStateChanged += OnOnboardingStateChanged;
        _providerStatusService.ProviderStatusChanged += OnProviderStatusChanged;

        // Initialize dashboard
        _ = Task.Run(InitializeAsync);
    }

    /// <summary>
    /// Initialize the dashboard with current provider information
    /// </summary>
    private async Task InitializeAsync()
    {
        try
        {
            IsLoading = true;
            StatusMessage = "Loading providers...";
            ClearError();

            // Get onboarding provider information
            var providersResult = await _onboardingService.GetOnboardingProvidersAsync();
            if (!providersResult.IsSuccess)
            {
                ShowError($"Failed to load providers: {providersResult.Error?.GetUserFriendlyMessage()}");
                return;
            }

            // Update providers collection
            var providers = providersResult.Value!;
            Providers.Clear();
            foreach (var provider in providers.OrderBy(p => p.DisplayOrder))
            {
                Providers.Add(provider);
            }

            // Update state information
            await UpdateDashboardStateAsync();

            StatusMessage = "Provider information loaded";
            _logger.LogInformation("Onboarding dashboard initialized with {Count} providers", Providers.Count);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception during onboarding dashboard initialization");
            ShowError("Failed to initialize dashboard. Please refresh to try again.");
        }
        finally
        {
            IsLoading = false;
            LastRefresh = DateTime.UtcNow;
        }
    }

    /// <summary>
    /// Refresh all provider status information
    /// </summary>
    [RelayCommand]
    private async Task RefreshAsync()
    {
        if (IsRefreshing)
        {
            return;
        }

        try
        {
            IsRefreshing = true;
            StatusMessage = "Refreshing provider status...";
            ClearError();

            // Refresh onboarding state
            var stateResult = await _onboardingService.RefreshOnboardingStateAsync();
            if (!stateResult.IsSuccess)
            {
                _logger.LogWarning("Failed to refresh onboarding state: {Error}", stateResult.Error?.Message);
            }

            // Refresh provider status
            await _providerStatusService.RefreshProviderStatusAsync();

            // Get updated provider information
            var providersResult = await _onboardingService.GetOnboardingProvidersAsync();
            if (providersResult.IsSuccess)
            {
                var providers = providersResult.Value!;

                // Update existing providers or add new ones
                foreach (var provider in providers.OrderBy(p => p.DisplayOrder))
                {
                    var existing = Providers.FirstOrDefault(p => p.ProviderName == provider.ProviderName);
                    if (existing != null)
                    {
                        // Update existing provider info
                        var index = Providers.IndexOf(existing);
                        Providers[index] = provider;
                    }
                    else
                    {
                        Providers.Add(provider);
                    }
                }

                // Remove providers that no longer exist
                var currentProviderNames = providers.Select(p => p.ProviderName).ToHashSet();
                var toRemove = Providers.Where(p => !currentProviderNames.Contains(p.ProviderName)).ToList();
                foreach (var provider in toRemove)
                {
                    Providers.Remove(provider);
                }
            }

            await UpdateDashboardStateAsync();
            StatusMessage = "✅ Status refreshed";
            LastRefresh = DateTime.UtcNow;

            // Clear success message after delay
            _ = Task.Delay(2000).ContinueWith(_ => StatusMessage = string.Empty);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception during refresh");
            ShowError("Failed to refresh provider status. Please try again.");
        }
        finally
        {
            IsRefreshing = false;
        }
    }

    /// <summary>
    /// Handle provider setup request
    /// </summary>
    [RelayCommand]
    private void RequestProviderSetup(string providerName)
    {
        if (string.IsNullOrEmpty(providerName))
        {
            return;
        }

        try
        {
            _logger.LogInformation("Provider setup requested for {Provider}", providerName);
            ProviderSetupRequested?.Invoke(this, providerName);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception requesting provider setup for {Provider}", providerName);
            ShowError($"Failed to start setup for {providerName}");
        }
    }

    /// <summary>
    /// Continue to the main application
    /// </summary>
    [RelayCommand]
    private async Task ContinueToAppAsync()
    {
        if (!CanContinue || IsLoading)
        {
            return;
        }

        try
        {
            IsLoading = true;
            StatusMessage = "Finalizing setup...";

            // Mark onboarding as complete if possible
            var canAccessResult = await _onboardingService.CanAccessMainApplicationAsync();
            if (canAccessResult.IsSuccess && canAccessResult.Value)
            {
                // Update to completed phase
                await _onboardingService.UpdateOnboardingPhaseAsync(OnboardingPhase.Completed);

                StatusMessage = "✅ Setup complete!";
                _logger.LogInformation("Onboarding completed, transitioning to main application");

                await Task.Delay(500);
                OnboardingCompleted?.Invoke(this, EventArgs.Empty);
            }
            else
            {
                ShowError("Cannot access main application yet. Please complete required provider setup.");
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception continuing to main app");
            ShowError("Failed to continue to main application. Please try again.");
        }
        finally
        {
            IsLoading = false;
            if (!HasError)
            {
                StatusMessage = string.Empty;
            }
        }
    }

    /// <summary>
    /// Handle onboarding state changes
    /// </summary>
    private async void OnOnboardingStateChanged(object? sender, OnboardingStateChangedEventArgs e)
    {
        try
        {
            await UpdateDashboardStateAsync();
            _logger.LogDebug("Dashboard updated from onboarding state change: {Change}", e.ChangeDescription);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception handling onboarding state change");
        }
    }

    /// <summary>
    /// Handle provider status changes
    /// </summary>
    private async void OnProviderStatusChanged(object? sender, ProviderStatusChangedEventArgs e)
    {
        try
        {
            // Find the provider and update its status
            var provider = Providers.FirstOrDefault(p => p.ProviderName == e.ProviderName);
            if (provider != null && e.Status != null)
            {
                provider.Status = e.Status;
                provider.SetupAttempted = !e.Status.IsHealthy && !string.IsNullOrEmpty(e.Status.ErrorMessage);
                provider.LastSetupAttempt = e.Status.LastCheck == DateTime.MinValue ? null : e.Status.LastCheck;
                provider.SetupErrorMessage = e.Status.ErrorMessage;
            }

            await UpdateDashboardStateAsync();
            _logger.LogDebug("Dashboard updated from provider status change for {Provider}", e.ProviderName);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception handling provider status change for {Provider}", e.ProviderName);
        }
    }

    /// <summary>
    /// Update overall dashboard state based on provider information
    /// </summary>
    private async Task UpdateDashboardStateAsync()
    {
        try
        {
            var healthyProviders = Providers.Count(p => p.Status.IsHealthy);
            var requiredProviders = Providers.Where(p => p.IsRequired).ToList();
            var healthyRequiredProviders = requiredProviders.Count(p => p.Status.IsHealthy);

            CompletedProviders = healthyProviders;
            TotalProviders = Providers.Count;

            if (TotalProviders > 0)
            {
                ProgressValue = (double)healthyProviders / TotalProviders;
                ProgressText = $"{healthyProviders} of {TotalProviders} providers ready";
            }
            else
            {
                ProgressValue = 0.0;
                ProgressText = "No providers configured";
            }

            AllRequiredProvidersReady = requiredProviders.All(p => p.Status.IsHealthy);
            HasOptionalProviders = Providers.Any(p => !p.IsRequired);

            // Check if user can access main app
            var canAccessResult = await _onboardingService.CanAccessMainApplicationAsync();
            CanAccessMainApp = canAccessResult.IsSuccess && canAccessResult.Value;
            CanContinue = CanAccessMainApp;

            // Update button text based on state
            if (AllRequiredProvidersReady)
            {
                ContinueButtonText = "Continue to App →";
            }
            else
            {
                var remaining = requiredProviders.Count - healthyRequiredProviders;
                ContinueButtonText = $"Setup {remaining} more provider{(remaining > 1 ? "s" : "")}";
            }

            _logger.LogDebug("Dashboard state updated: {Healthy}/{Total} providers, CanContinue={CanContinue}",
                healthyProviders, TotalProviders, CanContinue);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception updating dashboard state");
        }
    }

    /// <summary>
    /// Show an error message
    /// </summary>
    private void ShowError(string message)
    {
        HasError = true;
        ErrorMessage = message;
        StatusMessage = "❌ " + message;
        ErrorOccurred?.Invoke(this, message);
    }

    /// <summary>
    /// Clear error state
    /// </summary>
    [RelayCommand]
    private void ClearError()
    {
        HasError = false;
        ErrorMessage = null;
        if (StatusMessage.StartsWith("❌"))
        {
            StatusMessage = string.Empty;
        }
    }

    /// <summary>
    /// Get setup instructions for a provider
    /// </summary>
    public string GetProviderInstructions(string providerName)
    {
        var provider = Providers.FirstOrDefault(p => p.ProviderName == providerName);
        return provider?.SetupInstructions ?? "Follow the setup wizard to configure this provider.";
    }

    /// <summary>
    /// Get provider display name
    /// </summary>
    public string GetProviderDisplayName(string providerName)
    {
        var provider = Providers.FirstOrDefault(p => p.ProviderName == providerName);
        return provider?.DisplayName ?? providerName;
    }

    /// <summary>
    /// Cleanup resources
    /// </summary>
    public void Cleanup()
    {
        _onboardingService.OnboardingStateChanged -= OnOnboardingStateChanged;
        _providerStatusService.ProviderStatusChanged -= OnProviderStatusChanged;
    }
}