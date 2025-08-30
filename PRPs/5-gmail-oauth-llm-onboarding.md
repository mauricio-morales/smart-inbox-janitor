name: "Gmail OAuth and LLM Setup Onboarding Flow - Complete Implementation"
description: |

---

## Goal

**Feature Goal**: Implement a complete guided onboarding flow that securely connects users to Gmail via OAuth 2.0 and validates their OpenAI API key, replacing the current stub implementations with production-ready authentication.

**Deliverable**: Fully functional multi-step onboarding system with Gmail OAuth integration, OpenAI API key validation, secure credential storage, and persistent connection state management.

**Success Definition**: Users can complete onboarding by authenticating with Gmail, providing a valid OpenAI API key, and having their credentials securely stored with connection state persisting across app restarts.

## User Persona

**Target User**: Privacy-conscious Gmail users seeking email automation with AI assistance

**Use Case**: First-time app launch requiring secure credential setup before email processing

**User Journey**:

1. Launch app → Welcome screen explaining app purpose and security
2. Click "Connect Gmail" → OAuth flow in secure browser window → Success confirmation
3. Enter OpenAI API key → Real-time validation → Success confirmation
4. Review settings → Complete onboarding → Navigate to dashboard

**Pain Points Addressed**:

- Complex OAuth setup made simple with guided flow
- API key validation prevents runtime failures
- Clear security messaging builds trust
- One-time setup with persistent credentials

## Why

- **Security Foundation**: OAuth 2.0 and encrypted credential storage establish secure access patterns
- **User Trust**: Transparent security practices and local-first data handling
- **Development Enablement**: Real authentication unlocks actual Gmail API integration for features
- **Production Readiness**: Moves application from demo/stub state to functional email processing

## What

**User-visible behavior**: Replace current stub onboarding with working Gmail OAuth and OpenAI validation flows that persist across sessions

**Technical requirements**: Implement Gmail OAuth 2.0, OpenAI API validation, secure credential storage, connection state management, and error handling

### Success Criteria

- [ ] Users can authenticate with Gmail OAuth 2.0 and receive valid access/refresh tokens
- [ ] OpenAI API keys are validated in real-time with proper error messaging
- [ ] All credentials are stored using hybrid OS keychain + AES-256-GCM encryption
- [ ] Connection state persists across app restarts with automatic token refresh
- [ ] Error handling covers OAuth failures, API key issues, and network problems
- [ ] Onboarding completion redirects to dashboard and sets completion flag
- [ ] Returning users bypass onboarding if credentials are valid

## All Needed Context

### Context Completeness Check

_This PRP provides complete implementation context including existing patterns, OAuth flows, security infrastructure, error handling, and validation approaches needed for one-pass implementation success._

### Documentation & References

```yaml
# Gmail OAuth 2.0 Implementation
- url: https://developers.google.com/gmail/api/auth/web-server
  why: Complete OAuth 2.0 flow for desktop applications with code exchange patterns
  critical: Use "authorization code" flow with refresh tokens for persistent access

- url: https://developers.google.com/gmail/api/auth/scopes
  why: Specific OAuth scopes for Gmail operations (read, modify, labels)
  critical: Use minimal required scopes - gmail.readonly and gmail.modify

# Existing Implementation Patterns
- file: src/providers/email/gmail/GmailProvider.ts
  why: Current stub implementation shows expected interface and error patterns
  pattern: Result<T> pattern with specific error types (AuthenticationError, ConfigurationError)
  gotcha: All methods must return Result<T> - never throw exceptions

- file: src/main/security/SecureStorageManager.ts
  why: Established patterns for secure OAuth token storage with hybrid encryption
  pattern: storeGmailTokens() and getGmailTokens() methods with CredentialStorageOptions
  gotcha: API keys must start with 'sk-' prefix for validation

- file: src/main/security/CredentialEncryption.ts
  why: Core encryption service for sensitive credential storage
  pattern: encryptCredential() and decryptCredential() with OS keychain fallback
  gotcha: Error message sanitization prevents token exposure in logs

- file: src/renderer/src/pages/Onboarding/index.tsx
  why: Existing multi-step onboarding UI structure with stepper component
  pattern: MUI Stepper with getStepContent(), handleNext(), handleBack() navigation
  gotcha: Uses demo timeouts - replace with real OAuth and API validation

- file: src/shared/types/config.types.ts
  why: Complete type definitions for GmailTokens, GmailConnectionState, OpenAIConfig
  pattern: Readonly interfaces with optional fields and connection state tracking
  gotcha: Connection state needs isSignedIn and needsReSignIn status flags

- file: src/main/ipc.ts
  why: IPC handler patterns for secure communication between main and renderer
  pattern: ipcMain.handle with try-catch returning Result<T> structure
  gotcha: All IPC handlers must wrap provider calls and return consistent error format
```

### Current Codebase Tree

```bash
src/
├── main/
│   ├── index.ts                 # Main process entry point
│   ├── ipc.ts                   # IPC handlers (needs OAuth handlers)
│   ├── window.ts                # BrowserWindow management
│   └── security/
│       ├── CredentialEncryption.ts    # Hybrid encryption service
│       ├── SecureStorageManager.ts    # Token storage with OAuth methods
│       └── TokenRotationService.ts    # Token refresh automation
├── providers/
│   ├── email/gmail/
│   │   └── GmailProvider.ts     # Gmail stub (needs OAuth implementation)
│   ├── llm/openai/
│   │   └── OpenAIProvider.ts    # OpenAI stub (needs validation)
│   └── storage/sqlite/
│       └── SQLiteProvider.ts    # Working encrypted storage
├── renderer/src/
│   ├── pages/Onboarding/
│   │   └── index.tsx           # Multi-step UI (needs real OAuth)
│   ├── components/Layout/      # Working navigation components
│   └── hooks/
│       └── useElectronAPI.ts   # IPC communication hook
└── shared/
    ├── types/
    │   ├── config.types.ts     # OAuth and connection types defined
    │   ├── email.types.ts      # EmailProvider interface
    │   └── errors.types.ts     # Authentication error classes
    └── utils/
        └── crypto.utils.ts     # Cryptographic utilities
```

### Desired Codebase Tree with Files to be Added

```bash
src/
├── main/
│   ├── oauth/                   # NEW: OAuth flow management
│   │   ├── GmailOAuthManager.ts # Gmail OAuth 2.0 implementation
│   │   └── OAuthWindow.ts       # Secure BrowserWindow for OAuth
│   └── ipc.ts                   # UPDATE: Add OAuth IPC handlers
├── providers/
│   ├── email/gmail/
│   │   └── GmailProvider.ts     # UPDATE: Real OAuth implementation
│   └── llm/openai/
│       └── OpenAIProvider.ts    # UPDATE: Real API key validation
└── renderer/src/
    └── pages/Onboarding/
        └── index.tsx           # UPDATE: Real OAuth flows and validation
```

### Known Gotchas & Library Quirks

```typescript
// CRITICAL: Gmail API requires specific OAuth 2.0 flow for desktop apps
// Use authorization code flow with PKCE for security
// Must request 'offline' access to get refresh tokens

// CRITICAL: Electron BrowserWindow security for OAuth
// Disable nodeIntegration, enable contextIsolation
// Use separate window for OAuth to prevent script injection

// CRITICAL: OpenAI API validation
// API keys must start with 'sk-' prefix
// Use simple API call to validate (models endpoint or completion)
// Handle rate limiting and quota exceeded errors gracefully

// CRITICAL: Result<T> pattern enforcement
// All provider methods MUST return Result<T> - never throw exceptions
// IPC handlers must catch and convert exceptions to Result pattern

// CRITICAL: MUI v7 Grid syntax (project requirement)
// Use size={{ xs: 12, sm: 6 }} instead of xs={12} sm={6}
// No Grid2 component - use standard Grid with new syntax
```

## Implementation Blueprint

### Data Models and Structure

Leverage existing type definitions with OAuth-specific extensions:

```typescript
// Existing types in src/shared/types/config.types.ts to use:
interface GmailTokens {
  readonly accessToken: string;
  readonly refreshToken?: string;
  readonly expiryDate: number;
  readonly scope?: string;
  readonly tokenType?: string;
}

interface GmailConnectionState {
  readonly isSignedIn: boolean;
  readonly accountEmail?: string;
  readonly accountName?: string;
  readonly needsReSignIn: boolean;
  readonly lastError?: string;
}

interface OpenAIConnectionState {
  readonly hasValidKey: boolean;
  readonly keyLastFour?: string;
  readonly lastValidated?: string;
  readonly validationError?: string;
}
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: CREATE src/main/oauth/GmailOAuthManager.ts
  - IMPLEMENT: Complete Gmail OAuth 2.0 flow with authorization code exchange
  - FOLLOW pattern: src/main/security/SecureStorageManager.ts (Result<T> pattern, error handling)
  - NAMING: GmailOAuthManager class with async methods (initiateAuth, exchangeCode, refreshTokens)
  - SCOPES: ['https://www.googleapis.com/auth/gmail.readonly', 'https://www.googleapis.com/auth/gmail.modify']
  - DEPENDENCIES: googleapis package, existing CredentialEncryption service
  - PLACEMENT: New oauth directory in main process

Task 2: CREATE src/main/oauth/OAuthWindow.ts
  - IMPLEMENT: Secure BrowserWindow configuration for OAuth flow
  - FOLLOW pattern: src/main/window.ts (BrowserWindow creation patterns)
  - NAMING: OAuthWindow class with createOAuthWindow() and handleCallback() methods
  - SECURITY: contextIsolation: true, nodeIntegration: false, sandbox: true
  - DEPENDENCIES: electron BrowserWindow, URL parsing for callback handling
  - PLACEMENT: OAuth utilities in main process

Task 3: UPDATE src/providers/email/gmail/GmailProvider.ts
  - IMPLEMENT: Replace stub methods with real Gmail API integration using OAuth tokens
  - FOLLOW pattern: src/providers/storage/sqlite/SQLiteProvider.ts (provider structure, initialization)
  - NAMING: Keep existing GmailProvider class, implement initialize(), healthCheck(), list() methods
  - DEPENDENCIES: googleapis package, GmailOAuthManager from Task 1, SecureStorageManager
  - INTEGRATION: Use stored OAuth tokens for API authentication
  - PLACEMENT: Replace existing stub implementation

Task 4: UPDATE src/providers/llm/openai/OpenAIProvider.ts
  - IMPLEMENT: Replace stub methods with real OpenAI API key validation and connection testing
  - FOLLOW pattern: src/providers/email/gmail/GmailProvider.ts (provider interface, error handling)
  - NAMING: Keep existing OpenAIProvider class, implement testConnection(), validateConfiguration()
  - DEPENDENCIES: openai npm package, existing SecureStorageManager for API key retrieval
  - VALIDATION: Simple API call to models endpoint for key validation
  - PLACEMENT: Replace existing stub implementation

Task 5: UPDATE src/main/ipc.ts
  - IMPLEMENT: Add OAuth-specific IPC handlers for Gmail authentication and OpenAI validation
  - FOLLOW pattern: Existing IPC handlers (try-catch with Result<T> return format)
  - NAMING: 'gmail:initiateOAuth', 'gmail:getConnectionState', 'openai:validateKey', 'openai:testConnection'
  - DEPENDENCIES: GmailOAuthManager and OpenAIProvider from previous tasks
  - SECURITY: Ensure no sensitive data exposure in IPC responses
  - PLACEMENT: Add to existing IPC handler collection

Task 6: UPDATE src/renderer/src/pages/Onboarding/index.tsx
  - IMPLEMENT: Replace stub OAuth flows with real Gmail OAuth and OpenAI validation
  - FOLLOW pattern: Existing onboarding UI structure (MUI Stepper, error handling, navigation)
  - NAMING: Keep existing component structure, update handleGmailConnect() and handleOpenAIValidation()
  - DEPENDENCIES: useElectronAPI hook for IPC communication, existing UI components
  - UI UPDATES: Remove demo timeouts, add real loading states, update error messages
  - PLACEMENT: Update existing onboarding component

Task 7: CREATE __tests__/oauth/ directory with comprehensive test coverage
  - IMPLEMENT: Unit tests for GmailOAuthManager, OAuthWindow, and provider updates
  - FOLLOW pattern: Existing test structure in __tests__ directory
  - NAMING: test_gmail_oauth.ts, test_openai_validation.ts, test_onboarding_integration.ts
  - COVERAGE: OAuth flow, error handling, token storage, API validation, UI integration
  - MOCKING: External API calls, Electron BrowserWindow, secure storage operations
  - PLACEMENT: New oauth test directory with integration tests
```

### Implementation Patterns & Key Details

```typescript
// Gmail OAuth Flow Pattern
export class GmailOAuthManager {
  async initiateAuth(): Promise<Result<{ authUrl: string; codeVerifier: string }>> {
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.modify',
      ],
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });
    return createSuccessResult({ authUrl, codeVerifier });
  }

  async exchangeCode(authCode: string, codeVerifier: string): Promise<Result<GmailTokens>> {
    // PATTERN: Exchange authorization code for tokens with PKCE
    // CRITICAL: Store refresh token securely using SecureStorageManager
    // ERROR HANDLING: Map Google API errors to AuthenticationError types
  }
}

// OpenAI API Validation Pattern
export class OpenAIProvider {
  async validateConfiguration(config: OpenAIConfig): Promise<Result<boolean>> {
    // PATTERN: Simple API call to validate key without expensive operations
    const openai = new OpenAI({ apiKey: config.apiKey });
    try {
      await openai.models.list(); // Lightweight validation call
      return createSuccessResult(true);
    } catch (error) {
      // CRITICAL: Map OpenAI errors to ValidationError with sanitized messages
      return createErrorResult(new ValidationError('Invalid OpenAI API key'));
    }
  }
}

// Secure BrowserWindow Pattern for OAuth
export class OAuthWindow {
  createOAuthWindow(): BrowserWindow {
    return new BrowserWindow({
      width: 500,
      height: 600,
      webPreferences: {
        contextIsolation: true, // CRITICAL: Prevent script injection
        nodeIntegration: false, // CRITICAL: No Node.js access in OAuth window
        sandbox: true, // CRITICAL: Enable process sandboxing
        preload: undefined, // CRITICAL: No preload script for OAuth window
      },
    });
  }
}

// IPC Handler Pattern for OAuth
ipcMain.handle('gmail:initiateOAuth', async () => {
  try {
    const authResult = await gmailOAuthManager.initiateAuth();
    if (!authResult.success) {
      return authResult;
    }

    // Open OAuth window and handle callback
    const window = oAuthWindow.createOAuthWindow();
    window.loadURL(authResult.data.authUrl);

    return createSuccessResult({ status: 'auth_initiated' });
  } catch (error) {
    // PATTERN: Consistent error handling with sanitized messages
    return createErrorResult(new AuthenticationError('OAuth initiation failed'));
  }
});
```

### Integration Points

```yaml
OAUTH_FLOW:
  - gmail_scopes: 'readonly and modify for email operations'
  - redirect_uri: 'http://localhost:3000/oauth/callback'
  - token_storage: 'SecureStorageManager with OS keychain encryption'

SECURITY:
  - oauth_window: 'Isolated BrowserWindow with no Node.js access'
  - token_encryption: 'Hybrid OS keychain + AES-256-GCM via CredentialEncryption'
  - error_sanitization: 'Remove sensitive data from error messages using existing patterns'

API_INTEGRATION:
  - gmail_client: 'googleapis package with OAuth 2.0 authentication'
  - openai_client: 'openai package for API key validation and classification'
  - connection_state: 'Persistent tracking via SQLite storage with health checks'

UI_UPDATES:
  - remove: 'Demo timeouts and stub error messages'
  - add: 'Real loading states, OAuth flow status, API validation feedback'
  - follow: 'Existing MUI component patterns and error display formats'
```

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run after each file creation - fix before proceeding
npm run lint                     # ESLint validation with auto-fix
npm run type-check              # TypeScript strict checking
npm run format                  # Prettier code formatting

# Expected: Zero errors. If errors exist, READ output and fix before proceeding.
```

### Level 2: Unit Tests (Component Validation)

```bash
# Test OAuth implementation
npm run test src/main/oauth/     # OAuth manager and window tests
npm run test src/providers/      # Provider implementation tests

# Test UI integration
npm run test src/renderer/src/pages/Onboarding/  # Onboarding flow tests

# Coverage validation
npm run test:coverage --passWithNoTests          # 90%+ coverage required

# Expected: All tests pass with required coverage. If failing, debug and fix.
```

### Level 3: Integration Testing (System Validation)

```bash
# Application startup with new OAuth implementation
npm run dev                      # Start development server

# Manual OAuth flow testing
# 1. Launch app → should show onboarding if not completed
# 2. Click "Connect Gmail" → should open OAuth window
# 3. Complete OAuth → should store tokens and show success
# 4. Enter valid OpenAI key → should validate and proceed
# 5. Complete onboarding → should redirect to dashboard
# 6. Restart app → should skip onboarding (credentials persisted)

# Health check validation
# Test stored credential retrieval and token refresh

# Expected: Complete OAuth flow works, credentials persist, error handling graceful
```

### Level 4: Security & Production Validation

```bash
# Security validation
npm audit                       # Dependency security audit
npm run ci:security            # Project security checks

# Token storage verification
# Verify tokens are encrypted in database
# Verify tokens are not exposed in logs or error messages
# Test token refresh and rotation functionality

# OAuth security validation
# Verify OAuth window isolation (no Node.js access)
# Test PKCE code challenge/verifier flow
# Verify secure redirect URI handling

# API key security validation
# Verify OpenAI keys are encrypted and not logged
# Test API key format validation and error handling
# Verify connection state persistence and refresh

# Expected: All security checks pass, no credential exposure, proper isolation
```

## Final Validation Checklist

### Technical Validation

- [ ] All 4 validation levels completed successfully
- [ ] OAuth flow completes end-to-end with token storage
- [ ] OpenAI API key validation works with proper error handling
- [ ] No linting errors: `npm run lint`
- [ ] No type errors: `npm run type-check`
- [ ] Test coverage meets 90% requirement: `npm run test:coverage`

### Feature Validation

- [ ] Gmail OAuth 2.0 authentication flow works completely
- [ ] OpenAI API key validation provides real-time feedback
- [ ] Credentials persist across app restarts
- [ ] Error handling covers OAuth failures, invalid API keys, network issues
- [ ] Onboarding completion sets flag and redirects to dashboard
- [ ] Returning users with valid credentials skip onboarding
- [ ] Connection state accurately reflects authentication status

### Security Validation

- [ ] OAuth tokens encrypted using OS keychain + AES-256-GCM
- [ ] OAuth window properly isolated (no Node.js access, context isolation enabled)
- [ ] No sensitive data exposed in logs or error messages
- [ ] API keys validated and stored securely
- [ ] Token refresh mechanism works automatically
- [ ] Security audit logging captures authentication events
- [ ] PKCE flow properly implemented for OAuth security

### Code Quality Validation

- [ ] Follows existing Result<T> pattern consistently
- [ ] File placement matches desired codebase tree structure
- [ ] Error types match existing authentication error hierarchy
- [ ] UI follows established MUI component patterns
- [ ] IPC handlers follow existing secure communication patterns
- [ ] No hardcoded credentials or configuration values

### User Experience Validation

- [ ] Onboarding flow is intuitive and provides clear feedback
- [ ] Error messages are helpful and actionable
- [ ] Loading states provide appropriate user feedback
- [ ] OAuth flow feels secure and trustworthy
- [ ] API key validation gives immediate feedback
- [ ] Successful completion clearly indicates next steps

---

## Anti-Patterns to Avoid

- ❌ Don't store OAuth tokens in plain text or expose them in logs
- ❌ Don't use try-catch without converting to Result<T> pattern
- ❌ Don't enable Node.js integration in OAuth BrowserWindow
- ❌ Don't skip PKCE code challenge for OAuth security
- ❌ Don't hardcode OAuth redirect URIs or API endpoints
- ❌ Don't bypass existing secure storage infrastructure
- ❌ Don't use setTimeout for real API operations (replace demo patterns)
- ❌ Don't ignore token refresh and expiration handling
