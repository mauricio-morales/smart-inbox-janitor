using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using TrashMailPanda.Models;
using TrashMailPanda.Services;
using TrashMailPanda.Shared;

namespace TrashMailPanda.ViewModels;

/// <summary>
/// ViewModel for individual provider status cards
/// Displays real-time provider health and setup status
/// </summary>
public partial class ProviderStatusCardViewModel : ViewModelBase
{
    // Core provider information
    [ObservableProperty]
    private ProviderDisplayInfo _displayInfo = new();

    [ObservableProperty]
    private ProviderStatus _status = new();

    [ObservableProperty]
    private ProviderSetupState _setupState = new();

    // UI state
    [ObservableProperty]
    private bool _isLoading = false;

    [ObservableProperty]
    private string _lastRefreshTime = string.Empty;

    [ObservableProperty]
    private bool _canConfigureProvider = true;

    [ObservableProperty]
    private string _statusMessage = string.Empty;

    // Computed properties for UI binding
    public string ProviderName => DisplayInfo.Name;
    public string ProviderIcon => DisplayInfo.Icon;
    public string ProviderDisplayName => DisplayInfo.DisplayName;
    public string ProviderDescription => DisplayInfo.Description;

    // Status indicators
    public bool IsHealthy => Status.IsHealthy;
    public bool RequiresSetup => Status.RequiresSetup;
    public bool IsInitialized => Status.IsInitialized;
    public string CurrentStatus => Status.Status ?? "Unknown";
    public string? ErrorMessage => Status.ErrorMessage;

    // Setup information
    public string SetupComplexity => DisplayInfo.Complexity switch
    {
        Models.SetupComplexity.Simple => "Quick setup",
        Models.SetupComplexity.Moderate => "Moderate setup",
        Models.SetupComplexity.Complex => "Advanced setup",
        _ => "Setup required"
    };

    public string EstimatedTime => DisplayInfo.EstimatedSetupTimeMinutes switch
    {
        0 => "Automatic",
        1 => "1 minute",
        <= 5 => $"{DisplayInfo.EstimatedSetupTimeMinutes} minutes",
        <= 10 => "5-10 minutes",
        _ => "10+ minutes"
    };

    // Button states and text  
    public bool ShowSetupButton => !IsHealthy;
    public bool ShowStatusDetails => IsInitialized || !string.IsNullOrEmpty(ErrorMessage);

    public string ActionButtonText
    {
        get
        {
            // Check specific status messages first for appropriate actions
            return CurrentStatus switch
            {
                "OAuth Setup Required" => "Setup OAuth",
                "API Key Required" => "Enter API Key",
                "Setup Required" => "Setup",
                "Authentication Required" => "Sign In",
                "API Key Invalid" => "Fix API Key",
                "Connection Failed" => "Reconnect",
                _ => IsHealthy && IsInitialized ? "Reconfigure" : RequiresSetup ? "Configure" : "Fix Issue"
            };
        }
    }

    public string StatusDisplayText
    {
        get
        {
            if (!string.IsNullOrEmpty(StatusMessage))
                return StatusMessage;

            if (IsLoading)
                return "Checking status...";

            return CurrentStatus switch
            {
                "Connected" => "✅ Connected and working",
                "Ready" => "✅ Ready to use",
                "Healthy" => "✅ Operating normally",
                "OAuth Setup Required" => "⚙️ OAuth setup needed",
                "API Key Required" => "🔑 API key needed",
                "Authentication Required" => "🔐 Please sign in",
                "API Key Invalid" => "❌ Invalid API key",
                "Connection Failed" => "❌ Connection problem",
                "Database Error" => "❌ Database issue",
                _ => CurrentStatus ?? "❓ Status unknown"
            };
        }
    }

    // Events for parent communication
    public event EventHandler<string>? SetupRequested;
    public event EventHandler<string>? ConfigurationRequested;
    public event EventHandler<string>? RefreshRequested;

    /// <summary>
    /// Initialize the view model with provider information
    /// </summary>
    public ProviderStatusCardViewModel(ProviderDisplayInfo displayInfo)
    {
        DisplayInfo = displayInfo ?? throw new ArgumentNullException(nameof(displayInfo));

        // Initialize with default status
        Status = new ProviderStatus
        {
            Name = displayInfo.Name,
            IsHealthy = false,
            IsInitialized = false,
            RequiresSetup = true,
            Status = "Not checked",
            LastCheck = DateTime.MinValue
        };

        // Initialize setup state
        SetupState = new ProviderSetupState
        {
            ProviderName = displayInfo.Name,
            CurrentStep = SetupStep.NotStarted
        };

        UpdateLastRefreshTime();
    }

    /// <summary>
    /// Update the view model with new provider status
    /// </summary>
    public void UpdateFromProviderStatus(ProviderStatus newStatus)
    {
        if (newStatus == null)
            return;

        Status = newStatus;
        UpdateLastRefreshTime();

        // Clear any temporary status messages when status is updated
        if (!IsLoading)
        {
            StatusMessage = string.Empty;
        }

        // Update all computed properties
        OnPropertyChanged(nameof(IsHealthy));
        OnPropertyChanged(nameof(RequiresSetup));
        OnPropertyChanged(nameof(IsInitialized));
        OnPropertyChanged(nameof(CurrentStatus));
        OnPropertyChanged(nameof(ErrorMessage));
        OnPropertyChanged(nameof(ShowSetupButton));
        OnPropertyChanged(nameof(ShowStatusDetails));
        OnPropertyChanged(nameof(ActionButtonText));
        OnPropertyChanged(nameof(StatusDisplayText));
    }

    /// <summary>
    /// Update setup state during configuration flows
    /// </summary>
    public void UpdateSetupState(ProviderSetupState newSetupState)
    {
        if (newSetupState == null)
            return;

        SetupState = newSetupState;

        // Update UI state based on setup progress
        IsLoading = newSetupState.IsInProgress;
        CanConfigureProvider = !newSetupState.IsInProgress;

        // Update status message based on setup step
        StatusMessage = GetStatusMessageForSetupStep(newSetupState.CurrentStep);

        OnPropertyChanged(nameof(StatusDisplayText));
    }

    /// <summary>
    /// Main action command - setup or configuration
    /// </summary>
    [RelayCommand]
    private async Task HandleActionAsync()
    {
        if (!CanConfigureProvider || IsLoading)
            return;

        IsLoading = true;
        StatusMessage = "Preparing...";

        try
        {
            if (RequiresSetup)
            {
                StatusMessage = "Starting setup...";
                SetupRequested?.Invoke(this, ProviderName);
            }
            else
            {
                StatusMessage = "Opening configuration...";
                ConfigurationRequested?.Invoke(this, ProviderName);
            }

            // Reset loading state after a reasonable delay since we're not implementing
            // actual dialogs yet - this prevents the button from staying stuck
            await Task.Delay(2000);
            IsLoading = false;
            StatusMessage = RequiresSetup ? "Setup requested" : "Configuration requested";
        }
        catch (Exception ex)
        {
            StatusMessage = $"Error: {ex.Message}";
            IsLoading = false;
        }
    }

    /// <summary>
    /// Refresh provider status command
    /// </summary>
    [RelayCommand]
    private async Task RefreshStatusAsync()
    {
        if (IsLoading)
            return;

        IsLoading = true;
        StatusMessage = "Refreshing...";

        try
        {
            RefreshRequested?.Invoke(this, ProviderName);

            // Give visual feedback for the refresh
            await Task.Delay(500);
        }
        catch (Exception ex)
        {
            StatusMessage = $"Refresh failed: {ex.Message}";
        }
        finally
        {
            IsLoading = false;

            // Clear status message after delay if no errors
            _ = Task.Delay(2000).ContinueWith(_ =>
            {
                if (StatusMessage.StartsWith("Refresh", StringComparison.OrdinalIgnoreCase))
                {
                    StatusMessage = string.Empty;
                    OnPropertyChanged(nameof(StatusDisplayText));
                }
            });
        }
    }

    /// <summary>
    /// Reset provider to force reconfiguration
    /// </summary>
    [RelayCommand]
    private async Task ResetProviderAsync()
    {
        if (IsLoading)
            return;

        IsLoading = true;
        StatusMessage = "Resetting provider...";

        try
        {
            // Reset setup state
            SetupState = new ProviderSetupState
            {
                ProviderName = ProviderName,
                CurrentStep = SetupStep.NotStarted
            };

            // Reset status
            var resetStatus = Status with
            {
                IsHealthy = false,
                IsInitialized = false,
                RequiresSetup = true,
                Status = "Reset - Setup Required",
                ErrorMessage = null,
                LastCheck = DateTime.UtcNow
            };

            UpdateFromProviderStatus(resetStatus);

            StatusMessage = "Provider reset - setup required";
        }
        catch (Exception ex)
        {
            StatusMessage = $"Reset failed: {ex.Message}";
        }
        finally
        {
            IsLoading = false;
        }
    }

    /// <summary>
    /// Update last refresh time display
    /// </summary>
    private void UpdateLastRefreshTime()
    {
        if (Status.LastCheck == DateTime.MinValue)
        {
            LastRefreshTime = "Never";
        }
        else
        {
            var timeAgo = DateTime.UtcNow - Status.LastCheck;
            LastRefreshTime = timeAgo.TotalMinutes < 1
                ? "Just now"
                : timeAgo.TotalHours < 1
                    ? $"{(int)timeAgo.TotalMinutes} minutes ago"
                    : $"{(int)timeAgo.TotalHours} hours ago";
        }
    }

    /// <summary>
    /// Get status message for current setup step
    /// </summary>
    private static string GetStatusMessageForSetupStep(SetupStep step)
    {
        return step switch
        {
            SetupStep.Preparing => "Preparing setup...",
            SetupStep.GatheringInput => "Gathering configuration...",
            SetupStep.Authenticating => "Authenticating...",
            SetupStep.Configuring => "Configuring provider...",
            SetupStep.Testing => "Testing connection...",
            SetupStep.Finalizing => "Finalizing setup...",
            SetupStep.Completed => "Setup completed!",
            SetupStep.Failed => "Setup failed",
            SetupStep.Cancelled => "Setup cancelled",
            _ => string.Empty
        };
    }

    /// <summary>
    /// Force refresh of computed properties when needed
    /// </summary>
    public void RefreshComputedProperties()
    {
        OnPropertyChanged(nameof(IsHealthy));
        OnPropertyChanged(nameof(RequiresSetup));
        OnPropertyChanged(nameof(IsInitialized));
        OnPropertyChanged(nameof(CurrentStatus));
        OnPropertyChanged(nameof(ErrorMessage));
        OnPropertyChanged(nameof(ShowSetupButton));
        OnPropertyChanged(nameof(ShowStatusDetails));
        OnPropertyChanged(nameof(ActionButtonText));
        OnPropertyChanged(nameof(StatusDisplayText));
        OnPropertyChanged(nameof(SetupComplexity));
        OnPropertyChanged(nameof(EstimatedTime));
    }

    /// <summary>
    /// Set temporary status message with auto-clear
    /// </summary>
    public void SetTemporaryStatusMessage(string message, TimeSpan? clearAfter = null)
    {
        StatusMessage = message;
        OnPropertyChanged(nameof(StatusDisplayText));

        var delay = clearAfter ?? TimeSpan.FromSeconds(3);
        _ = Task.Delay(delay).ContinueWith(_ =>
        {
            if (StatusMessage == message) // Only clear if message hasn't changed
            {
                StatusMessage = string.Empty;
                OnPropertyChanged(nameof(StatusDisplayText));
            }
        });
    }
}