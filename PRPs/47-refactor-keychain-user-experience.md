name: "Refactor Keychain Storage for Improved User Experience"
description: |
  Improve user experience by simplifying keychain prompts and using user-friendly service names in macOS Keychain Access instead of technical credential identifiers that confuse non-technical users.

---

## Goal

**Feature Goal**: Eliminate technical service names from macOS keychain dialogs and replace them with a single user-friendly "TrashMail Panda" keychain entry that stores a master encryption key for all credentials, while maintaining the same security level and zero-password user experience.

**Deliverable**: Enhanced CredentialEncryption service with user-friendly keychain integration and improved service naming conventions that store a single master key in OS keychain and encrypt individual credentials in the existing SQLCipher database.

**Success Definition**: Users see only "TrashMail Panda" in keychain dialogs instead of technical names like "google_access_token", while maintaining full security functionality and backward compatibility with existing provider integrations.

## User Persona

**Target User**: Non-technical TrashMail Panda users who need to grant keychain access for credential storage

**Use Case**: Setting up Gmail and OpenAI provider credentials during application onboarding

**User Journey**: 
1. User installs TrashMail Panda
2. User attempts to set up Gmail provider
3. macOS prompts for keychain access with clear "TrashMail Panda" service name
4. User grants access understanding it's for the application
5. All subsequent credential operations happen transparently

**Pain Points Addressed**: 
- Users seeing confusing technical prompts like "gmail_access_token" in keychain dialogs
- Users not understanding what service is requesting keychain access
- Multiple keychain prompts for different credential types

## Why

- **Improved User Experience**: Single, clear keychain prompt instead of multiple technical prompts
- **Better Security Understanding**: Users can easily identify TrashMail Panda entries in Keychain Access.app  
- **Simplified Architecture**: Reduce complexity by storing single master key instead of individual credentials in keychain
- **Maintained Security**: Same security level using existing SQLCipher database for credential storage
- **Backward Compatibility**: Preserve existing provider integrations without breaking changes

## What

Transform the current multi-credential keychain storage approach into a master-key approach:

**Current State**: Each credential type (gmail_access_token, gmail_refresh_token, openai_api_key) stored individually in OS keychain with technical service names

**Desired State**: Single "TrashMail Panda" master key stored in OS keychain, individual credentials encrypted and stored in existing SQLCipher database

### Success Criteria

- [ ] Users see only "TrashMail Panda" in keychain access prompts
- [ ] All existing credential storage/retrieval functionality works unchanged  
- [ ] Zero breaking changes to provider integration code
- [ ] Security audit logs continue working as before
- [ ] Health checks validate both keychain and database encryption
- [ ] Clean implementation for new app - no migration complexity needed

## All Needed Context

### Context Completeness Check

_"If someone knew nothing about this codebase, would they have everything needed to implement this successfully?"_ 

✅ **Yes** - This PRP provides complete architecture understanding, specific file patterns to follow, exact implementation details, and comprehensive validation approach.

### Documentation & References

```yaml
# MUST READ - Include these in your context window
- file: src/Shared/TrashMailPanda.Shared/Security/CredentialEncryption.cs
  why: Current keychain integration implementation with platform-specific P/Invoke code
  pattern: Platform-specific encryption methods (EncryptMacOSAsync, EncryptWindowsAsync, EncryptLinuxAsync)
  gotcha: Line 434 shows technical service name issue - var service = context ?? "TrashMail Panda"

- file: src/Shared/TrashMailPanda.Shared/Security/SecureStorageManager.cs  
  why: High-level credential management interface that calls CredentialEncryption
  pattern: Provider-specific helper methods (StoreGmailTokenAsync, RetrieveGmailTokenAsync)
  gotcha: Uses technical prefixes like "gmail_", "openai_" that appear in keychain

- file: src/TrashMailPanda/TrashMailPanda/Services/GmailOAuthService.cs
  why: Example of how providers currently store credentials via SecureStorageManager
  pattern: Custom DataStore integration with Google OAuth using SecureTokenDataStore class
  gotcha: Stores individual token components separately (access, refresh, expiry)

- file: src/Shared/TrashMailPanda.Shared/Security/ICredentialEncryption.cs
  why: Interface definition that must be preserved for backward compatibility
  pattern: EncryptAsync/DecryptAsync methods with context parameter
  gotcha: Context parameter is used for keychain service names - needs refactoring

- file: src/Tests/TrashMailPanda.Tests/Security/SecureStorageManagerTests.cs
  why: Test patterns for security components that must continue passing
  pattern: Mock-based testing with Moq, Result pattern validation
  gotcha: Tests use [Trait("Category", "Security")] for categorization

- file: src/Tests/TrashMailPanda.Tests/Integration/SecureStorageIntegrationTests.cs
  why: Real keychain integration tests that validate cross-platform functionality
  pattern: Platform-specific test execution with timeout handling
  gotcha: 60-second timeouts for keychain operations, skip on wrong platform

- docfile: PRPs/ai_docs/secure_storage_implementation.md
  why: Comprehensive documentation of current security architecture patterns
  section: Master Key Management and Cross-Platform Integration sections
```

### Current Codebase tree

```bash
.
├── data
│   └── app.db
├── PRPs
│   ├── ai_docs
│   │   ├── secure_storage_implementation.md
│   │   └── [other docs...]
│   └── templates
├── src
│   ├── Providers
│   │   ├── Email
│   │   ├── LLM
│   │   └── Storage
│   ├── Shared
│   │   └── TrashMailPanda.Shared
│   ├── Tests
│   │   └── TrashMailPanda.Tests
│   └── TrashMailPanda
│       └── TrashMailPanda
├── CLAUDE.md
└── TrashMailPanda.sln
```

### Desired Codebase tree with files to be added and responsibility of file

```bash
# No new files required - refactoring existing architecture
src/Shared/TrashMailPanda.Shared/Security/
├── CredentialEncryption.cs          # [MODIFIED] Master key approach, user-friendly service names
├── SecureStorageManager.cs          # [MODIFIED] Updated to use database storage for credentials  
├── ICredentialEncryption.cs         # [PRESERVED] Same interface for backward compatibility
└── MasterKeyManager.cs              # [NEW] Helper class for master key derivation and validation

# Enhanced test coverage for new functionality
src/Tests/TrashMailPanda.Tests/Security/
├── CredentialEncryptionTests.cs     # [MODIFIED] Add master key tests
├── SecureStorageManagerTests.cs     # [MODIFIED] Update for database credential storage
├── SecureStorageIntegrationTests.cs # [MODIFIED] Test single keychain entry approach
└── MasterKeyManagerTests.cs         # [NEW] Unit tests for master key operations
```

### Known Gotchas of our codebase & Library Quirks

```csharp
// CRITICAL: TrashMail Panda uses Result<T> pattern - NO exceptions in provider layer
// Must return Result<T>.Success() or Result<T>.Failure() for all operations

// CRITICAL: Platform-specific keychain integration via P/Invoke
// macOS: SecKeychainAddGenericPassword requires UTF8 byte counting for service/account length
// Windows: DPAPI requires DataProtectionScope.CurrentUser with entropy
// Linux: libsecret may not be available, needs graceful fallback

// CRITICAL: SQLCipher database already exists and is working
// Database file: data/app.db with encryption, don't break existing tables
// Schema migrations handled by storage provider InitializeAsync method

// CRITICAL: ConcurrentDictionary used for in-memory credential cache
// Thread-safe operations required, existing patterns use TryAdd/TryGetValue

// CRITICAL: Health checks must validate both keychain access AND database encryption
// Startup orchestration depends on health check results for provider readiness

// CRITICAL: Security audit logging must continue for compliance
// All credential operations logged via SecurityAuditLogger without exposing secrets

// CRITICAL: Xamarin.Essentials NOT available - custom platform detection required
// Use RuntimeInformation.IsOSPlatform(OSPlatform.OSX/Windows/Linux) for platform checks
```

## Implementation Blueprint

### Data models and structure

Core types are already established - preserve existing Result types and add master key support:

```csharp
// PRESERVE existing types - no breaking changes
public class SecureStorageResult<T> { }
public class EncryptionResult<T> { }

// NEW: Master key management
public class MasterKeyResult
{
    public bool IsSuccess { get; set; }
    public string? MasterKey { get; set; }
    public string? ErrorMessage { get; set; }
    public EncryptionErrorType ErrorType { get; set; }
}

// ENHANCE: Database credential storage model
public class EncryptedCredential
{
    public string Key { get; set; }
    public string EncryptedValue { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? ExpiresAt { get; set; }
}
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: CREATE src/Shared/TrashMailPanda.Shared/Security/MasterKeyManager.cs
  - IMPLEMENT: MasterKeyManager class with GenerateMasterKey, DeriveMasterKey, ValidateMasterKey methods
  - FOLLOW pattern: src/Shared/TrashMailPanda.Shared/Security/CredentialEncryption.cs (Result pattern, platform detection)
  - NAMING: MasterKeyManager class, async methods with Result<T> return types  
  - PLACEMENT: Same directory as other security classes
  - DEPENDENCIES: None - standalone utility class

Task 2: MODIFY src/Shared/TrashMailPanda.Shared/Security/CredentialEncryption.cs
  - IMPLEMENT: Refactor service name logic to use "TrashMail Panda" consistently
  - PRESERVE: Same interface methods - EncryptAsync, DecryptAsync with context parameter
  - CHANGE: Store/retrieve master key instead of individual credentials in keychain
  - FOLLOW pattern: Keep existing platform-specific P/Invoke code structure
  - DEPENDENCIES: Use MasterKeyManager from Task 1

Task 3: MODIFY src/Shared/TrashMailPanda.Shared/Security/SecureStorageManager.cs  
  - IMPLEMENT: Database credential storage using master key for encryption
  - PRESERVE: Same public interface - StoreCredentialAsync, RetrieveCredentialAsync methods
  - CHANGE: Store encrypted credentials in SQLCipher database instead of keychain
  - FOLLOW pattern: Keep existing Result<T> return types and error handling
  - DEPENDENCIES: Updated CredentialEncryption from Task 2

Task 4: CREATE src/Tests/TrashMailPanda.Tests/Security/MasterKeyManagerTests.cs
  - IMPLEMENT: Unit tests for master key operations (generate, derive, validate)
  - FOLLOW pattern: src/Tests/TrashMailPanda.Tests/Security/CredentialEncryptionTests.cs (Moq usage, platform traits)
  - NAMING: test_{method}_{scenario} convention
  - COVERAGE: All public methods with success and failure scenarios
  - PLACEMENT: Same directory as other security tests

Task 5: MODIFY src/Tests/TrashMailPanda.Tests/Security/CredentialEncryptionTests.cs
  - UPDATE: Add tests for master key storage approach  
  - PRESERVE: Existing test structure and platform-specific test traits
  - ADD: Tests for user-friendly service names in keychain operations
  - FOLLOW pattern: Keep [Trait("Category", "Security")] and platform detection
  - DEPENDENCIES: None - test updates only

Task 6: MODIFY src/Tests/TrashMailPanda.Tests/Integration/SecureStorageIntegrationTests.cs
  - UPDATE: Integration tests for single keychain entry approach
  - PRESERVE: 60-second timeout patterns and platform-specific execution  
  - ADD: Validate master key retrieval and credential database operations
  - FOLLOW pattern: Real OS keychain integration without mocks
  - DEPENDENCIES: Updated implementation from Tasks 2-3
```

### Implementation Patterns & Key Details

```csharp
// CRITICAL: Master Key Management Pattern
public class MasterKeyManager
{
    // Generate 256-bit master key for new installations
    public Result<string> GenerateMasterKey()
    {
        using var rng = RandomNumberGenerator.Create();
        var keyBytes = new byte[32]; // 256-bit key
        rng.GetBytes(keyBytes);
        var key = Convert.ToBase64String(keyBytes);
        
        // PATTERN: SecureClear after use (follow CredentialEncryption pattern)
        SecureClear(keyBytes);
        
        return Result<string>.Success(key);
    }
    
    // CRITICAL: Derive master key from system entropy for consistency
    public async Task<Result<string>> DeriveMasterKeyAsync()
    {
        // PATTERN: Platform-specific entropy sources like existing implementation
        // GOTCHA: Must be deterministic for same user/machine combination
        var entropy = GetSystemEntropy();
        return await DeriveKeyFromEntropyAsync(entropy);
    }
}

// CRITICAL: User-Friendly Service Names Pattern  
private async Task<EncryptionResult<string>> EncryptMacOSAsync(string plainText, string? context)
{
    // OLD: var service = context ?? "TrashMail Panda";
    // NEW: Always use user-friendly name
    const string service = "TrashMail Panda";
    const string account = "master-encryption-key";
    
    // PATTERN: Same P/Invoke structure, different service/account names
    var status = MacOSKeychain.SecKeychainAddGenericPassword(
        defaultKeychain,
        (uint)Encoding.UTF8.GetByteCount(service), service,
        (uint)Encoding.UTF8.GetByteCount(account), account,
        (uint)masterKeyBytes.Length, masterKeyBytes,
        out var itemRef);
    
    // NOTE: New app - no migration needed, clean implementation
}

// CRITICAL: Database Credential Storage Pattern
public class SecureStorageManager
{
    public async Task<SecureStorageResult> StoreCredentialAsync(string key, string credential)
    {
        // PATTERN: Get master key from keychain (single entry)
        var masterKeyResult = await _credentialEncryption.GetMasterKeyAsync();
        if (!masterKeyResult.IsSuccess)
        {
            return SecureStorageResult.Failure(masterKeyResult.ErrorMessage);
        }
        
        // PATTERN: Encrypt credential with master key
        var encryptedResult = await EncryptWithMasterKeyAsync(credential, masterKeyResult.Value, key);
        
        // NEW: Store in SQLCipher database instead of keychain
        await StoreInDatabaseAsync(key, encryptedResult.Value);
        
        // PATTERN: Cache in memory for performance (existing pattern)
        _cache.TryAdd(key, credential);
        
        return SecureStorageResult.Success();
    }
}

// SIMPLIFIED: Clean Implementation for New App
public async Task<Result<bool>> InitializeMasterKeyAsync()
{
    // Generate new master key for fresh installation
    var masterKeyResult = await _masterKeyManager.GenerateMasterKeyAsync();
    
    if (masterKeyResult.IsSuccess)
    {
        // Store master key in keychain with user-friendly service name
        await StoreInKeychainAsync(masterKeyResult.Value);
        
        _logger.LogInformation("Master key initialized successfully");
    }
    
    return Result<bool>.Success(true);
}
```

### Integration Points

```yaml
DATABASE:
  - table: "encrypted_credentials" (add to existing SQLCipher database)
  - schema: "CREATE TABLE encrypted_credentials (key TEXT PRIMARY KEY, encrypted_value TEXT, created_at DATETIME, expires_at DATETIME)"
  - migration: "Add encrypted_credentials table in storage provider InitializeAsync"

DEPENDENCY_INJECTION:
  - preserve: "services.AddSingleton<ICredentialEncryption, CredentialEncryption>();" 
  - preserve: "services.AddSingleton<ISecureStorageManager, SecureStorageManager>();"
  - add: "services.AddSingleton<IMasterKeyManager, MasterKeyManager>();"

PROVIDER_INTEGRATION:
  - gmail: No changes to GmailOAuthService - same SecureStorageManager interface
  - openai: No changes to OpenAI provider - same credential storage methods
  - storage: Storage provider handles database schema migration automatically

HEALTH_CHECKS:
  - enhance: Validate both keychain master key access and database encryption
  - preserve: Same health check interface for startup orchestration
  - add: Master key derivation validation during health checks
```

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run after each file modification - fix before proceeding
dotnet format src/Shared/TrashMailPanda.Shared/Security/ --verify-no-changes
dotnet build src/Shared/TrashMailPanda.Shared/ --configuration Debug
dotnet format src/Tests/TrashMailPanda.Tests/Security/ --verify-no-changes

# Project-wide validation  
dotnet build --configuration Debug
dotnet format --verify-no-changes

# Expected: Zero errors. Fix any compilation or formatting issues before proceeding.
```

### Level 2: Unit Tests (Component Validation)

```bash
# Test each component as it's modified
dotnet test src/Tests/TrashMailPanda.Tests/Security/MasterKeyManagerTests.cs -v
dotnet test src/Tests/TrashMailPanda.Tests/Security/CredentialEncryptionTests.cs -v  
dotnet test src/Tests/TrashMailPanda.Tests/Security/SecureStorageManagerTests.cs -v

# Full security test suite
dotnet test src/Tests/TrashMailPanda.Tests/Security/ -v --filter "Category=Security"

# Platform-specific test execution (run on each platform)
dotnet test --filter "Platform=Windows" -v  # Run on Windows
dotnet test --filter "Platform=OSX" -v     # Run on macOS  
dotnet test --filter "Platform=Linux" -v   # Run on Linux

# Expected: All tests pass. Debug and fix any failing tests before proceeding.
```

### Level 3: Integration Testing (System Validation)

```bash
# Integration tests for keychain operations
dotnet test src/Tests/TrashMailPanda.Tests/Integration/SecureStorageIntegrationTests.cs -v

# Application startup validation
dotnet build --configuration Debug
dotnet run --project src/TrashMailPanda/TrashMailPanda &
sleep 5  # Allow startup time

# Provider health check validation
# Should see single "TrashMail Panda" keychain entry instead of multiple technical entries

# Manual keychain verification (macOS)
# Open Keychain Access.app and verify only "TrashMail Panda" entries exist
# No "gmail_access_token" or other technical entries should be visible

# Database credential validation
sqlite3 data/app.db "SELECT COUNT(*) FROM encrypted_credentials;"
# Should show encrypted credentials in database instead of keychain

# Expected: All integrations working, single keychain entry, credentials in database
```

### Level 4: Creative & Domain-Specific Validation

```bash
# Security-specific validations
dotnet tool restore && dotnet security-scan

# Cross-platform keychain behavior validation
# Test on Windows: Verify DPAPI master key storage
# Test on macOS: Verify Keychain master key with "TrashMail Panda" service name  
# Test on Linux: Verify libsecret fallback behavior

# User experience validation
# Simulate fresh installation - should see single keychain prompt
# Simulate existing installation - should migrate seamlessly
# Verify no confusing technical prompts during credential setup

# Performance validation
# Measure credential retrieval performance (should be similar to before)
# Validate memory usage doesn't increase significantly with database storage

# Fresh Installation validation  
# Test with clean installation - no existing keychain entries
# Verify single "TrashMail Panda" keychain entry creation
# Confirm all provider integrations work correctly from fresh state

# Expected: All validations pass, improved UX, maintained security and performance
```

## Final Validation Checklist

### Technical Validation

- [ ] All 4 validation levels completed successfully
- [ ] All tests pass: `dotnet test src/Tests/TrashMailPanda.Tests/Security/ -v`
- [ ] No compilation errors: `dotnet build --configuration Debug`
- [ ] No formatting issues: `dotnet format --verify-no-changes`
- [ ] Cross-platform functionality verified on Windows, macOS, and Linux

### Feature Validation

- [ ] Users see only "TrashMail Panda" in keychain dialogs (no technical service names)
- [ ] All existing credential storage/retrieval functionality works unchanged
- [ ] Provider integrations (Gmail, OpenAI) continue working without modification
- [ ] Clean initialization works for new installations without migration complexity  
- [ ] Health checks validate both keychain and database encryption functionality
- [ ] Security audit logging continues working as before

### Code Quality Validation

- [ ] Follows existing Result<T> pattern with no exceptions in provider layer
- [ ] File modifications preserve public interfaces for backward compatibility
- [ ] Database integration uses existing SQLCipher setup without breaking changes
- [ ] Thread-safe operations using existing ConcurrentDictionary patterns
- [ ] Platform-specific code follows existing P/Invoke patterns
- [ ] Error handling provides clear messages without exposing sensitive information

### Documentation & Deployment

- [ ] Code changes are self-documenting with clear method/variable names
- [ ] Security audit logs provide appropriate detail level
- [ ] Clean initialization handles edge cases (keychain access denied, database errors)
- [ ] Health checks provide clear status messages for troubleshooting

---

## Anti-Patterns to Avoid

- ❌ Don't break the existing Result<T> pattern - no exceptions in provider layer
- ❌ Don't modify provider integration interfaces - preserve backward compatibility  
- ❌ Don't store credentials in plain text anywhere - maintain encryption throughout
- ❌ Don't add unnecessary migration complexity - keep implementation clean and simple
- ❌ Don't ignore platform-specific behaviors - test on all supported platforms
- ❌ Don't remove security audit logging - compliance requires operation tracking
- ❌ Don't change DI registration patterns - preserve existing service lifetimes
- ❌ Don't hardcode service names - use consistent constants for maintainability

**Confidence Score**: 9/10 for one-pass implementation success likelihood

This PRP provides comprehensive context, specific implementation patterns, preserved interfaces for backward compatibility, and detailed validation procedures. The research shows this approach aligns with industry standards while significantly improving user experience.