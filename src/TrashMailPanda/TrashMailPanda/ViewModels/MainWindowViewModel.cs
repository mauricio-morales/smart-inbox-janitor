using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.DependencyInjection;
using System;
using System.Threading.Tasks;
using TrashMailPanda.Views;

namespace TrashMailPanda.ViewModels;

/// <summary>
/// Main window ViewModel that manages navigation between provider dashboard and email dashboard
/// Serves as the central navigation hub for the application
/// </summary>
public partial class MainWindowViewModel : ViewModelBase
{
    private readonly ProviderStatusDashboardViewModel _providerDashboardViewModel;
    private readonly EmailDashboardViewModel _emailDashboardViewModel;
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<MainWindowViewModel> _logger;

    // Navigation State
    [ObservableProperty]
    private ViewModelBase _currentView;

    [ObservableProperty]
    private bool _canAccessMainDashboard = false;

    [ObservableProperty]
    private bool _isNavigating = false;

    [ObservableProperty]
    private string _navigationStatus = string.Empty;

    // Window State
    [ObservableProperty]
    private string _windowTitle = "TrashMail Panda";

    [ObservableProperty]
    private bool _showStatusBar = true;

    public MainWindowViewModel(
        ProviderStatusDashboardViewModel providerDashboardViewModel,
        EmailDashboardViewModel emailDashboardViewModel,
        IServiceProvider serviceProvider,
        ILogger<MainWindowViewModel> logger)
    {
        _providerDashboardViewModel = providerDashboardViewModel ?? throw new ArgumentNullException(nameof(providerDashboardViewModel));
        _emailDashboardViewModel = emailDashboardViewModel ?? throw new ArgumentNullException(nameof(emailDashboardViewModel));
        _serviceProvider = serviceProvider ?? throw new ArgumentNullException(nameof(serviceProvider));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));

        // Subscribe to provider dashboard events
        _providerDashboardViewModel.DashboardAccessRequested += OnDashboardAccessRequested;
        _providerDashboardViewModel.ProviderSetupRequested += OnProviderSetupRequested;
        _providerDashboardViewModel.ProviderConfigurationRequested += OnProviderConfigurationRequested;

        // Subscribe to email dashboard events
        _emailDashboardViewModel.ReturnToDashboardRequested += OnReturnToDashboardRequested;
        _emailDashboardViewModel.EmailProcessingRequested += OnEmailProcessingRequested;

        // Monitor CanAccessMainDashboard changes from provider dashboard
        _providerDashboardViewModel.PropertyChanged += OnProviderDashboardPropertyChanged;

        // Start with provider dashboard as the default view
        _currentView = _providerDashboardViewModel;
        WindowTitle = "TrashMail Panda - Provider Status";
        NavigationStatus = "Provider Status Dashboard";

        _logger.LogInformation("MainWindowViewModel initialized with provider dashboard as default view");
    }

    /// <summary>
    /// Navigate to the provider status dashboard
    /// </summary>
    [RelayCommand]
    private async Task ShowProviderDashboardAsync()
    {
        if (CurrentView == _providerDashboardViewModel || IsNavigating)
            return;

        try
        {
            IsNavigating = true;
            NavigationStatus = "Navigating to Provider Status...";

            _logger.LogInformation("Navigating to provider status dashboard");

            CurrentView = _providerDashboardViewModel;
            WindowTitle = "TrashMail Panda - Provider Status";
            NavigationStatus = "Provider Status Dashboard";

            // Refresh provider status when returning to dashboard
            await _providerDashboardViewModel.RefreshAllProvidersCommand.ExecuteAsync(null);

            _logger.LogInformation("Successfully navigated to provider status dashboard");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception navigating to provider status dashboard");
            NavigationStatus = "Navigation failed";
        }
        finally
        {
            IsNavigating = false;
        }
    }

    /// <summary>
    /// Navigate to the main email dashboard (if allowed)
    /// </summary>
    [RelayCommand]
    private async Task ShowMainDashboardAsync()
    {
        if (!CanAccessMainDashboard || CurrentView == _emailDashboardViewModel || IsNavigating)
        {
            if (!CanAccessMainDashboard)
            {
                _logger.LogWarning("Attempted to access main dashboard but providers not ready");
                NavigationStatus = "Providers not ready - setup required";
            }
            return;
        }

        try
        {
            IsNavigating = true;
            NavigationStatus = "Navigating to Email Dashboard...";

            _logger.LogInformation("Navigating to email dashboard");

            CurrentView = _emailDashboardViewModel;
            WindowTitle = "TrashMail Panda - Email Processing";
            NavigationStatus = "Email Processing Dashboard";

            // Initialize the email dashboard
            await _emailDashboardViewModel.InitializeAsync();

            _logger.LogInformation("Successfully navigated to email dashboard");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception navigating to email dashboard");
            NavigationStatus = "Navigation failed - returning to provider status";

            // Fallback to provider dashboard on error
            CurrentView = _providerDashboardViewModel;
            WindowTitle = "TrashMail Panda - Provider Status";
        }
        finally
        {
            IsNavigating = false;
        }
    }

    /// <summary>
    /// Handle dashboard access requests from provider dashboard
    /// </summary>
    private async void OnDashboardAccessRequested(object? sender, EventArgs e)
    {
        try
        {
            _logger.LogInformation("Dashboard access requested from provider dashboard");
            await ShowMainDashboardAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception handling dashboard access request");
        }
    }

    /// <summary>
    /// Handle return to dashboard requests from email dashboard
    /// </summary>
    private async void OnReturnToDashboardRequested(object? sender, EventArgs e)
    {
        try
        {
            _logger.LogInformation("Return to dashboard requested from email dashboard");
            await ShowProviderDashboardAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception handling return to dashboard request");
        }
    }

    /// <summary>
    /// Handle email processing requests from email dashboard
    /// </summary>
    private void OnEmailProcessingRequested(object? sender, EventArgs e)
    {
        try
        {
            _logger.LogInformation("Email processing requested from email dashboard");

            // TODO: Implement email processing workflow
            NavigationStatus = "Email processing workflow starting...";

            // For now, this is a placeholder
            // In the future, this would navigate to the email processing UI
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception handling email processing request");
        }
    }

    /// <summary>
    /// Handle provider setup requests from provider dashboard
    /// </summary>
    private async void OnProviderSetupRequested(object? sender, string providerName)
    {
        try
        {
            _logger.LogInformation("Provider setup requested for {Provider}", providerName);

            NavigationStatus = $"Opening {providerName} setup...";

            // Open appropriate setup dialog based on provider type
            switch (providerName?.ToLowerInvariant())
            {
                case "gmail":
                    _logger.LogInformation("Opening Gmail OAuth setup dialog");
                    NavigationStatus = "Gmail setup - OAuth flow not yet implemented";
                    // TODO: Implement Gmail OAuth setup dialog
                    await Task.Delay(2000);
                    break;

                case "openai":
                    _logger.LogInformation("Opening OpenAI API key setup dialog");
                    await OpenOpenAISetupDialogAsync();
                    break;

                default:
                    _logger.LogInformation("Generic setup for {Provider} not yet implemented", providerName);
                    NavigationStatus = $"{providerName} setup not yet implemented";
                    await Task.Delay(2000);
                    break;
            }

            // Reset navigation status
            NavigationStatus = IsOnProviderDashboard
                ? "Provider Status Dashboard"
                : "Email Processing Dashboard";
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception handling provider setup request for {Provider}", providerName);
            NavigationStatus = "Setup failed - check logs";
        }
    }

    /// <summary>
    /// Handle provider configuration requests from provider dashboard
    /// </summary>
    private async void OnProviderConfigurationRequested(object? sender, string providerName)
    {
        try
        {
            _logger.LogInformation("Provider configuration requested for {Provider}", providerName);

            NavigationStatus = $"Opening {providerName} configuration...";

            // TODO: Implement actual configuration dialog navigation based on provider type
            switch (providerName?.ToLowerInvariant())
            {
                case "gmail":
                    _logger.LogInformation("Would open Gmail configuration dialog");
                    NavigationStatus = "Gmail configuration would open here";
                    break;
                case "openai":
                    _logger.LogInformation("Would open OpenAI configuration dialog");
                    NavigationStatus = "OpenAI configuration would open here";
                    break;
                default:
                    _logger.LogInformation("Would open generic configuration dialog for {Provider}", providerName);
                    NavigationStatus = $"{providerName} configuration would open here";
                    break;
            }

            // Reset navigation status after delay
            await Task.Delay(3000);
            NavigationStatus = IsOnProviderDashboard
                ? "Provider Status Dashboard"
                : "Email Processing Dashboard";
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception handling provider configuration request for {Provider}", providerName);
            NavigationStatus = "Configuration failed - check logs";
        }
    }

    /// <summary>
    /// Open the OpenAI API key setup dialog
    /// </summary>
    private async Task OpenOpenAISetupDialogAsync()
    {
        try
        {
            var viewModel = _serviceProvider.GetRequiredService<OpenAISetupViewModel>();
            await viewModel.LoadExistingApiKeyAsync();

            var dialog = new OpenAISetupDialog(viewModel);

            // Subscribe to close event
            viewModel.RequestClose += (sender, args) => dialog.Close();

            // Show dialog (modal)
            var mainWindow = GetMainWindow();
            if (mainWindow != null)
            {
                await dialog.ShowDialog(mainWindow);
            }
            else
            {
                dialog.Show(); // Show as regular window if no parent
            }

            if (viewModel.DialogResult)
            {
                _logger.LogInformation("OpenAI setup completed successfully");
                NavigationStatus = "OpenAI API key saved successfully";

                // Refresh provider status to reflect the change
                await _providerDashboardViewModel.RefreshAllProvidersCommand.ExecuteAsync(null);
            }
            else
            {
                _logger.LogInformation("OpenAI setup was cancelled");
                NavigationStatus = "OpenAI setup cancelled";
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception opening OpenAI setup dialog");
            NavigationStatus = "Failed to open OpenAI setup";
        }
    }

    /// <summary>
    /// Get the main window for dialog parent
    /// </summary>
    private Avalonia.Controls.Window? GetMainWindow()
    {
        // In a real implementation, this would need to get the actual main window
        // For now, we'll return null which will center the dialog on screen
        return null;
    }

    /// <summary>
    /// Monitor CanAccessMainDashboard changes from provider dashboard
    /// </summary>
    private void OnProviderDashboardPropertyChanged(object? sender, System.ComponentModel.PropertyChangedEventArgs e)
    {
        if (e.PropertyName == nameof(ProviderStatusDashboardViewModel.CanAccessMainDashboard))
        {
            CanAccessMainDashboard = _providerDashboardViewModel.CanAccessMainDashboard;

            _logger.LogDebug("CanAccessMainDashboard updated to {CanAccess}", CanAccessMainDashboard);

            // Update navigation status based on availability
            if (CurrentView == _providerDashboardViewModel)
            {
                NavigationStatus = CanAccessMainDashboard
                    ? "All providers ready - email dashboard available"
                    : "Provider setup or issues detected";
            }
        }
    }

    /// <summary>
    /// Get the current navigation state description
    /// </summary>
    public string CurrentViewDescription
    {
        get
        {
            return CurrentView switch
            {
                ProviderStatusDashboardViewModel => "Provider Status Dashboard",
                EmailDashboardViewModel => "Email Processing Dashboard",
                _ => "Unknown View"
            };
        }
    }

    /// <summary>
    /// Check if we're currently on the provider dashboard
    /// </summary>
    public bool IsOnProviderDashboard => CurrentView == _providerDashboardViewModel;

    /// <summary>
    /// Check if we're currently on the email dashboard
    /// </summary>
    public bool IsOnEmailDashboard => CurrentView == _emailDashboardViewModel;

    /// <summary>
    /// Cleanup when view model is no longer needed
    /// </summary>
    public void Cleanup()
    {
        // Unsubscribe from events
        if (_providerDashboardViewModel != null)
        {
            _providerDashboardViewModel.DashboardAccessRequested -= OnDashboardAccessRequested;
            _providerDashboardViewModel.ProviderSetupRequested -= OnProviderSetupRequested;
            _providerDashboardViewModel.ProviderConfigurationRequested -= OnProviderConfigurationRequested;
            _providerDashboardViewModel.PropertyChanged -= OnProviderDashboardPropertyChanged;
        }

        if (_emailDashboardViewModel != null)
        {
            _emailDashboardViewModel.ReturnToDashboardRequested -= OnReturnToDashboardRequested;
            _emailDashboardViewModel.EmailProcessingRequested -= OnEmailProcessingRequested;
        }

        _logger.LogInformation("MainWindowViewModel cleanup completed");
    }
}
