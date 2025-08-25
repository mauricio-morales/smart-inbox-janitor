---
name: "OS Keychain Storage Implementation for Credential Encryption"
description: |
  Complete the TODO implementations in CredentialEncryption.ts for OS keychain storage
  functionality, enabling secure credential storage on Windows and macOS platforms
  with proper fallback handling for Linux systems.

---

## Goal

**Feature Goal**: Implement OS-level keychain storage for encrypted credentials in Smart Inbox Janitor, providing secure credential management that leverages native platform security features (Windows DPAPI, macOS Keychain Services) while maintaining zero-password UX.

**Deliverable**: Complete implementation of `storeInOSKeychain()` and `retrieveFromOSKeychain()` methods in `src/main/security/CredentialEncryption.ts` with comprehensive error handling, cross-platform support, and full test coverage.

**Success Definition**: 
- Windows/macOS users can securely store/retrieve credentials using OS keychain
- Linux users receive clear error message with contribution invitation
- All existing tests pass + new tests achieve >95% coverage
- Integration works seamlessly with existing SecureStorageManager
- Code follows all project conventions (Result<T> pattern, error handling, TypeScript strict mode)

## User Persona

**Target User**: Smart Inbox Janitor users on Windows and macOS who need secure credential storage

**Use Case**: Application startup requiring OAuth tokens, API keys, and encrypted credentials to be retrieved from secure OS-level storage without user password prompts

**User Journey**: 
1. User launches Smart Inbox Janitor application
2. Application attempts to retrieve stored credentials from OS keychain
3. OS keychain provides transparent access (no password prompts)
4. Application uses retrieved credentials for Gmail/OpenAI authentication
5. New credentials are automatically stored in OS keychain for future sessions

**Pain Points Addressed**: 
- Eliminates need for users to re-enter API keys on every app restart
- Provides enterprise-grade security without complexity
- Prevents credential exposure in plaintext files or weak encryption

## Why

- **Security Enhancement**: Leverages OS-level security features (Windows DPAPI, macOS Keychain) for maximum protection
- **User Experience**: Maintains zero-password UX while improving security posture
- **Enterprise Readiness**: Meets security requirements for business environments
- **Platform Integration**: Native OS keychain integration prevents credential theft by other applications
- **Issue Resolution**: Completes GitHub issue #5 for production-ready credential management

## What

Complete implementation of hybrid OS keychain + file-based credential storage in `CredentialEncryption.ts`.

### Success Criteria

- [ ] `storeInOSKeychain()` method fully implemented with Windows/macOS support
- [ ] `retrieveFromOSKeychain()` method fully implemented with graceful error handling
- [ ] Linux platform shows clear "not implemented" message with contribution invitation
- [ ] Atomic file operations with proper permissions (0o600) implemented
- [ ] Cross-platform error handling covers all documented scenarios
- [ ] Integration with existing CryptoUtils and SecureStorageManager maintained
- [ ] All project linting, type-checking, and testing requirements met
- [ ] Security audit logging properly captures keychain operations
- [ ] Performance meets existing application standards (<100ms per operation)

## All Needed Context

### Context Completeness Check

_This PRP provides everything needed to implement OS keychain storage without prior codebase knowledge, including specific file patterns, API documentation, platform-specific considerations, and comprehensive error handling strategies._

### Documentation & References

```yaml
# MUST READ - Include these in your context window
- url: https://www.electronjs.org/docs/latest/api/safe-storage
  why: Complete Electron safeStorage API documentation with method signatures
  critical: Platform support matrix, isEncryptionAvailable() behavior, error scenarios

- url: https://raw.githubusercontent.com/electron/electron/main/spec/api-safe-storage-spec.ts
  why: Official test cases showing proper usage patterns and error handling
  critical: Mock patterns for testing, expected error types and handling

- file: src/main/security/CredentialEncryption.ts
  why: Current implementation with TODO methods requiring completion
  pattern: Hybrid encryption approach, Result<T> pattern, error sanitization
  gotcha: Lines 398 & 436 contain detailed TODO implementation requirements

- file: src/shared/utils/crypto.utils.ts
  why: AES-256-GCM encryption patterns and machine-specific key derivation
  pattern: Zero-password UX, base64 encoding, secure random generation
  gotcha: No console logging - maintain silent operation pattern

- file: src/shared/types/security.types.ts
  why: SecurityError, CryptoError, SecurityAuditEvent type definitions
  pattern: Readonly interfaces, comprehensive error context tracking
  gotcha: Use specific error types, never expose sensitive data in error messages

- file: src/shared/types/base.types.ts
  why: Result<T> pattern implementation and helper functions
  pattern: createSuccessResult(), createErrorResult(), never throw exceptions
  gotcha: All async operations must return Result<T>, not throw

- file: src/providers/storage/sqlite/SQLiteProvider.ts
  why: File system operation patterns with proper error handling
  pattern: Directory creation, path validation, atomic operations
  gotcha: Use app.getPath('userData'), check directory existence before operations

- docfile: PRPs/ai_docs/secure_storage_implementation.md
  why: Project-specific secure storage architecture and patterns
  section: OS keychain integration requirements and security considerations
```

### Current Codebase tree

```bash
src/
├── main/
│   ├── security/
│   │   ├── CredentialEncryption.ts        # Contains TODO methods to implement
│   │   ├── SecureStorageManager.ts        # Uses CredentialEncryption
│   │   └── TokenRotationService.ts        # Depends on credential storage
│   └── index.ts                           # Initializes security services
├── shared/
│   ├── types/
│   │   ├── base.types.ts                  # Result<T> pattern definitions
│   │   ├── security.types.ts              # Security error types
│   │   └── errors.types.ts                # Error hierarchy
│   └── utils/
│       └── crypto.utils.ts                # AES-256-GCM encryption utilities
├── providers/
│   └── storage/
│       └── sqlite/
│           └── SQLiteProvider.ts          # File system operation patterns
└── __tests__/
    ├── setup.ts                           # Custom Jest matchers
    └── oauth/                             # Existing security test patterns
```

### Desired Codebase tree with files to be added and responsibility of file

```bash
src/
├── main/
│   └── security/
│       ├── CredentialEncryption.ts           # MODIFIED: Complete TODO methods
│       └── utils/
│           └── SecureFileOperations.ts       # NEW: Atomic file operations utility
└── __tests__/
    ├── main/
    │   └── security/
    │       ├── CredentialEncryption.test.ts  # NEW: Complete test coverage
    │       └── utils/
    │           └── SecureFileOperations.test.ts # NEW: File operations tests
    └── fixtures/
        └── keychain/                          # NEW: Test fixtures for keychain scenarios
            ├── mock-encrypted-keys.ts         # Mock encrypted key data
            └── platform-test-scenarios.ts     # Cross-platform test scenarios
```

### Known Gotchas of our codebase & Library Quirks

```typescript
// CRITICAL: Never throw exceptions - always use Result<T> pattern
// Example: All provider methods must return Result<T, ProviderError>
const result = await operation();
if (!result.success) {
  return createErrorResult(result.error);
}

// CRITICAL: Electron safeStorage requires app.whenReady() before use on macOS
// The CredentialEncryption service is initialized after app.whenReady() in main/index.ts

// CRITICAL: No console logging in crypto utilities
// Follow existing pattern - crypto.utils.ts has zero console output

// CRITICAL: File permissions must be set correctly cross-platform
// Unix: 0o600 for files, 0o700 for directories
// Windows: Use icacls commands or accept default NTFS permissions

// CRITICAL: TypeScript strict mode enabled
// All functions require explicit return types, no any types allowed

// CRITICAL: Path mapping requires @shared/* imports
import { Result, createSuccessResult } from '@shared/types';

// CRITICAL: Sanitize all error messages to prevent sensitive data exposure
// Follow pattern in CredentialEncryption.ts sanitizeErrorMessage() method

// CRITICAL: All operations must be atomic for concurrent access safety
// Use temp file + rename pattern for file writes

// CRITICAL: Linux safeStorage may fallback to plaintext encryption
// Always check capabilities and provide clear error messages
```

## Implementation Blueprint

### Data models and structure

Extend existing security types with OS keychain specific structures:

```typescript
// Add to existing security.types.ts
interface OSKeychainCapabilities {
  readonly available: boolean;
  readonly backend: 'keychain' | 'dpapi' | 'gnome-libsecret' | 'kwallet' | 'basic_text';
  readonly securityLevel: 'high' | 'medium' | 'low';
  readonly platform: 'darwin' | 'win32' | 'linux';
}

interface KeychainOperationContext {
  readonly keyId: string;
  readonly operation: 'store' | 'retrieve';
  readonly platform: string;
  readonly timestamp: Date;
  readonly success: boolean;
  readonly error?: string;
}
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: CREATE src/main/security/utils/SecureFileOperations.ts
  - IMPLEMENT: Atomic file operations with cross-platform permissions
  - FOLLOW pattern: SQLiteProvider.ts directory creation and error handling
  - NAMING: writeFileAtomically(), verifyFilePermissions(), sanitizeFilePath()
  - PLACEMENT: Utility functions supporting CredentialEncryption.ts
  - CRITICAL: Handle Windows vs Unix permission differences

Task 2: MODIFY src/main/security/CredentialEncryption.ts - storeInOSKeychain() method
  - IMPLEMENT: Complete TODO method at line 398 with safeStorage integration
  - FOLLOW pattern: Existing encryptCredential() error handling and Result<T> returns
  - NAMING: Keep existing method signature, add private helper methods as needed
  - DEPENDENCIES: Import SecureFileOperations utility from Task 1
  - CRITICAL: Use app.getPath('userData'), atomic writes, file permissions 0o600

Task 3: MODIFY src/main/security/CredentialEncryption.ts - retrieveFromOSKeychain() method  
  - IMPLEMENT: Complete TODO method at line 436 with graceful error handling
  - FOLLOW pattern: Existing decryptCredential() method error handling approach
  - NAMING: Keep existing method signature, return string | null as specified
  - DEPENDENCIES: Use SecureFileOperations utility from Task 1
  - CRITICAL: Handle platform-specific errors, graceful degradation to fallback

Task 4: ADD Linux platform error handling with contribution invitation
  - IMPLEMENT: Clear error message when Linux OS keychain unavailable
  - FOLLOW pattern: Existing platform detection in isOSEncryptionAvailable()
  - MESSAGE: "Linux OS keychain not implemented. Contributions welcome! Visit github.com/mauricio-morales/smart-inbox-janitor"
  - PLACEMENT: Within both storeInOSKeychain() and retrieveFromOSKeychain() methods
  - CRITICAL: Still return proper Result<T> types, don't break interface

Task 5: CREATE __tests__/main/security/CredentialEncryption.test.ts
  - IMPLEMENT: Comprehensive test coverage for OS keychain methods
  - FOLLOW pattern: __tests__/setup.ts custom matchers and Result<T> validation  
  - NAMING: test_storeInOSKeychain_success, test_retrieveFromOSKeychain_platformErrors
  - COVERAGE: Happy path, error scenarios, cross-platform behavior, Linux fallback
  - PLACEMENT: Mirror source structure in __tests__ directory

Task 6: CREATE __tests__/main/security/utils/SecureFileOperations.test.ts
  - IMPLEMENT: Unit tests for atomic file operations and permission handling
  - FOLLOW pattern: Existing test patterns with mocked file system operations
  - MOCK: Node.js fs module methods for predictable test behavior  
  - COVERAGE: Atomic writes, permission setting, error recovery, path validation
  - PLACEMENT: Test utilities alongside code they test

Task 7: ADD security audit logging for keychain operations
  - IMPLEMENT: SecurityAuditEvent creation for store/retrieve operations
  - FOLLOW pattern: Existing audit logging in SecureStorageManager.ts
  - EVENT_TYPES: 'os_keychain_store', 'os_keychain_retrieve', 'keychain_fallback'
  - INTEGRATION: Add to both storeInOSKeychain() and retrieveFromOSKeychain()
  - CRITICAL: Never log sensitive data - only operation metadata
```

### Implementation Patterns & Key Details

```typescript
// OS Keychain Storage Pattern (Windows/macOS)
private storeInOSKeychain(keyId: string, keyData: Buffer): void {
  if (!this.isOSEncryptionAvailable()) {
    if (process.platform === 'linux') {
      throw new Error('Linux OS keychain not implemented. Contributions welcome! Visit github.com/mauricio-morales/smart-inbox-janitor');
    }
    throw new Error('OS encryption not available');
  }
  
  // PATTERN: Convert to base64 for string handling (follow existing patterns)
  const keyDataB64 = keyData.toString('base64');
  
  // PATTERN: Use safeStorage.encryptString() for OS encryption
  const encryptedKey = safeStorage.encryptString(keyDataB64);
  
  // PATTERN: Store in app.getPath('userData') with atomic operations
  const userDataPath = app.getPath('userData');
  const keyPath = path.join(userDataPath, 'keychain', `sij-key-${keyId}.enc`);
  
  // CRITICAL: Atomic write pattern to prevent corruption
  SecureFileOperations.writeFileAtomically(keyPath, encryptedKey, { mode: 0o600 });
  
  // CRITICAL: Security audit logging (without sensitive data)
  this.logSecurityEvent('os_keychain_store', keyId, true);
}

// OS Keychain Retrieval Pattern with Graceful Degradation
private retrieveFromOSKeychain(keyId: string): string | null {
  if (!this.isOSEncryptionAvailable()) {
    return null; // Graceful degradation to fallback encryption
  }
  
  try {
    const keyPath = path.join(app.getPath('userData'), 'keychain', `sij-key-${keyId}.enc`);
    
    // PATTERN: Check existence before reading (avoid exceptions)
    if (!fs.existsSync(keyPath)) {
      return null;
    }
    
    // PATTERN: Verify file permissions before sensitive operations
    SecureFileOperations.verifyFilePermissions(keyPath, 0o600);
    
    const encryptedData = fs.readFileSync(keyPath);
    const decryptedKey = safeStorage.decryptString(encryptedData);
    
    // CRITICAL: Validate decrypted data format
    if (!this.isValidBase64(decryptedKey)) {
      throw new Error('Invalid decrypted key format');
    }
    
    this.logSecurityEvent('os_keychain_retrieve', keyId, true);
    return decryptedKey;
  } catch (error) {
    // CRITICAL: Log error but return null for graceful degradation
    this.logSecurityEvent('os_keychain_retrieve', keyId, false, error.message);
    return null;
  }
}

// Atomic File Operations Pattern
export class SecureFileOperations {
  static writeFileAtomically(filePath: string, data: Buffer, options?: { mode?: number }): void {
    const tempPath = `${filePath}.tmp.${crypto.randomBytes(8).toString('hex')}`;
    
    try {
      // PATTERN: Create parent directory if needed (follow SQLiteProvider pattern)
      const parentDir = path.dirname(filePath);
      if (!fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir, { recursive: true, mode: 0o700 });
      }
      
      // PATTERN: Write to temp file first for atomicity
      fs.writeFileSync(tempPath, data, { mode: options?.mode ?? 0o600, flag: 'wx' });
      
      // PATTERN: Set cross-platform permissions
      this.setCrossPlatformPermissions(tempPath, options?.mode ?? 0o600);
      
      // CRITICAL: Atomic rename to final location
      fs.renameSync(tempPath, filePath);
    } catch (error) {
      // CRITICAL: Cleanup temp file on failure
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }
      throw error;
    }
  }
}
```

### Integration Points

```yaml
SECURITY:
  - add to: src/main/security/CredentialEncryption.ts
  - pattern: "Complete existing TODO methods without breaking interface"
  
TESTING:
  - add to: __tests__/main/security/
  - pattern: "Follow __tests__/setup.ts custom matchers for Result<T> validation"

LOGGING:
  - add to: existing SecurityAuditEvent system
  - pattern: "Use same event types and context as SecureStorageManager.ts"

FILE_SYSTEM:
  - add to: app.getPath('userData')/keychain/ directory
  - pattern: "Follow SQLiteProvider.ts directory creation and permission patterns"
```

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run after each file creation - fix before proceeding
npm run type-check                    # TypeScript strict mode compliance
npm run lint                         # ESLint with project rules
npm run format:check                 # Prettier formatting validation

# Project-wide validation
npm run ci:quick                     # Fast validation: lint + type-check + build

# Expected: Zero errors. If errors exist, READ output and fix before proceeding.
```

### Level 2: Unit Tests (Component Validation)

```bash
# Test each component as it's created
npm run test -- __tests__/main/security/CredentialEncryption.test.ts
npm run test -- __tests__/main/security/utils/SecureFileOperations.test.ts

# Full security test suite
npm run test -- __tests__/main/security/
npm run test:types                   # Type definition tests
npm run test:schemas                 # Schema validation tests

# Coverage validation
npm run test:coverage

# Expected: All tests pass, >95% coverage for new code. Debug failures before proceeding.
```

### Level 3: Integration Testing (System Validation)

```bash
# Development server validation
npm run dev &
sleep 5

# Manual testing of credential storage/retrieval
# Test OAuth flow with credential persistence
# Verify keychain integration on Windows/macOS

# Build validation for all platforms
npm run build
npm run build:mac                    # macOS specific build
npm run build:win                    # Windows specific build

# Expected: Clean builds, no integration errors, keychain operations working
```

### Level 4: Creative & Domain-Specific Validation

```bash
# Security-specific validation
npm run ci:security                  # Security audit with npm audit

# Cross-platform compatibility testing
# Verify Windows DPAPI integration
# Verify macOS Keychain integration  
# Verify Linux graceful degradation

# Performance validation
# Ensure keychain operations complete within 100ms

# Security audit validation
# Verify no sensitive data in error messages
# Verify proper file permissions set
# Verify atomic operations working correctly

# Expected: All security checks pass, cross-platform compatibility verified
```

## Final Validation Checklist

### Technical Validation

- [ ] All 4 validation levels completed successfully
- [ ] All tests pass: `npm run test`
- [ ] No linting errors: `npm run lint`
- [ ] No type errors: `npm run type-check`  
- [ ] No formatting issues: `npm run format:check`
- [ ] Security audit clean: `npm run ci:security`

### Feature Validation

- [ ] Windows DPAPI keychain storage working
- [ ] macOS Keychain Services storage working  
- [ ] Linux shows clear contribution invitation message
- [ ] Graceful fallback to encrypted file storage when keychain unavailable
- [ ] All error scenarios handled with proper Result<T> returns
- [ ] Security audit events properly logged for all operations
- [ ] File permissions correctly set cross-platform (0o600 for files, 0o700 for directories)

### Code Quality Validation

- [ ] Follows existing Result<T> pattern consistently
- [ ] Uses project's crypto utilities and error types
- [ ] File placement matches desired codebase tree structure
- [ ] No sensitive data exposed in error messages or logs
- [ ] Atomic file operations implemented correctly
- [ ] Cross-platform compatibility handled properly

### Documentation & Deployment

- [ ] Code is self-documenting with clear method names
- [ ] Security operations logged at appropriate level without sensitive data
- [ ] Error messages provide actionable guidance without security exposure
- [ ] Integration maintains existing SecureStorageManager functionality

---

## Anti-Patterns to Avoid

- ❌ Don't throw exceptions - always use Result<T> pattern
- ❌ Don't log sensitive data (keys, tokens, credentials)
- ❌ Don't skip atomic file operations - prevent corruption
- ❌ Don't ignore cross-platform permission differences
- ❌ Don't break existing CredentialEncryption interface
- ❌ Don't hardcode file paths - use app.getPath('userData')
- ❌ Don't skip error sanitization - prevent information leakage