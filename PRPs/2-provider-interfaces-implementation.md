# Enhanced Provider Base Architecture Implementation

## Goal

**Feature Goal**: Implement a unified base provider architecture with Result pattern and enhanced lifecycle management to complement the existing rich provider interfaces and enable consistent error handling across all providers in TrashMail Panda.

**Deliverable**: Complete C# base provider architecture including IProvider<TConfig> interface, Result<T> pattern, enhanced provider lifecycle management, and refactored existing providers to use the unified architecture.

**Success Definition**: All existing providers (Gmail, OpenAI, SQLite) successfully refactored to inherit from base provider architecture with Result pattern, comprehensive error handling, and consistent lifecycle management while maintaining backward compatibility.

## User Persona

**Target User**: C# developers extending TrashMail Panda with new providers or maintaining existing provider implementations

**Use Case**: Creating new providers (IMAP email, Claude LLM, PostgreSQL storage) or enhancing existing providers with consistent error handling, health monitoring, and lifecycle management

**User Journey**:

1. Inherit from IProvider<TConfig> interface for type-safe provider implementation
2. Implement standardized lifecycle methods (Initialize, Shutdown, ValidateConfiguration, HealthCheck)
3. Use Result<T> pattern for all async operations instead of throwing exceptions
4. Leverage built-in metrics collection and state management
5. Register provider with factory pattern using Microsoft.Extensions.DependencyInjection

**Pain Points Addressed**:

- Inconsistent error handling between providers (some throw exceptions, some use custom result types)
- No unified provider lifecycle management
- Missing base architecture described in CLAUDE.md documentation
- Lack of standardized health checking and metrics collection
- Manual provider registration and configuration validation

## Why

- **Architectural Consistency**: Unifies the existing rich provider interfaces under a common base architecture as described in project documentation
- **Error Handling Standardization**: Replaces mixed exception/custom result patterns with consistent Result<T> approach
- **Enhanced Observability**: Adds built-in metrics collection, health checking, and state management to all providers
- **Future Provider Support**: Enables easy addition of new providers (IMAP, Claude, PostgreSQL) with guaranteed consistency
- **Testing Enablement**: Standardizes provider testing patterns and mock strategies

## What

Base provider architecture that complements the existing comprehensive interfaces:

- **IProvider<TConfig>**: Generic base interface with lifecycle management
- **Result<T>**: Standardized result type replacing exceptions
- **BaseProvider<TConfig>**: Abstract base class with common functionality
- **Provider Factory Pattern**: Type-safe provider registration and creation
- **Enhanced Error Hierarchy**: Comprehensive error types with proper inheritance
- **Metrics Integration**: Built-in performance monitoring and health checks
- **Configuration Validation**: IValidateOptions<T> integration with DataAnnotations

### Success Criteria

- [ ] All existing providers refactored to inherit from IProvider<TConfig>
- [ ] Result<T> pattern implemented consistently across all provider methods
- [ ] No breaking changes to existing rich interfaces (IEmailProvider, ILLMProvider, etc.)
- [ ] Built-in health checks and metrics collection for all providers
- [ ] Provider factory pattern with type-safe registration
- [ ] Comprehensive error hierarchy with proper inheritance
- [ ] Full backward compatibility with existing service registrations
- [ ] 100% test coverage for base provider architecture

## All Needed Context

### Context Completeness Check

_If someone knew nothing about this codebase, would they have everything needed to implement this successfully?_

**✅ YES** - This PRP provides complete specifications for enhancing existing architecture with base provider patterns, maintaining compatibility while adding standardized error handling and lifecycle management.

### Documentation & References

```yaml
# MUST READ - Current codebase interfaces
- file: src/Shared/TrashMailPanda.Shared/IEmailProvider.cs
  why: Rich email provider interface to be enhanced with base provider architecture
  pattern: Comprehensive DTOs and methods - maintain all existing functionality
  gotcha: Must preserve existing method signatures while adding Result<T> wrapper

- file: src/Shared/TrashMailPanda.Shared/ILLMProvider.cs
  why: Complex LLM provider interface with extensive type system
  pattern: Advanced type system with discriminated unions - preserve complexity
  gotcha: LLMAuth hierarchy and classification types must remain unchanged

- file: src/Shared/TrashMailPanda.Shared/IStorageProvider.cs
  why: Storage provider interface with comprehensive data operations
  pattern: Full CRUD operations with specialized storage types
  gotcha: Existing storage operations must maintain transaction semantics

- file: src/Shared/TrashMailPanda.Shared/Security/
  why: Security interfaces already use custom result types (EncryptionResult<T>, SecureStorageResult<T>)
  pattern: Custom result types with specific error hierarchies
  gotcha: Need to unify with new Result<T> pattern or maintain compatibility

- file: src/TrashMailPanda/TrashMailPanda/Services/ServiceCollectionExtensions.cs
  why: Current DI registration patterns and service configuration
  pattern: Microsoft.Extensions.DependencyInjection registration approach
  gotcha: Must maintain existing service lifetimes and configurations

# External documentation
- url: https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/keywords/interface
  why: C# interface inheritance and implementation patterns
  critical: Generic interface constraints, multiple interface inheritance

- url: https://learn.microsoft.com/en-us/dotnet/api/system.componentmodel.dataannotations.ivalidateoptions-1
  why: IValidateOptions<T> pattern for configuration validation
  critical: Integration with Microsoft.Extensions.Options for provider configs

- url: https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/functional/discriminated-unions
  why: Result pattern implementation with discriminated unions
  critical: Type-safe error handling without exceptions
```

### Current Codebase tree

```bash
src/
├── TrashMailPanda/                 # Main Avalonia application
│   ├── Views/                      # Avalonia XAML views  
│   ├── ViewModels/                 # MVVM view models
│   └── Services/                   # Application services
│       ├── ServiceCollectionExtensions.cs  # DI registration
│       ├── StartupOrchestrator.cs          # Provider coordination
│       └── ProviderStatusService.cs        # Provider monitoring
├── Shared/                         # Shared interfaces and types
│   └── TrashMailPanda.Shared/
│       ├── IEmailProvider.cs       # ✅ Rich email interface (111 lines)
│       ├── ILLMProvider.cs         # ✅ Complex LLM interface (223 lines)  
│       ├── IStorageProvider.cs     # ✅ Storage interface (152 lines)
│       ├── IContactsProvider.cs    # ✅ Contacts interface (24 lines)
│       └── Security/               # ✅ Security interfaces with custom Result types
├── Providers/                      # Provider implementations
│   ├── Email/                      
│   │   └── TrashMailPanda.Providers.Email/
│   │       └── GmailEmailProvider.cs       # ✅ Complete Gmail implementation
│   ├── LLM/
│   │   └── TrashMailPanda.Providers.LLM/  
│   │       └── OpenAIProvider.cs           # ✅ Complete OpenAI implementation
│   └── Storage/
│       └── TrashMailPanda.Providers.Storage/
│           └── SqliteStorageProvider.cs    # ✅ Complete SQLite implementation
└── Tests/                          # xUnit test projects
    └── TrashMailPanda.Tests/       # ✅ Existing test structure
```

### Desired Codebase tree with files to be added

```bash
src/
├── Shared/
│   └── TrashMailPanda.Shared/
│       ├── Base/                   # NEW: Base provider architecture
│       │   ├── IProvider.cs        # Generic base provider interface
│       │   ├── BaseProvider.cs     # Abstract base provider implementation
│       │   ├── Result.cs           # Result<T> pattern implementation
│       │   ├── ProviderError.cs    # Base error hierarchy
│       │   └── ProviderState.cs    # Provider state management
│       ├── Factories/              # NEW: Provider factory pattern
│       │   ├── IProviderFactory.cs # Provider factory interface
│       │   ├── ProviderRegistry.cs # Provider registration system
│       │   └── ProviderServiceExtensions.cs # Enhanced DI extensions
│       ├── Models/                 # NEW: Enhanced models
│       │   ├── ProviderConfig.cs   # Base configuration types
│       │   └── HealthStatus.cs     # Health check models
│       └── Validation/             # NEW: Validation infrastructure
│           ├── IConfigurationValidator.cs  # Config validation interface
│           └── ValidationExtensions.cs     # Validation helper methods
```

### Known Gotchas of our codebase & Library Quirks

```csharp
// CRITICAL: Existing interfaces are comprehensive - DO NOT break existing functionality
// Current providers: GmailEmailProvider, OpenAIProvider, SqliteStorageProvider all work
// Goal: Enhance with base architecture while maintaining backward compatibility

// CRITICAL: Mixed error handling patterns currently exist
// Security interfaces use: EncryptionResult<T>, SecureStorageResult<T> 
// Other providers throw exceptions directly
// Need unified Result<T> pattern without breaking existing security interfaces

// CRITICAL: Rich DTOs and complex types already exist
// IEmailProvider: EmailSummary, EmailFull, BatchModifyRequest, ListOptions
// ILLMProvider: LLMAuth (ApiKey/OAuth/Local), ClassifyInput/Output, UserRules
// IStorageProvider: Full CRUD operations with complex data models
// Must preserve ALL existing complexity

// CRITICAL: Microsoft.Extensions.DependencyInjection already configured
// ServiceCollectionExtensions.cs registers all providers as singletons
// Provider configs: EmailProviderConfig, LLMProviderConfig, StorageProviderConfig
// Must enhance registration without breaking existing startup

// CRITICAL: No breaking changes to public interfaces
// IEmailProvider.ConnectAsync() currently returns Task (not Task<Result<T>>)
// Must implement Result pattern internally while maintaining interface compatibility
// Solution: Use adapter pattern or internal Result mapping

// GOTCHA: Avalonia UI data binding considerations
// ViewModels currently expect specific return types from providers
// Result pattern implementation must not break MVVM data binding patterns

// GOTCHA: Security audit logging is sophisticated
// SecurityAuditLogger tracks all credential operations
// Base provider architecture must integrate with existing audit system
```

## Implementation Blueprint

### Data models and structure

Enhance existing architecture with base provider types while maintaining all current functionality.

```csharp
Examples:
 - IProvider<TConfig> generic interface with lifecycle methods
 - Result<T> discriminated union for standardized error handling
 - BaseProvider<TConfig> abstract class with common functionality
 - Enhanced error hierarchy inheriting from ProviderError base
 - Provider factory interfaces with generic type constraints
 - Configuration validation using IValidateOptions<T> pattern
 - Health status models with detailed diagnostics
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: CREATE src/Shared/TrashMailPanda.Shared/Base/Result.cs
  - IMPLEMENT: Result<T> discriminated union with Success/Failure states
  - FOLLOW pattern: C# discriminated unions, readonly record types
  - NAMING: Result<T>, Result<T, TError>, Success/Failure static factory methods
  - PLACEMENT: Foundation type used by all other base architecture components
  - DEPENDENCIES: None (foundation layer)

Task 2: CREATE src/Shared/TrashMailPanda.Shared/Base/ProviderError.cs
  - IMPLEMENT: Base error hierarchy with specific provider error types
  - FOLLOW pattern: Exception inheritance hierarchy, but for Result pattern
  - NAMING: ProviderError base, ConfigurationError, AuthenticationError, NetworkError
  - DEPENDENCIES: None (foundation layer)
  - PLACEMENT: Error types for Result<T> pattern

Task 3: CREATE src/Shared/TrashMailPanda.Shared/Base/ProviderState.cs
  - IMPLEMENT: Provider state enumeration and state tracking types
  - FOLLOW pattern: Enum for state, record types for state data
  - NAMING: ProviderState enum (Uninitialized, Initializing, Ready, Error, Shutdown)
  - DEPENDENCIES: Import ProviderError from Task 2
  - PLACEMENT: State management for provider lifecycle

Task 4: CREATE src/Shared/TrashMailPanda.Shared/Models/ProviderConfig.cs
  - IMPLEMENT: Base configuration types and common configuration patterns
  - FOLLOW pattern: src/Shared/TrashMailPanda.Shared/Security/ (existing config patterns)
  - NAMING: BaseProviderConfig, generic constraints for configuration validation
  - DEPENDENCIES: Import Result and ProviderError types from Tasks 1-2
  - PLACEMENT: Base configuration types for all providers

Task 5: CREATE src/Shared/TrashMailPanda.Shared/Models/HealthStatus.cs
  - IMPLEMENT: Health check models with detailed diagnostic information
  - FOLLOW pattern: Microsoft.Extensions.Diagnostics.HealthChecks types
  - NAMING: HealthStatus enum, HealthCheckResult record type
  - DEPENDENCIES: Import Result and ProviderError types
  - PLACEMENT: Health monitoring types for provider diagnostics

Task 6: CREATE src/Shared/TrashMailPanda.Shared/Base/IProvider.cs
  - IMPLEMENT: Generic base provider interface with lifecycle methods
  - FOLLOW pattern: Generic constraints, async patterns, Result<T> return types
  - NAMING: IProvider<TConfig> interface, async lifecycle methods
  - DEPENDENCIES: Import Result, ProviderError, ProviderState, HealthStatus from previous tasks
  - PLACEMENT: Core interface that all providers will inherit from

Task 7: CREATE src/Shared/TrashMailPanda.Shared/Validation/IConfigurationValidator.cs
  - IMPLEMENT: Configuration validation interface using IValidateOptions<T> pattern
  - FOLLOW pattern: Microsoft.Extensions.Options.IValidateOptions<T>
  - NAMING: IConfigurationValidator<TConfig>, ValidateOptions result types
  - DEPENDENCIES: Import base types and ProviderConfig from previous tasks
  - PLACEMENT: Validation infrastructure for provider configurations

Task 8: CREATE src/Shared/TrashMailPanda.Shared/Validation/ValidationExtensions.cs
  - IMPLEMENT: Extension methods for configuration validation and Result<T> helpers
  - FOLLOW pattern: C# extension methods, fluent validation patterns
  - NAMING: ValidationExtensions static class, ValidateAsync extension methods
  - DEPENDENCIES: Import Result, ProviderError, and validation interfaces
  - PLACEMENT: Helper methods for validation operations

Task 9: CREATE src/Shared/TrashMailPanda.Shared/Base/BaseProvider.cs
  - IMPLEMENT: Abstract base provider class with common functionality
  - FOLLOW pattern: Abstract base class with protected virtual methods
  - NAMING: BaseProvider<TConfig> abstract class, template method pattern
  - DEPENDENCIES: Import all base interfaces and types from previous tasks
  - PLACEMENT: Base implementation that concrete providers will inherit from

Task 10: CREATE src/Shared/TrashMailPanda.Shared/Factories/IProviderFactory.cs
  - IMPLEMENT: Provider factory interface for type-safe provider creation
  - FOLLOW pattern: Generic factory pattern with constraints
  - NAMING: IProviderFactory<TProvider, TConfig> interface
  - DEPENDENCIES: Import IProvider interface and configuration types
  - PLACEMENT: Factory abstraction for provider creation and registration

Task 11: CREATE src/Shared/TrashMailPanda.Shared/Factories/ProviderRegistry.cs
  - IMPLEMENT: Provider registry for runtime provider management
  - FOLLOW pattern: Registry pattern with type-safe provider lookup
  - NAMING: ProviderRegistry class, RegisterProvider/GetProvider methods
  - DEPENDENCIES: Import factory interfaces and provider types
  - PLACEMENT: Runtime provider management system

Task 12: CREATE src/Shared/TrashMailPanda.Shared/Factories/ProviderServiceExtensions.cs
  - IMPLEMENT: Enhanced DI extension methods for provider registration
  - FOLLOW pattern: src/TrashMailPanda/TrashMailPanda/Services/ServiceCollectionExtensions.cs
  - NAMING: AddProviders, AddProvider<T> extension methods
  - DEPENDENCIES: Import factory types and existing service extensions
  - PLACEMENT: Enhanced dependency injection configuration

Task 13: REFACTOR src/Providers/Email/TrashMailPanda.Providers.Email/GmailEmailProvider.cs
  - IMPLEMENT: Refactor to inherit from BaseProvider<EmailProviderConfig>
  - FOLLOW pattern: Preserve all existing IEmailProvider functionality
  - NAMING: Maintain existing class and method names
  - DEPENDENCIES: Import base provider architecture from previous tasks
  - PLACEMENT: Enhanced Gmail provider with base architecture
  - CRITICAL: Use adapter pattern to maintain interface compatibility

Task 14: REFACTOR src/Providers/LLM/TrashMailPanda.Providers.LLM/OpenAIProvider.cs
  - IMPLEMENT: Refactor to inherit from BaseProvider<LLMProviderConfig>
  - FOLLOW pattern: Preserve complex type system and classification logic
  - NAMING: Maintain existing class and method names
  - DEPENDENCIES: Import base provider architecture
  - PLACEMENT: Enhanced OpenAI provider with base architecture
  - CRITICAL: Preserve LLMAuth hierarchy and all classification types

Task 15: REFACTOR src/Providers/Storage/TrashMailPanda.Providers.Storage/SqliteStorageProvider.cs
  - IMPLEMENT: Refactor to inherit from BaseProvider<StorageProviderConfig>
  - FOLLOW pattern: Preserve all CRUD operations and transaction semantics
  - NAMING: Maintain existing class and method names
  - DEPENDENCIES: Import base provider architecture
  - PLACEMENT: Enhanced SQLite provider with base architecture
  - CRITICAL: Maintain SQLCipher encryption and data integrity

Task 16: ENHANCE src/TrashMailPanda/TrashMailPanda/Services/ServiceCollectionExtensions.cs
  - IMPLEMENT: Update service registration to use enhanced provider factory pattern
  - FOLLOW pattern: Existing registration approach, maintain singleton lifetimes
  - NAMING: Enhance existing AddTrashMailPandaServices method
  - DEPENDENCIES: Import enhanced factory services
  - PLACEMENT: Update existing DI configuration
  - CRITICAL: Maintain backward compatibility with existing service registrations

Task 17: CREATE src/Tests/TrashMailPanda.Tests/Base/ comprehensive test suite
  - IMPLEMENT: Unit tests for all base provider architecture components
  - FOLLOW pattern: xUnit testing patterns, test organization in src/Tests/
  - NAMING: Test classes mirror source structure, descriptive test method names
  - DEPENDENCIES: All base provider interfaces and implementations
  - PLACEMENT: Comprehensive test coverage for base architecture
  - CRITICAL: Test Result<T> pattern, error handling, and lifecycle management
```

### Implementation Patterns & Key Details

```csharp
// Result<T> pattern implementation
public readonly record struct Result<T>
{
    private readonly bool _isSuccess;
    private readonly T? _value;
    private readonly ProviderError? _error;

    public bool IsSuccess => _isSuccess;
    public T Value => _isSuccess ? _value! : throw new InvalidOperationException("Result is failure");
    public ProviderError Error => !_isSuccess ? _error! : throw new InvalidOperationException("Result is success");

    public static Result<T> Success(T value) => new(true, value, null);
    public static Result<T> Failure(ProviderError error) => new(false, default, error);
    
    // PATTERN: Use factory methods for type-safe result creation
    // GOTCHA: Private constructor prevents invalid states
    // CRITICAL: Thread-safe readonly implementation
}

// Base provider interface pattern
public interface IProvider<TConfig> where TConfig : class
{
    string Name { get; }
    string Version { get; }
    ProviderState State { get; }
    
    // PATTERN: All async operations return Result<T> for consistent error handling
    Task<Result<bool>> InitializeAsync(TConfig config, CancellationToken cancellationToken = default);
    Task<Result<bool>> ShutdownAsync(CancellationToken cancellationToken = default);
    Task<Result<bool>> ValidateConfigurationAsync(TConfig config, CancellationToken cancellationToken = default);
    Task<Result<HealthStatus>> HealthCheckAsync(CancellationToken cancellationToken = default);
    
    // GOTCHA: Generic constraints ensure type safety
    // CRITICAL: CancellationToken support for all async operations
}

// Provider adapter pattern for backward compatibility
public partial class GmailEmailProvider : BaseProvider<EmailProviderConfig>, IEmailProvider
{
    // PATTERN: Implement base provider architecture
    protected override async Task<Result<bool>> PerformInitializationAsync(EmailProviderConfig config)
    {
        try
        {
            // Existing initialization logic
            return Result<bool>.Success(true);
        }
        catch (Exception ex)
        {
            return Result<bool>.Failure(new AuthenticationError(ex.Message));
        }
    }
    
    // PATTERN: Maintain interface compatibility with adapter methods
    public async Task ConnectAsync() // IEmailProvider interface method
    {
        var result = await InitializeAsync(Configuration);
        if (!result.IsSuccess)
        {
            // Convert Result<T> back to exception for interface compatibility
            throw new InvalidOperationException(result.Error.Message);
        }
    }
    
    // CRITICAL: Use adapter pattern to maintain existing interface contracts
    // GOTCHA: Internal Result<T> pattern with external exception throwing for compatibility
}

// Configuration validation pattern
public class EmailProviderConfigValidator : IConfigurationValidator<EmailProviderConfig>
{
    public ValidateOptionsResult Validate(string name, EmailProviderConfig config)
    {
        var failures = new List<string>();
        
        if (string.IsNullOrEmpty(config.ClientId))
            failures.Add("Gmail Client ID is required");
            
        if (string.IsNullOrEmpty(config.ClientSecret))
            failures.Add("Gmail Client Secret is required");
        
        return failures.Count > 0 
            ? ValidateOptionsResult.Fail(failures)
            : ValidateOptionsResult.Success;
    }
    
    // PATTERN: IValidateOptions<T> integration with DataAnnotations
    // CRITICAL: Comprehensive validation with specific error messages
}

// Enhanced service registration pattern
public static IServiceCollection AddEnhancedProviders(this IServiceCollection services, IConfiguration configuration)
{
    // Register base provider services
    services.AddSingleton<ProviderRegistry>();
    
    // Register enhanced providers with base architecture
    services.AddProvider<IEmailProvider, GmailEmailProvider, EmailProviderConfig>(configuration);
    services.AddProvider<ILLMProvider, OpenAIProvider, LLMProviderConfig>(configuration);
    services.AddProvider<IStorageProvider, SqliteStorageProvider, StorageProviderConfig>(configuration);
    
    // Register configuration validators
    services.AddSingleton<IConfigurationValidator<EmailProviderConfig>, EmailProviderConfigValidator>();
    
    return services;
    
    // PATTERN: Fluent service registration with generic type constraints
    // GOTCHA: Maintain existing singleton lifetimes for compatibility
}
```

### Integration Points

```yaml
DEPENDENCY_INJECTION:
  - enhance: src/TrashMailPanda/TrashMailPanda/Services/ServiceCollectionExtensions.cs
  - pattern: "Add base provider registration while maintaining existing services"

CONFIGURATION:
  - preserve: existing appsettings.json structure and environment variables  
  - add: IValidateOptions<T> registration for each provider configuration

STARTUP_ORCHESTRATION:
  - enhance: src/TrashMailPanda/TrashMailPanda/Services/StartupOrchestrator.cs
  - pattern: "Use enhanced health checks from base provider architecture"

MVVM_INTEGRATION:
  - preserve: existing ViewModel patterns and data binding
  - ensure: Result<T> pattern doesn't break Avalonia UI integration

SECURITY_AUDIT:
  - integrate: SecurityAuditLogger with base provider lifecycle events
  - pattern: "Audit provider initialization, shutdown, and health check events"
```

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run after each file creation - fix before proceeding
dotnet format src/Shared/TrashMailPanda.Shared/Base/ --verify-no-changes
dotnet build src/Shared/TrashMailPanda.Shared/ --configuration Debug
dotnet build --verbosity normal

# Project-wide validation
dotnet format --verify-no-changes
dotnet build --configuration Release
dotnet test --no-build --logger console --verbosity normal

# Expected: Zero errors. If errors exist, READ output and fix before proceeding.
```

### Level 2: Unit Tests (Component Validation)

```bash
# Test each component as it's created
dotnet test src/Tests/TrashMailPanda.Tests/Base/ --logger console --verbosity detailed
dotnet test --filter "Category=BaseProvider" --logger console

# Full test suite for affected areas  
dotnet test src/Tests/TrashMailPanda.Tests/ --configuration Debug
dotnet test --collect:"XPlat Code Coverage" --results-directory TestResults/

# Coverage validation - require high coverage for base architecture
dotnet test --collect:"XPlat Code Coverage" --logger console
# Check coverage reports in TestResults/ directory

# Expected: All tests pass. If failing, debug root cause and fix implementation.
```

### Level 3: Integration Testing (System Validation)

```bash
# Application startup validation
dotnet run --project src/TrashMailPanda/TrashMailPanda --configuration Debug &
sleep 5  # Allow startup time

# Provider health check validation through application logs
# Verify all providers initialize successfully with base architecture

# Service registration validation
dotnet run --project src/TrashMailPanda/TrashMailPanda -- --validate-services
# Custom startup mode to validate DI container registration

# Database connectivity (SQLite provider)
sqlite3 data/app.db "SELECT name FROM sqlite_master WHERE type='table';" || echo "Database validation failed"

# Configuration validation
dotnet run --project src/TrashMailPanda/TrashMailPanda -- --validate-config
# Verify all provider configurations validate successfully

# Expected: All integrations working, providers initialize successfully, no DI errors
```

### Level 4: Creative & Domain-Specific Validation

```bash
# .NET-specific validation

# Generic constraint validation
dotnet build --verbosity diagnostic | grep -E "(constraint|generic)" || echo "Generic constraints validated"

# Result pattern validation - verify no exceptions thrown
dotnet run --project src/Tests/TrashMailPanda.Tests -- --filter "Category=ResultPattern" --logger console

# Provider lifecycle validation
dotnet run --project src/TrashMailPanda/TrashMailPanda -- --test-provider-lifecycle
# Custom validation mode to test Initialize -> HealthCheck -> Shutdown cycle

# Configuration validation testing
dotnet run --project src/TrashMailPanda/TrashMailPanda -- --test-invalid-config
# Verify providers handle invalid configurations gracefully with Result pattern

# Avalonia UI integration validation
dotnet run --project src/TrashMailPanda/TrashMailPanda --configuration Debug
# Manual UI testing to verify MVVM integration still works with enhanced providers

# Security audit integration validation
dotnet run --project src/TrashMailPanda/TrashMailPanda -- --test-audit-logging
# Verify SecurityAuditLogger integration with provider lifecycle events

# Memory and performance validation
dotnet run --project src/TrashMailPanda/TrashMailPanda --configuration Release &
# Monitor memory usage and ensure no performance regression

# Expected: All provider patterns work correctly, UI remains responsive, audit logging functional
```

## Final Validation Checklist

### Technical Validation

- [ ] All 4 validation levels completed successfully
- [ ] All tests pass: `dotnet test`
- [ ] No build errors: `dotnet build --configuration Release`
- [ ] No formatting issues: `dotnet format --verify-no-changes`
- [ ] Clean startup: `dotnet run --project src/TrashMailPanda/TrashMailPanda`

### Feature Validation

- [ ] All success criteria from "What" section met
- [ ] Result<T> pattern implemented consistently across all providers
- [ ] No breaking changes to existing provider interfaces
- [ ] Base provider architecture enhances existing rich interfaces
- [ ] Provider factory pattern working with type-safe registration
- [ ] Health checks and metrics collection functional for all providers
- [ ] Backward compatibility maintained with existing service registrations

### Code Quality Validation

- [ ] Follows existing .NET project patterns and naming conventions
- [ ] File placement matches desired codebase tree structure
- [ ] Anti-patterns avoided (no breaking changes, no mixed error handling)
- [ ] Generic constraints properly applied for type safety
- [ ] Configuration validation integrated with IValidateOptions<T> pattern

### .NET-Specific Validation

- [ ] All interfaces compile with C# nullable reference types enabled
- [ ] Proper inheritance hierarchies for provider base classes
- [ ] Generic interfaces with appropriate constraints function correctly
- [ ] Result<T> discriminated union provides type-safe error handling
- [ ] Microsoft.Extensions.DependencyInjection integration enhanced
- [ ] IValidateOptions<T> pattern working for all provider configurations

### Documentation & Integration

- [ ] XML documentation provided for all new public interfaces
- [ ] Integration points properly enhanced without breaking existing functionality
- [ ] Provider registration patterns clearly documented in ServiceCollectionExtensions
- [ ] Base provider architecture integrates seamlessly with existing security audit system

---

## Anti-Patterns to Avoid

- ❌ Don't break existing provider interfaces - enhance with base architecture
- ❌ Don't change existing service registration lifetimes - maintain singleton patterns
- ❌ Don't replace security interfaces' custom result types - maintain compatibility
- ❌ Don't modify existing rich DTOs and complex type systems 
- ❌ Don't change MVVM patterns or Avalonia UI integration approaches
- ❌ Don't skip configuration validation - integrate with IValidateOptions<T>
- ❌ Don't throw exceptions from Result<T> pattern methods - use consistent error handling