using System;
using System.Threading.Tasks;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using Microsoft.Extensions.Logging;
using TrashMailPanda.Models;
using TrashMailPanda.Services;

namespace TrashMailPanda.ViewModels;

/// <summary>
/// ViewModel for the onboarding welcome screen
/// Handles the initial welcome experience and progression to provider setup
/// </summary>
public partial class OnboardingWelcomeViewModel : ViewModelBase
{
    private readonly IOnboardingService _onboardingService;
    private readonly ILogger<OnboardingWelcomeViewModel> _logger;

    // UI Content Properties
    [ObservableProperty]
    private string _title = "Welcome to TrashMail Panda 🐼";

    [ObservableProperty]
    private string _subtitle = "Your AI-powered email cleanup assistant";

    [ObservableProperty]
    private string _description = "TrashMail Panda helps you safely clean your Gmail inbox using intelligent AI classification. Let's get started with a quick setup process.";

    [ObservableProperty]
    private string _featuresHeading = "What you'll get:";

    // Features list for display
    public string[] Features { get; } = new[]
    {
        "🔒 Safe email processing - no permanent deletions",
        "🤖 AI-powered intelligent email classification",
        "⚡ Bulk operations for efficient inbox management",
        "📊 Clear insights into your email habits",
        "🔐 Secure local storage with encryption"
    };

    // State Properties
    [ObservableProperty]
    private bool _isLoading = false;

    [ObservableProperty]
    private string _statusMessage = string.Empty;

    [ObservableProperty]
    private bool _hasError = false;

    [ObservableProperty]
    private string? _errorMessage;

    [ObservableProperty]
    private bool _canProceed = true;

    // Button text
    [ObservableProperty]
    private string _proceedButtonText = "Get Started →";

    [ObservableProperty]
    private string _skipButtonText = "Skip Setup (Advanced)";

    // Progress indicator
    [ObservableProperty]
    private double _progressValue = 0.0;

    [ObservableProperty]
    private string _progressText = "Step 1 of 3: Welcome";

    // Events for navigation
    public event EventHandler? WelcomeCompleted;
    public event EventHandler? SetupSkipped;
    public event EventHandler<string>? ErrorOccurred;

    public OnboardingWelcomeViewModel(
        IOnboardingService onboardingService,
        ILogger<OnboardingWelcomeViewModel> logger)
    {
        _onboardingService = onboardingService ?? throw new ArgumentNullException(nameof(onboardingService));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));

        // Subscribe to onboarding state changes
        _onboardingService.OnboardingStateChanged += OnOnboardingStateChanged;

        // Initialize state
        _ = Task.Run(InitializeAsync);
    }

    /// <summary>
    /// Initialize the welcome screen state
    /// </summary>
    private async Task InitializeAsync()
    {
        try
        {
            IsLoading = true;
            StatusMessage = "Loading...";

            // Get current onboarding state
            var stateResult = await _onboardingService.GetOnboardingStateAsync();
            if (stateResult.IsSuccess)
            {
                var state = stateResult.Value!;

                // Update UI based on current state
                if (state.IsWelcomeComplete)
                {
                    // User has already seen welcome, they might be returning
                    Title = "Welcome Back! 👋";
                    Description = "Continue setting up your providers to get the most out of TrashMail Panda.";
                    ProceedButtonText = "Continue Setup →";
                }

                UpdateProgressFromState(state);
                StatusMessage = "Ready to begin";
            }
            else
            {
                _logger.LogWarning("Failed to load onboarding state: {Error}", stateResult.Error?.Message);
                StatusMessage = "Ready to begin (state could not be loaded)";
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception during welcome screen initialization");
            ShowError("Failed to initialize welcome screen. You can still proceed with setup.");
        }
        finally
        {
            IsLoading = false;
        }
    }

    /// <summary>
    /// Command to proceed with onboarding
    /// </summary>
    [RelayCommand]
    private async Task ProceedAsync()
    {
        if (!CanProceed || IsLoading)
        {
            return;
        }

        try
        {
            IsLoading = true;
            CanProceed = false;
            StatusMessage = "Marking welcome as complete...";

            // Mark welcome screen as completed
            var result = await _onboardingService.MarkWelcomeCompleteAsync();

            if (result.IsSuccess)
            {
                StatusMessage = "✅ Welcome completed!";
                _logger.LogInformation("Welcome screen marked as complete");

                // Small delay to show success message
                await Task.Delay(500);

                // Fire completion event
                WelcomeCompleted?.Invoke(this, EventArgs.Empty);
            }
            else
            {
                var errorMsg = result.Error?.GetUserFriendlyMessage() ?? "Failed to mark welcome as complete";
                _logger.LogError("Failed to mark welcome complete: {Error}", result.Error?.Message);
                ShowError(errorMsg);
                CanProceed = true; // Re-enable button
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception during welcome proceed");
            ShowError("An unexpected error occurred. Please try again.");
            CanProceed = true; // Re-enable button
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
    /// Command to skip the entire onboarding process
    /// </summary>
    [RelayCommand]
    private async Task SkipSetupAsync()
    {
        if (IsLoading)
        {
            return;
        }

        try
        {
            IsLoading = true;
            StatusMessage = "Skipping setup...";

            _logger.LogInformation("User chose to skip onboarding setup");

            // Mark welcome as complete but don't set up providers
            var result = await _onboardingService.MarkWelcomeCompleteAsync();

            if (result.IsSuccess)
            {
                // Fire skip event
                SetupSkipped?.Invoke(this, EventArgs.Empty);
            }
            else
            {
                _logger.LogError("Failed to mark welcome complete during skip: {Error}", result.Error?.Message);
                ShowError("Failed to skip setup. Please try again.");
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception during skip setup");
            ShowError("An unexpected error occurred while skipping setup.");
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
    /// Handle onboarding state changes from the service
    /// </summary>
    private void OnOnboardingStateChanged(object? sender, OnboardingStateChangedEventArgs e)
    {
        try
        {
            UpdateProgressFromState(e.OnboardingState);
            _logger.LogDebug("Welcome screen updated from onboarding state change: {Change}", e.ChangeDescription);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception handling onboarding state change");
        }
    }

    /// <summary>
    /// Update progress indicator from onboarding state
    /// </summary>
    private void UpdateProgressFromState(OnboardingState state)
    {
        switch (state.CurrentPhase)
        {
            case OnboardingPhase.Welcome:
                ProgressValue = 0.33; // 1 of 3 steps
                ProgressText = "Step 1 of 3: Welcome";
                break;
            case OnboardingPhase.ProviderSetup:
                ProgressValue = 0.66; // 2 of 3 steps  
                ProgressText = "Step 2 of 3: Provider Setup";
                break;
            case OnboardingPhase.Completed:
                ProgressValue = 1.0; // 3 of 3 steps
                ProgressText = "Step 3 of 3: Complete";
                break;
        }
    }

    /// <summary>
    /// Show an error message to the user
    /// </summary>
    private void ShowError(string message)
    {
        HasError = true;
        ErrorMessage = message;
        StatusMessage = "❌ " + message;
        ErrorOccurred?.Invoke(this, message);
    }

    /// <summary>
    /// Clear any error state
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
    /// Refresh the welcome screen state
    /// </summary>
    [RelayCommand]
    private async Task RefreshAsync()
    {
        ClearError();
        await InitializeAsync();
    }

    /// <summary>
    /// Cleanup when the view model is disposed
    /// </summary>
    public void Cleanup()
    {
        _onboardingService.OnboardingStateChanged -= OnOnboardingStateChanged;
    }
}