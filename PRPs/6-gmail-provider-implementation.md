# Gmail Provider Implementation PRP

## Goal

**Feature Goal**: Implement a robust, production-ready GmailProvider that fully integrates with the TrashMail Panda provider architecture to enable Gmail email operations with proper authentication, rate limiting, error handling, and comprehensive testing.

**Deliverable**: Complete GmailProvider class implementing IEmailProvider interface with OAuth2 authentication, Gmail API integration, batch operations support, comprehensive error handling, and full test coverage.

**Success Definition**: GmailProvider successfully authenticates users, lists/retrieves emails with search functionality, performs batch operations (trash/spam), handles rate limiting gracefully, and passes all unit and integration tests while maintaining 95%+ code coverage.

## User Persona

**Target User**: TrashMail Panda application users who want to clean and organize their Gmail inbox using AI-powered email triage.

**Use Case**: Users connect their Gmail account through OAuth2, then the application automatically classifies emails and performs bulk operations (move to trash, mark as spam) based on AI recommendations while respecting Gmail API limits.

**User Journey**: 
1. User launches TrashMail Panda
2. Provider status dashboard shows Gmail provider needs setup
3. User clicks setup, completes OAuth2 flow  
4. Gmail provider becomes healthy and ready
5. Application can now fetch, classify, and modify user's Gmail messages

**Pain Points Addressed**: 
- Manual email management is time-consuming
- Gmail's built-in filters are limited and not AI-powered
- Need safe, reversible bulk email operations
- Want to maintain Gmail account security through proper OAuth

## Why

- **Core Functionality**: Gmail is the primary email provider for the application - without it, TrashMail Panda cannot function
- **User Security**: Proper OAuth2 implementation ensures secure, revocable access to user Gmail accounts
- **API Compliance**: Respecting Gmail API rate limits and quotas ensures stable, long-term operation
- **Error Recovery**: Robust error handling and exponential backoff prevent service disruptions
- **Provider Architecture Integration**: Follows established provider patterns for consistency and maintainability

## What

A complete Gmail provider implementation that:

### Core Functionality
- Authenticates users via OAuth2 using existing SecureStorageManager for token storage
- Lists Gmail messages with search queries, pagination, and filtering
- Retrieves full message content including headers, body, and attachments
- Performs batch label operations (TRASH, SPAM) with proper Gmail API calls
- Reports phishing emails (fallback to SPAM if no direct API support)
- Provides authenticated user information and health status

### Technical Requirements
- Inherits from BaseProvider<GmailProviderConfig> for lifecycle management
- Implements IEmailProvider interface completely
- Uses Result<T> pattern for all operations (no exceptions)
- Integrates with existing SecureStorageManager for OAuth token persistence
- Implements exponential backoff for rate limiting (429 errors)
- Supports Gmail search operators and label filtering
- Handles pagination for large result sets
- Provides comprehensive error handling and diagnostics

### Success Criteria

- [ ] GmailProvider class inherits BaseProvider and implements IEmailProvider
- [ ] OAuth2 authentication works with SecureStorageManager token storage
- [ ] ConnectAsync() establishes authenticated Gmail service connection
- [ ] ListAsync() supports Gmail search queries, pagination, and label filtering
- [ ] GetAsync() retrieves complete message content with headers and body
- [ ] BatchModifyAsync() performs bulk label operations (TRASH, SPAM)
- [ ] Rate limiting handled with exponential backoff on 429 errors
- [ ] Comprehensive error handling using Result<T> pattern
- [ ] Provider health checks validate Gmail API connectivity
- [ ] Unit tests achieve 95%+ code coverage
- [ ] Integration tests verify Gmail API operations
- [ ] Performance tests validate rate limiting behavior

## All Needed Context

### Context Completeness Check

_This PRP provides complete implementation context including existing interfaces, provider patterns, authentication flows, Gmail API specifics, testing patterns, and all necessary code examples for one-pass implementation success._

### Documentation & References

```yaml
# MUST READ - Gmail API Documentation
- url: https://developers.google.com/workspace/gmail/api/guides/handle-errors
  why: Essential error handling patterns for 429/403 rate limiting
  critical: Exponential backoff implementation details for production stability

- url: https://developers.google.com/workspace/gmail/api/guides/batch
  why: Batch operation patterns for efficient bulk message modifications
  critical: Batch size limits (100 max) and proper error handling per operation

- url: https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/batchModify
  why: Specific API method for bulk label modifications (TRASH, SPAM)
  critical: Proper request structure and label ID constants

- url: https://developers.google.com/workspace/gmail/api/guides/list-messages
  why: Message listing with search queries and pagination patterns
  critical: Gmail search operator syntax and maxResults handling

# MUST FOLLOW - Existing Code Patterns
- file: /Users/mmorales/Dev/trashmail-panda/src/Shared/TrashMailPanda.Shared/IEmailProvider.cs
  why: Complete interface definition that must be implemented
  pattern: All methods return Task<T> or Task<IReadOnlyList<T>>
  gotcha: Uses ListOptions, BatchModifyRequest, EmailSummary, EmailFull models

- file: /Users/mmorales/Dev/trashmail-panda/src/Shared/TrashMailPanda.Shared/Base/BaseProvider.cs
  why: Provider base class with lifecycle management and Result<T> pattern
  pattern: Inherit from BaseProvider<TConfig>, implement PerformInitializationAsync
  gotcha: All operations must use ExecuteOperationAsync wrapper for metrics/state

- file: /Users/mmorales/Dev/trashmail-panda/src/Providers/Email/TrashMailPanda.Providers.Email/GmailEmailProvider.cs
  why: Existing implementation that needs to be enhanced to follow BaseProvider pattern
  pattern: Current OAuth2 setup and Gmail API usage patterns
  gotcha: Currently throws exceptions - must convert to Result<T> pattern

- file: /Users/mmorales/Dev/trashmail-panda/src/Tests/TrashMailPanda.Tests/Services/StartupOrchestratorTests.cs
  why: Testing patterns using Moq and xUnit with provider interfaces
  pattern: Mock setup, Result<T> assertions, async test patterns
  gotcha: Tests expect providers to return Result<T> not throw exceptions

# MUST USE - Shared Models
- file: /Users/mmorales/Dev/trashmail-panda/src/Shared/TrashMailPanda.Shared/ListOptions.cs
  why: Input model for list operations with query, pagination, filtering
  pattern: Query (Gmail search), MaxResults, PageToken, LabelIds, After/Before dates
  gotcha: Gmail maxResults limit is 500, must handle pagination properly

- file: /Users/mmorales/Dev/trashmail-panda/src/Shared/TrashMailPanda.Shared/BatchModifyRequest.cs
  why: Input model for batch operations with label management
  pattern: EmailIds list, AddLabelIds, RemoveLabelIds for TRASH/SPAM operations
  gotcha: Gmail batch limit is 100 operations per request
```

### Current Codebase Tree

```bash
src/
├── Providers/Email/TrashMailPanda.Providers.Email/
│   ├── GmailEmailProvider.cs                    # Existing implementation (needs BaseProvider conversion)
│   └── TrashMailPanda.Providers.Email.csproj   # Google.Apis.Gmail.v1 already included
├── Shared/TrashMailPanda.Shared/
│   ├── IEmailProvider.cs                       # Interface definition to implement
│   ├── Base/BaseProvider.cs                    # Provider base class to inherit
│   ├── Base/IProvider.cs                       # Provider interface with lifecycle methods
│   ├── ListOptions.cs                          # List operation parameters
│   ├── BatchModifyRequest.cs                   # Batch operation parameters
│   ├── EmailSummary.cs                         # List operation return type
│   ├── EmailFull.cs                            # Get operation return type
│   └── Models/AuthenticatedUserInfo.cs         # User info return type
└── Tests/TrashMailPanda.Tests/
    ├── Services/StartupOrchestratorTests.cs     # Test patterns to follow
    └── Security/SecureStorageManagerTests.cs   # Security testing patterns
```

### Desired Codebase Tree with New Files

```bash
src/
├── Providers/Email/TrashMailPanda.Providers.Email/
│   ├── GmailEmailProvider.cs                   # MODIFY: Convert to BaseProvider pattern
│   ├── GmailProviderConfig.cs                  # CREATE: Configuration class
│   ├── Models/GmailConstants.cs                # CREATE: Gmail-specific constants
│   └── Services/GmailRateLimitHandler.cs       # CREATE: Rate limiting service
└── Tests/TrashMailPanda.Tests/
    ├── Providers/Email/
    │   ├── GmailEmailProviderTests.cs           # CREATE: Unit tests
    │   ├── GmailProviderConfigTests.cs          # CREATE: Config validation tests
    │   └── Integration/
    │       └── GmailApiIntegrationTests.cs      # CREATE: Integration tests
    └── Utilities/
        └── GmailTestHelper.cs                   # CREATE: Test utilities
```

### Known Gotchas & Library Quirks

```csharp
// CRITICAL: Gmail API Rate Limits
// Per Project: 1,200,000 quota units/minute  
// Per User: 15,000 quota units/user/minute
// messages.get/list: 5 units, batchModify: 50 units, send: 100 units

// CRITICAL: Google.Apis.Gmail.v1 Exception Handling
// Library throws GoogleApiException for all API errors
// Must catch and convert to Result<T> pattern for consistency
try
{
    var response = await request.ExecuteAsync();
    return Result<T>.Success(response);
}
catch (GoogleApiException ex) when (ex.HttpStatusCode == HttpStatusCode.TooManyRequests)
{
    return Result<T>.Failure(new RateLimitError($"Rate limit exceeded: {ex.Message}"));
}

// CRITICAL: OAuth2 Token Storage Integration
// Use SecureStorageManager for all token operations
// Tokens stored with "gmail_" prefix: gmail_access_token, gmail_refresh_token

// CRITICAL: BaseProvider Pattern Requirements
// All operations must use ExecuteOperationAsync wrapper
// Provider state managed automatically
// Health checks must validate Gmail connectivity
```

## Implementation Blueprint

### Data Models and Structure

Create core configuration and support models for Gmail provider.

```csharp
// GmailProviderConfig.cs - Provider configuration
public sealed record GmailProviderConfig : BaseProviderConfig
{
    [Required]
    public string ClientId { get; init; } = string.Empty;
    
    [Required]
    public string ClientSecret { get; init; } = string.Empty;
    
    public string ApplicationName { get; init; } = "TrashMail Panda";
    
    public string[] Scopes { get; init; } = { GmailService.Scope.GmailModify };
    
    public TimeSpan RequestTimeout { get; init; } = TimeSpan.FromMinutes(2);
    
    public int MaxRetries { get; init; } = 5;
    
    public TimeSpan BaseRetryDelay { get; init; } = TimeSpan.FromSeconds(1);
}

// GmailConstants.cs - Gmail-specific constants  
public static class GmailConstants
{
    public static class Labels
    {
        public const string INBOX = "INBOX";
        public const string TRASH = "TRASH"; 
        public const string SPAM = "SPAM";
        public const string UNREAD = "UNREAD";
        public const string STARRED = "STARRED";
        public const string IMPORTANT = "IMPORTANT";
        public const string SENT = "SENT";
        public const string DRAFT = "DRAFT";
    }
    
    public static class Quotas
    {
        public const int MAX_BATCH_SIZE = 100;
        public const int MAX_LIST_RESULTS = 500;
        public const int DEFAULT_LIST_RESULTS = 100;
    }
    
    public static class StorageKeys
    {
        public const string ACCESS_TOKEN = "gmail_access_token";
        public const string REFRESH_TOKEN = "gmail_refresh_token";
        public const string CLIENT_ID = "gmail_client_id";
        public const string CLIENT_SECRET = "gmail_client_secret";
    }
}
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: CREATE src/Providers/Email/TrashMailPanda.Providers.Email/GmailProviderConfig.cs
  - IMPLEMENT: GmailProviderConfig record inheriting BaseProviderConfig
  - FOLLOW pattern: src/Shared/TrashMailPanda.Shared/Models/ProviderConfig.cs (DataAnnotations validation)
  - NAMING: GmailProviderConfig class, standard C# property naming
  - PLACEMENT: Same directory as GmailEmailProvider.cs
  - VALIDATION: Required attributes, reasonable defaults for timeouts/retries

Task 2: CREATE src/Providers/Email/TrashMailPanda.Providers.Email/Models/GmailConstants.cs
  - IMPLEMENT: Static class with Gmail label IDs, quotas, storage keys
  - FOLLOW pattern: Static readonly or const fields for constants
  - NAMING: GmailConstants class, nested static classes for organization
  - PLACEMENT: Models subdirectory in Email provider project
  - CONTENT: Label constants, API limits, SecureStorage key names

Task 3: CREATE src/Providers/Email/TrashMailPanda.Providers.Email/Services/GmailRateLimitHandler.cs
  - IMPLEMENT: Service class for exponential backoff and rate limiting
  - FOLLOW pattern: Injectable service with async methods
  - NAMING: GmailRateLimitHandler class, ExecuteWithRetryAsync method
  - DEPENDENCIES: ILogger injection, configurable retry policies
  - PLACEMENT: Services subdirectory in Email provider project

Task 4: MODIFY src/Providers/Email/TrashMailPanda.Providers.Email/GmailEmailProvider.cs  
  - CONVERT: From standalone class to BaseProvider<GmailProviderConfig> inheritance
  - IMPLEMENT: PerformInitializationAsync, PerformShutdownAsync, PerformHealthCheckAsync
  - REPLACE: Exception throwing with Result<T> pattern returns
  - INTEGRATE: SecureStorageManager for OAuth token persistence
  - WRAP: All operations in ExecuteOperationAsync for metrics/state management
  - PRESERVE: Existing Gmail API integration and OAuth flow logic

Task 5: CREATE src/Tests/TrashMailPanda.Tests/Providers/Email/GmailProviderConfigTests.cs
  - IMPLEMENT: Unit tests for configuration validation and defaults
  - FOLLOW pattern: src/Tests/TrashMailPanda.Tests/Security/SecureStorageManagerTests.cs (xUnit + Moq)
  - NAMING: test_{property}_{scenario} method naming convention
  - COVERAGE: Validation rules, default values, invalid configurations
  - PLACEMENT: Tests/Providers/Email directory structure

Task 6: CREATE src/Tests/TrashMailPanda.Tests/Providers/Email/GmailEmailProviderTests.cs
  - IMPLEMENT: Comprehensive unit tests for all IEmailProvider methods
  - FOLLOW pattern: src/Tests/TrashMailPanda.Tests/Services/StartupOrchestratorTests.cs (Mock setup)
  - MOCK: GmailService, SecureStorageManager, ILogger dependencies  
  - COVERAGE: Success cases, error cases, rate limiting, authentication flows
  - PLACEMENT: Tests/Providers/Email directory structure

Task 7: CREATE src/Tests/TrashMailPanda.Tests/Providers/Email/Integration/GmailApiIntegrationTests.cs
  - IMPLEMENT: Integration tests with real Gmail API (conditional on credentials)
  - FOLLOW pattern: src/Tests/TrashMailPanda.Tests/Integration/SecureStorageIntegrationTests.cs
  - CONDITIONAL: Skip tests if Gmail credentials not available
  - COVERAGE: OAuth flow, basic API operations, error handling
  - PLACEMENT: Tests/Providers/Email/Integration directory

Task 8: CREATE src/Tests/TrashMailPanda.Tests/Utilities/GmailTestHelper.cs
  - IMPLEMENT: Test utilities for Gmail API mocking and test data generation
  - FOLLOW pattern: src/Tests/TrashMailPanda.Tests/Utilities/PlatformTestHelper.cs
  - NAMING: GmailTestHelper class, helper method naming
  - CONTENT: Mock Gmail API responses, test email data, configuration builders
  - PLACEMENT: Tests/Utilities directory
```

### Implementation Patterns & Key Details

```csharp
// Provider Base Class Integration Pattern
public class GmailEmailProvider : BaseProvider<GmailProviderConfig>, IEmailProvider
{
    private readonly ISecureStorageManager _secureStorageManager;
    private readonly IGmailRateLimitHandler _rateLimitHandler;
    private GmailService? _gmailService;
    
    public override string Name => "Gmail";
    public override string Version => "1.0.0";
    
    public GmailEmailProvider(
        ISecureStorageManager secureStorageManager,
        IGmailRateLimitHandler rateLimitHandler,
        ILogger<GmailEmailProvider> logger) 
        : base(logger)
    {
        _secureStorageManager = secureStorageManager ?? throw new ArgumentNullException(nameof(secureStorageManager));
        _rateLimitHandler = rateLimitHandler ?? throw new ArgumentNullException(nameof(rateLimitHandler));
    }

    protected override async Task<Result<bool>> PerformInitializationAsync(
        GmailProviderConfig config, 
        CancellationToken cancellationToken)
    {
        // PATTERN: Initialize Gmail service with stored OAuth tokens
        var tokenResult = await _secureStorageManager.RetrieveGmailTokenAsync("access_token");
        if (tokenResult.IsFailure)
            return Result<bool>.Failure(new AuthenticationError("No stored Gmail credentials"));
            
        // Create Gmail service with credentials
        // CRITICAL: Handle token refresh automatically
    }
    
    // Operation Wrapper Pattern for Rate Limiting
    public async Task<IReadOnlyList<EmailSummary>> ListAsync(ListOptions options)
    {
        return await ExecuteOperationAsync("List", async (cancellationToken) =>
        {
            return await _rateLimitHandler.ExecuteWithRetryAsync(async () =>
            {
                var request = _gmailService.Users.Messages.List("me");
                
                // PATTERN: Apply ListOptions to Gmail API request
                if (!string.IsNullOrEmpty(options.Query))
                    request.Q = options.Query;
                    
                if (options.MaxResults.HasValue)
                    request.MaxResults = Math.Min(options.MaxResults.Value, GmailConstants.Quotas.MAX_LIST_RESULTS);
                    
                var response = await request.ExecuteAsync(cancellationToken);
                var summaries = await ConvertToEmailSummariesAsync(response.Messages);
                
                return Result<IReadOnlyList<EmailSummary>>.Success(summaries);
            }, cancellationToken);
        });
    }

    // Batch Operations Pattern
    public async Task BatchModifyAsync(BatchModifyRequest request)
    {
        return await ExecuteOperationAsync("BatchModify", async (cancellationToken) =>
        {
            // PATTERN: Split large requests into Gmail API batch size limits
            var batches = request.EmailIds.Batch(GmailConstants.Quotas.MAX_BATCH_SIZE);
            
            foreach (var batch in batches)
            {
                var batchRequest = new BatchModifyMessagesRequest
                {
                    Ids = batch.ToList(),
                    AddLabelIds = request.AddLabelIds?.ToList(),
                    RemoveLabelIds = request.RemoveLabelIds?.ToList()
                };
                
                await _rateLimitHandler.ExecuteWithRetryAsync(async () =>
                {
                    await _gmailService.Users.Messages.BatchModify(batchRequest, "me").ExecuteAsync(cancellationToken);
                    return Result<bool>.Success(true);
                }, cancellationToken);
            }
            
            return Result<bool>.Success(true);
        });
    }
}

// Rate Limiting Service Pattern
public class GmailRateLimitHandler : IGmailRateLimitHandler
{
    public async Task<Result<T>> ExecuteWithRetryAsync<T>(
        Func<Task<Result<T>>> operation,
        CancellationToken cancellationToken = default)
    {
        var maxRetries = 5;
        var baseDelay = TimeSpan.FromSeconds(1);
        
        for (int attempt = 0; attempt < maxRetries; attempt++)
        {
            try
            {
                return await operation();
            }
            catch (GoogleApiException ex) when (ex.HttpStatusCode == HttpStatusCode.TooManyRequests)
            {
                if (attempt == maxRetries - 1)
                    return Result<T>.Failure(new RateLimitError($"Max retries exceeded: {ex.Message}"));
                    
                var delay = TimeSpan.FromMilliseconds(baseDelay.TotalMilliseconds * Math.Pow(2, attempt));
                await Task.Delay(delay, cancellationToken);
            }
            catch (GoogleApiException ex) when (ex.HttpStatusCode == HttpStatusCode.Forbidden)
            {
                return Result<T>.Failure(new AuthenticationError($"Access forbidden: {ex.Message}"));
            }
            catch (GoogleApiException ex)
            {
                return Result<T>.Failure(new NetworkError($"Gmail API error: {ex.Message}"));
            }
        }
        
        return Result<T>.Failure(new TimeoutError("Operation failed after all retries"));
    }
}

// Test Pattern Example
[Fact]
public async Task ListAsync_WithValidOptions_ShouldReturnEmailSummaries()
{
    // Arrange
    var config = CreateValidConfig();
    await _provider.InitializeAsync(config);
    
    var options = new ListOptions { Query = "is:unread", MaxResults = 10 };
    
    // Mock Gmail API response
    var mockMessage = new Message { Id = "123", Snippet = "Test email" };
    _mockGmailService.Setup(x => x.Users.Messages.List("me"))
        .Returns(CreateMockListRequest(new[] { mockMessage }));
    
    // Act
    var result = await _provider.ListAsync(options);
    
    // Assert
    Assert.True(result.IsSuccess);
    Assert.Single(result.Value);
    Assert.Equal("123", result.Value.First().Id);
}
```

### Integration Points

```yaml
SECURE_STORAGE:
  - integration: "Use existing SecureStorageManager for OAuth token persistence"
  - keys: "gmail_access_token, gmail_refresh_token, gmail_client_id, gmail_client_secret"
  - pattern: "await _secureStorageManager.StoreGmailTokenAsync(tokenType, token)"

DEPENDENCY_INJECTION:
  - add to: "src/TrashMailPanda/ServiceCollectionExtensions.cs"
  - pattern: "services.AddScoped<IEmailProvider, GmailEmailProvider>()"
  - dependencies: "Register GmailRateLimitHandler, configure GmailProviderConfig"

PROVIDER_BRIDGE:
  - integration: "Existing ProviderBridgeService automatically detects IEmailProvider"
  - health_checks: "Provider health status displayed in startup dashboard"
  - configuration: "GmailProviderConfig loaded from appsettings and user secrets"
```

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run after each file creation - fix before proceeding
dotnet format src/Providers/Email/ --verify-no-changes    # Code formatting validation
dotnet build src/Providers/Email/                        # Compilation check
dotnet test src/Tests/TrashMailPanda.Tests/ --filter "Category=Unit&FullyQualifiedName~Gmail" # Unit test validation

# Expected: Zero errors. If errors exist, READ output and fix before proceeding.
```

### Level 2: Unit Tests (Component Validation)

```bash
# Test each component as it's created
dotnet test src/Tests/TrashMailPanda.Tests/Providers/Email/GmailProviderConfigTests.cs -v
dotnet test src/Tests/TrashMailPanda.Tests/Providers/Email/GmailEmailProviderTests.cs -v

# Coverage validation
dotnet test src/Tests/TrashMailPanda.Tests/ --filter "FullyQualifiedName~Gmail" --collect:"XPlat Code Coverage"

# Expected: All tests pass, 95%+ coverage for provider implementation
```

### Level 3: Integration Testing (System Validation)

```bash
# Provider integration validation
dotnet run --project src/TrashMailPanda -- --validate-providers

# Gmail API integration (requires test credentials)
dotnet test src/Tests/TrashMailPanda.Tests/Providers/Email/Integration/ -v

# Health check validation through startup
dotnet run --project src/TrashMailPanda
# Verify Gmail provider shows as "Healthy" or "Setup Required" in dashboard

# Expected: Provider integrates correctly, OAuth flow works, API operations succeed
```

### Level 4: Security & Performance Validation

```bash
# Security validation - ensure no credential exposure
dotnet test src/Tests/TrashMailPanda.Tests/ --filter "Category=Security&FullyQualifiedName~Gmail"

# Rate limiting performance test
dotnet test src/Tests/TrashMailPanda.Tests/ --filter "Category=Performance&FullyQualifiedName~Gmail"

# Load test with Gmail API rate limits
# Test should demonstrate proper 429 handling and exponential backoff

# Expected: No credential leaks, rate limiting works correctly, performance within bounds
```

## Final Validation Checklist

### Technical Validation

- [ ] All 4 validation levels completed successfully  
- [ ] All tests pass: `dotnet test --filter "FullyQualifiedName~Gmail"`
- [ ] Code coverage ≥95%: Check coverage report for GmailEmailProvider
- [ ] No compilation errors: `dotnet build src/Providers/Email/`
- [ ] Code formatting: `dotnet format --verify-no-changes`

### Feature Validation

- [ ] OAuth2 authentication flow works with SecureStorageManager
- [ ] ListAsync supports Gmail search queries and pagination
- [ ] GetAsync retrieves complete message content with headers/body
- [ ] BatchModifyAsync performs TRASH/SPAM operations correctly  
- [ ] Rate limiting handles 429 errors with exponential backoff
- [ ] ReportPhishingAsync falls back to SPAM labeling
- [ ] Provider health checks validate Gmail API connectivity
- [ ] Integration with provider status dashboard works

### Code Quality Validation

- [ ] Follows BaseProvider pattern consistently
- [ ] Uses Result<T> pattern instead of exceptions
- [ ] Proper dependency injection registration
- [ ] SecureStorageManager integration for OAuth tokens
- [ ] Comprehensive error handling for all Gmail API scenarios
- [ ] Provider state management follows established patterns
- [ ] Test coverage includes success, error, and edge cases

### Documentation & Deployment

- [ ] Provider configuration documented in CLAUDE.md
- [ ] Gmail OAuth scopes documented with justification
- [ ] Rate limiting behavior documented for operations team
- [ ] Integration tests provide real-world usage examples
- [ ] Error handling covers all Gmail API error scenarios

---

## Anti-Patterns to Avoid

- ❌ Don't throw exceptions from provider methods - use Result<T> pattern
- ❌ Don't ignore Gmail API rate limits - implement proper exponential backoff  
- ❌ Don't store OAuth tokens in plain text - use SecureStorageManager
- ❌ Don't bypass BaseProvider pattern - inherit and implement required methods
- ❌ Don't hardcode Gmail API limits - use GmailConstants for maintainability
- ❌ Don't skip health checks - implement proper Gmail API connectivity validation
- ❌ Don't forget batch size limits - respect Gmail's 100 operation limit
- ❌ Don't ignore token refresh - handle OAuth token expiration gracefully