# Secure Local Storage for Tokens and Settings - .NET Implementation

## Goal

**Feature Goal**: Implement a comprehensive secure storage system that encrypts Gmail OAuth tokens, OpenAI API keys, and application settings at rest using OS-level credential storage and database encryption, ensuring unauthorized parties cannot access sensitive data even with local file system access.

**Deliverable**: Production-ready SecureStorageService integrated into the .NET application with encrypted SQLite database, OS keychain integration (DPAPI, macOS Keychain, libsecret), token rotation capabilities, and comprehensive security audit logging.

**Success Definition**: All sensitive credentials are encrypted at rest, tokens automatically rotate before expiration, security events are logged without exposing secrets, and the system gracefully handles corruption/compromise scenarios with recovery procedures.

## User Persona

**Target User**: TransMail Panda application users who need to store Gmail OAuth credentials and OpenAI API keys securely on their local machine

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

A hybrid secure storage system combining .NET OS-level credential storage APIs (DPAPI, macOS Keychain, libsecret) with encrypted SQLite database storage that automatically manages token lifecycles and provides comprehensive security monitoring.

**🔑 ZERO-PASSWORD USER EXPERIENCE GUARANTEE**: Users will never be prompted for passwords, passphrases, or secret keys. All encryption is handled automatically using OS-level security features and machine-specific key derivation.

### Success Criteria

- [ ] Gmail OAuth tokens encrypted and stored in OS keychain using .NET ProtectedData/Keychain APIs (zero user input required)
- [ ] OpenAI API keys encrypted with AES-256-GCM using System.Security.Cryptography and stored securely (automatic encryption without passwords)
- [ ] Email metadata and user rules stored in encrypted SQLite database using Microsoft.Data.Sqlite with SQLitePCLRaw.bundle_e_sqlcipher
- [ ] Automatic token rotation with 5-minute expiration buffer
- [ ] Security audit logging without exposing actual credentials
- [ ] Recovery procedures for corrupted storage and compromised credentials
- [ ] xUnit tests covering encryption, decryption, and rotation scenarios
- [ ] Integration tests validating end-to-end security across app restarts

## All Needed Context

### Context Completeness Check

_This PRP provides everything needed to implement secure credential storage from the current stub implementations, including specific encryption patterns, OS integration methods, database schema, and comprehensive validation procedures._

### Documentation & References

```yaml
# MUST READ - Include these in your context window
- url: https://learn.microsoft.com/en-us/dotnet/api/system.security.cryptography.protecteddata
  why: .NET ProtectedData API for OS-level credential encryption on Windows (DPAPI)
  critical: Cross-platform encryption availability detection and secure string encryption methods

- url: https://www.nuget.org/packages/SQLitePCLRaw.bundle_e_sqlcipher/
  why: SQLCipher integration for .NET with pre-built binaries for all platforms
  critical: Database encryption setup, connection strings, and performance considerations

- url: https://learn.microsoft.com/en-us/dotnet/api/system.security.cryptography.aes
  why: .NET System.Security.Cryptography for AES-256-GCM encryption and key derivation functions
  critical: Cipher creation, authentication tags, and secure random number generation

- file: src/TransMailPanda.Core/Interfaces/IStorageProvider.cs
  why: Complete IStorageProvider interface with encrypted token storage methods already defined
  pattern: Result<T> pattern for all provider methods, GetEncryptedTokensAsync/SetEncryptedTokenAsync interface
  gotcha: Must preserve exact interface contracts and error handling patterns

- file: src/TransMailPanda.Providers/Storage/SQLiteProvider.cs
  why: Existing implementation that needs to be enhanced with secure storage
  pattern: Methods return Result<T> with proper error handling
  gotcha: Must maintain same public interface while implementing actual functionality

- file: src/shared/types/config.types.ts
  why: SQLiteStorageConfig includes encryptionKey field and connection parameters
  pattern: Configuration interfaces with readonly properties and optional fields
  gotcha: Must handle missing encryptionKey and provide secure key generation

- docfile: PRPs/ai_docs/secure_storage_implementation.md
  why: Comprehensive implementation guide with security patterns and code examples
  section: Complete technology stack decisions, encryption patterns, and integration requirements
```

### Current Codebase Tree

```bash
smart-inbox-janitor/
├── src/
│   ├── main/                     # Electron main process (needs SecureStorageManager)
│   │   ├── index.ts              # Main process entry point
│   │   ├── ipc.ts                # IPC handlers (needs secure storage endpoints)
│   │   └── window.ts             # Window management
│   ├── preload/                  # Secure IPC bridge (needs credential APIs)
│   │   └── index.ts              # Preload script for secure communication
│   ├── shared/
│   │   ├── types/                # Complete type system (EXISTS)
│   │   │   ├── storage.types.ts  # StorageProvider interface with encrypted methods
│   │   │   ├── config.types.ts   # Storage configuration types
│   │   │   └── index.ts          # Type exports with Result<T> pattern
│   │   └── schemas/              # Zod validation schemas (EXISTS)
│   ├── providers/storage/sqlite/ # Current stub implementation (NEEDS REPLACEMENT)
│   │   └── SQLiteProvider.ts     # Stub returning "not implemented" errors
│   └── renderer/                 # React application (needs error handling)
├── __tests__/                    # Test infrastructure (EXISTS)
│   ├── setup.ts                  # Jest setup with custom matchers
│   └── (empty directories)       # No actual tests yet - need to create
├── package.json                  # Dependencies include better-sqlite3, keytar
└── PRPs/ai_docs/                 # Implementation guidance (EXISTS)
    └── secure_storage_implementation.md
```

### Desired Codebase Tree with Files to be Added

```bash
smart-inbox-janitor/
├── src/
│   ├── main/
│   │   ├── security/             # NEW: Security-focused services
│   │   │   ├── SecureStorageManager.ts    # NEW: Main secure storage orchestrator
│   │   │   ├── CredentialEncryption.ts    # NEW: Encryption/decryption utilities
│   │   │   ├── TokenRotationService.ts    # NEW: Automatic token rotation
│   │   │   └── SecurityAuditLogger.ts     # NEW: Security event logging
│   │   └── ipc.ts                # MODIFY: Add secure storage IPC handlers
│   ├── preload/
│   │   └── index.ts              # MODIFY: Expose secure storage APIs to renderer
│   ├── providers/storage/sqlite/
│   │   ├── SQLiteProvider.ts     # REPLACE: Full implementation with SQLCipher
│   │   ├── migrations/           # NEW: Database schema migrations
│   │   │   ├── 001_initial.sql   # NEW: Initial encrypted schema
│   │   │   └── 002_audit.sql     # NEW: Audit logging tables
│   │   └── schemas/              # NEW: SQL schema definitions
│   │       └── encrypted_storage.sql     # NEW: Complete encrypted schema
│   └── shared/
│       ├── utils/                # NEW: Shared utilities
│       │   ├── crypto.utils.ts   # NEW: Crypto helper functions
│       │   └── validation.utils.ts       # NEW: Security validation utilities
│       └── types/
│           └── security.types.ts # NEW: Security-specific type definitions
├── __tests__/
│   ├── integration/              # NEW: Integration test suites
│   │   ├── secure-storage.test.ts        # NEW: End-to-end security tests
│   │   └── token-rotation.test.ts        # NEW: Token lifecycle tests
│   ├── unit/                     # NEW: Unit test suites
│   │   ├── SecureStorageManager.test.ts  # NEW: Storage manager tests
│   │   ├── CredentialEncryption.test.ts  # NEW: Encryption tests
│   │   └── SQLiteProvider.test.ts        # NEW: Provider implementation tests
│   └── fixtures/                 # NEW: Test data and mocks
│       ├── mock-credentials.ts    # NEW: Mock credential data
│       └── test-keys.ts           # NEW: Test encryption keys
└── migrations/                   # NEW: Database migration scripts
    └── sqlite/                   # NEW: SQLite-specific migrations
        ├── 001_initial.sql       # NEW: Create encrypted tables
        └── 002_audit_tables.sql  # NEW: Add audit logging
```

### Known Gotchas & Library Quirks

```typescript
// CRITICAL: Keytar is deprecated - use Electron's safeStorage API instead
import { safeStorage } from 'electron';

// CRITICAL: Check safeStorage availability and implement graceful fallback
if (!safeStorage.isEncryptionAvailable()) {
  console.warn('OS-level encryption not available, using fallback encryption');
  // Implement fallback that still requires no user passwords
}

// CRITICAL: SQLCipher requires specific PRAGMA commands before any operations
db.exec("PRAGMA cipher_compatibility = 4");
db.exec(`PRAGMA key = '${encryptionKey}'`);

// GOTCHA: better-sqlite3 must be external in Electron-Vite config
// Already configured in electron.vite.config.ts rollupOptions.external

// CRITICAL: Must preserve Result<T> pattern from existing codebase
async getEncryptedTokens(): Promise<Result<Record<string, string>>> {
  try {
    const tokens = await this.retrieveTokens();
    return createSuccessResult(tokens);
  } catch (error) {
    return createErrorResult(new SecurityError('Token retrieval failed'));
  }
}

// GOTCHA: AES-GCM requires authentication tag handling
const cipher = crypto.createCipherGCM('aes-256-gcm', key);
cipher.setAAD(Buffer.from('smart-inbox-janitor')); // Additional authentication data
const authTag = cipher.getAuthTag(); // Must store with encrypted data

// CRITICAL: IPC security - main process only handles sensitive operations
// Renderer process never directly accesses encryption keys or raw tokens
```

## Implementation Blueprint

### Data Models and Structure

Leveraging existing comprehensive type system with security enhancements:

```typescript
// Existing types from src/shared/types/storage.types.ts - PRESERVE
interface StorageProvider {
  getEncryptedTokens(): Promise<Result<Record<string, string>>>;
  setEncryptedToken(provider: string, encryptedToken: string): Promise<Result<void>>;
  removeEncryptedToken(provider: string): Promise<Result<void>>;
  // ... other existing methods
}

// New security-specific types - ADD
interface SecureCredential {
  readonly encryptedData: string;
  readonly iv: string;
  readonly authTag: string;
  readonly algorithm: string;
  readonly createdAt: Date;
  readonly expiresAt?: Date;
}

interface SecurityAuditEvent {
  readonly timestamp: Date;
  readonly eventType: SecurityEventType;
  readonly provider: string;
  readonly success: boolean;
  readonly metadata: Record<string, unknown>;
}

type SecurityEventType =
  | 'credential_store'
  | 'credential_retrieve'
  | 'token_rotation'
  | 'encryption_key_rotation'
  | 'security_violation';
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: CREATE src/shared/utils/crypto.utils.ts
  - IMPLEMENT: AES-256-GCM encryption/decryption utilities with proper auth tag handling
  - FOLLOW pattern: src/shared/types/ (Result<T> return types, readonly interfaces)
  - NAMING: CryptoUtils class with static methods, descriptive function names
  - SECURITY: Generate secure random IVs, derive keys from machine characteristics (no user passwords), secure memory handling
  - UX_CRITICAL: All key derivation must be automatic - never prompt user for passwords
  - PLACEMENT: Shared utilities directory for use across main/preload processes

Task 2: CREATE src/main/security/CredentialEncryption.ts
  - IMPLEMENT: High-level credential encryption service using CryptoUtils
  - FOLLOW pattern: PRPs/ai_docs/secure_storage_implementation.md (encryption patterns)
  - NAMING: CredentialEncryption class with encryptCredential/decryptCredential methods
  - DEPENDENCIES: Import CryptoUtils from Task 1, use Electron safeStorage for automatic key storage
  - UX_CRITICAL: Must gracefully handle safeStorage unavailability with automatic fallback (no user prompts)
  - PLACEMENT: Main process security directory

Task 3: CREATE src/main/security/SecurityAuditLogger.ts
  - IMPLEMENT: Security event logging without exposing sensitive data
  - FOLLOW pattern: src/shared/types/storage.types.ts (ClassificationHistoryItem structure)
  - NAMING: SecurityAuditLogger class with logSecurityEvent method
  - DEPENDENCIES: Use existing StorageProvider interface for persistence
  - PLACEMENT: Main process security directory

Task 4: REPLACE src/providers/storage/sqlite/SQLiteProvider.ts
  - IMPLEMENT: Full SQLiteProvider with SQLCipher encryption replacing stub implementation
  - FOLLOW pattern: src/shared/types/storage.types.ts (exact interface implementation)
  - NAMING: Preserve existing class name and method signatures exactly
  - DEPENDENCIES: @journeyapps/sqlcipher, CredentialEncryption from Task 2
  - CRITICAL: Must return Result<T> types matching existing interface contracts

Task 5: CREATE src/main/security/SecureStorageManager.ts
  - IMPLEMENT: Main orchestrator for secure credential operations
  - FOLLOW pattern: PRPs/ai_docs/secure_storage_implementation.md (hybrid storage architecture)
  - NAMING: SecureStorageManager class with provider-specific methods
  - DEPENDENCIES: CredentialEncryption, SecurityAuditLogger, SQLiteProvider from previous tasks
  - PLACEMENT: Main process security directory

Task 6: CREATE src/main/security/TokenRotationService.ts
  - IMPLEMENT: Automatic token rotation with scheduling and failure handling
  - FOLLOW pattern: PRPs/ai_docs/secure_storage_implementation.md (rotation service patterns)
  - NAMING: TokenRotationService class with start/stop rotation scheduler
  - DEPENDENCIES: SecureStorageManager from Task 5, Gmail API refresh logic
  - PLACEMENT: Main process security directory

Task 7: MODIFY src/main/ipc.ts
  - INTEGRATE: Add IPC handlers for secure storage operations
  - FIND pattern: existing IPC handler structure in current file
  - ADD: secure-storage:* channels with input validation and error handling
  - PRESERVE: Existing IPC handlers and registration patterns
  - SECURITY: Validate all renderer requests, sanitize error messages

Task 8: MODIFY src/preload/index.ts
  - INTEGRATE: Expose secure storage APIs to renderer process
  - FIND pattern: existing electronAPI structure in current file
  - ADD: secureStorage object with typed method signatures
  - PRESERVE: Existing API surface and type safety
  - SECURITY: Never expose encryption keys or raw credential operations

Task 9: CREATE __tests__/unit/CredentialEncryption.test.ts
  - IMPLEMENT: Unit tests for encryption/decryption with various scenarios
  - FOLLOW pattern: __tests__/setup.ts (custom Jest matchers, Result<T> validation)
  - NAMING: describe blocks by functionality, test names describe specific scenarios
  - COVERAGE: Happy path, error cases, key rotation, tampered data detection
  - PLACEMENT: Unit tests directory

Task 10: CREATE __tests__/unit/SecureStorageManager.test.ts
  - IMPLEMENT: Unit tests for storage manager with mocked dependencies
  - FOLLOW pattern: __tests__/setup.ts (toBeValidResult matcher usage)
  - NAMING: Test each public method with success and failure scenarios
  - DEPENDENCIES: Mock CredentialEncryption, SecurityAuditLogger, SQLiteProvider
  - COVERAGE: All public methods, error propagation, audit logging verification

Task 11: CREATE __tests__/integration/secure-storage.test.ts
  - IMPLEMENT: End-to-end integration tests across app restart scenarios
  - FOLLOW pattern: __tests__/setup.ts (test environment configuration)
  - NAMING: Integration test scenarios describing full user workflows
  - DEPENDENCIES: Real SQLiteProvider with test database, mocked Electron APIs
  - COVERAGE: Store/retrieve credentials, app restart persistence, corruption recovery

Task 12: CREATE migrations/sqlite/001_initial.sql
  - IMPLEMENT: Initial encrypted database schema for email metadata and credentials
  - FOLLOW pattern: src/shared/types/storage.types.ts (table structures matching interfaces)
  - NAMING: SQL table and column names using snake_case convention
  - ENCRYPTION: Design schema for encrypted storage of sensitive fields
  - PLACEMENT: Database migration scripts directory
```

### Implementation Patterns & Key Details

```typescript
// Secure Storage Manager Pattern - Core orchestrator with ZERO user passwords
export class SecureStorageManager {
  constructor(
    private credentialEncryption: CredentialEncryption,
    private sqliteProvider: SQLiteProvider,
    private auditLogger: SecurityAuditLogger,
  ) {}

  async storeGmailTokens(tokens: GmailTokens): Promise<Result<void>> {
    try {
      // ZERO-PASSWORD: Use OS keychain for tokens via Electron safeStorage (automatic)
      const encryptedTokens = await this.credentialEncryption.encryptTokens(tokens);
      const result = await this.sqliteProvider.setEncryptedToken('gmail', encryptedTokens);

      await this.auditLogger.logSecurityEvent({
        eventType: 'credential_store',
        provider: 'gmail',
        success: result.success,
        metadata: { tokenExpiryDate: tokens.expiryDate },
      });

      return result;
    } catch (error) {
      return createErrorResult(new SecurityError('Failed to store Gmail tokens'));
    }
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
ELECTRON_MAIN_PROCESS:
  - integrate: SecureStorageManager as singleton service
  - startup: Initialize encrypted storage during app initialization
  - ipc: Add secure storage channels with validation

PRELOAD_BRIDGE:
  - expose: Secure storage APIs to renderer via contextBridge
  - security: Never expose raw encryption operations or keys
  - typing: Strongly typed interfaces matching main process

SQLITE_PROVIDER:
  - replace: Current stub implementation with SQLCipher integration
  - preserve: Exact interface contracts and Result<T> patterns
  - enhance: Add encrypted metadata storage and audit logging

ELECTRON_SAFESTORAGE:
  - integrate: OS-level credential storage for master keys
  - fallback: Implement secure fallback for unsupported platforms
  - validation: Check encryption availability during startup
```

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run after each file creation - fix before proceeding
npm run lint                         # ESLint with auto-fix for new security files
npm run type-check                   # TypeScript compilation including new types
npm run format                       # Prettier formatting for consistent style

# Security-specific validation
npm run test:types                   # Validate type-only imports and interfaces
npm run test:schemas                 # Validate Zod schemas if added

# Expected: Zero errors. Security code must have perfect type safety.
```

### Level 2: Unit Tests (Component Validation)

```bash
# Test each security component as created
npm run test -- __tests__/unit/CredentialEncryption.test.ts
npm run test -- __tests__/unit/SecureStorageManager.test.ts
npm run test -- __tests__/unit/SQLiteProvider.test.ts

# Test encryption/decryption roundtrips
npm run test:encryption              # Custom script for crypto validation

# Expected: All tests pass with 100% coverage for security components
```

### Level 3: Integration Testing (System Validation)

```bash
# End-to-end security validation
npm run test -- __tests__/integration/secure-storage.test.ts

# Test app lifecycle with secure storage
npm run dev &                        # Start app in development
sleep 5                              # Allow startup
# Simulate credential storage and app restart cycle
npm run test:integration:restart     # Custom test for restart persistence

# Database encryption validation
npm run test:sqlcipher               # Verify database encryption is active

# Expected: All credentials persist across restarts, encryption verified
```

### Level 4: Security & Compliance Validation

```bash
# Security scanning
npm audit --audit-level=moderate     # Check for known vulnerabilities
npm run lint:security                # Security-focused ESLint rules

# Encryption validation
npm run test:crypto                  # Validate encryption strength and patterns
npm run test:key-rotation            # Test automatic key rotation

# Compliance checks
npm run test:audit-logging           # Verify security events are logged
npm run test:gdpr-compliance         # Test data deletion capabilities

# Performance impact assessment
npm run test:crypto-performance      # Measure encryption overhead

# Expected: No security vulnerabilities, all compliance tests pass
```

## Final Validation Checklist

### Technical Validation

- [ ] All 4 validation levels completed successfully
- [ ] Encryption/decryption roundtrip tests pass: `npm run test:encryption`
- [ ] Database encryption verified: `npm run test:sqlcipher`
- [ ] Token rotation works automatically: `npm run test:key-rotation`
- [ ] App restart preserves credentials: `npm run test:integration:restart`
- [ ] Security audit logging complete: `npm run test:audit-logging`

### Feature Validation

- [ ] Gmail OAuth tokens encrypted in OS keychain using Electron safeStorage
- [ ] OpenAI API keys encrypted with AES-256-GCM and rotated automatically
- [ ] Email metadata stored in encrypted SQLite database with SQLCipher
- [ ] Security events logged without exposing actual credentials
- [ ] Users never prompted for passwords, passphrases, or master keys during any operation
- [ ] Cross-platform compatibility verified on macOS and Windows with automatic OS-level encryption
- [ ] Graceful fallback implemented for systems where OS encryption is unavailable (still no user passwords)
- [ ] Credential corruption detected and recovery procedures triggered automatically
- [ ] Performance impact under 10% for normal email processing operations

### Security Validation

- [ ] No plaintext credentials found in any storage locations
- [ ] Tampering with encrypted data properly detected and rejected
- [ ] Token rotation maintains service availability during refresh
- [ ] OS keychain integration works across Windows, macOS, Linux
- [ ] Failed authentication attempts trigger appropriate security responses
- [ ] Audit trail maintains integrity and non-repudiation

### Code Quality Validation

- [ ] Follows existing codebase Result<T> pattern exactly
- [ ] File placement matches desired codebase tree structure
- [ ] Anti-patterns avoided (check against Anti-Patterns section)
- [ ] Security-focused ESLint rules pass without exceptions
- [ ] Type safety maintained across all process boundaries
- [ ] Error messages never expose sensitive credential data

### Compliance & Documentation Validation

- [ ] GDPR compliance verified through data deletion tests
- [ ] Security documentation updated with implementation details
- [ ] Recovery procedures documented and tested
- [ ] Code is self-documenting with clear security-focused variable names
- [ ] Configuration changes properly documented for deployment

---

## Anti-Patterns to Avoid

- ❌ Don't use deprecated keytar library - use Electron's safeStorage API
- ❌ Don't store credentials in plaintext configuration files
- ❌ Don't skip authentication tag validation in AES-GCM decryption
- ❌ Don't expose encryption keys or raw tokens in IPC communication
- ❌ Don't log actual credential values in audit trails
- ❌ Don't ignore token expiration - implement proactive rotation
- ❌ Don't skip input validation in IPC handlers
- ❌ Don't hardcode encryption keys - derive from secure sources
- ❌ **NEVER prompt users for passwords, passphrases, or secret keys**
- ❌ **Don't require config file editing for encryption setup**
- ❌ **Don't break the zero-configuration user experience**
