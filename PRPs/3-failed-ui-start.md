name: "Fix TrashMail Panda Avalonia UI Startup Failure"
description: |

---

## Goal

**Feature Goal**: Fix the Avalonia UI startup failure that causes the application to crash with XAML compilation errors

**Deliverable**: Functional TrashMail Panda desktop application that starts without XAML errors and displays the UI properly

**Success Definition**: Application launches successfully with `dotnet run --project src/TrashMailPanda`, displays startup UI, and passes all XAML compilation without exceptions

## User Persona

**Target User**: Developer working on TrashMail Panda application

**Use Case**: Developer needs to run the application in development mode to test email processing functionality

**User Journey**: 
1. Developer runs `dotnet run --project src/TrashMailPanda` 
2. Application compiles successfully
3. Avalonia UI launches and displays startup screens
4. Application initialization completes without crashing

**Pain Points Addressed**: 
- Application crashes immediately on startup with XAML errors
- Unable to test any application functionality
- macOS crash dialogs interrupt development workflow

## Why

- **Development Blocker**: The application cannot be tested or developed further until UI startup works
- **Core Infrastructure**: Avalonia UI is the primary interface for the email processing application
- **User Experience**: Application must launch reliably across platforms (Windows, macOS, Linux)
- **Foundation Requirement**: All other features depend on a working UI framework

## What

Fix specific XAML syntax errors causing Avalonia compilation failures:

1. **Grid Property Errors**: Remove invalid `Padding` and `CornerRadius` properties from Grid elements
2. **CSS Selector Errors**: Fix invalid selector syntax using `^` operators  
3. **ScrollViewer Content Errors**: Ensure single child elements in ScrollViewers
4. **Converter Reference Errors**: Fix missing converter imports and complex MultiBinding issues

### Success Criteria

- [ ] `dotnet build` completes without XAML compilation errors
- [ ] `dotnet run --project src/TrashMailPanda` starts application successfully  
- [ ] Avalonia UI displays without crash dialogs on macOS
- [ ] All XAML files compile with proper syntax
- [ ] Application startup sequence completes through provider initialization

## All Needed Context

### Context Completeness Check

_This PRP provides complete context for fixing XAML compilation errors with specific file locations, error patterns, and exact syntax corrections needed._

### Documentation & References

```yaml
- docfile: PRPs/ai_docs/avalonia_xaml_troubleshooting.md
  why: Comprehensive guide to Avalonia XAML syntax rules, Grid vs Border properties, CSS selectors
  section: "Grid vs Border Properties" and "CSS Selector Syntax" 
  critical: Grid elements cannot have Padding/CornerRadius - must use Border wrapper

- file: src/TrashMailPanda/TrashMailPanda/Views/ProviderStatusDashboard.axaml
  why: Contains primary XAML errors on lines 235-240 and 352-356
  pattern: Invalid Grid properties and CSS selector syntax
  gotcha: Grid styling properties must be moved to Border wrapper element

- file: src/TrashMailPanda/TrashMailPanda/Views/WelcomeWizardWindow.axaml  
  why: Contains complex MultiBinding and ScrollViewer content errors
  pattern: Simplified command binding and single child ScrollViewer content
  gotcha: Complex MultiBinding with custom converters often fails in Avalonia 11.x

- file: src/TrashMailPanda/TrashMailPanda/TrashMailPanda.csproj
  why: XAML resource configuration is already correct with EnableDefaultAvaloniaItems=true
  pattern: Auto-inclusion of .axaml files as AvaloniaResource 
  gotcha: Project configuration is not the issue - XAML syntax errors block compilation

- url: https://docs.avaloniaui.net/docs/guides/basics/user-interface/styling/selectors
  why: Official Avalonia CSS selector documentation for valid syntax patterns
  critical: Only specific operators are supported - ^ and ~ are invalid
```

### Current Codebase tree (run `tree` in the root of the project) to get an overview of the codebase

```bash
src/
├── TrashMailPanda/         # Main Avalonia application
│   ├── Views/              # Avalonia XAML views (CONTAINS ERRORS)
│   │   ├── ProviderStatusDashboard.axaml (XAML ERRORS)
│   │   ├── WelcomeWizardWindow.axaml (XAML ERRORS)
│   │   ├── MainWindow.axaml (OK)
│   │   └── Controls/
│   │       └── ProviderStatusCard.axaml (OK)
│   ├── ViewModels/         # MVVM view models
│   ├── Models/             # Domain models
│   ├── Services/           # Application services
│   ├── App.axaml           # Application root (OK - proper x:Class)
│   ├── App.axaml.cs        # Application code-behind (OK)
│   └── Program.cs          # Entry point (OK)
├── Shared/                 # Shared types and utilities
├── Providers/              # Provider implementations
└── Tests/                  # xUnit test projects
```

### Desired Codebase tree with files to be modified

```bash
src/TrashMailPanda/TrashMailPanda/Views/
├── ProviderStatusDashboard.axaml (FIXED - Border wrapper, valid CSS selectors)
├── WelcomeWizardWindow.axaml (FIXED - simplified binding, single ScrollViewer child)
├── MainWindow.axaml (NO CHANGES)
└── Controls/
    └── ProviderStatusCard.axaml (NO CHANGES)
```

### Known Gotchas of our codebase & Library Quirks  

```csharp
// CRITICAL: Avalonia Grid elements do NOT support visual styling properties
// Grid can have Background but NOT Padding, CornerRadius, BorderBrush, etc.
<Grid Padding="16,8" CornerRadius="4" />  // ❌ COMPILATION ERROR

// SOLUTION: Wrap Grid in Border for styling
<Border Padding="16,8" CornerRadius="4">
    <Grid><!-- layout content --></Grid>
</Border>

// CRITICAL: Avalonia CSS selectors have limited operator support  
<Style Selector="UserControl[Width^='600']">  // ❌ ^ operator invalid
<Style Selector="UserControl[Width~='large']"> // ❌ ~ operator invalid  
<Style Selector="UserControl.responsive">       // ✅ Class selector valid

// CRITICAL: ScrollViewer must have exactly ONE direct child
<ScrollViewer>
    <StackPanel />  // ✅ Single child OK
    <Grid />        // ❌ Second child causes error  
</ScrollViewer>

// CRITICAL: .NET 9 + Avalonia 11.3.4 - some XAML compilation is stricter
// Complex MultiBinding patterns may fail - use simpler single command binding
```

## Implementation Blueprint

### Data models and structure

No new data models required. This is a XAML syntax fix operation.

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: FIX src/TrashMailPanda/TrashMailPanda/Views/ProviderStatusDashboard.axaml
  - LOCATE: Lines 235-240 with Grid Padding/CornerRadius properties
  - REPLACE: Grid element with Border wrapper containing Grid
  - SYNTAX: <Border Padding="16,8" CornerRadius="4" Background="#F5F5F5"><Grid ColumnDefinitions="*,Auto">
  - LOCATE: Lines 352-356 with invalid CSS selector ^= operators  
  - REPLACE: Remove attribute selectors, use simple class-based or element selectors
  - VALIDATE: XAML compiles without syntax errors

Task 2: FIX src/TrashMailPanda/TrashMailPanda/Views/WelcomeWizardWindow.axaml  
  - LOCATE: Lines 246-270 with complex MultiBinding for Button.Command
  - REPLACE: Use single command binding with conditional logic in ViewModel
  - SYNTAX: <Button Command="{Binding ProceedCommand}" IsEnabled="{Binding CanProceed}">
  - LOCATE: Line 39 ScrollViewer with multiple direct children
  - WRAP: Multiple children in single StackPanel container
  - VALIDATE: XAML compiles and binds properly

Task 3: VERIFY src/TrashMailPanda/TrashMailPanda/App.axaml
  - CONFIRM: x:Class="TrashMailPanda.App" is correctly set
  - CONFIRM: ViewLocator and FluentTheme references are valid
  - VALIDATE: No changes needed - this file is correct

Task 4: VERIFY src/TrashMailPanda/TrashMailPanda/TrashMailPanda.csproj  
  - CONFIRM: EnableDefaultAvaloniaItems="true" includes .axaml files
  - CONFIRM: Avalonia 11.3.4 package references are correct
  - VALIDATE: No changes needed - project config is correct

Task 5: TEST complete build and startup sequence
  - BUILD: dotnet clean && dotnet restore && dotnet build
  - RUN: dotnet run --project src/TrashMailPanda  
  - VALIDATE: Application starts without XAML errors or crash dialogs
```

### Implementation Patterns & Key Details

```xml
<!-- PATTERN: Grid with styling properties - INCORRECT -->
<Grid Grid.Row="2" 
      ColumnDefinitions="*,Auto" 
      Background="#F5F5F5" 
      Padding="16,8"           <!-- ❌ Grid doesn't support Padding -->
      CornerRadius="4">        <!-- ❌ Grid doesn't support CornerRadius -->

<!-- PATTERN: Border wrapper with Grid - CORRECT -->
<Border Grid.Row="2" 
        Background="#F5F5F5" 
        Padding="16,8"         
        CornerRadius="4">       
    <Grid ColumnDefinitions="*,Auto">
        <!-- Grid layout content here -->
    </Grid>
</Border>

<!-- PATTERN: Invalid CSS selector - INCORRECT -->
<Style Selector="UserControl[Width^='600'] UniformGrid">  <!-- ❌ ^= not supported -->
    <Setter Property="Columns" Value="2"/>
</Style>

<!-- PATTERN: Valid CSS selector - CORRECT --> 
<Style Selector="UserControl.responsive UniformGrid">    <!-- ✅ Class selector -->
    <Setter Property="Columns" Value="2"/>
</Style>

<!-- PATTERN: Complex MultiBinding - PROBLEMATIC -->
<Button.Command>
    <MultiBinding Converter="{x:Static BoolConverters.Or}">
        <Binding Path="NextStepCommand"/>
        <Binding Path="FinishSetupCommand"/>
    </MultiBinding>
</Button.Command>

<!-- PATTERN: Single command binding - PREFERRED -->
<Button Command="{Binding ProceedCommand}"
        IsEnabled="{Binding CanProceed}"
        Content="{Binding ProceedButtonText}" />
```

### Integration Points

```yaml  
XAML_COMPILATION:
  - affects: All .axaml files in Views/ directory
  - validation: "dotnet build succeeds without XamlParseException"

AVALONIA_RESOURCES:  
  - config: EnableDefaultAvaloniaItems=true in .csproj
  - includes: All .axaml files automatically as AvaloniaResource

VIEWMODEL_BINDING:
  - modify: Add ProceedCommand and CanProceed properties if missing
  - pattern: "ICommand ProceedCommand { get; }" in ViewModels
```

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Validate XAML compilation after each fix
dotnet clean
dotnet restore  
dotnet build --verbosity detailed    # Look for XamlParseException errors

# Specific XAML validation  
dotnet build src/TrashMailPanda/TrashMailPanda/TrashMailPanda.csproj --verbosity detailed

# Expected: No XamlParseException, no XAML compilation errors
# If errors exist, READ line numbers and fix specific syntax issues
```

### Level 2: Application Startup (Component Validation)

```bash
# Test application startup without runtime errors
dotnet run --project src/TrashMailPanda/TrashMailPanda/TrashMailPanda.csproj

# Expected outcomes:
# ✅ No "No precompiled XAML found" exceptions
# ✅ No macOS crash dialog appears  
# ✅ Avalonia UI window appears (even if providers are not configured)
# ✅ Application initializes through startup sequence

# If startup fails:
# - Check console output for specific XAML line number errors
# - Verify all Grid elements have been wrapped in Border where needed
# - Confirm CSS selectors use valid operators
```

### Level 3: UI Functionality (System Validation)

```bash
# Validate UI responsiveness and provider status display
# (Run after startup succeeds)

# Check startup screens display properly
# 1. Application shows startup/loading screen
# 2. Provider status dashboard appears (even with errors)
# 3. UI elements are clickable and responsive
# 4. No additional XAML binding errors in console

# Manual UI validation:
# - Startup screen displays without layout issues
# - Provider status cards render properly  
# - Window resizing works correctly
# - Navigation between views functions

# Expected: UI displays correctly even if providers fail initialization
```

### Level 4: Cross-Platform & Build Validation

```bash
# Validate across development scenarios

# Development build validation
dotnet run --project src/TrashMailPanda --configuration Debug

# Release build validation  
dotnet build --configuration Release
dotnet run --project src/TrashMailPanda --configuration Release

# Hot reload validation (if using dotnet watch)
dotnet watch --project src/TrashMailPanda

# Package/publish validation
dotnet publish -c Release -r osx-x64  # For macOS
dotnet publish -c Release -r win-x64  # For Windows
dotnet publish -c Release -r linux-x64  # For Linux

# Expected: All build configurations work without XAML errors
```

## Final Validation Checklist

### Technical Validation

- [ ] XAML compilation succeeds: `dotnet build` with no XamlParseException
- [ ] Application startup succeeds: `dotnet run --project src/TrashMailPanda` 
- [ ] No macOS crash dialogs appear during startup
- [ ] All modified XAML files use valid Avalonia syntax
- [ ] Grid elements properly wrapped in Border for styling properties

### Feature Validation

- [ ] Application launches and displays UI without crashing
- [ ] Startup sequence progresses through provider initialization
- [ ] Provider status dashboard displays (even with configuration errors)
- [ ] UI navigation and basic interaction works
- [ ] Window opens on correct screen with proper sizing

### Code Quality Validation

- [ ] XAML syntax follows Avalonia 11.x best practices  
- [ ] No invalid CSS selectors using unsupported operators
- [ ] ScrollViewer elements have single child containers
- [ ] Border/Grid element hierarchy used for styled layouts
- [ ] ViewBinding patterns remain unchanged where not problematic

### Documentation & Deployment

- [ ] Error-free XAML serves as example for future development
- [ ] Build process is reliable for development and CI/CD
- [ ] Application startup is consistent across platforms

---

## Anti-Patterns to Avoid

- ❌ Don't add styling properties directly to Grid elements (use Border wrapper)
- ❌ Don't use CSS attribute selectors with ^= or ~= operators in Avalonia
- ❌ Don't put multiple direct children in ScrollViewer elements
- ❌ Don't use complex MultiBinding when simple command binding works
- ❌ Don't modify working App.axaml or project configuration unnecessarily
- ❌ Don't ignore XAML compilation warnings - they often indicate real issues