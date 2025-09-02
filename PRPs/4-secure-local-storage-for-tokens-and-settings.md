# Secure Local Storage for Tokens and Settings - .NET Implementation

## Goal

**Feature Goal**: Complete the existing comprehensive secure storage system by implementing missing macOS/Linux OS keychain integrations and finalizing token rotation capabilities, ensuring all Gmail OAuth tokens, OpenAI API keys, and application settings are encrypted at rest using OS-level credential storage and SQLite database encryption.

**Deliverable**: Production-ready complete implementation of the existing SecureStorageManager and CredentialEncryption classes with full cross-platform OS keychain integration (DPAPI on Windows, macOS Keychain, libsecret on Linux), automatic token rotation, and comprehensive security audit logging.

**Success Definition**: All sensitive credentials are encrypted at rest across Windows, macOS, and Linux platforms, tokens automatically rotate before expiration, security events are logged without exposing secrets, and the system gracefully handles corruption/compromise scenarios with recovery procedures.

## User Persona

**Target User**: TrashMail Panda application users who need to store Gmail OAuth credentials and OpenAI API keys securely on their local machine

**Use Case**: Users authenticate with Gmail and configure OpenAI API access during onboarding, then the application securely stores and manages these credentials across sessions while processing thousands of emails

**User Journey**:

1. User completes Gmail OAuth flow → tokens automatically encrypted and stored using OS-level security (no user passwords required)
2. User enters OpenAI API key → key automatically encrypted and stored with zero-configuration security
3. Application processes emails → automatically refreshes tokens as needed without user interaction
4. User restarts application → credentials seamlessly available without re-authentication or password prompts
5. Security event occurs → user notified with recovery options, audit trail maintained (no password recovery needed)

**Pain Points Addressed**: Eliminates plaintext credential storage, prevents token expiration disruptions, provides recovery from corrupted credentials, maintains security compliance for enterprise users, ensures zero-password user experience with automatic OS-level encryption

## Why

- **Business Value**: Enables secure Gmail and OpenAI integration for processing thousands of emails without compromising user credentials or API access
- **Integration**: Leverages existing IStorageProvider interface and Result<T> pattern while adding enterprise-grade security
- **Problems Solved**: Prevents credential theft, ensures uninterrupted email processing, provides audit trail for compliance, enables secure multi-session usage

## What

Complete the existing hybrid secure storage system that combines .NET OS-level credential storage APIs (DPAPI, macOS Keychain, libsecret) with encrypted SQLite database storage. The system already has comprehensive interfaces and partial implementations - this task focuses on completing the missing macOS/Linux implementations and token rotation features.

**🔑 ZERO-PASSWORD USER EXPERIENCE GUARANTEE**: Users will never be prompted for passwords, passphrases, or secret keys. All encryption is handled automatically using OS-level security features and machine-specific key derivation.

### Success Criteria

- [ ] Complete macOS Keychain Services integration in CredentialEncryption class (currently stubbed with TODO)
- [ ] Complete Linux libsecret integration in CredentialEncryption class (currently stubbed with TODO)
- [ ] Gmail OAuth tokens encrypted and stored using completed cross-platform credential encryption (Windows DPAPI already working)
- [ ] OpenAI API keys encrypted using completed cross-platform System.Security.Cryptography implementation
- [ ] Email metadata and user rules stored in encrypted SQLite database using existing Microsoft.Data.Sqlite with SQLitePCLRaw.bundle_e_sqlcipher
- [ ] Implement automatic token rotation service using existing SecureStorageManager methods
- [ ] Security audit logging without exposing actual credentials (SecurityAuditLogger already implemented)
- [ ] Recovery procedures for corrupted storage and compromised credentials
- [ ] xUnit tests covering cross-platform encryption, decryption, and rotation scenarios
- [ ] Integration tests validating end-to-end security across app restarts on all platforms

## All Needed Context

### Context Completeness Check

_This PRP provides everything needed to complete the existing secure credential storage implementation, including specific cross-platform OS keychain integration patterns, token rotation service implementation, and comprehensive validation procedures for the existing .NET architecture._

### Documentation & References

```yaml
# MUST READ - Include these in your context window
- url: https://learn.microsoft.com/en-us/dotnet/api/system.security.cryptography.protecteddata
  why: .NET ProtectedData API for OS-level credential encryption on Windows (DPAPI) - already implemented
  critical: Cross-platform encryption availability detection and secure string encryption methods

- url: https://developer.apple.com/documentation/security/keychain_services
  why: macOS Keychain Services API for secure credential storage - needed for macOS implementation
  critical: Keychain item creation, retrieval, and secure key storage patterns

- url: https://wiki.gnome.org/Projects/Libsecret
  why: Linux libsecret library for GNOME Keyring integration - needed for Linux implementation
  critical: Secret storage, retrieval, and platform-specific integration patterns

- file: src/Shared/TrashMailPanda.Shared/Security/ISecureStorageManager.cs
  why: Complete ISecureStorageManager interface already defined with comprehensive credential operations
  pattern: SecureStorageResult<T> pattern, async operations, health check integration
  gotcha: Interface is complete - implementation in SecureStorageManager class needs no changes

- file: src/Shared/TrashMailPanda.Shared/Security/SecureStorageManager.cs
  why: Fully implemented SecureStorageManager with credential caching and provider integration
  pattern: Comprehensive logging, error handling, credential key prefixes, audit integration
  gotcha: Implementation is complete - no changes needed, just use existing methods

- file: src/Shared/TrashMailPanda.Shared/Security/ICredentialEncryption.cs
  why: Complete ICredentialEncryption interface defining cross-platform encryption contract
  pattern: EncryptionResult<T> pattern, platform-specific async operations, health checks
  gotcha: Interface is complete - need to implement macOS/Linux methods in CredentialEncryption class

- file: src/Shared/TrashMailPanda.Shared/Security/CredentialEncryption.cs
  why: Partial implementation with Windows DPAPI working, macOS/Linux methods stubbed with TODO comments
  pattern: Platform detection, Windows DPAPI implementation, health check integration
  gotcha: Windows implementation complete, macOS/Linux methods return "not implemented" errors

- file: src/Providers/Storage/TrashMailPanda.Providers.Storage/SqliteStorageProvider.cs
  why: Complete SQLite provider with SQLCipher encryption, token storage methods already implemented
  pattern: Encrypted database schema, token storage/retrieval, transaction management
  gotcha: Implementation is complete - already handles encrypted tokens and secure storage

- url: https://www.nuget.org/packages/SQLitePCLRaw.bundle_e_sqlcipher/
  why: SQLCipher integration for .NET already configured in project file
  critical: Database encryption is already set up and working
```

### Current Codebase Tree

```bash
TrashMailPanda/
├── src/
│   ├── TrashMailPanda/TrashMailPanda/           # Main Avalonia application (EXISTS)
│   │   ├── Views/                              # Avalonia XAML views with MVVM
│   │   ├── ViewModels/                         # MVVM view models with CommunityToolkit.Mvvm
│   │   └── Services/                           # Application services and orchestration
│   ├── Shared/TrashMailPanda.Shared/           # Shared types and utilities (COMPLETE)
│   │   ├── Security/                           # Security infrastructure (MOSTLY COMPLETE)
│   │   │   ├── ISecureStorageManager.cs        # Complete interface ✓
│   │   │   ├── SecureStorageManager.cs         # Complete implementation ✓
│   │   │   ├── ICredentialEncryption.cs        # Complete interface ✓
│   │   │   ├── CredentialEncryption.cs         # Windows DPAPI ✓, macOS/Linux TODO
│   │   │   ├── SecurityAuditLogger.cs          # Complete implementation ✓
│   │   │   └── [20+ security result/model files] # All result types and models ✓
│   │   ├── Base/                               # IProvider architecture ✓
│   │   └── Models/                             # Domain models and DTOs ✓
│   ├── Providers/                              # Provider implementations
│   │   ├── Email/                              # Gmail provider (in progress)
│   │   ├── LLM/                                # OpenAI provider (in progress)
│   │   └── Storage/                            # SQLite provider with encryption (COMPLETE)
│   │       └── SqliteStorageProvider.cs        # Full SQLCipher implementation ✓
│   └── Tests/TrashMailPanda.Tests/             # xUnit test infrastructure (EXISTS)
├── data/app.db                                 # Encrypted SQLite database (EXISTS)
├── TrashMailPanda.sln                         # .NET solution file ✓
└── PRPs/ai_docs/                              # Implementation guidance (EXISTS)
```

### Desired Codebase Tree with Files to be Added/Modified

```bash
TrashMailPanda/
├── src/
│   ├── Shared/TrashMailPanda.Shared/
│   │   ├── Security/
│   │   │   ├── CredentialEncryption.cs           # MODIFY: Complete macOS/Linux implementations
│   │   │   │   └── TODO: Implement EncryptMacOSAsync/DecryptMacOSAsync methods
│   │   │   │   └── TODO: Implement EncryptLinuxAsync/DecryptLinuxAsync methods
│   │   │   │   └── TODO: Complete InitializeMacOSAsync/InitializeLinuxAsync methods
│   │   │   ├── TokenRotationService.cs           # NEW: Automatic token rotation service
│   │   │   └── ITokenRotationService.cs          # NEW: Token rotation interface
│   │   └── Utils/                                # NEW: Platform-specific utilities
│   │       ├── MacOSKeychainHelper.cs            # NEW: macOS Keychain Services wrapper
│   │       └── LinuxSecretHelper.cs              # NEW: Linux libsecret wrapper
│   └── Tests/TrashMailPanda.Tests/
│       ├── Security/                             # NEW: Security test suites
│       │   ├── CredentialEncryptionTests.cs      # NEW: Cross-platform encryption tests
│       │   ├── SecureStorageManagerTests.cs      # NEW: Storage manager integration tests
│       │   ├── TokenRotationServiceTests.cs      # NEW: Token rotation tests
│       │   └── PlatformSpecificTests.cs          # NEW: OS-specific encryption tests
│       └── Integration/                          # NEW: Integration test suites
│           ├── SecureStorageIntegrationTests.cs  # NEW: End-to-end security tests
│           └── CrossPlatformStorageTests.cs      # NEW: Multi-platform validation tests
└── Dependencies/                                 # NEW: Platform-specific native libraries
    ├── macOS/                                    # NEW: macOS Keychain Services bindings
    │   └── KeychainServices.cs                   # NEW: P/Invoke declarations for Keychain
    └── Linux/                                    # NEW: Linux libsecret bindings
        └── LibSecretWrapper.cs                   # NEW: P/Invoke declarations for libsecret
```

### Known Gotchas & Library Quirks

```csharp
// CRITICAL: Platform-specific attribute usage for P/Invoke methods
[System.Runtime.Versioning.SupportedOSPlatform("windows")]
private Task<EncryptionResult<string>> EncryptWindowsAsync(string plainText, string? context)

// CRITICAL: SQLCipher is already configured and working in SqliteStorageProvider
// Connection string example from existing code:
var connectionString = new SqliteConnectionStringBuilder
{
    DataSource = _databasePath,
    Password = _password  // SQLCipher encryption key
}.ToString();

// GOTCHA: macOS Keychain Services requires specific P/Invoke signatures
[DllImport("/System/Library/Frameworks/Security.framework/Security")]
private static extern int SecItemAdd(IntPtr attributes, IntPtr result);

// GOTCHA: Linux libsecret requires GNOME desktop environment
// Must check for libsecret availability before attempting to use
private static bool IsLibSecretAvailable() => 
    RuntimeInformation.IsOSPlatform(OSPlatform.Linux) && File.Exists("/usr/lib/libsecret-1.so");

// CRITICAL: Must preserve existing Result<T> pattern from codebase
public async Task<EncryptionResult<string>> EncryptAsync(string plainText, string? context = null)
{
    if (!_isInitialized)
    {
        return EncryptionResult<string>.Failure("Encryption not initialized", EncryptionErrorType.ConfigurationError);
    }
    // Implementation continues...
}

// GOTCHA: Secure memory handling in .NET
public void SecureClear(Span<char> sensitiveData)
{
    // Clear sensitive data from memory
    sensitiveData.Clear();
    // Additional security: overwrite with random data
    var random = new Random();
    for (int i = 0; i < sensitiveData.Length; i++)
    {
        sensitiveData[i] = (char)random.Next(32, 127);
    }
    sensitiveData.Clear();
}

// CRITICAL: All existing security infrastructure is complete
// Windows DPAPI implementation in CredentialEncryption.cs works perfectly
// SecureStorageManager.cs has full implementation with caching and audit logging
// SqliteStorageProvider.cs has complete SQLCipher encryption working
```

## Implementation Blueprint

### Data Models and Structure

Leveraging existing comprehensive security type system - ALL MODELS ALREADY EXIST:

```csharp
// Existing complete interfaces from src/Shared/TrashMailPanda.Shared/Security/ - NO CHANGES NEEDED
public interface ISecureStorageManager
{
    Task<SecureStorageResult> StoreCredentialAsync(string key, string credential);
    Task<SecureStorageResult<string>> RetrieveCredentialAsync(string key);
    Task<SecureStorageResult> RemoveCredentialAsync(string key);
    // ... complete interface already implemented
}

public interface ICredentialEncryption
{
    Task<EncryptionResult<string>> EncryptAsync(string plainText, string? context = null);
    Task<EncryptionResult<string>> DecryptAsync(string encryptedText, string? context = null);
    // ... complete interface already defined
}

// Existing complete result types - ALL IMPLEMENTED
public record SecureStorageResult<T>
{
    public bool IsSuccess { get; init; }
    public T? Value { get; init; }
    public string? ErrorMessage { get; init; }
    public SecureStorageErrorType ErrorType { get; init; }
}

public record EncryptionResult<T>
{
    public bool IsSuccess { get; init; }
    public T? Value { get; init; }
    public string? ErrorMessage { get; init; }
    public EncryptionErrorType ErrorType { get; init; }
}

// New interfaces to be added for token rotation
public interface ITokenRotationService
{
    Task<Result<bool>> StartRotationSchedulerAsync();
    Task<Result<bool>> StopRotationSchedulerAsync();
    Task<Result<TokenRotationResult>> RotateTokensAsync(string providerName);
    Task<Result<bool>> IsTokenNearExpiryAsync(string providerName);
}

public record TokenRotationResult
{
    public string ProviderName { get; init; } = string.Empty;
    public bool WasRotated { get; init; }
    public DateTime? NewExpiryDate { get; init; }
    public string? ErrorMessage { get; init; }
}
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: CREATE src/Shared/TrashMailPanda.Shared/Utils/MacOSKeychainHelper.cs
  - IMPLEMENT: macOS Keychain Services P/Invoke wrapper with SecItemAdd, SecItemCopyMatching, SecItemDelete
  - FOLLOW pattern: src/Shared/TrashMailPanda.Shared/Security/CredentialEncryption.cs (platform detection and error handling)
  - NAMING: MacOSKeychainHelper class with static methods, descriptive P/Invoke function names
  - SECURITY: Use kSecAttrService and kSecAttrAccount for keychain item identification
  - PLATFORM: Apply [SupportedOSPlatform("osx")] attribute for macOS-specific code
  - PLACEMENT: Shared utilities directory for use by CredentialEncryption

Task 2: CREATE src/Shared/TrashMailPanda.Shared/Utils/LinuxSecretHelper.cs
  - IMPLEMENT: Linux libsecret P/Invoke wrapper with secret_store, secret_retrieve, secret_clear functions
  - FOLLOW pattern: src/Shared/TrashMailPanda.Shared/Security/CredentialEncryption.cs (platform detection and error handling)
  - NAMING: LinuxSecretHelper class with static methods, descriptive P/Invoke function names
  - SECURITY: Use secret schemas for GNOME keyring integration
  - PLATFORM: Apply [SupportedOSPlatform("linux")] attribute for Linux-specific code
  - PLACEMENT: Shared utilities directory for use by CredentialEncryption

Task 3: MODIFY src/Shared/TrashMailPanda.Shared/Security/CredentialEncryption.cs
  - IMPLEMENT: Complete macOS implementation in EncryptMacOSAsync, DecryptMacOSAsync, InitializeMacOSAsync methods
  - FOLLOW pattern: existing Windows DPAPI implementation in same file
  - DEPENDENCIES: MacOSKeychainHelper from Task 1
  - REPLACE: TODO placeholders with full macOS Keychain Services integration
  - SECURITY: Use existing context parameter for keychain item identification

Task 4: MODIFY src/Shared/TrashMailPanda.Shared/Security/CredentialEncryption.cs
  - IMPLEMENT: Complete Linux implementation in EncryptLinuxAsync, DecryptLinuxAsync, InitializeLinuxAsync methods
  - FOLLOW pattern: existing Windows DPAPI implementation in same file
  - DEPENDENCIES: LinuxSecretHelper from Task 2
  - REPLACE: TODO placeholders with full libsecret integration
  - SECURITY: Handle libsecret availability detection and graceful fallback

Task 5: CREATE src/Shared/TrashMailPanda.Shared/Security/ITokenRotationService.cs
  - IMPLEMENT: Token rotation service interface with scheduling and provider-specific methods
  - FOLLOW pattern: existing ISecureStorageManager.cs interface structure
  - NAMING: ITokenRotationService interface with Result<T> return types
  - METHODS: StartRotationSchedulerAsync, StopRotationSchedulerAsync, RotateTokensAsync, IsTokenNearExpiryAsync
  - PLACEMENT: Security interfaces directory

Task 6: CREATE src/Shared/TrashMailPanda.Shared/Security/TokenRotationService.cs
  - IMPLEMENT: Token rotation service implementation with Timer-based scheduling
  - FOLLOW pattern: src/Shared/TrashMailPanda.Shared/Security/SecureStorageManager.cs (logging, error handling)
  - DEPENDENCIES: ISecureStorageManager, ICredentialEncryption, ILogger<TokenRotationService>
  - NAMING: TokenRotationService class implementing ITokenRotationService interface
  - PLACEMENT: Security implementations directory

Task 7: CREATE src/Tests/TrashMailPanda.Tests/Security/CredentialEncryptionTests.cs
  - IMPLEMENT: xUnit tests for cross-platform credential encryption with platform-specific test methods
  - FOLLOW pattern: existing test structure in TrashMailPanda.Tests project
  - NAMING: CredentialEncryptionTests class with [Fact] and [Theory] attributes
  - COVERAGE: Windows DPAPI, macOS Keychain, Linux libsecret encryption/decryption roundtrips
  - PLATFORM: Use conditional compilation for platform-specific tests

Task 8: CREATE src/Tests/TrashMailPanda.Tests/Security/SecureStorageManagerTests.cs
  - IMPLEMENT: xUnit tests for SecureStorageManager integration with mocked dependencies
  - FOLLOW pattern: existing test structure with Mock<T> usage if available
  - DEPENDENCIES: Test existing complete SecureStorageManager implementation
  - COVERAGE: All public methods, credential caching, audit logging verification
  - PLACEMENT: Security test directory

Task 9: CREATE src/Tests/TrashMailPanda.Tests/Security/TokenRotationServiceTests.cs
  - IMPLEMENT: xUnit tests for token rotation service with timer scheduling
  - FOLLOW pattern: existing async test patterns in TrashMailPanda.Tests
  - DEPENDENCIES: Mock ISecureStorageManager, test timer scheduling
  - COVERAGE: Rotation scheduling, provider-specific rotation, expiry detection
  - PLACEMENT: Security test directory

Task 10: CREATE src/Tests/TrashMailPanda.Tests/Integration/SecureStorageIntegrationTests.cs
  - IMPLEMENT: End-to-end integration tests for complete security system
  - FOLLOW pattern: existing integration test structure in TrashMailPanda.Tests
  - DEPENDENCIES: Real implementations with test database, cross-platform validation
  - COVERAGE: Full credential lifecycle, app restart persistence, corruption recovery
  - PLACEMENT: Integration test directory

Task 11: MODIFY src/TrashMailPanda/TrashMailPanda/Services/ServiceCollectionExtensions.cs
  - INTEGRATE: Register ITokenRotationService and TokenRotationService in DI container
  - FIND pattern: existing security service registrations in same file
  - ADD: services.AddSingleton<ITokenRotationService, TokenRotationService>() with proper lifetime
  - PRESERVE: Existing service registrations and DI configuration
  - VALIDATION: Ensure all dependencies are registered before dependent services

Task 12: VALIDATE Complete System Integration
  - VERIFY: All platforms (Windows, macOS, Linux) can encrypt/decrypt credentials successfully
  - TEST: Full application startup with credential storage and retrieval
  - CONFIRM: Token rotation service integrates with existing SecureStorageManager
  - VALIDATE: All existing security infrastructure continues to work without modifications
```

### Implementation Patterns & Key Details

```csharp
// macOS Keychain Services P/Invoke pattern - CRITICAL implementation detail
[SupportedOSPlatform("osx")]
private Task<EncryptionResult<string>> EncryptMacOSAsync(string plainText, string? context)
{
    try
    {
        // PATTERN: Create CFDictionary for keychain attributes
        var serviceBytes = Encoding.UTF8.GetBytes("TrashMailPanda");
        var accountBytes = Encoding.UTF8.GetBytes(context ?? "default");
        var secretBytes = Encoding.UTF8.GetBytes(plainText);
        
        // GOTCHA: Must use CFDictionary with specific kSec* constants
        var attributes = NSDictionary.FromObjectsAndKeys(
            new object[] { serviceBytes, accountBytes, secretBytes },
            new object[] { "kSecAttrService", "kSecAttrAccount", "kSecValueData" }
        );
        
        var status = SecItemAdd(attributes.Handle, IntPtr.Zero);
        // CRITICAL: Handle keychain errors properly with OSStatus codes
        
        return Task.FromResult(EncryptionResult<string>.Success("keychain_reference"));
    }
    catch (Exception ex)
    {
        return Task.FromResult(EncryptionResult<string>.Failure($"macOS encryption failed: {ex.Message}", EncryptionErrorType.EncryptionFailed));
    }
}

// Linux libsecret P/Invoke pattern - CRITICAL implementation detail
[SupportedOSPlatform("linux")]
private Task<EncryptionResult<string>> EncryptLinuxAsync(string plainText, string? context)
{
    try
    {
        // PATTERN: Check libsecret availability before attempting operations
        if (!IsLibSecretAvailable())
        {
            return Task.FromResult(EncryptionResult<string>.Failure("libsecret not available", EncryptionErrorType.PlatformNotSupported));
        }
        
        // GOTCHA: Must create schema before storing secrets
        var schema = CreateSecretSchema();
        var service = "TrashMailPanda";
        var account = context ?? "default";
        
        // CRITICAL: Use secret_store_sync for synchronous operation
        var result = secret_store_sync(schema, service, account, plainText, IntPtr.Zero);
        
        return Task.FromResult(EncryptionResult<string>.Success("libsecret_reference"));
    }
    catch (Exception ex)
    {
        return Task.FromResult(EncryptionResult<string>.Failure($"Linux encryption failed: {ex.Message}", EncryptionErrorType.EncryptionFailed));
    }
}

// Existing SecureStorageManager - NO CHANGES NEEDED (already complete)
public class SecureStorageManager : ISecureStorageManager
{
    // PATTERN: Complete implementation already exists with credential caching
    // GOTCHA: Implementation is production-ready - just use the existing methods
    // CRITICAL: StoreGmailTokenAsync and RetrieveGmailTokenAsync helpers already implemented
    
    public async Task<SecureStorageResult> StoreGmailTokenAsync(string tokenType, string token)
    {
        var key = $"{GmailTokenPrefix}{tokenType}";
        return await StoreCredentialAsync(key, token); // Uses existing complete implementation
    }
}

// SQLCipher Integration Pattern - Replace stub with encrypted storage
export class SQLiteProvider implements StorageProvider {
  private db: Database; // From @journeyapps/sqlcipher

  async initialize(config: SQLiteStorageConfig): Promise<Result<void>> {
    try {
      this.db = new Database(config.databasePath);

      // CRITICAL: Set encryption before any other operations
      await this.db.exec('PRAGMA cipher_compatibility = 4');
      await this.db.exec(`PRAGMA key = '${config.encryptionKey}'`);

      // Verify encryption by testing a query
      await this.db.exec('SELECT count(*) FROM sqlite_master');

      await this.createTables();
      return createSuccessResult(undefined);
    } catch (error) {
      return createErrorResult(new ConfigurationError('Database initialization failed'));
    }
  }

  async setEncryptedToken(provider: string, encryptedToken: string): Promise<Result<void>> {
    try {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO encrypted_tokens (provider, encrypted_token, created_at)
        VALUES (?, ?, ?)
      `);
      stmt.run(provider, encryptedToken, new Date().toISOString());
      return createSuccessResult(undefined);
    } catch (error) {
      return createErrorResult(new StorageError('Token storage failed'));
    }
  }
}

// Encryption Utility Pattern - AES-256-GCM with ZERO-PASSWORD automatic key management
export class CredentialEncryption {
  private static readonly ALGORITHM = 'aes-256-gcm';

  async encryptCredential(data: string, keyId: string): Promise<Result<SecureCredential>> {
    try {
      const key = await this.getOrCreateAutomaticKey(keyId);
      const iv = crypto.randomBytes(16);

      const cipher = crypto.createCipherGCM(CredentialEncryption.ALGORITHM, key);
      cipher.setAAD(Buffer.from('smart-inbox-janitor'));

      let encrypted = cipher.update(data, 'utf8', 'base64');
      encrypted += cipher.final('base64');

      const authTag = cipher.getAuthTag();

      return createSuccessResult({
        encryptedData: encrypted,
        iv: iv.toString('base64'),
        authTag: authTag.toString('base64'),
        algorithm: CredentialEncryption.ALGORITHM,
        createdAt: new Date(),
      });
    } catch (error) {
      return createErrorResult(new CryptoError('Encryption failed'));
    }
  }

  private async getOrCreateAutomaticKey(keyId: string): Promise<Buffer> {
    // ZERO-PASSWORD: Use OS-level security or machine-specific derivation
    if (safeStorage.isEncryptionAvailable()) {
      // Store/retrieve key using OS security (no user passwords)
      return await this.getOrCreateSafeStorageKey(keyId);
    }

    // Fallback: Derive from machine characteristics (still no user input)
    const machineInfo = os.hostname() + os.userInfo().username + process.platform;
    return crypto.pbkdf2Sync(machineInfo, keyId, 100000, 32, 'sha256');
  }
}

// IPC Security Pattern - Validate all renderer requests
ipcMain.handle('secure-storage:store-gmail-tokens', async (event, tokens: GmailTokens) => {
  // SECURITY: Validate sender and input
  if (!isValidIPCSender(event.sender)) {
    throw new SecurityError('Invalid IPC sender');
  }

  if (!validateGmailTokensStructure(tokens)) {
    throw new ValidationError('Invalid token structure');
  }

  return await secureStorageManager.storeGmailTokens(tokens);
});
```

### Integration Points

```yaml
AVALONIA_APPLICATION:
  - integrate: ISecureStorageManager and ICredentialEncryption as singleton services
  - startup: Initialize cross-platform encrypted storage during app initialization via StartupOrchestrator
  - dependency_injection: Register services in ServiceCollectionExtensions.cs

PROVIDER_SYSTEM:
  - enhance: Use existing SecureStorageManager in Gmail and OpenAI providers for credential management
  - preserve: Existing IProvider interface contracts and Result<T> patterns
  - integrate: TokenRotationService with existing provider health check system

SQLITE_PROVIDER:
  - maintain: Existing complete SqliteStorageProvider.cs with SQLCipher integration
  - preserve: Current encrypted token storage methods (GetEncryptedTokensAsync/SetEncryptedTokenAsync)
  - validate: Database encryption continues to work with cross-platform credential system

CROSS_PLATFORM_ENCRYPTION:
  - windows: Continue using existing working Windows DPAPI implementation
  - macos: Add macOS Keychain Services via P/Invoke to complete CredentialEncryption
  - linux: Add Linux libsecret integration via P/Invoke to complete CredentialEncryption
```

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run after each file creation - fix before proceeding
dotnet build                         # Full solution build with all new cross-platform code
dotnet format --verify-no-changes    # Verify code formatting meets project standards  
dotnet restore                       # Restore NuGet packages for any new dependencies

# Security-specific validation
dotnet build --configuration Release # Release build validation for deployment
dotnet test --logger console --verbosity normal --filter Category=Security # Security-specific unit tests

# Expected: Zero errors. Security code must compile on all target platforms.
```

### Level 2: Unit Tests (Component Validation)

```bash
# Test each security component as created
dotnet test --filter "FullyQualifiedName~CredentialEncryptionTests"
dotnet test --filter "FullyQualifiedName~SecureStorageManagerTests"  
dotnet test --filter "FullyQualifiedName~TokenRotationServiceTests"

# Test cross-platform encryption/decryption roundtrips
dotnet test --filter "Category=CrossPlatform" --logger console
dotnet test --filter "FullyQualifiedName~PlatformSpecificTests"

# Expected: All tests pass with platform-specific conditional compilation working correctly
```

### Level 3: Integration Testing (System Validation)

```bash
# End-to-end security validation
dotnet test --filter "FullyQualifiedName~SecureStorageIntegrationTests"
dotnet test --filter "FullyQualifiedName~CrossPlatformStorageTests"

# Test app lifecycle with secure storage
dotnet run --project src/TrashMailPanda/TrashMailPanda &   # Start app in development
sleep 5                                                    # Allow startup
# Verify credential storage and app restart persistence work correctly
dotnet test --filter "Category=Integration" --logger console

# Database encryption validation - SQLCipher already working in existing SqliteStorageProvider

# Expected: All credentials persist across restarts, cross-platform encryption verified
```

### Level 4: Security & Compliance Validation

```bash
# Security scanning
dotnet list package --vulnerable     # Check for vulnerable NuGet packages
dotnet tool run security-scan --project src/ # Security-focused static analysis if available

# Cross-platform encryption validation  
dotnet test --filter "Category=Encryption" --logger console # Validate encryption on all platforms
dotnet test --filter "FullyQualifiedName~TokenRotationServiceTests" # Test automatic token rotation

# Compliance and audit checks
dotnet test --filter "Category=Audit" --logger console # Verify security events are logged
dotnet test --filter "Category=GDPR" --logger console  # Test data deletion capabilities if applicable

# Performance impact assessment
dotnet test --filter "Category=Performance" --logger console # Measure encryption overhead

# Expected: No security vulnerabilities, all compliance tests pass, cross-platform functionality verified
```

## Final Validation Checklist

### Technical Validation

- [ ] All 4 validation levels completed successfully
- [ ] Cross-platform encryption/decryption roundtrip tests pass: `dotnet test --filter "Category=CrossPlatform"`
- [ ] Database encryption continues to work: existing SqliteStorageProvider with SQLCipher verified
- [ ] Token rotation works automatically: `dotnet test --filter "FullyQualifiedName~TokenRotationServiceTests"`
- [ ] App restart preserves credentials: `dotnet test --filter "Category=Integration"`
- [ ] Security audit logging works: existing SecurityAuditLogger integration verified

### Feature Validation

- [ ] Gmail OAuth tokens encrypted using completed cross-platform CredentialEncryption (Windows DPAPI ✓, macOS Keychain Services, Linux libsecret)
- [ ] OpenAI API keys encrypted using completed cross-platform System.Security.Cryptography implementation 
- [ ] Email metadata continues to work with existing encrypted SQLite database using SQLCipher (already working ✓)
- [ ] Security events logged using existing SecurityAuditLogger without exposing actual credentials (already working ✓)
- [ ] Users never prompted for passwords - automatic OS-level encryption on Windows/macOS/Linux
- [ ] Cross-platform compatibility verified across Windows (DPAPI ✓), macOS (Keychain Services), Linux (libsecret)
- [ ] Graceful platform detection and fallback for unsupported systems
- [ ] Token rotation service integrates with existing SecureStorageManager infrastructure
- [ ] Performance impact minimal - P/Invoke calls are lightweight operations

### Security Validation

- [ ] No plaintext credentials found in any storage locations
- [ ] Cross-platform tampering detection works properly for all OS implementations
- [ ] Token rotation maintains service availability during refresh using new TokenRotationService
- [ ] OS keychain integration works across Windows (DPAPI ✓), macOS (Keychain Services), Linux (libsecret)
- [ ] Failed authentication attempts trigger existing SecurityAuditLogger responses
- [ ] Audit trail maintains integrity using existing audit logging infrastructure

### Code Quality Validation

- [ ] Follows existing codebase Result<T> and EncryptionResult<T> patterns exactly
- [ ] File placement matches desired codebase tree structure in Shared/Security and Tests directories
- [ ] Anti-patterns avoided (check against Anti-Patterns section)
- [ ] .NET code analysis and security rules pass without exceptions
- [ ] Type safety maintained across all cross-platform P/Invoke boundaries
- [ ] Error messages never expose sensitive credential data (existing pattern preserved)

### Compliance & Documentation Validation

- [ ] Cross-platform security implementation documented with P/Invoke patterns and platform requirements
- [ ] Recovery procedures work with existing SecureStorageManager corruption handling
- [ ] Code is self-documenting with clear platform-specific attribute usage and security-focused naming
- [ ] New dependencies documented (none required - using built-in OS libraries via P/Invoke)

---

## Anti-Patterns to Avoid

- ❌ **Don't modify existing complete SecureStorageManager or SecurityAuditLogger implementations**
- ❌ **Don't change existing SQLite provider encryption - it already works perfectly**
- ❌ Don't store credentials in plaintext appsettings.json or configuration files
- ❌ Don't skip platform-specific attribute usage - apply [SupportedOSPlatform] attributes correctly
- ❌ Don't expose encryption keys or raw tokens in application logs or debug output
- ❌ Don't log actual credential values in audit trails (existing SecurityAuditLogger already handles this correctly)
- ❌ Don't ignore cross-platform compatibility - test on Windows, macOS, and Linux
- ❌ Don't skip P/Invoke error handling - always check OSStatus and error codes from native APIs
- ❌ Don't hardcode encryption keys - use OS-provided secure storage mechanisms
- ❌ **NEVER prompt users for passwords, passphrases, or secret keys**
- ❌ **Don't require manual configuration for encryption setup**
- ❌ **Don't break the zero-configuration user experience**
- ❌ **Don't reinvent existing security infrastructure - complete the missing implementations only**
