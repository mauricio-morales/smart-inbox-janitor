# Provider Status Dashboard and Configuration System

## Goal

**Feature Goal**: Create a comprehensive provider status dashboard that displays real-time health status for all providers (Storage, Email, AI LLM), handles configuration/setup flows, and ensures the main dashboard only loads when all providers are healthy and connected.

**Deliverable**: 
- Provider status dashboard UI with status cards for each provider
- Configuration/setup dialogs for provider authentication and setup
- Provider health monitoring service with real-time updates
- Dashboard gate system that prevents main app access until all providers are healthy

**Success Definition**: 
- All three provider types (Storage/SQLite, Email/Gmail, AI/OpenAI) display real-time status
- Setup/reconfiguration flows work for failed or unconfigured providers
- Main dashboard only becomes accessible when all providers report healthy status
- Provider failures are detected and UI updates accordingly with setup/reconnect options

## User Persona

**Target User**: TransMail Panda end users setting up the application for first use or troubleshooting provider connection issues

**Use Case**: User launches TransMail Panda and needs to:
1. View the status of all required providers (Storage, Email, AI)
2. Complete setup for unconfigured providers
3. Troubleshoot and reconnect failed providers
4. Access the main dashboard only when all systems are operational

**User Journey**: 
1. Launch TransMail Panda application
2. Provider status dashboard appears showing current status of all providers
3. Complete setup for any providers requiring configuration (Gmail OAuth, OpenAI API key, etc.)
4. Monitor provider health checks and see real-time status updates
5. Access main dashboard once all providers report healthy status
6. Return to provider status dashboard if any provider fails in the future

**Pain Points Addressed**: 
- Confusion about which providers need setup or are failing
- Inability to access main features when providers are misconfigured
- No visibility into provider health and connection status
- Difficulty troubleshooting provider authentication issues

## Why

- **Foundation for Reliability**: Provider health is critical for all TransMail Panda functionality - email processing, AI classification, and data storage all depend on healthy provider connections
- **User Experience**: Users need clear visibility into system status and guided setup flows for complex integrations like Gmail OAuth and OpenAI API configuration
- **Enterprise Requirements**: Real-time monitoring and graceful failure handling are essential for production use
- **Scalability**: Establishes patterns for adding future providers (IMAP email, Claude LLM, etc.)

## What

A sophisticated provider status and configuration system that:

### Core Features
1. **Real-time Provider Status Dashboard** - Visual status cards showing health, configuration status, and last check time for each provider
2. **Provider Configuration Flows** - Guided setup dialogs for Gmail OAuth, OpenAI API keys, and other provider-specific configurations
3. **Health Monitoring Service** - Background service that continuously monitors provider health and reports status changes
4. **Dashboard Gate System** - Prevents access to main application features until all providers are healthy
5. **Failure Recovery UI** - Setup/reconnect buttons that appear when providers fail or require reconfiguration

### Provider Types
- **Storage Provider**: SQLite with SQLCipher encryption (single instance, always required)
- **Email Provider**: Gmail OAuth integration (single instance, always required, extensible for future IMAP providers)
- **AI LLM Provider**: OpenAI GPT-4o-mini (single active instance, always required, extensible for Claude/local models)

### Success Criteria

- [ ] Provider status dashboard displays all three provider types with real-time health status
- [ ] Setup buttons appear for unconfigured providers and launch appropriate configuration dialogs
- [ ] Reconnect/reconfigure buttons appear for failed providers
- [ ] All provider configuration flows complete successfully (Gmail OAuth, OpenAI API key setup)
- [ ] Provider health checks run continuously and status updates reflect in UI immediately
- [ ] Main dashboard access is gated behind all providers being healthy
- [ ] Provider failures are detected and UI transitions back to configuration mode
- [ ] Status cards show appropriate visual indicators (colors, icons, progress indicators)

## All Needed Context

### Context Completeness Check

_This PRP provides comprehensive context including existing provider architecture analysis, MVVM patterns, health monitoring best practices, and specific implementation patterns - everything needed for successful one-pass implementation._

### Documentation & References

```yaml
# CRITICAL STORED DOCUMENTATION
- docfile: PRPs/ai_docs/provider_dashboard_avalonia_patterns.md
  why: Complete MVVM patterns, card layouts, and real-time data binding for provider status UI
  section: All sections - ViewModels, XAML patterns, converters, service integration
  critical: ObservableCollection patterns and event subscription for real-time updates

- docfile: PRPs/ai_docs/provider_health_monitoring_patterns.md
  why: Enterprise health check patterns, circuit breaker implementation, and retry strategies
  section: Health Check Patterns, Provider State Machines, Configuration Validation
  critical: Multi-layer health checks and failure recovery patterns

# EXISTING CODEBASE PATTERNS TO FOLLOW
- file: src/TransMailPanda/TransMailPanda/ViewModels/WelcomeWizardViewModel.cs
  why: Existing MVVM patterns with ObservableProperty, RelayCommand, and provider status management
  pattern: IsLoading boolean pattern, StatusMessage string pattern, async command handling
  gotcha: Uses CommunityToolkit.Mvvm with source generators - follow exact attribute patterns

- file: src/TransMailPanda/TransMailPanda/Views/WelcomeWizardWindow.axaml
  why: Existing card-based layout patterns and Border/StackPanel structure
  pattern: Card styling, status indicators, progress indicators, button layouts
  gotcha: Uses Avalonia 11 syntax - maintain existing XAML patterns and styling

- file: src/Shared/TransMailPanda.Shared/Base/IProvider.cs
  why: Comprehensive provider interface with state management, health checks, and event system
  pattern: State management, health check methods, event-driven updates, Result<T> pattern
  gotcha: Current providers don't implement this interface - need bridge implementation

- file: src/TransMailPanda/TransMailPanda/Services/ProviderStatusService.cs
  why: Existing provider status service with real-time event system
  pattern: Event subscription, status aggregation, provider health monitoring
  gotcha: Currently returns hardcoded status - needs integration with actual provider health checks

- file: src/TransMailPanda/TransMailPanda/Services/StartupOrchestrator.cs
  why: Provider initialization orchestration and startup flow coordination
  pattern: Sequential startup process, timeout handling, progress reporting
  gotcha: Has placeholder TODO comments - needs actual provider initialization calls

- file: src/Shared/TransMailPanda.Shared/Extensions/ProviderServiceExtensions.cs
  why: Provider registration patterns with dependency injection and health check integration
  pattern: Service registration, factory patterns, health check registration
  gotcha: Sophisticated DI patterns that need to be leveraged properly

- url: https://docs.avaloniaui.net/docs/guides/building-cross-platform-applications/solution-setup
  why: Avalonia UI 11 MVVM patterns and dependency injection setup
  critical: Service registration and view model instantiation patterns

- url: https://learn.microsoft.com/en-us/dotnet/communitytoolkit/mvvm/
  why: CommunityToolkit.Mvvm source generator patterns and observable properties
  critical: ObservableProperty and RelayCommand attribute usage with async operations
```

### Current Codebase Tree

```bash
src/
├── TransMailPanda/TransMailPanda/         # Main Avalonia application
│   ├── Views/                             # Existing XAML views
│   │   ├── MainWindow.axaml               # Main window container
│   │   └── WelcomeWizardWindow.axaml      # Provider setup UI (pattern to follow)
│   ├── ViewModels/                        # Existing view models
│   │   ├── ViewModelBase.cs               # Base class with ObservableObject
│   │   ├── MainWindowViewModel.cs         # Main window orchestration
│   │   └── WelcomeWizardViewModel.cs      # Provider setup patterns (follow this)
│   ├── Services/                          # Application services
│   │   ├── ProviderStatusService.cs       # Provider health monitoring (extend this)
│   │   ├── IProviderStatusService.cs      # Service interface (use this)
│   │   └── StartupOrchestrator.cs         # Provider initialization (integrate with this)
│   └── App.axaml.cs                       # DI container setup (register new services here)
├── Shared/TransMailPanda.Shared/          # Provider architecture foundation
│   ├── Base/                              # Provider interfaces and base classes
│   │   ├── IProvider.cs                   # Core provider interface (target architecture)
│   │   ├── BaseProvider.cs                # Provider base implementation
│   │   └── ProviderState.cs               # State management system
│   ├── Extensions/                        # Service registration extensions
│   │   └── ProviderServiceExtensions.cs   # DI registration patterns
│   └── Models/                            # Data models
│       └── ProviderConfig.cs              # Configuration base classes
├── Providers/                             # Provider implementations
│   ├── Email/                             # Gmail provider (needs IProvider integration)
│   ├── LLM/                               # OpenAI provider (needs IProvider integration)  
│   └── Storage/                           # SQLite provider (needs IProvider integration)
└── Tests/                                 # Test projects
```

### Desired Codebase Tree with Files to be Added

```bash
src/TransMailPanda/TransMailPanda/
├── Views/
│   ├── Controls/
│   │   └── ProviderStatusCard.axaml       # Individual provider status card UI
│   └── ProviderStatusDashboard.axaml      # Main provider status dashboard
├── ViewModels/
│   ├── ProviderStatusCardViewModel.cs     # ViewModel for individual provider cards
│   ├── ProviderStatusDashboardViewModel.cs # Main dashboard coordination ViewModel
│   └── ProviderSetupDialogViewModel.cs    # Provider-specific setup dialog ViewModels
├── Services/
│   ├── IProviderHealthMonitorService.cs   # Enhanced health monitoring service interface
│   ├── ProviderHealthMonitorService.cs    # Background health monitoring implementation
│   └── ProviderBridgeService.cs           # Bridge between legacy providers and IProvider interface
├── Converters/
│   ├── BoolToHealthConverter.cs           # Health status to display text converter
│   ├── BoolToColorConverter.cs            # Health status to color converter
│   └── BoolToIconConverter.cs             # Health status to icon converter
└── Models/
    ├── ProviderDisplayInfo.cs             # UI-specific provider information
    └── ProviderSetupState.cs              # Setup flow state management
```

### Known Gotchas & Library Quirks

```csharp
// CRITICAL: CommunityToolkit.Mvvm requires specific attribute patterns
[ObservableProperty]
private bool _isLoading = false; // Generates IsLoading property automatically

[RelayCommand]
private async Task RefreshAsync() // Generates RefreshCommand automatically
{
    // GOTCHA: Always wrap in try/finally for IsLoading state management
    IsLoading = true;
    try { /* work */ } finally { IsLoading = false; }
}

// CRITICAL: Avalonia 11 data binding syntax
IsVisible="{Binding !!ErrorMessage}" // !! converts string to bool for visibility

// CRITICAL: Current providers don't implement IProvider<TConfig> interface
// Need to create bridge service to integrate legacy providers with new architecture

// CRITICAL: StartupOrchestrator has placeholder TODO comments
// Replace with actual provider initialization calls using ProviderBridgeService

// CRITICAL: ProviderStatusService returns hardcoded status
// Must integrate with actual provider health check methods

// CRITICAL: Result<T> pattern required for all provider operations
// Never throw exceptions - always return Result.Success() or Result.Failure()

// GOTCHA: ObservableCollection required for dynamic UI updates
// Regular List<T> won't trigger UI updates when items change

// GOTCHA: Computed properties need OnPropertyChanged notification
public string StatusIcon => _isHealthy ? "✅" : "❌"; // Won't update automatically
// Must call OnPropertyChanged(nameof(StatusIcon)) when _isHealthy changes
```

## Implementation Blueprint

### Data Models and Structure

Create the core data models to ensure type safety and consistency across the provider status system.

```csharp
// Provider display information for UI binding
public record ProviderDisplayInfo
{
    public string Name { get; init; } = string.Empty;
    public string DisplayName { get; init; } = string.Empty;
    public string Description { get; init; } = string.Empty;
    public ProviderType Type { get; init; } // Storage, Email, LLM
    public bool IsRequired { get; init; } = true;
    public bool AllowsMultiple { get; init; } = false; // Only LLM allows single active
}

// Setup flow state management
public record ProviderSetupState
{
    public string ProviderName { get; init; } = string.Empty;
    public SetupStep CurrentStep { get; init; } = SetupStep.NotStarted;
    public bool IsInProgress { get; init; } = false;
    public string? ErrorMessage { get; init; }
    public Dictionary<string, object> SetupData { get; init; } = new();
}

public enum ProviderType { Storage, Email, LLM }
public enum SetupStep { NotStarted, Authenticating, Configuring, Testing, Completed, Failed }
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: CREATE src/TransMailPanda/TransMailPanda/Models/ProviderDisplayInfo.cs
  - IMPLEMENT: ProviderDisplayInfo, ProviderSetupState records with validation
  - FOLLOW pattern: src/Shared/TransMailPanda.Shared/Models/ (record syntax, validation attributes)
  - NAMING: PascalCase for properties, descriptive enum values
  - PLACEMENT: Models folder for UI-specific data structures

Task 2: CREATE src/TransMailPanda/TransMailPanda/Services/ProviderBridgeService.cs
  - IMPLEMENT: Bridge service connecting legacy providers to IProvider<TConfig> interface
  - FOLLOW pattern: src/TransMailPanda/TransMailPanda/Services/ProviderStatusService.cs (service structure)
  - DEPENDENCIES: IEmailProvider, ILLMProvider, IStorageProvider from existing providers
  - NAMING: ProviderBridgeService class with Get*ProviderStatus methods
  - CRITICAL: Implement health check methods that call actual provider validation

Task 3: CREATE src/TransMailPanda/TransMailPanda/Services/ProviderHealthMonitorService.cs
  - IMPLEMENT: Background service for continuous provider health monitoring
  - FOLLOW pattern: Microsoft.Extensions.Hosting.IHostedService for background processing
  - DEPENDENCIES: ProviderBridgeService from Task 2, IProviderStatusService
  - NAMING: ProviderHealthMonitorService with StartAsync, StopAsync, MonitorProvidersAsync methods
  - INTEGRATION: Timer-based health checks with configurable intervals

Task 4: CREATE src/TransMailPanda/TransMailPanda/Converters/StatusConverters.cs
  - IMPLEMENT: BoolToHealthConverter, BoolToColorConverter, BoolToIconConverter
  - FOLLOW pattern: Avalonia IValueConverter interface with Convert/ConvertBack methods
  - NAMING: Descriptive converter class names ending in "Converter"
  - PLACEMENT: Converters folder for UI data binding converters

Task 5: CREATE src/TransMailPanda/TransMailPanda/ViewModels/ProviderStatusCardViewModel.cs
  - IMPLEMENT: ViewModel for individual provider status cards with ObservableProperty attributes
  - FOLLOW pattern: src/TransMailPanda/TransMailPanda/ViewModels/WelcomeWizardViewModel.cs (MVVM patterns)
  - DEPENDENCIES: ProviderDisplayInfo from Task 1, IProviderStatusService
  - NAMING: ProviderStatusCardViewModel with async RelayCommand methods
  - CRITICAL: Implement UpdateFromProviderStatus method and computed properties with OnPropertyChanged

Task 6: CREATE src/TransMailPanda/TransMailPanda/ViewModels/ProviderStatusDashboardViewModel.cs
  - IMPLEMENT: Main dashboard ViewModel with ObservableCollection<ProviderStatusCardViewModel>
  - FOLLOW pattern: src/TransMailPanda/TransMailPanda/ViewModels/ViewModelBase.cs (ObservableObject inheritance)
  - DEPENDENCIES: ProviderStatusCardViewModel from Task 5, IProviderStatusService
  - NAMING: ProviderStatusDashboardViewModel with RefreshAllAsync, NavigateToDashboard methods
  - INTEGRATION: Event subscription to ProviderStatusChanged with real-time UI updates

Task 7: CREATE src/TransMailPanda/TransMailPanda/Views/Controls/ProviderStatusCard.axaml
  - IMPLEMENT: Individual provider status card UserControl with modern card design
  - FOLLOW pattern: src/TransMailPanda/TransMailPanda/Views/WelcomeWizardWindow.axaml (card styling, Border layout)
  - DEPENDENCIES: ProviderStatusCardViewModel from Task 5, StatusConverters from Task 4
  - NAMING: ProviderStatusCard.axaml with corresponding .axaml.cs code-behind
  - CRITICAL: Use data binding with converters, progress indicators, conditional visibility

Task 8: CREATE src/TransMailPanda/TransMailPanda/Views/ProviderStatusDashboard.axaml
  - IMPLEMENT: Main provider status dashboard with ItemsControl and UniformGrid layout
  - FOLLOW pattern: src/TransMailPanda/TransMailPanda/Views/MainWindow.axaml (main window structure)
  - DEPENDENCIES: ProviderStatusCard from Task 7, ProviderStatusDashboardViewModel from Task 6
  - NAMING: ProviderStatusDashboard.axaml with grid layout and loading overlays
  - INTEGRATION: Real-time data binding with status updates and refresh capabilities

Task 9: MODIFY src/TransMailPanda/TransMailPanda/Services/StartupOrchestrator.cs
  - INTEGRATE: Replace TODO placeholder code with actual provider initialization
  - DEPENDENCIES: ProviderBridgeService from Task 2, existing provider interfaces
  - PATTERN: Follow existing progress reporting and timeout handling patterns
  - CRITICAL: Implement actual health checks and provider status validation

Task 10: MODIFY src/TransMailPanda/TransMailPanda/App.axaml.cs
  - INTEGRATE: Register new services in DI container following existing patterns
  - DEPENDENCIES: All services from previous tasks
  - PATTERN: Follow existing AddTransMailPandaServices extension method pattern
  - PRESERVATION: Maintain existing service registrations and configuration

Task 11: CREATE src/Tests/TransMailPanda.Tests/ViewModels/TestProviderStatusCardViewModel.cs
  - IMPLEMENT: Unit tests for provider status card ViewModel with mock provider status
  - FOLLOW pattern: Existing test patterns in Tests project (xUnit, mocking)
  - COVERAGE: UpdateFromProviderStatus method, computed properties, command execution
  - NAMING: Test_{Method}_{Scenario} naming convention

Task 12: CREATE src/Tests/TransMailPanda.Tests/Services/TestProviderBridgeService.cs
  - IMPLEMENT: Unit tests for provider bridge service with mock provider dependencies
  - FOLLOW pattern: Service testing patterns with dependency injection
  - COVERAGE: Health check methods, provider status mapping, error handling
  - MOCKING: Mock IEmailProvider, ILLMProvider, IStorageProvider implementations
```

### Implementation Patterns & Key Details

```csharp
// Provider Bridge Service Pattern - Connecting Legacy Providers to New Architecture
public class ProviderBridgeService : IProviderBridgeService
{
    private readonly IEmailProvider _emailProvider;
    private readonly ILLMProvider _llmProvider;
    private readonly IStorageProvider _storageProvider;

    // PATTERN: Health check delegation with Result<T> pattern
    public async Task<Result<ProviderStatus>> GetEmailProviderStatusAsync()
    {
        try
        {
            // CRITICAL: Actual health check call (not hardcoded)
            var isHealthy = await _emailProvider.HealthCheckAsync();
            var requiresSetup = await _emailProvider.RequiresSetupAsync();
            
            return Result.Success(new ProviderStatus
            {
                Name = "Gmail",
                IsHealthy = isHealthy,
                RequiresSetup = requiresSetup,
                Status = isHealthy ? "Connected" : requiresSetup ? "Setup Required" : "Failed",
                LastCheck = DateTime.UtcNow
            });
        }
        catch (Exception ex)
        {
            return Result.Failure<ProviderStatus>(new ProviderError($"Health check failed: {ex.Message}"));
        }
    }
}

// ViewModel Pattern with Computed Properties and Event Handling
public partial class ProviderStatusCardViewModel : ViewModelBase
{
    [ObservableProperty]
    private bool _isHealthy = false;

    [ObservableProperty] 
    private bool _requiresSetup = false;

    // CRITICAL: Computed properties require manual notification
    public string StatusIcon => IsHealthy ? "✅" : RequiresSetup ? "⚙️" : "❌";
    public string ButtonText => RequiresSetup ? "Setup" : IsHealthy ? "Reconnect" : "Configure";

    public void UpdateFromProviderStatus(ProviderStatus status)
    {
        IsHealthy = status.IsHealthy;
        RequiresSetup = status.RequiresSetup;
        
        // GOTCHA: Must manually notify computed properties
        OnPropertyChanged(nameof(StatusIcon));
        OnPropertyChanged(nameof(ButtonText));
    }

    [RelayCommand]
    private async Task SetupProviderAsync()
    {
        // PATTERN: Loading state management with try/finally
        IsLoading = true;
        try
        {
            // DELEGATE: Provider-specific setup logic
            await HandleProviderSetupFlowAsync();
        }
        finally
        {
            IsLoading = false;
        }
    }
}

// Dashboard ViewModel Pattern with Real-time Updates
public partial class ProviderStatusDashboardViewModel : ViewModelBase
{
    private readonly IProviderStatusService _providerStatusService;

    [ObservableProperty]
    private ObservableCollection<ProviderStatusCardViewModel> _providers = new();

    public ProviderStatusDashboardViewModel(IProviderStatusService providerStatusService)
    {
        _providerStatusService = providerStatusService;
        
        // PATTERN: Event subscription for real-time updates
        _providerStatusService.ProviderStatusChanged += OnProviderStatusChanged;
    }

    private async void OnProviderStatusChanged(object sender, ProviderStatusChangedEventArgs e)
    {
        // PATTERN: Find and update specific provider card
        var provider = Providers.FirstOrDefault(p => p.ProviderName == e.ProviderName);
        provider?.UpdateFromProviderStatus(e.Status);
        
        // UPDATE: Overall dashboard state
        await UpdateOverallStatusAsync();
    }
}

// Health Monitoring Service Pattern with Background Processing
public class ProviderHealthMonitorService : BackgroundService
{
    private readonly IProviderBridgeService _bridgeService;
    private readonly IProviderStatusService _statusService;
    private readonly TimeSpan _healthCheckInterval = TimeSpan.FromMinutes(1);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // PATTERN: Continuous monitoring with configurable intervals
        using var timer = new PeriodicTimer(_healthCheckInterval);
        
        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            await PerformHealthChecksAsync();
        }
    }

    private async Task PerformHealthChecksAsync()
    {
        // PATTERN: Parallel health checks with individual error handling
        var healthCheckTasks = new[]
        {
            CheckProviderHealthAsync("Gmail", _bridgeService.GetEmailProviderStatusAsync),
            CheckProviderHealthAsync("OpenAI", _bridgeService.GetLLMProviderStatusAsync),
            CheckProviderHealthAsync("SQLite", _bridgeService.GetStorageProviderStatusAsync)
        };

        await Task.WhenAll(healthCheckTasks);
    }
}
```

### Integration Points

```yaml
DEPENDENCY_INJECTION:
  - register: ProviderBridgeService as singleton in App.axaml.cs
  - register: ProviderHealthMonitorService as hosted service
  - register: ViewModels as transient for proper lifecycle management

STARTUP_ORCHESTRATION:
  - modify: StartupOrchestrator.InitializeProvidersAsync() to call actual health checks
  - integrate: Provider status validation before allowing dashboard access
  - maintain: Existing timeout and progress reporting patterns

PROVIDER_INTERFACES:
  - bridge: Legacy provider interfaces (IEmailProvider, etc.) to new IProvider<TConfig> architecture
  - preserve: Existing provider implementations without breaking changes
  - enhance: Health check methods to return actual status instead of hardcoded values

UI_NAVIGATION:
  - gate: Main dashboard access behind provider health validation
  - implement: Navigation from provider status dashboard to main dashboard
  - maintain: Existing window management patterns from App.axaml.cs
```

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run after each file creation - fix before proceeding
dotnet format src/TransMailPanda/TransMailPanda --verify-no-changes
dotnet build src/TransMailPanda/TransMailPanda                    # Check compilation
dotnet test src/Tests/TransMailPanda.Tests --logger console       # Run unit tests

# Expected: Zero compilation errors, all tests pass, no formatting issues
```

### Level 2: Unit Tests (Component Validation)

```bash
# Test ViewModels and Services individually
dotnet test src/Tests/TransMailPanda.Tests/ViewModels/ -v
dotnet test src/Tests/TransMailPanda.Tests/Services/ -v

# Test provider bridge service integration
dotnet test --filter "FullyQualifiedName~ProviderBridgeService" --logger console

# Expected: All unit tests pass with proper mocking and coverage
```

### Level 3: Integration Testing (System Validation)

```bash
# Application startup validation
dotnet run --project src/TransMailPanda/TransMailPanda &
sleep 5  # Allow startup time

# Provider status dashboard accessibility
# Manual validation: Provider status dashboard displays with all three providers
# Manual validation: Setup buttons appear for unconfigured providers
# Manual validation: Status updates reflect in real-time

# Provider health monitoring validation
# Manual validation: Health checks run every minute
# Manual validation: Provider failures trigger status updates
# Manual validation: Dashboard gate prevents main app access when providers unhealthy

# Expected: All providers display correctly, setup flows work, health monitoring active
```

### Level 4: Provider-Specific Validation

```bash
# Gmail Provider Setup Validation
# Manual test: Click "Setup" on Gmail provider card
# Expected: OAuth flow launches and completes successfully
# Expected: Provider status updates to "Healthy" after successful setup

# OpenAI Provider Setup Validation  
# Manual test: Click "Setup" on OpenAI provider card
# Expected: API key configuration dialog appears
# Expected: API key validation succeeds and provider status updates

# SQLite Provider Validation
# Manual test: Database initialization and health check
# Expected: SQLite provider always reports healthy (no setup required)

# Provider Failure Simulation
# Manual test: Revoke Gmail token or invalidate OpenAI API key
# Expected: Health monitoring detects failure within 1 minute
# Expected: Provider status updates and setup button appears
# Expected: Main dashboard access is blocked

# Expected: All provider setup flows complete successfully, failures are detected
```

## Final Validation Checklist

### Technical Validation

- [ ] All compilation successful: `dotnet build src/TransMailPanda/TransMailPanda`
- [ ] All tests pass: `dotnet test src/Tests/TransMailPanda.Tests/ -v`
- [ ] No formatting issues: `dotnet format --verify-no-changes`
- [ ] Provider bridge service connects legacy providers to new architecture
- [ ] Background health monitoring service runs continuously

### Feature Validation

- [ ] Provider status dashboard displays all three provider types (Storage, Email, LLM)
- [ ] Real-time status updates when provider health changes
- [ ] Setup buttons launch appropriate configuration flows (Gmail OAuth, OpenAI API key)
- [ ] Reconnect/reconfigure buttons appear for failed providers
- [ ] Dashboard gate system prevents main app access until all providers healthy
- [ ] Provider status cards show visual indicators (colors, icons, progress)
- [ ] Background health monitoring detects provider failures

### Provider-Specific Validation

- [ ] Gmail OAuth flow completes successfully and updates provider status
- [ ] OpenAI API key setup validates key and updates provider status  
- [ ] SQLite provider always reports healthy (no setup required)
- [ ] Provider failures trigger status updates within health check interval
- [ ] Multiple provider failures handled gracefully with individual setup flows

### Code Quality Validation

- [ ] Follows existing MVVM patterns from WelcomeWizardViewModel
- [ ] Uses CommunityToolkit.Mvvm ObservableProperty and RelayCommand attributes correctly
- [ ] Implements Result<T> pattern for all provider operations
- [ ] Uses ObservableCollection for dynamic provider lists
- [ ] Follows existing card layout patterns from WelcomeWizardWindow
- [ ] Properly disposes of event subscriptions and background services

### User Experience Validation

- [ ] Clear visual distinction between healthy, setup required, and failed providers
- [ ] Intuitive setup flows with progress indicators and error messages
- [ ] Responsive UI with loading states during health checks and setup
- [ ] Graceful error handling with user-friendly error messages
- [ ] Consistent styling with existing TransMail Panda UI patterns

---

## Anti-Patterns to Avoid

- ❌ Don't hardcode provider status - must call actual health check methods
- ❌ Don't use regular List<T> for provider collections - ObservableCollection required for UI updates  
- ❌ Don't forget OnPropertyChanged for computed properties - they won't update automatically
- ❌ Don't throw exceptions from provider operations - use Result<T> pattern consistently
- ❌ Don't skip background service registration - health monitoring won't work without IHostedService
- ❌ Don't bypass the dashboard gate - main app must be inaccessible when providers unhealthy
- ❌ Don't ignore provider bridge service - it's critical for integrating legacy providers