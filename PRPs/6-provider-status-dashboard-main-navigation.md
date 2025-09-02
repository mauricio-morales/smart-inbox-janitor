# Product Requirement Prompt (PRP): Provider Status Dashboard with Main Application Navigation

## Problem Statement & Goals

**Primary Goal**: Implement a central provider status dashboard that acts as the primary view when the application starts, serving as both a health monitoring center and a navigation gateway to the main email processing dashboard. The dashboard should provide real-time provider status monitoring, guided setup flows, and seamless transition to the main application when all providers are healthy.

**Strategic Context**: The TrashMail Panda application currently has a basic MainWindow with a simple greeting and separate provider status components that aren't integrated into a coherent navigation flow. Users need a comprehensive status dashboard that can guide them through provider setup and provide ongoing health monitoring while serving as the main entry point for application functionality.

**User Journey Target**:
1. Application starts → Provider Status Dashboard (primary view)
2. Dashboard shows provider health status and guides setup if needed
3. Once all providers are healthy → User can navigate to Main Email Dashboard
4. Dashboard remains accessible for ongoing provider management

## Context & Current Architecture Analysis

### Current Application Structure (from analysis)

**Application Startup Flow**:
- `Program.cs` → `App.axaml.cs` with dependency injection setup
- App builds IHost with Microsoft.Extensions.Hosting
- ServiceCollectionExtensions configures all services: providers, ViewModels, application services
- StartupHostedService runs StartupOrchestrator for provider initialization
- MainWindow loads with MainWindowViewModel (currently just shows "Welcome to Avalonia!")

**Existing Provider Architecture**:
- **Provider Health System**: Comprehensive health monitoring via ProviderBridgeService, ProviderStatusService, and ProviderHealthMonitorService
- **Provider Types**: Gmail (IEmailProvider), OpenAI (ILLMProvider), SQLite (IStorageProvider)
- **Status Management**: ProviderStatus record with IsHealthy, RequiresSetup, Status fields
- **Bridge Service**: Handles provider display info, credential separation, and connectivity testing

**Current UI Components**:
- **ProviderStatusDashboard**: Complete UserControl with provider cards grid
- **ProviderStatusCard**: Individual provider status display with setup actions
- **WelcomeWizardWindow**: Separate window for guided provider setup
- **ViewModels**: Comprehensive MVVM implementation with CommunityToolkit.Mvvm

### Provider Status System (from codebase analysis)

**Provider Health Monitoring**:
- **Background Monitoring**: ProviderHealthMonitorService runs continuous health checks
- **Real-time Events**: ProviderStatusService fires events on status changes
- **Comprehensive Status**: Each provider reports IsHealthy, IsInitialized, RequiresSetup
- **Error Handling**: Result<T> pattern throughout, no exceptions thrown

**Provider Display Architecture**:
- **ProviderDisplayInfo**: Icon, complexity, setup time, prerequisites
- **Setup States**: OAuth setup required, API key required, authentication required, connected
- **Action Buttons**: Dynamic text based on provider status (Setup OAuth, Enter API Key, Reconnect, etc.)

## Implementation Strategy & Technical Approach

### Core Navigation Architecture

**Primary View Strategy**: Replace the current MainWindow content with ProviderStatusDashboard as the default view, with conditional navigation to a Main Email Dashboard when all providers are healthy.

**Navigation Pattern**: 
```csharp
MainWindow Content = ProviderStatusDashboard (default)
                   ↓ (when CanAccessMainDashboard = true)
MainWindow Content = MainEmailDashboard
                   ↑ (user can return to provider status)
```

### Key Implementation Components

**1. MainWindow Refactoring**:
- Replace simple greeting with ContentControl bound to current view
- MainWindowViewModel manages navigation state between dashboard views
- Navigation commands handled through ViewModel

**2. Navigation ViewModel Structure**:
```csharp
public class MainWindowViewModel : ViewModelBase
{
    [ObservableProperty] private ViewModelBase _currentView;
    [ObservableProperty] private bool _canAccessMainDashboard;
    
    // Navigation commands
    [RelayCommand] private Task ShowProviderDashboardAsync();
    [RelayCommand] private Task ShowMainDashboardAsync();
}
```

**3. Provider Status Integration**:
- ProviderStatusDashboardViewModel already has CanAccessMainDashboard property
- Wire dashboard ViewModel events to MainWindow navigation
- Maintain real-time updates from ProviderHealthMonitorService

**4. Main Email Dashboard Creation**:
- Create new EmailDashboardViewModel for main application functionality
- Create EmailDashboard UserControl for email processing interface
- Implement return navigation to provider status dashboard

### Dashboard UI Enhancement

**Status Dashboard Improvements** (building on existing ProviderStatusDashboard):
- **Header Section**: Already implemented with app icon, overall status, and action buttons
- **Provider Cards Grid**: Already implemented with comprehensive status cards
- **Navigation Actions**: "Open Dashboard" button when CanAccessMainDashboard is true
- **Real-time Updates**: Already implemented via ProviderStatusService events

**Provider Card Features** (existing implementation):
- **Dynamic Status Display**: Weather-like status indicators (✅ Connected, ⚙️ Setup Required, ❌ Error)
- **Action-Oriented Buttons**: Context-aware actions (Setup OAuth, Enter API Key, Reconnect)
- **Setup Information**: Complexity indicators, time estimates, prerequisites
- **Loading States**: Progress indicators during setup operations

### Setup Flow Integration

**Guided Setup Approach**:
- Use existing WelcomeWizardViewModel but integrate as embedded UserControl rather than separate window
- Implement setup dialog overlay within main window
- Provider cards trigger specific setup flows based on provider type

**Setup State Management**:
- Leverage existing ProviderSetupState system
- Real-time updates during setup via event system
- Seamless return to dashboard after successful setup

## Validation Gates & Success Criteria

**Technical Validation**:
1. **Navigation Flow**: Smooth transition between provider dashboard and main dashboard
2. **Real-time Updates**: Provider status changes reflect immediately in UI
3. **Setup Integration**: Provider setup flows complete successfully without separate windows
4. **Health Monitoring**: Background health monitoring continues without interrupting user workflows

**User Experience Validation**:
1. **Clear Status Communication**: Users immediately understand what needs setup
2. **Guided Actions**: Setup buttons clearly indicate next steps
3. **Progress Visibility**: Users can see setup progress and completion
4. **Return Navigation**: Users can return to provider status from main dashboard

**Performance Validation**:
1. **Startup Performance**: Dashboard loads within 2 seconds
2. **Real-time Responsiveness**: Status updates appear within 1 second
3. **Memory Efficiency**: No memory leaks during navigation transitions
4. **Background Processing**: Health monitoring doesn't impact UI responsiveness

## File Structure & Code Organization

### Files to Modify
```
src/TrashMailPanda/TrashMailPanda/
├── Views/
│   ├── MainWindow.axaml                    # Replace content with ContentControl
│   ├── MainWindow.axaml.cs                 # Update constructor for navigation ViewModel
│   └── EmailDashboard.axaml                # NEW: Main email processing view
├── ViewModels/
│   ├── MainWindowViewModel.cs              # Replace with navigation ViewModel
│   └── EmailDashboardViewModel.cs          # NEW: Main application ViewModel
└── Services/
    └── INavigationService.cs               # NEW: Optional navigation service interface
```

### Key Code Changes

**MainWindow.axaml** (Navigation Container):
```xml
<Window xmlns="https://github.com/avaloniaui">
  <Grid>
    <!-- Navigation Header -->
    <Grid Grid.Row="0" Background="#2E7D32" Height="48">
      <!-- App title and navigation buttons -->
    </Grid>
    
    <!-- Main Content Area -->
    <ContentControl Grid.Row="1" Content="{Binding CurrentView}"/>
    
    <!-- Status Bar -->
    <Border Grid.Row="2" Background="#F5F5F5">
      <!-- Connection status and quick actions -->
    </Border>
  </Grid>
</Window>
```

**MainWindowViewModel.cs** (Navigation Logic):
```csharp
public partial class MainWindowViewModel : ViewModelBase
{
    private readonly ProviderStatusDashboardViewModel _dashboardViewModel;
    private readonly EmailDashboardViewModel _emailDashboardViewModel;

    [ObservableProperty] private ViewModelBase _currentView;
    [ObservableProperty] private bool _canAccessMainDashboard;

    public MainWindowViewModel(
        ProviderStatusDashboardViewModel dashboardViewModel,
        EmailDashboardViewModel emailDashboardViewModel)
    {
        _dashboardViewModel = dashboardViewModel;
        _emailDashboardViewModel = emailDashboardViewModel;
        
        // Subscribe to dashboard events
        _dashboardViewModel.DashboardAccessRequested += OnDashboardAccessRequested;
        
        // Start with provider dashboard
        CurrentView = _dashboardViewModel;
    }

    [RelayCommand]
    private async Task ShowProviderDashboardAsync()
    {
        CurrentView = _dashboardViewModel;
        await _dashboardViewModel.RefreshAllProvidersCommand.ExecuteAsync(null);
    }

    [RelayCommand] 
    private async Task ShowMainDashboardAsync()
    {
        if (!CanAccessMainDashboard) return;
        
        CurrentView = _emailDashboardViewModel;
        await _emailDashboardViewModel.InitializeAsync();
    }
}
```

### Integration with Existing Services

**Service Registration** (ServiceCollectionExtensions.cs):
```csharp
// Add new ViewModels
services.AddTransient<EmailDashboardViewModel>();

// MainWindowViewModel already registered but needs update for navigation
services.AddTransient<MainWindowViewModel>(provider => new MainWindowViewModel(
    provider.GetRequiredService<ProviderStatusDashboardViewModel>(),
    provider.GetRequiredService<EmailDashboardViewModel>()
));
```

### Real-time Integration Points

**Provider Status Events**: 
- ProviderStatusService.ProviderStatusChanged → Update CanAccessMainDashboard
- ProviderHealthMonitorService continues background monitoring
- Dashboard ViewModel handles all status updates automatically

**Navigation Events**:
- Dashboard.DashboardAccessRequested → Navigate to main dashboard
- Provider setup completion → Refresh provider status → Check navigation availability

## Dependencies & Prerequisites

### Required NuGet Packages (Already Available)
- CommunityToolkit.Mvvm (MVVM framework)
- Microsoft.Extensions.Hosting (DI and services)
- Microsoft.Extensions.Logging (logging framework)
- Avalonia.UI 11 (UI framework)

### Existing Architecture Dependencies
- All provider services (IProviderBridgeService, IProviderStatusService)
- Security services (ISecureStorageManager, ICredentialEncryption)
- ProviderStatus and ProviderDisplayInfo models
- Existing ViewModel and View infrastructure

### No Additional Dependencies Required
- No new external libraries needed
- No database schema changes required
- No new configuration requirements

## Risk Mitigation & Alternatives

### Technical Risks
1. **Navigation Complexity**: Risk of complex navigation state management
   - *Mitigation*: Keep navigation simple with clear state boundaries
   - *Alternative*: Use formal navigation service/router if needed

2. **Real-time Update Performance**: Risk of UI performance issues with frequent updates
   - *Mitigation*: Existing implementation already handles this efficiently
   - *Alternative*: Implement update throttling if necessary

3. **Provider Setup Integration**: Risk of complex setup flow management
   - *Mitigation*: Leverage existing WelcomeWizardViewModel patterns
   - *Alternative*: Keep separate setup windows if integration proves difficult

### User Experience Risks
1. **Navigation Confusion**: Users might not understand dashboard vs main app distinction
   - *Mitigation*: Clear visual hierarchy and navigation cues
   - *Alternative*: Single integrated dashboard approach

2. **Setup Complexity**: Provider setup might be overwhelming for users
   - *Mitigation*: Existing setup flows already handle complexity well
   - *Alternative*: Implement setup wizard overlay

## Testing Strategy

### Unit Tests
```csharp
[Test] public void MainWindowViewModel_CanAccessMainDashboard_WhenAllProvidersHealthy()
[Test] public void Navigation_ShowMainDashboard_OnlyWhenProvidersReady()
[Test] public void ProviderStatus_Updates_ReflectInNavigationState()
```

### Integration Tests
```csharp
[Test] public void ProviderSetup_CompletesSuccessfully_EnablesMainDashboard()
[Test] public void BackgroundMonitoring_ContinuesDuringNavigation()
[Test] public void NavigationState_PersistsAcrossProviderUpdates()
```

### UI Tests (Manual)
- Navigation flow testing
- Real-time update verification
- Setup flow completion testing
- Responsive design validation

## Implementation Timeline

**Phase 1: Core Navigation** (2-3 days)
- Refactor MainWindow for navigation
- Create EmailDashboard placeholder
- Implement navigation ViewModel

**Phase 2: Dashboard Integration** (1-2 days)
- Wire provider dashboard events
- Test navigation flow
- Implement status bar integration

**Phase 3: Setup Flow Enhancement** (2-3 days)
- Integrate setup flows
- Polish UI transitions
- Add navigation breadcrumbs

**Phase 4: Testing & Polish** (1-2 days)
- Comprehensive testing
- Performance validation
- UI polish and refinement

**Total Estimated Time: 6-10 days**

## Success Metrics

**Technical Metrics**:
- Navigation response time < 200ms
- Zero memory leaks during navigation
- Real-time updates < 1 second latency
- 100% provider status accuracy

**User Experience Metrics**:
- Setup completion rate > 95%
- Navigation clarity (user testing)
- Error reduction in provider setup
- Reduced support requests for setup issues

This PRP provides a comprehensive roadmap for implementing a provider status dashboard with navigation that builds on the existing robust architecture while providing a seamless user experience for both setup and ongoing provider management.