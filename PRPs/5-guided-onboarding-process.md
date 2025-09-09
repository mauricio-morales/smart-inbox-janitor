name: "Guided Onboarding Process for TrashMail Panda"
description: |

---

## Goal

**Feature Goal**: Implement a comprehensive guided onboarding process that helps users set up Gmail and LLM provider connections through a non-wizard, card-based dashboard approach that allows independent provider configuration and handles partial setup states gracefully.

**Deliverable**: A complete onboarding system consisting of:
- Enhanced welcome screen with clear setup expectations
- Provider status dashboard showing individual provider health
- Individual provider setup flows (Gmail OAuth, OpenAI API key)
- Graceful handling of partial functionality scenarios
- Integration with existing startup orchestration

**Success Definition**: Users can complete initial setup through guided flows, understand which providers need configuration, set them up in any order, and use the application with available providers while being guided to complete missing setups.

## User Persona

**Target User**: End users setting up TrashMail Panda for the first time or returning users whose providers have failed/expired

**Use Case**: Initial application setup requiring Gmail OAuth consent and LLM provider API key configuration

**User Journey**: 
1. Launch application → see welcome screen explaining setup requirements
2. View provider status dashboard showing which providers need setup
3. Complete Gmail OAuth flow (independent of other providers)
4. Enter and validate OpenAI API key (independent of Gmail)
5. Use application with available providers, guided to complete missing setups
6. Return to setup any failed providers without repeating working configurations

**Pain Points Addressed**: 
- Confusion about what needs to be set up and why
- Forced sequential setup that breaks if one provider fails
- Having to reconfigure working providers when others fail
- Lack of clear guidance about partial functionality availability

## Why

- **User Experience**: Current wizard approach forces sequential setup and doesn't handle partial failures gracefully
- **Provider Independence**: Users should be able to set up providers in any order
- **Failure Recovery**: When providers fail after successful setup, users should only need to fix the failing provider
- **Clear Communication**: Users need to understand setup requirements and available functionality states
- **Integration**: Builds on existing provider architecture and startup orchestration without disruption

## What

A comprehensive onboarding system that replaces the current wizard-based approach with:

### Core Components:
1. **Enhanced Welcome Screen**: Explains what TrashMail Panda does and what setup is required
2. **Provider Status Dashboard**: Visual cards showing each provider's status with individual setup actions
3. **Independent Provider Setup**: Individual setup flows that can be completed in any order
4. **Partial Functionality Support**: Allow app usage with available providers
5. **Progressive Enhancement**: Guide users to complete missing providers contextually
6. **Persistent State Management**: Remember setup progress across sessions

### Success Criteria

- [ ] Welcome screen clearly explains setup requirements and expectations
- [ ] Provider status dashboard shows real-time status of all providers
- [ ] Gmail OAuth setup works independently and persists credentials securely
- [ ] OpenAI API key setup validates and stores credentials securely
- [ ] Users can access main application with partial provider setup
- [ ] Failed providers can be reset/reconfigured without affecting working ones
- [ ] Setup state persists between application sessions
- [ ] Error messages are clear and actionable for each provider type
- [ ] Integration with existing startup orchestration and security systems

## All Needed Context

### Context Completeness Check

_This PRP provides comprehensive context for implementing guided onboarding by integrating with existing provider architecture, security systems, MVVM patterns, and UI components without requiring external knowledge of the codebase._

### Documentation & References

```yaml
# MUST READ - Include these in your context window
- url: https://www.patternfly.org/patterns/dashboard/design-guidelines/
  why: Dashboard-first setup approach with status cards and individual actions
  critical: Card layout patterns for provider status display with action buttons

- url: https://cloudscape.design/patterns/general/service-dashboard/configurable-dashboard/
  why: User-controlled dashboard design for provider management
  critical: Independent service management without sequential dependencies

- url: https://docs.avaloniaui.net/docs/basics/mvvm
  why: MVVM patterns for ViewModels and data binding in Avalonia
  critical: ObservableProperty and RelayCommand usage patterns

- url: https://platform.openai.com/docs/quickstart/developer-quickstart
  why: OpenAI API key validation and usage patterns
  critical: Proper API key format validation and testing approaches

- file: src/TrashMailPanda/TrashMailPanda/ViewModels/WelcomeWizardViewModel.cs
  why: Existing onboarding ViewModel with established patterns to follow
  pattern: MVVM structure, ObservableProperty usage, step management, command patterns
  gotcha: Current wizard approach needs refactoring to card-based approach

- file: src/TrashMailPanda/TrashMailPanda/ViewModels/ProviderStatusDashboardViewModel.cs
  why: Existing provider status management architecture to integrate with
  pattern: Provider card management, status monitoring, event-driven communication
  gotcha: Real-time status updates through ProviderStatusChanged events

- file: src/TrashMailPanda/TrashMailPanda/ViewModels/GmailSetupViewModel.cs
  why: Existing Gmail OAuth setup patterns and security integration
  pattern: SecureStorageManager integration, OAuth credential handling, validation patterns
  gotcha: Two-tier credential system (client credentials vs session tokens)

- file: src/TrashMailPanda/TrashMailPanda/ViewModels/OpenAISetupViewModel.cs
  why: API key setup and validation patterns
  pattern: API key masking, secure storage, connection testing
  gotcha: API key format validation and masking for security display

- file: src/TrashMailPanda/TrashMailPanda/Services/StartupOrchestrator.cs
  why: Existing startup sequence that onboarding must integrate with
  pattern: Provider initialization, health checks, progress reporting
  gotcha: Non-blocking startup allows partial provider setup

- file: src/Shared/TrashMailPanda.Shared/Security/SecureStorageManager.cs
  why: Security patterns for credential storage and retrieval
  pattern: OS keychain integration, Result<T> pattern, zero-password UX
  gotcha: Platform-specific storage with automatic encryption

- file: src/TrashMailPanda/TrashMailPanda/Theming/ProfessionalColors.cs
  why: Centralized color system for consistent UI theming
  pattern: Semantic color mapping for status indicators
  gotcha: Use semantic color helpers, never hardcode colors

- docfile: PRPs/ai_docs/provider_dashboard_avalonia_patterns.md
  why: Comprehensive Avalonia UI patterns for dashboard components
  section: Provider status card implementations and data binding patterns
```

### Current Codebase tree (run `tree` in the root of the project) to get an overview of the codebase

```bash
/Users/mmorales/Dev/trashmail-panda
├── CLAUDE.md
├── src
│   ├── Providers
│   │   ├── Email              # Gmail provider implementation
│   │   ├── LLM                # OpenAI provider implementation  
│   │   └── Storage            # SQLite provider implementation
│   ├── Shared
│   │   └── TrashMailPanda.Shared
│   │       ├── Base           # IProvider<T> architecture
│   │       ├── Models         # Provider configurations and DTOs
│   │       ├── Security       # SecureStorageManager, encryption
│   │       └── Extensions     # Utility extensions
│   ├── Tests
│   │   └── TrashMailPanda.Tests    # xUnit test projects
│   └── TrashMailPanda
│       └── TrashMailPanda
│           ├── Views          # Avalonia XAML views
│           ├── ViewModels     # MVVM view models
│           ├── Services       # Application services
│           ├── Models         # UI-specific models
│           └── Theming        # Professional color system
├── PRPs                       # Product Requirement Prompts
│   ├── ai_docs               # Curated documentation
│   └── templates             # PRP templates
└── TrashMailPanda.sln        # Solution file
```

### Desired Codebase tree with files to be added and responsibility of file

```bash
src/TrashMailPanda/TrashMailPanda/
├── ViewModels/
│   ├── OnboardingWelcomeViewModel.cs          # Welcome screen with setup expectations
│   ├── OnboardingDashboardViewModel.cs       # Provider status dashboard for onboarding  
│   └── OnboardingCoordinatorViewModel.cs     # Coordinates onboarding flow and completion
├── Views/
│   ├── OnboardingWelcomeView.axaml           # Welcome screen UI
│   ├── OnboardingWelcomeView.axaml.cs        # Welcome screen code-behind
│   ├── OnboardingDashboardView.axaml        # Provider dashboard UI
│   ├── OnboardingDashboardView.axaml.cs     # Provider dashboard code-behind
│   └── Controls/
│       ├── OnboardingProviderCard.axaml     # Individual provider setup card
│       └── OnboardingProviderCard.axaml.cs  # Provider card code-behind
├── Services/
│   └── IOnboardingService.cs                # Onboarding state management interface
│   └── OnboardingService.cs                 # Onboarding state management service
└── Models/
    ├── OnboardingState.cs                   # Onboarding progress tracking
    └── OnboardingProviderInfo.cs           # Provider info for onboarding UI
```

### Known Gotchas of our codebase & Library Quirks

```csharp
// CRITICAL: TrashMail Panda uses Result<T> pattern instead of exceptions
// All async operations must return Result<T> or Result<T, TError>
var result = await provider.InitializeAsync(config);
if (result.IsSuccess) { /* success */ } else { /* handle error */ }

// CRITICAL: CommunityToolkit.Mvvm source generators require partial classes
public partial class OnboardingWelcomeViewModel : ViewModelBase
{
    [ObservableProperty]  // Generates public property with change notification
    private string _statusMessage = string.Empty;
    
    [RelayCommand]  // Generates ICommand property
    private async Task ProceedAsync() { /* implementation */ }
}

// CRITICAL: Avalonia XAML uses specific syntax different from WPF
<Grid ColumnDefinitions="*,Auto,*" RowDefinitions="Auto,*,Auto">
  <TextBlock Grid.Column="1" Grid.Row="0" Text="{Binding Title}" />
</Grid>

// CRITICAL: Professional color system - never hardcode colors
var statusColor = ProfessionalColors.GetStatusColor("Authentication Required");
// NOT: var color = Color.Parse("#E57373");

// CRITICAL: SecureStorageManager uses OS keychain, no user passwords required
await _secureStorage.StoreCredentialAsync(ProviderCredentialTypes.OpenAIApiKey, apiKey);

// CRITICAL: Provider architecture requires type-safe configuration
public class OnboardingServiceConfig : BaseProviderConfig
{
    [Required] public bool ShowWelcomeScreen { get; set; } = true;
    [Range(1, 60)] public int SetupTimeoutMinutes { get; set; } = 10;
}

// CRITICAL: Startup orchestration allows partial provider setup
// Don't fail if providers are unhealthy - guide user through setup instead
```

## Implementation Blueprint

### Data models and structure

Create the core data models to ensure type safety and consistency with existing provider architecture.

```csharp
// Models for onboarding state management
public class OnboardingState
{
    public bool IsWelcomeComplete { get; set; }
    public Dictionary<string, bool> ProviderSetupComplete { get; set; } = new();
    public DateTime LastUpdated { get; set; }
    public bool CanAccessMainApplication { get; set; }
}

public class OnboardingProviderInfo
{
    public string ProviderName { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public ProviderStatus Status { get; set; } = new();
    public bool IsRequired { get; set; }
    public string SetupInstructions { get; set; } = string.Empty;
}

// Configuration for onboarding service
public class OnboardingServiceConfig : BaseProviderConfig
{
    [Required] public bool ShowWelcomeScreen { get; set; } = true;
    [Range(1, 60)] public int SetupTimeoutMinutes { get; set; } = 10;
    public List<string> RequiredProviders { get; set; } = new() { "Gmail", "OpenAI" };
}
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: CREATE src/TrashMailPanda/TrashMailPanda/Models/OnboardingState.cs
  - IMPLEMENT: OnboardingState, OnboardingProviderInfo data models
  - FOLLOW pattern: src/TrashMailPanda/TrashMailPanda/Models/ProviderDisplayInfo.cs (model structure, validation)
  - NAMING: PascalCase for classes, properties following existing model patterns
  - PLACEMENT: Models directory for UI-specific data models

Task 2: CREATE src/TrashMailPanda/TrashMailPanda/Services/IOnboardingService.cs & OnboardingService.cs  
  - IMPLEMENT: IOnboardingService interface and OnboardingService implementation
  - FOLLOW pattern: src/TrashMailPanda/TrashMailPanda/Services/ProviderStatusService.cs (service structure, event handling)
  - NAMING: Service naming convention with interface, dependency injection registration
  - DEPENDENCIES: IProviderBridgeService, ISecureStorageManager from Task 1 models
  - PLACEMENT: Services directory with other application services

Task 3: CREATE src/TrashMailPanda/TrashMailPanda/ViewModels/OnboardingWelcomeViewModel.cs
  - IMPLEMENT: Welcome screen ViewModel with setup explanation and navigation
  - FOLLOW pattern: src/TrashMailPanda/TrashMailPanda/ViewModels/WelcomeWizardViewModel.cs (MVVM structure, ObservableProperty usage)  
  - NAMING: OnboardingWelcomeViewModel class, ProceedToSetup command, observable properties
  - DEPENDENCIES: Import OnboardingService from Task 2
  - PLACEMENT: ViewModels directory following existing ViewModel organization

Task 4: CREATE src/TrashMailPanda/TrashMailPanda/Views/OnboardingWelcomeView.axaml & .axaml.cs
  - IMPLEMENT: Welcome screen UI with clear setup expectations and provider overview
  - FOLLOW pattern: src/TrashMailPanda/TrashMailPanda/Views/WelcomeWizardWindow.axaml (Avalonia XAML structure, data binding)
  - NAMING: OnboardingWelcomeView following Avalonia view naming conventions
  - DEPENDENCIES: Bind to OnboardingWelcomeViewModel from Task 3
  - PLACEMENT: Views directory with existing view components

Task 5: CREATE src/TrashMailPanda/TrashMailPanda/ViewModels/OnboardingDashboardViewModel.cs
  - IMPLEMENT: Provider status dashboard ViewModel coordinating provider cards
  - FOLLOW pattern: src/TrashMailPanda/TrashMailPanda/ViewModels/ProviderStatusDashboardViewModel.cs (card management, event handling)
  - NAMING: OnboardingDashboardViewModel, provider card collection, setup event handlers
  - DEPENDENCIES: Use OnboardingService, ProviderStatusService from previous tasks
  - PLACEMENT: ViewModels directory with existing dashboard ViewModels

Task 6: CREATE src/TrashMailPanda/TrashMailPanda/Views/Controls/OnboardingProviderCard.axaml & .axaml.cs
  - IMPLEMENT: Individual provider status card with setup actions
  - FOLLOW pattern: src/TrashMailPanda/TrashMailPanda/Views/Controls/ProviderStatusCard.axaml (card structure, status indicators)
  - NAMING: OnboardingProviderCard control following existing control patterns
  - DEPENDENCIES: Use ProfessionalColors for status theming
  - PLACEMENT: Views/Controls directory with other reusable controls

Task 7: CREATE src/TrashMailPanda/TrashMailPanda/Views/OnboardingDashboardView.axaml & .axaml.cs
  - IMPLEMENT: Dashboard view containing provider cards and overall status
  - FOLLOW pattern: src/TrashMailPanda/TrashMailPanda/Views/ProviderStatusDashboard.axaml (dashboard layout, card collections)
  - NAMING: OnboardingDashboardView following existing view naming
  - DEPENDENCIES: Use OnboardingProviderCard from Task 6, bind to OnboardingDashboardViewModel
  - PLACEMENT: Views directory with other main views

Task 8: CREATE src/TrashMailPanda/TrashMailPanda/ViewModels/OnboardingCoordinatorViewModel.cs
  - IMPLEMENT: Main coordinator managing onboarding flow and transitions
  - FOLLOW pattern: src/TrashMailPanda/TrashMailPanda/ViewModels/MainWindowViewModel.cs (main coordination, view management)
  - NAMING: OnboardingCoordinatorViewModel, view transition commands, completion handlers
  - DEPENDENCIES: Coordinate OnboardingWelcomeViewModel, OnboardingDashboardViewModel from previous tasks  
  - PLACEMENT: ViewModels directory as main coordinator ViewModel

Task 9: MODIFY src/TrashMailPanda/TrashMailPanda/Services/StartupOrchestrator.cs
  - INTEGRATE: Add onboarding completion detection and flow coordination
  - FIND pattern: existing startup sequence completion handling
  - ADD: OnboardingService integration, completion state checking
  - PRESERVE: Existing provider initialization and health checking sequence

Task 10: MODIFY src/TrashMailPanda/TrashMailPanda/App.axaml.cs
  - INTEGRATE: Register onboarding services and ViewModels with dependency injection
  - FIND pattern: existing service registration in startup configuration
  - ADD: OnboardingService, onboarding ViewModels registration
  - PRESERVE: Existing service registrations and application configuration

Task 11: CREATE src/Tests/TrashMailPanda.Tests/Services/OnboardingServiceTests.cs
  - IMPLEMENT: Unit tests for OnboardingService functionality
  - FOLLOW pattern: src/Tests/TrashMailPanda.Tests/Services/StartupOrchestratorTests.cs (service testing, mock usage)
  - NAMING: test_{method}_{scenario} function naming convention
  - COVERAGE: All public methods with positive and negative test cases
  - PLACEMENT: Tests alongside the code they test

Task 12: CREATE src/Tests/TrashMailPanda.Tests/ViewModels/OnboardingViewModelTests.cs  
  - IMPLEMENT: Unit tests for all onboarding ViewModels
  - FOLLOW pattern: src/Tests/TrashMailPanda.Tests/ViewModels/ProviderStatusDashboardViewModelTests.cs (ViewModel testing patterns)
  - MOCK: Service dependencies using existing test patterns
  - COVERAGE: Commands, observable properties, event handling
  - PLACEMENT: ViewModel tests in tests directory structure
```

### Implementation Patterns & Key Details

```csharp
// OnboardingService pattern - integrates with existing provider architecture
public class OnboardingService : IOnboardingService
{
    private readonly IProviderBridgeService _providerBridge;
    private readonly ISecureStorageManager _secureStorage;
    
    // PATTERN: Result<T> for all operations
    public async Task<Result<OnboardingState>> GetOnboardingStateAsync()
    {
        // PATTERN: Check provider status through bridge service
        var providerStatuses = await _providerBridge.GetAllProviderStatusAsync();
        
        // PATTERN: Determine completion based on provider health and setup requirements
        var state = new OnboardingState
        {
            CanAccessMainApplication = providerStatuses.Values.Any(p => p.IsHealthy),
            ProviderSetupComplete = providerStatuses.ToDictionary(
                kvp => kvp.Key, 
                kvp => kvp.Value.IsHealthy && !kvp.Value.RequiresSetup)
        };
        
        return Result.Success(state);
    }
    
    // PATTERN: Event-driven updates for real-time UI sync
    public event EventHandler<OnboardingState>? OnboardingStateChanged;
}

// OnboardingWelcomeViewModel pattern - follows existing MVVM conventions
public partial class OnboardingWelcomeViewModel : ViewModelBase
{
    private readonly IOnboardingService _onboardingService;
    
    [ObservableProperty]
    private string _welcomeTitle = "Welcome to TrashMail Panda";
    
    [ObservableProperty] 
    private bool _canProceedToSetup = true;
    
    // PATTERN: Clear messaging about setup requirements
    public string SetupExplanation => 
        "TrashMail Panda helps you clean your Gmail inbox using AI. " +
        "You'll need to connect your Gmail account and configure an AI provider. " +
        "You can set these up in any order and start using the app as soon as providers are available.";
    
    [RelayCommand]
    private async Task ProceedToSetupAsync()
    {
        // PATTERN: Event-driven navigation
        NavigationRequested?.Invoke(this, "Dashboard");
    }
    
    // PATTERN: Event communication with parent coordinators
    public event EventHandler<string>? NavigationRequested;
}

// OnboardingProviderCard pattern - integrates with professional theming
// CRITICAL: Use ProfessionalColors for status theming, never hardcode colors
public partial class OnboardingProviderCard : UserControl
{
    // PATTERN: Status-driven UI with semantic colors
    private void UpdateStatusAppearance(ProviderStatus status)
    {
        var statusColor = ProfessionalColors.GetStatusColor(status.Status);
        StatusIndicator.Background = new SolidColorBrush(statusColor);
        
        // PATTERN: Action button text based on status
        ActionButton.Content = status.RequiresSetup ? "Set Up" : 
                              !status.IsHealthy ? "Fix Issues" : 
                              "Configure";
    }
}

// PATTERN: Coordinator ViewModel managing view transitions
public partial class OnboardingCoordinatorViewModel : ViewModelBase
{
    [ObservableProperty]
    private ViewModelBase? _currentView;
    
    // PATTERN: Navigation state management
    private void NavigateToView(string viewName)
    {
        CurrentView = viewName switch
        {
            "Welcome" => _welcomeViewModel,
            "Dashboard" => _dashboardViewModel,
            _ => _welcomeViewModel
        };
    }
}
```

### Integration Points

```yaml
STARTUP_ORCHESTRATION:
  - modify: src/TrashMailPanda/TrashMailPanda/Services/StartupOrchestrator.cs
  - pattern: "Check onboarding completion state after health checks"
  - integration: "Add onboarding service to determine if setup UI needed"

DEPENDENCY_INJECTION:
  - modify: src/TrashMailPanda/TrashMailPanda/App.axaml.cs  
  - pattern: "services.AddTransient<OnboardingService>()"
  - integration: "Register all onboarding services and ViewModels"

MAIN_WINDOW:
  - modify: src/TrashMailPanda/TrashMailPanda/ViewModels/MainWindowViewModel.cs
  - pattern: "Add onboarding flow detection and coordination"
  - integration: "Show onboarding UI when required, main app when ready"

PROVIDER_BRIDGE:
  - use: src/TrashMailPanda/TrashMailPanda/Services/ProviderBridgeService.cs
  - pattern: "GetAllProviderStatusAsync() for real-time status updates"
  - integration: "Subscribe to provider status changes for live onboarding updates"

SECURE_STORAGE:
  - use: src/Shared/TrashMailPanda.Shared/Security/SecureStorageManager.cs
  - pattern: "StoreCredentialAsync(), RetrieveCredentialAsync() for onboarding state persistence"
  - integration: "Store onboarding completion flags with other app preferences"
```

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run after each file creation - fix before proceeding
dotnet build --verbosity minimal                    # Check compilation
dotnet format --verify-no-changes                  # Verify code formatting
dotnet format                                       # Auto-format if needed

# Expected: Zero compilation errors, proper formatting applied
```

### Level 2: Unit Tests (Component Validation)

```bash
# Test onboarding services
dotnet test src/Tests/TrashMailPanda.Tests/Services/OnboardingServiceTests.cs -v minimal

# Test onboarding ViewModels
dotnet test src/Tests/TrashMailPanda.Tests/ViewModels/OnboardingViewModelTests.cs -v minimal

# Full test suite for affected components
dotnet test --filter "Category=Unit&FullyQualifiedName~Onboarding" -v minimal

# Expected: All tests pass, proper mocking of dependencies
```

### Level 3: Integration Testing (System Validation)

```bash
# Application startup with onboarding flow
dotnet run --project src/TrashMailPanda/TrashMailPanda

# Verify provider status integration
# Manual testing: Launch app, verify welcome screen shows, check provider cards display correctly
# Manual testing: Complete Gmail setup, verify status updates in real-time
# Manual testing: Complete OpenAI setup, verify status updates and main app access

# Database integration for onboarding state persistence
# Verify onboarding completion state persists across app restarts

# Expected: Smooth onboarding flow, real-time status updates, persistent state
```

### Level 4: Creative & Domain-Specific Validation

```bash
# User Experience Validation
# Test partial setup scenarios:
# 1. Gmail working, OpenAI failed - should allow partial functionality
# 2. OpenAI working, Gmail failed - should allow API testing but not email processing
# 3. All providers healthy - should allow full main application access

# Security Validation
# Verify OAuth flows work correctly through onboarding
# Verify API keys are masked in UI and stored securely
# Verify no credentials are logged or exposed in debug output

# UI/UX Validation  
# Test responsive design on different window sizes
# Verify professional theming is applied consistently
# Verify accessibility features work (keyboard navigation, screen reader support)

# Error Handling Validation
# Test network failures during provider setup
# Test invalid API keys and OAuth failures
# Verify error messages are clear and actionable

# Expected: Excellent user experience, secure credential handling, graceful error handling
```

## Final Validation Checklist

### Technical Validation

- [ ] All 4 validation levels completed successfully
- [ ] All tests pass: `dotnet test --filter "FullyQualifiedName~Onboarding" -v minimal`
- [ ] No compilation errors: `dotnet build --verbosity minimal`
- [ ] Code formatting verified: `dotnet format --verify-no-changes`
- [ ] Professional theming applied consistently using ProfessionalColors
- [ ] Result<T> pattern used throughout (no exception throwing)

### Feature Validation

- [ ] Welcome screen clearly explains setup requirements and expectations
- [ ] Provider status dashboard shows real-time provider health status
- [ ] Individual provider setup works independently (Gmail OAuth, OpenAI API key)
- [ ] Partial functionality allows app usage with available providers
- [ ] Failed providers can be reconfigured without affecting working ones
- [ ] Setup state persists across application sessions
- [ ] Integration with existing startup orchestration works seamlessly
- [ ] Security integration works (SecureStorageManager, credential masking)

### Code Quality Validation

- [ ] Follows existing MVVM patterns (ObservableProperty, RelayCommand, ViewModelBase)
- [ ] Uses existing service patterns (dependency injection, Result<T>, event-driven)
- [ ] Professional color system integration (no hardcoded colors)
- [ ] Consistent with existing UI patterns and Avalonia XAML conventions
- [ ] Proper error handling and logging throughout
- [ ] Thread-safe operations where required

### User Experience Validation

- [ ] Clear messaging about setup requirements and current status
- [ ] Non-blocking setup allowing users to complete in any order
- [ ] Graceful handling of partial setup scenarios
- [ ] Intuitive navigation between onboarding screens
- [ ] Professional visual design consistent with application theme
- [ ] Accessible keyboard navigation and screen reader support

---

## Anti-Patterns to Avoid

- ❌ Don't create sequential wizard flows - use independent provider setup
- ❌ Don't block application usage when some providers are available
- ❌ Don't force users to reconfigure working providers when others fail
- ❌ Don't hardcode colors - use ProfessionalColors semantic system
- ❌ Don't throw exceptions - use Result<T> pattern consistently
- ❌ Don't ignore existing provider architecture - integrate with bridge services
- ❌ Don't skip security integration - use SecureStorageManager for credentials
- ❌ Don't bypass startup orchestration - integrate with existing flow