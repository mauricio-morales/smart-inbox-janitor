using System;
using System.Threading.Tasks;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using TrashMailPanda.Models;
using TrashMailPanda.Services;

namespace TrashMailPanda.ViewModels;

/// <summary>
/// Central coordinator for the onboarding process
/// Orchestrates navigation between welcome screen and provider setup dashboard
/// </summary>
public partial class OnboardingCoordinatorViewModel : ViewModelBase
{
    private readonly IOnboardingService _onboardingService;
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<OnboardingCoordinatorViewModel> _logger;

    // Child ViewModels
    [ObservableProperty]
    private OnboardingWelcomeViewModel? _welcomeViewModel;

    [ObservableProperty]
    private OnboardingDashboardViewModel? _dashboardViewModel;

    // Current view state
    [ObservableProperty]
    private OnboardingPhase _currentPhase = OnboardingPhase.Welcome;

    [ObservableProperty]
    private ViewModelBase? _currentViewModel;

    [ObservableProperty]
    private string _title = "TrashMail Panda Setup";

    [ObservableProperty]
    private bool _isLoading = true;

    [ObservableProperty]
    private string _statusMessage = "Initializing onboarding...";

    [ObservableProperty]
    private bool _hasError = false;

    [ObservableProperty]
    private string? _errorMessage;

    // Navigation state
    [ObservableProperty]
    private bool _canGoBack = false;

    [ObservableProperty]
    private string _backButtonText = "← Back";

    [ObservableProperty]
    private bool _showBackButton = false;

    // Events
    public event EventHandler? OnboardingCompleted;
    public event EventHandler? OnboardingSkipped;
    public event EventHandler<string>? ProviderSetupRequested;
    public event EventHandler<string>? ErrorOccurred;

    public OnboardingCoordinatorViewModel(
        IOnboardingService onboardingService,
        IServiceProvider serviceProvider,
        ILogger<OnboardingCoordinatorViewModel> logger)
    {
        _onboardingService = onboardingService ?? throw new ArgumentNullException(nameof(onboardingService));
        _serviceProvider = serviceProvider ?? throw new ArgumentNullException(nameof(serviceProvider));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));

        // Subscribe to onboarding state changes
        _onboardingService.OnboardingStateChanged += OnOnboardingStateChanged;

        // Initialize coordinator
        _ = Task.Run(InitializeAsync);
    }

    /// <summary>
    /// Initialize the coordinator and determine starting view
    /// </summary>
    private async Task InitializeAsync()
    {
        try
        {
            IsLoading = true;
            StatusMessage = "Checking onboarding status...";
            ClearError();

            // Get current onboarding state
            var stateResult = await _onboardingService.GetOnboardingStateAsync();
            if (!stateResult.IsSuccess)
            {
                _logger.LogError("Failed to get onboarding state: {Error}", stateResult.Error?.Message);
                ShowError("Failed to load onboarding status. Starting from the beginning.");
                await NavigateToWelcomeAsync();
                return;
            }

            var state = stateResult.Value!;
            _logger.LogInformation("Current onboarding state: Phase={Phase}, WelcomeComplete={WelcomeComplete}",
                state.CurrentPhase, state.IsWelcomeComplete);

            // Navigate to appropriate starting view
            await NavigateToPhaseAsync(state.CurrentPhase);

            StatusMessage = "Onboarding coordinator ready";
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception during coordinator initialization");
            ShowError("Failed to initialize onboarding. Please restart the application.");
        }
        finally
        {
            IsLoading = false;
        }
    }

    /// <summary>
    /// Navigate to a specific onboarding phase
    /// </summary>
    private async Task NavigateToPhaseAsync(OnboardingPhase phase)
    {
        try
        {
            _logger.LogDebug("Navigating to phase: {Phase}", phase);

            switch (phase)
            {
                case OnboardingPhase.Welcome:
                    await NavigateToWelcomeAsync();
                    break;
                case OnboardingPhase.ProviderSetup:
                    await NavigateToDashboardAsync();
                    break;
                case OnboardingPhase.Completed:
                    // Onboarding is complete - signal completion
                    _logger.LogInformation("Onboarding is already complete");
                    OnboardingCompleted?.Invoke(this, EventArgs.Empty);
                    break;
                default:
                    _logger.LogWarning("Unknown onboarding phase: {Phase}, defaulting to welcome", phase);
                    await NavigateToWelcomeAsync();
                    break;
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception navigating to phase {Phase}", phase);
            ShowError($"Failed to navigate to {phase} phase");
        }
    }

    /// <summary>
    /// Navigate to the welcome screen
    /// </summary>
    private async Task NavigateToWelcomeAsync()
    {
        try
        {
            // Dispose existing dashboard view model
            if (DashboardViewModel != null)
            {
                DashboardViewModel.OnboardingCompleted -= OnDashboardCompleted;
                DashboardViewModel.ProviderSetupRequested -= OnProviderSetupRequested;
                DashboardViewModel.ErrorOccurred -= OnChildViewModelError;
                DashboardViewModel.Cleanup();
                DashboardViewModel = null;
            }

            // Create or update welcome view model
            if (WelcomeViewModel == null)
            {
                WelcomeViewModel = _serviceProvider.GetRequiredService<OnboardingWelcomeViewModel>();
                WelcomeViewModel.WelcomeCompleted += OnWelcomeCompleted;
                WelcomeViewModel.SetupSkipped += OnSetupSkipped;
                WelcomeViewModel.ErrorOccurred += OnChildViewModelError;
            }

            CurrentPhase = OnboardingPhase.Welcome;
            CurrentViewModel = WelcomeViewModel;
            Title = "Welcome to TrashMail Panda";
            ShowBackButton = false;
            CanGoBack = false;

            _logger.LogDebug("Navigated to welcome screen");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception navigating to welcome screen");
            ShowError("Failed to load welcome screen");
        }
    }

    /// <summary>
    /// Navigate to the provider dashboard
    /// </summary>
    private async Task NavigateToDashboardAsync()
    {
        try
        {
            // Dispose existing welcome view model
            if (WelcomeViewModel != null)
            {
                WelcomeViewModel.WelcomeCompleted -= OnWelcomeCompleted;
                WelcomeViewModel.SetupSkipped -= OnSetupSkipped;
                WelcomeViewModel.ErrorOccurred -= OnChildViewModelError;
                WelcomeViewModel.Cleanup();
                WelcomeViewModel = null;
            }

            // Create or update dashboard view model
            if (DashboardViewModel == null)
            {
                DashboardViewModel = _serviceProvider.GetRequiredService<OnboardingDashboardViewModel>();
                DashboardViewModel.OnboardingCompleted += OnDashboardCompleted;
                DashboardViewModel.ProviderSetupRequested += OnProviderSetupRequested;
                DashboardViewModel.ErrorOccurred += OnChildViewModelError;
            }

            CurrentPhase = OnboardingPhase.ProviderSetup;
            CurrentViewModel = DashboardViewModel;
            Title = "Set Up Your Providers";
            ShowBackButton = true;
            CanGoBack = true;

            _logger.LogDebug("Navigated to dashboard screen");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception navigating to dashboard screen");
            ShowError("Failed to load provider dashboard");
        }
    }

    /// <summary>
    /// Handle welcome completion
    /// </summary>
    private async void OnWelcomeCompleted(object? sender, EventArgs e)
    {
        try
        {
            _logger.LogInformation("Welcome screen completed, navigating to dashboard");
            await NavigateToDashboardAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception handling welcome completion");
            ShowError("Failed to proceed to provider setup");
        }
    }

    /// <summary>
    /// Handle dashboard completion
    /// </summary>
    private void OnDashboardCompleted(object? sender, EventArgs e)
    {
        try
        {
            _logger.LogInformation("Dashboard completed, onboarding is finished");
            OnboardingCompleted?.Invoke(this, EventArgs.Empty);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception handling dashboard completion");
        }
    }

    /// <summary>
    /// Handle setup skip request
    /// </summary>
    private void OnSetupSkipped(object? sender, EventArgs e)
    {
        try
        {
            _logger.LogInformation("User skipped onboarding setup");
            OnboardingSkipped?.Invoke(this, EventArgs.Empty);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception handling setup skip");
        }
    }

    /// <summary>
    /// Handle provider setup requests from child view models
    /// </summary>
    private void OnProviderSetupRequested(object? sender, string providerName)
    {
        try
        {
            _logger.LogInformation("Provider setup requested for {Provider}", providerName);
            ProviderSetupRequested?.Invoke(this, providerName);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception handling provider setup request for {Provider}", providerName);
        }
    }

    /// <summary>
    /// Handle errors from child view models
    /// </summary>
    private void OnChildViewModelError(object? sender, string errorMessage)
    {
        try
        {
            ShowError(errorMessage);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception handling child view model error");
        }
    }

    /// <summary>
    /// Go back to the previous screen
    /// </summary>
    [RelayCommand]
    private async Task GoBackAsync()
    {
        if (!CanGoBack || IsLoading)
        {
            return;
        }

        try
        {
            _logger.LogDebug("Going back from phase {Phase}", CurrentPhase);

            switch (CurrentPhase)
            {
                case OnboardingPhase.ProviderSetup:
                    await NavigateToWelcomeAsync();
                    break;
                default:
                    _logger.LogWarning("Cannot go back from phase {Phase}", CurrentPhase);
                    break;
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception going back from phase {Phase}", CurrentPhase);
            ShowError("Failed to go back");
        }
    }

    /// <summary>
    /// Handle onboarding state changes
    /// </summary>
    private async void OnOnboardingStateChanged(object? sender, OnboardingStateChangedEventArgs e)
    {
        try
        {
            var newPhase = e.OnboardingState.CurrentPhase;

            if (newPhase != CurrentPhase)
            {
                _logger.LogDebug("Onboarding phase changed from {OldPhase} to {NewPhase}", CurrentPhase, newPhase);
                await NavigateToPhaseAsync(newPhase);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception handling onboarding state change");
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
    /// Refresh the current state
    /// </summary>
    [RelayCommand]
    private async Task RefreshAsync()
    {
        ClearError();
        await InitializeAsync();
    }

    /// <summary>
    /// Skip the entire onboarding process
    /// </summary>
    [RelayCommand]
    private async Task SkipOnboardingAsync()
    {
        try
        {
            _logger.LogInformation("Skipping entire onboarding process");

            // Mark welcome as complete to allow main app access
            var result = await _onboardingService.MarkWelcomeCompleteAsync();
            if (result.IsSuccess)
            {
                OnboardingSkipped?.Invoke(this, EventArgs.Empty);
            }
            else
            {
                ShowError("Failed to skip onboarding. Please try again.");
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception skipping onboarding");
            ShowError("An error occurred while skipping onboarding.");
        }
    }

    /// <summary>
    /// Cleanup resources when the coordinator is disposed
    /// </summary>
    public void Cleanup()
    {
        _onboardingService.OnboardingStateChanged -= OnOnboardingStateChanged;

        if (WelcomeViewModel != null)
        {
            WelcomeViewModel.WelcomeCompleted -= OnWelcomeCompleted;
            WelcomeViewModel.SetupSkipped -= OnSetupSkipped;
            WelcomeViewModel.ErrorOccurred -= OnChildViewModelError;
            WelcomeViewModel.Cleanup();
        }

        if (DashboardViewModel != null)
        {
            DashboardViewModel.OnboardingCompleted -= OnDashboardCompleted;
            DashboardViewModel.ProviderSetupRequested -= OnProviderSetupRequested;
            DashboardViewModel.ErrorOccurred -= OnChildViewModelError;
            DashboardViewModel.Cleanup();
        }
    }
}