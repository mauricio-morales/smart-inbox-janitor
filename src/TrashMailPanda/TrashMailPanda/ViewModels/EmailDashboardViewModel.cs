using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using Microsoft.Extensions.Logging;
using System;
using System.Threading.Tasks;
using TrashMailPanda.Models;
using TrashMailPanda.Services;

namespace TrashMailPanda.ViewModels;

/// <summary>
/// ViewModel for the main email processing dashboard
/// Handles navigation, provider status monitoring, and email processing workflow
/// </summary>
public partial class EmailDashboardViewModel : ViewModelBase
{
    private readonly IProviderBridgeService _providerBridgeService;
    private readonly IProviderStatusService _providerStatusService;
    private readonly ILogger<EmailDashboardViewModel> _logger;

    // Loading and Status State
    [ObservableProperty]
    private bool _isLoading = true;

    [ObservableProperty]
    private bool _isReady = false;

    [ObservableProperty]
    private bool _hasErrors = false;

    [ObservableProperty]
    private bool _canStartProcessing = false;

    [ObservableProperty]
    private string _statusMessage = "Initializing dashboard...";

    [ObservableProperty]
    private string _connectionStatusText = "Checking provider connections...";

    [ObservableProperty]
    private string _errorMessage = string.Empty;

    // Provider Status Information
    [ObservableProperty]
    private ProviderStatusInfo _gmailStatus = new();

    [ObservableProperty]
    private ProviderStatusInfo _openAIStatus = new();

    [ObservableProperty]
    private ProviderStatusInfo _storageStatus = new();

    // System Information
    [ObservableProperty]
    private string _lastUpdateText = "Never";

    [ObservableProperty]
    private string _systemStatusText = "Initializing...";

    // Events for navigation
    public event EventHandler? ReturnToDashboardRequested;
    public event EventHandler? EmailProcessingRequested;

    public EmailDashboardViewModel(
        IProviderBridgeService providerBridgeService,
        IProviderStatusService providerStatusService,
        ILogger<EmailDashboardViewModel> logger)
    {
        _providerBridgeService = providerBridgeService ?? throw new ArgumentNullException(nameof(providerBridgeService));
        _providerStatusService = providerStatusService ?? throw new ArgumentNullException(nameof(providerStatusService));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));

        // Initialize provider status information
        InitializeProviderStatusInfo();

        // Subscribe to provider status changes
        _providerStatusService.ProviderStatusChanged += OnProviderStatusChanged;

        _logger.LogInformation("EmailDashboardViewModel initialized");
    }

    /// <summary>
    /// Initialize the dashboard when it becomes active
    /// </summary>
    public async Task InitializeAsync()
    {
        if (!IsLoading)
            return;

        try
        {
            _logger.LogInformation("Initializing email dashboard");

            StatusMessage = "Checking provider connections...";
            ConnectionStatusText = "Validating Gmail, OpenAI, and Storage connections...";

            // Check all provider statuses
            await RefreshProviderStatusAsync();

            LastUpdateText = DateTime.Now.ToString("HH:mm:ss");

            _logger.LogInformation("Email dashboard initialization completed");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception during dashboard initialization");
            HasErrors = true;
            ErrorMessage = "Failed to initialize dashboard. Please check provider connections.";
            StatusMessage = "Initialization failed";
            SystemStatusText = "Error";
        }
        finally
        {
            IsLoading = false;
        }
    }

    /// <summary>
    /// Refresh provider connection status
    /// </summary>
    [RelayCommand]
    private async Task RefreshConnectionAsync()
    {
        if (IsLoading)
            return;

        IsLoading = true;
        StatusMessage = "Refreshing connections...";
        ConnectionStatusText = "Checking provider health...";

        try
        {
            _logger.LogInformation("Refreshing provider connections from email dashboard");

            await RefreshProviderStatusAsync();

            LastUpdateText = DateTime.Now.ToString("HH:mm:ss");
            StatusMessage = IsReady ? "All connections healthy" : "Some providers need attention";

            _logger.LogInformation("Provider connection refresh completed");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception refreshing provider connections");
            HasErrors = true;
            ErrorMessage = "Failed to refresh connections. Please check your network and provider configurations.";
            StatusMessage = "Connection refresh failed";
        }
        finally
        {
            IsLoading = false;
        }
    }

    /// <summary>
    /// Return to the provider status dashboard
    /// </summary>
    [RelayCommand]
    private async Task ReturnToProviderDashboardAsync()
    {
        try
        {
            _logger.LogInformation("Returning to provider status dashboard");
            ReturnToDashboardRequested?.Invoke(this, EventArgs.Empty);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception returning to provider dashboard");
        }

        await Task.CompletedTask;
    }

    /// <summary>
    /// Start the email processing workflow
    /// </summary>
    [RelayCommand]
    private async Task StartEmailProcessingAsync()
    {
        if (!CanStartProcessing)
        {
            _logger.LogWarning("Attempted to start email processing but providers not ready");
            return;
        }

        try
        {
            _logger.LogInformation("Starting email processing workflow");

            StatusMessage = "Starting email processing...";
            EmailProcessingRequested?.Invoke(this, EventArgs.Empty);

            // TODO: Implement actual email processing workflow
            // For now, this is a placeholder that would trigger the email processing UI

        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception starting email processing");
            HasErrors = true;
            ErrorMessage = "Failed to start email processing. Please check provider connections.";
        }

        await Task.CompletedTask;
    }

    /// <summary>
    /// Refresh provider status from bridge service
    /// </summary>
    private async Task RefreshProviderStatusAsync()
    {
        try
        {
            var allStatuses = await _providerBridgeService.GetAllProviderStatusAsync();
            var displayInfo = _providerBridgeService.GetProviderDisplayInfo();

            // Update Gmail status
            if (allStatuses.TryGetValue("Gmail", out var gmailStatus))
            {
                GmailStatus = CreateProviderStatusInfo("Gmail", gmailStatus, displayInfo.TryGetValue("Gmail", out var gmailDisplay) ? gmailDisplay : null);
            }

            // Update OpenAI status
            if (allStatuses.TryGetValue("OpenAI", out var openaiStatus))
            {
                OpenAIStatus = CreateProviderStatusInfo("OpenAI", openaiStatus, displayInfo.TryGetValue("OpenAI", out var openaiDisplay) ? openaiDisplay : null);
            }

            // Update Storage status
            if (allStatuses.TryGetValue("Storage", out var storageStatus))
            {
                StorageStatus = CreateProviderStatusInfo("Storage", storageStatus, displayInfo.TryGetValue("Storage", out var storageDisplay) ? storageDisplay : null);
            }

            // Update overall dashboard state
            UpdateOverallDashboardState(allStatuses);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception refreshing provider status");
            throw;
        }
    }

    /// <summary>
    /// Create provider status information for display
    /// </summary>
    private ProviderStatusInfo CreateProviderStatusInfo(string providerName, ProviderStatus status, TrashMailPanda.Models.ProviderDisplayInfo? displayInfo)
    {
        var statusInfo = new ProviderStatusInfo();

        if (status.IsHealthy)
        {
            statusInfo.Icon = "✅";
            statusInfo.StatusText = "Connected";
            statusInfo.StatusColor = "#4CAF50";
        }
        else if (status.RequiresSetup)
        {
            statusInfo.Icon = "⚙️";
            statusInfo.StatusText = "Setup Required";
            statusInfo.StatusColor = "#FF9800";
        }
        else
        {
            statusInfo.Icon = "❌";
            statusInfo.StatusText = "Error";
            statusInfo.StatusColor = "#F44336";
        }

        return statusInfo;
    }

    /// <summary>
    /// Update overall dashboard state based on provider statuses
    /// </summary>
    private void UpdateOverallDashboardState(Dictionary<string, ProviderStatus> allStatuses)
    {
        var healthyProviders = allStatuses.Values.Count(s => s.IsHealthy);
        var totalProviders = allStatuses.Count;
        var hasSetupRequired = allStatuses.Values.Any(s => s.RequiresSetup);
        var hasErrors = allStatuses.Values.Any(s => !s.IsHealthy && !s.RequiresSetup);

        // Update connection status text
        ConnectionStatusText = $"{healthyProviders} of {totalProviders} providers connected";

        // Determine overall state
        if (healthyProviders == totalProviders)
        {
            IsReady = true;
            HasErrors = false;
            CanStartProcessing = true;
            StatusMessage = "All systems operational";
            SystemStatusText = "Operational";
        }
        else if (hasSetupRequired)
        {
            IsReady = false;
            HasErrors = false;
            CanStartProcessing = false;
            StatusMessage = "Provider setup required";
            SystemStatusText = "Setup Required";
            ErrorMessage = "Some providers require configuration. Please return to the provider dashboard to complete setup.";
        }
        else if (hasErrors)
        {
            IsReady = false;
            HasErrors = true;
            CanStartProcessing = false;
            StatusMessage = "Provider connection issues";
            SystemStatusText = "Errors Detected";
            ErrorMessage = "Some providers are experiencing connection issues. Please check your network and provider configurations.";
        }
        else
        {
            IsReady = false;
            HasErrors = false;
            CanStartProcessing = false;
            StatusMessage = "Checking provider status...";
            SystemStatusText = "Checking...";
        }

        _logger.LogDebug("Dashboard state updated: Ready={IsReady}, CanStart={CanStart}, Healthy={Healthy}/{Total}",
            IsReady, CanStartProcessing, healthyProviders, totalProviders);
    }

    /// <summary>
    /// Handle provider status change events
    /// </summary>
    private async void OnProviderStatusChanged(object? sender, ProviderStatusChangedEventArgs e)
    {
        try
        {
            _logger.LogDebug("Received provider status change for {Provider} in email dashboard", e.ProviderName);

            // Refresh provider status to get updated information
            await RefreshProviderStatusAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception handling provider status change in email dashboard");
        }
    }

    /// <summary>
    /// Initialize provider status info with default values
    /// </summary>
    private void InitializeProviderStatusInfo()
    {
        GmailStatus = new ProviderStatusInfo
        {
            Icon = "⏳",
            StatusText = "Checking...",
            StatusColor = "#757575"
        };

        OpenAIStatus = new ProviderStatusInfo
        {
            Icon = "⏳",
            StatusText = "Checking...",
            StatusColor = "#757575"
        };

        StorageStatus = new ProviderStatusInfo
        {
            Icon = "⏳",
            StatusText = "Checking...",
            StatusColor = "#757575"
        };
    }

    /// <summary>
    /// Cleanup when view model is no longer needed
    /// </summary>
    public void Cleanup()
    {
        // Unsubscribe from events
        _providerStatusService.ProviderStatusChanged -= OnProviderStatusChanged;

        _logger.LogInformation("EmailDashboardViewModel cleanup completed");
    }
}

/// <summary>
/// Provider status information for display in the sidebar
/// </summary>
public partial class ProviderStatusInfo : ObservableObject
{
    [ObservableProperty]
    private string _icon = "";

    [ObservableProperty]
    private string _statusText = "";

    [ObservableProperty]
    private string _statusColor = "#757575";
}