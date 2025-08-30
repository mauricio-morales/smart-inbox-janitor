# PRP: Robust Gmail OAuth Token Renewal & User Flow

---

## Goal

**Feature Goal**: Implement automatic Gmail OAuth token renewal with transparent user experience that eliminates visible errors for expired access tokens while maintaining secure authentication state management.

**Deliverable**: Complete OAuth token renewal system with proactive refresh logic, seamless error recovery, and user-friendly re-authentication flow integrated into existing provider architecture.

**Success Definition**:

- Users never see errors for expired access tokens (only failed refresh scenarios)
- Automatic token refresh occurs transparently during app initialization and health checks
- Setup UI clearly indicates connection states with appropriate actions
- All existing OAuth security patterns preserved and enhanced

## User Persona

**Target User**: Desktop email users managing large Gmail inboxes with Smart Inbox Janitor

**Use Case**: User opens the app after several hours/days away and expects Gmail connection to work seamlessly without manual intervention

**User Journey**:

1. User launches Smart Inbox Janitor
2. App automatically validates and refreshes Gmail tokens in background
3. If refresh succeeds: User sees "Connected" status and can use Gmail features immediately
4. If refresh fails: User sees clear "Sign in to Gmail again" prompt with single-click re-authentication

**Pain Points Addressed**:

- Eliminates confusing technical OAuth error messages
- Removes need for users to understand token expiration concepts
- Provides clear recovery path when re-authentication is actually needed

## Why

- **Enhanced User Experience**: Eliminates 90% of authentication errors through proactive token refresh
- **Security Maintenance**: Maintains existing security audit logging and encryption while improving reliability
- **System Integration**: Builds on existing TokenRotationService and SecureStorageManager architecture
- **Error Clarity**: Transforms technical OAuth errors into actionable user guidance

## What

### User-Visible Behavior

**Transparent Token Refresh**:

- App startup automatically refreshes expired/expiring tokens (≤2 minute buffer)
- No user-facing errors or dialogs during successful refresh
- Loading indicators during refresh process

**Connection State UI**:

- **Connected**: Green status with account email and last refresh timestamp
- **Refreshing**: Spinner during automatic token renewal
- **Needs Re-Auth**: Clear "Sign in to Gmail again" button with friendly messaging

**Re-Authentication Flow**:

- Single-click OAuth re-initiation preserving existing security (PKCE, secure storage)
- Success updates connection state immediately
- Failure shows specific guidance without technical error codes

### Technical Requirements

**Proactive Token Management**:

- Integration with existing TokenRotationService for automatic scheduling
- Enhancement of GmailOAuthManager.refreshTokens() for comprehensive error handling
- Atomic token updates through SecureStorageManager

**Enhanced Error Categorization**:

- Map OAuth error codes to technical error categories (invalid_grant, network_error, etc.)
- Distinguish between transient network errors and permanent auth failures
- Comprehensive security audit logging for all token operations

**Provider Initialization Integration**:

- Integration with startup provider initialization sequence in `src/main/index.ts`
- Enhanced provider health check mechanisms
- Proper error propagation to existing provider status systems

### Success Criteria

- [ ] Expired access tokens trigger automatic refresh during app startup
- [ ] Successful refresh allows provider initialization to continue normally
- [ ] Failed refresh properly categorizes error types for appropriate handling
- [ ] Token renewal preserves all existing security patterns (encryption, audit logging, keychain storage)
- [ ] Integration with existing startup sequence maintains initialization flow
- [ ] Comprehensive error logging without exposing sensitive OAuth data

## All Needed Context

### Context Completeness Check

_This PRP provides complete implementation context including existing OAuth patterns, error handling approaches, UI component structures, security requirements, and comprehensive test patterns from the Smart Inbox Janitor codebase._

### Documentation & References

```yaml
# MUST READ - OAuth Implementation Patterns
- file: src/main/oauth/GmailOAuthManager.ts
  why: Core OAuth implementation with existing refreshTokens() method (lines 278-358)
  pattern: PKCE security, token validation (lines 366-408), willExpireSoon buffer (lines 417-426)
  gotcha: 5-minute buffer hardcoded, refresh token fallback pattern, Result<T> return type

- file: src/main/security/SecureStorageManager.ts
  why: Token storage patterns with encryption and audit logging
  pattern: storeGmailTokens() atomic operations (lines 172-259), security audit integration (lines 226-239)
  gotcha: All token operations must include security audit logging, encryption before storage

- file: src/main/security/TokenRotationService.ts
  why: Existing automatic token rotation infrastructure
  pattern: Scheduler integration (lines 117-143), automatic expiration detection (lines 309-325)
  gotcha: 5-minute buffer configuration (line 423), integration points for OAuth manager

# MUST READ - Provider Integration Patterns
- file: src/providers/email/gmail/GmailProvider.ts
  why: Provider-level OAuth integration and error handling patterns
  pattern: connect() method with automatic refresh (lines 236-334), callWithErrorHandling() (lines 906-975)
  gotcha: Result<T> pattern enforcement, authentication error detection (lines 917-923)

# MUST READ - Error Handling Architecture
- file: src/shared/types/errors.types.ts
  why: Comprehensive error type hierarchy and utility functions
  pattern: AuthenticationError, NetworkError, ValidationError classes, isRetryableError() helpers
  gotcha: GmailError specific error code mapping (lines 142-215), severity classification

- file: src/shared/types/base.types.ts
  why: Result<T> pattern implementation and helper functions
  pattern: createSuccessResult(), createErrorResult() helpers (lines 191-238)
  gotcha: All async provider methods must return Result<T>, never throw exceptions

# MUST READ - UI/UX Flow Patterns
- file: src/renderer/src/components/ProviderSetupCard.tsx
  why: Reusable provider status display component
  pattern: Status chip with color coding, setup buttons, message display
  gotcha: ProviderStatus interface requirements, MUI v7 Grid syntax

- file: src/renderer/src/machines/startupMachine.ts
  why: XState integration for provider status management
  pattern: ProviderStatus interface, state transitions, setup type classification
  gotcha: setupType values: 'token_refresh' | 'full_reconfiguration' | 'initial_setup'

- file: src/renderer/src/services/StartupOrchestrator.ts
  why: Provider health check orchestration patterns
  pattern: checkAllProviders() parallel execution, provider status mapping
  gotcha: Connection state mapping, error classification for UI display

# MUST READ - IPC Communication Security
- file: src/main/ipc.ts
  why: Secure IPC handler patterns for OAuth operations
  pattern: OAuth handlers (lines 346-836), Result<T> propagation, error handling
  gotcha: All OAuth operations wrapped in try-catch, sensitive data protection

- file: src/preload/index.ts
  why: Secure IPC bridge type definitions
  pattern: oauth interface definitions, Result<T> return types
  gotcha: Type safety requirements, security context isolation

# MUST READ - External Documentation
- url: https://developers.google.com/identity/protocols/oauth2/web-server#offline
  why: Google OAuth refresh token specifications and error codes
  critical: offline access_type required, refresh_token only on first auth, error code meanings

- url: https://developers.google.com/identity/protocols/oauth2/web-server#handlinganerrorresponse
  why: Official OAuth error handling and recovery strategies
  critical: invalid_grant vs invalid_client distinction, retry vs re-auth scenarios

- docfile: PRPs/ai_docs/gmail_oauth_refresh_patterns.md
  why: Comprehensive research on OAuth refresh patterns and desktop app security
  section: Error Codes and Handling Strategies, Desktop Application Security
```

### Current Codebase Tree

```bash
src/
├── main/
│   ├── oauth/
│   │   ├── GmailOAuthManager.ts          # Core OAuth with refreshTokens() method
│   │   └── OAuthWindow.ts                # Secure OAuth window management
│   ├── security/
│   │   ├── SecureStorageManager.ts       # Token storage with encryption
│   │   ├── CredentialEncryption.ts       # OS keychain integration
│   │   └── TokenRotationService.ts       # Automatic rotation scheduling
│   └── ipc.ts                            # OAuth IPC handlers
├── providers/email/gmail/
│   └── GmailProvider.ts                  # Provider integration with OAuth
├── renderer/src/
│   ├── components/
│   │   ├── ProviderSetupCard.tsx         # Reusable provider status UI
│   │   └── StartupStateMachine.tsx       # Startup orchestration
│   ├── machines/
│   │   └── startupMachine.ts             # XState provider status management
│   ├── services/
│   │   └── StartupOrchestrator.ts        # Provider health check coordination
│   └── pages/Setup/
│       └── GmailSetupModal.tsx           # OAuth setup UI patterns
├── shared/types/
│   ├── base.types.ts                     # Result<T> pattern definitions
│   ├── errors.types.ts                   # Error hierarchy and utilities
│   ├── config.types.ts                   # OAuth configuration types
│   └── security.types.ts                 # Token and security types
└── preload/index.ts                      # Secure IPC type definitions
```

### Desired Codebase Tree with New Files

```bash
src/
├── main/
│   ├── oauth/
│   │   ├── GmailOAuthManager.ts          # ENHANCED: Better refresh error handling
│   │   └── OAuthWindow.ts                # UNCHANGED: Secure window patterns
│   ├── security/
│   │   ├── SecureStorageManager.ts       # UNCHANGED: Token storage patterns
│   │   ├── TokenRotationService.ts       # ENHANCED: Startup integration
│   │   └── GmailStartupAuth.ts           # NEW: Startup-specific auth handling
│   ├── index.ts                          # ENHANCED: Token refresh in initialization
│   └── ipc.ts                            # ENHANCED: Auth error status handlers
├── providers/email/gmail/
│   └── GmailProvider.ts                  # ENHANCED: Improved refresh integration
└── __tests__/
    ├── oauth/
    │   └── gmail-startup-auth.test.ts     # NEW: Startup auth integration tests
    ├── main/security/
    │   └── GmailStartupAuth.test.ts       # NEW: Startup auth service tests
    └── main/
        └── startup-integration.test.ts    # NEW: Full startup flow tests
```

### Known Gotchas & Library Quirks

```typescript
// CRITICAL: Result<T> pattern is mandatory - never throw exceptions
// All provider methods must return Result<T> types from src/shared/types/base.types.ts
const result = await gmailProvider.someMethod();
if (!result.success) {
  // Handle error through result.error, not catch block
}

// CRITICAL: Google APIs OAuth client requires specific credential setting
// Lines from GmailOAuthManager.ts:278-358 show refresh pattern
this.oauth2Client.setCredentials({ refresh_token: refreshToken });
// Must check if new refresh_token returned and update storage atomically

// CRITICAL: TokenRotationService uses 5-minute expiration buffer
// Lines 320-324 in TokenRotationService.ts show existing buffer logic
const bufferTime = currentTime + this.config.expirationBufferMs; // 5 minutes default
// Must maintain compatibility with existing buffer configuration

// CRITICAL: SecureStorageManager requires security audit logging
// Lines 226-239 show audit pattern - ALL credential operations must log
await this.securityAuditLogger.logEvent({
  eventType: 'credential_stored' | 'credential_retrieved',
  // No sensitive data in logs
});

// CRITICAL: MUI v7 Grid requires new syntax in UI components
// DO NOT use <Grid xs={12}> - use <Grid size={{ xs: 12 }}>
<Grid container spacing={2}>
  <Grid size={{ xs: 12, sm: 6 }}>Content</Grid>
</Grid>

// CRITICAL: XState machines require specific state structure
// ProviderStatus interface from startupMachine.ts must include:
{
  id: 'gmail',
  status: 'connected' | 'disconnected' | 'error' | 'checking',
  requiresSetup: boolean,
  setupType: 'token_refresh' | 'full_reconfiguration' | 'initial_setup'
}

// CRITICAL: OAuth error code mapping for user-friendly messages
// From errors.types.ts GmailError - specific codes require specific handling:
// 'invalid_grant' -> needs full re-authentication
// 'invalid_client' -> configuration error
// Network errors -> retry with backoff, don't require re-auth
```

## Implementation Blueprint

### Data Models and Structure

Enhance existing OAuth and security types to support comprehensive token renewal states and error classifications.

```typescript
// EXTEND: src/shared/types/config.types.ts
interface GmailAuthState {
  readonly status: 'connected' | 'refreshing' | 'needs_reauth';
  readonly accountEmail?: string;
  readonly expiresAt?: number;
  readonly lastRefreshAt?: number;
  readonly refreshAttempts?: number;
  readonly lastError?: {
    readonly code: string;
    readonly reason: RefreshFailureReason;
    readonly timestamp: number;
  };
}

type RefreshFailureReason =
  | 'invalid_grant' // Refresh token revoked/expired
  | 'consent_revoked' // User removed app permissions
  | 'insufficient_scope' // Scope changes require re-auth
  | 'client_misconfigured' // OAuth client credentials invalid
  | 'network_error' // Transient network issues
  | 'rate_limit_exceeded' // Too many refresh attempts
  | 'unknown';

// EXTEND: src/shared/types/security.types.ts
interface TokenRefreshMetadata {
  readonly refreshedAt: number;
  readonly refreshMethod: 'automatic' | 'manual' | 'startup';
  readonly previousExpiryDate?: number;
  readonly refreshDurationMs: number;
  readonly attemptNumber: number;
}
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: ENHANCE src/main/oauth/GmailOAuthManager.ts
  - IMPLEMENT: Enhanced refreshTokens() with comprehensive error categorization
  - FOLLOW pattern: Existing refreshTokens() method (lines 278-358), Result<T> returns
  - NAMING: Maintain existing method names, add private helper methods for error mapping
  - ENHANCE: Add refreshFailureReason mapping, retry logic with exponential backoff
  - DEPENDENCIES: Use existing error types from src/shared/types/errors.types.ts
  - PLACEMENT: Enhance existing file, preserve all security patterns

Task 2: CREATE src/main/security/GmailStartupAuth.ts
  - IMPLEMENT: Startup-specific Gmail authentication service
  - FOLLOW pattern: src/main/security/SecureStorageManager.ts (audit logging, Result<T>)
  - NAMING: GmailStartupAuth class, methods: validateAndRefreshTokens(), handleStartupAuth()
  - INTEGRATE: Enhanced GmailOAuthManager, SecureStorageManager for token operations
  - DEPENDENCIES: Enhanced GmailOAuthManager from Task 1, existing security patterns
  - PLACEMENT: New service in src/main/security/ following existing security patterns

Task 3: ENHANCE src/main/security/TokenRotationService.ts
  - INTEGRATE: GmailStartupAuth for startup-aware token management
  - FOLLOW pattern: Existing rotation methods (lines 309-383), maintain scheduler integration
  - ENHANCE: Add startup token validation, improved error categorization
  - PRESERVE: Existing 5-minute buffer configuration (lines 419-427)
  - DEPENDENCIES: GmailStartupAuth from Task 2, existing OAuth manager
  - PLACEMENT: Enhance existing file, maintain compatibility with current rotation schedule

Task 4: ENHANCE src/main/index.ts
  - INTEGRATE: Gmail token refresh into provider initialization sequence
  - FOLLOW pattern: Existing provider initialization (lines 43-71)
  - ENHANCE: Add token validation and refresh before Gmail provider setup
  - PRESERVE: Existing initialization flow and error handling patterns
  - DEPENDENCIES: GmailStartupAuth from Task 2, existing main process patterns
  - PLACEMENT: Enhance existing initialization sequence

Task 5: ENHANCE src/providers/email/gmail/GmailProvider.ts
  - INTEGRATE: Enhanced OAuth manager for improved startup integration
  - FOLLOW pattern: Existing connect() method (lines 236-334), callWithErrorHandling() approach
  - ENHANCE: Better token expiration handling during provider initialization
  - MAINTAIN: Existing Result<T> patterns, security audit requirements
  - DEPENDENCIES: Enhanced OAuth manager from Task 1
  - PLACEMENT: Enhance existing provider, preserve all existing functionality

Task 6: CREATE comprehensive test suite
  - CREATE: __tests__/oauth/gmail-startup-auth.test.ts (startup auth flow tests)
  - CREATE: __tests__/main/security/GmailStartupAuth.test.ts (startup auth service tests)
  - CREATE: __tests__/main/startup-integration.test.ts (full startup integration tests)
  - FOLLOW pattern: Existing test structure, Result<T> testing, comprehensive mocking
  - COVER: Startup token refresh, initialization integration, error scenarios
  - DEPENDENCIES: All implementation tasks completed
  - PLACEMENT: Follow existing test directory structure and naming conventions
```

### Implementation Patterns & Key Details

```typescript
// Enhanced OAuth Manager Pattern - refreshTokens() with comprehensive error handling
async refreshTokens(refreshToken: string, attemptNumber = 1): Promise<Result<GmailTokens & { refreshMetadata: TokenRefreshMetadata }>> {
  const startTime = Date.now();

  try {
    // PATTERN: Follow existing oauth2Client setup (lines 278-290)
    this.oauth2Client.setCredentials({ refresh_token: refreshToken });

    const { credentials } = await this.oauth2Client.refreshAccessToken();

    // CRITICAL: Atomic token update with metadata
    const refreshMetadata: TokenRefreshMetadata = {
      refreshedAt: Date.now(),
      refreshMethod: 'automatic',
      refreshDurationMs: Date.now() - startTime,
      attemptNumber
    };

    return createSuccessResult({
      accessToken: credentials.access_token!,
      refreshToken: credentials.refresh_token ?? refreshToken, // Fallback pattern
      expiryDate: credentials.expiry_date ?? Date.now() + 3600000,
      refreshMetadata
    });

  } catch (error) {
    // PATTERN: Error categorization for user-friendly handling
    const failureReason = this.categorizeRefreshError(error);
    return createErrorResult(new AuthenticationError(
      `Token refresh failed: ${failureReason}`,
      { code: 'OAUTH_REFRESH_FAILED', reason: failureReason }
    ));
  }
}

// Startup Auth Integration Pattern - Token refresh during app initialization
async validateAndRefreshTokens(): Promise<Result<boolean>> {
  // PATTERN: Security audit logging (follow SecureStorageManager lines 226-239)
  await this.securityAuditLogger.logEvent({
    eventType: 'startup_token_validation',
    provider: 'gmail',
    success: true,
    metadata: { operation: 'validate_and_refresh' }
  });

  const tokensResult = await this.secureStorageManager.getGmailTokens();
  if (!tokensResult.success) {
    // No tokens available - provider needs initial setup
    return createSuccessResult(false);
  }

  const tokens = tokensResult.data;
  if (!this.oauthManager.willExpireSoon(tokens)) {
    // Tokens still valid
    return createSuccessResult(true);
  }

  // Tokens need refresh - attempt automatic renewal
  const refreshResult = await this.oauthManager.refreshTokens(tokens.refreshToken);
  if (refreshResult.success) {
    // Store refreshed tokens and continue
    await this.secureStorageManager.storeGmailTokens(refreshResult.data);
    return createSuccessResult(true);
  } else {
    // Refresh failed - provider needs reconfiguration
    await this.securityAuditLogger.logEvent({
      eventType: 'startup_token_refresh_failed',
      provider: 'gmail',
      success: false,
      metadata: { error: refreshResult.error.code }
    });
    return createSuccessResult(false);
  }
}

// Main Process Initialization Pattern - Enhanced startup sequence
async function initializeProviders() {
  try {
    // Initialize storage provider first
    await storageProvider.initialize({ databasePath: './data/app.db' });

    // Initialize secure storage manager with storage provider
    const secureStorageInitResult = await secureStorageManager.initialize({
      storageProvider,
      enableTokenRotation: true,
      sessionId: `session-${Date.now()}`,
      userId: 'default-user',
    });

    if (!secureStorageInitResult.success) {
      console.error('Failed to initialize secure storage manager');
      return;
    }

    // ENHANCED: Validate and refresh Gmail tokens before provider initialization
    const gmailStartupAuth = new GmailStartupAuth(gmailOAuthManager, secureStorageManager);
    const tokenValidationResult = await gmailStartupAuth.validateAndRefreshTokens();

    if (tokenValidationResult.success && tokenValidationResult.data) {
      // Tokens are valid - proceed with Gmail provider initialization
      const gmailInitResult = await emailProvider.initialize();
      if (!gmailInitResult.success) {
        console.error('Gmail provider initialization failed:', gmailInitResult.error);
      }
    } else {
      console.log('Gmail tokens require reconfiguration - provider will need setup');
    }

    // Setup IPC handlers after provider initialization attempts
    setupIPC(emailProvider, llmProvider, storageProvider, secureStorageManager);

  } catch (error) {
    console.error('Provider initialization failed:', error);
  }
}

// Enhanced Provider Connect Pattern - Automatic refresh integration
async connect(config?: GmailProviderConfig): Promise<Result<{ connected: boolean; connectedAt: Date }>> {
  try {
    // ENHANCED: Check token status before attempting connection
    const tokensResult = await this.secureStorageManager?.getGmailTokens();
    if (!tokensResult?.success) {
      return createErrorResult(new AuthenticationError('No Gmail tokens available'));
    }

    const tokens = tokensResult.data;

    // Check if tokens are expired and attempt refresh
    if (this.oauthManager?.willExpireSoon(tokens)) {
      const refreshResult = await this.oauthManager.refreshTokens(tokens.refreshToken);
      if (refreshResult.success) {
        // Update stored tokens atomically
        await this.secureStorageManager?.storeGmailTokens(refreshResult.data);
        // Update oauth client with fresh tokens
        this.gmail?.auth.setCredentials({
          access_token: refreshResult.data.accessToken,
          refresh_token: refreshResult.data.refreshToken,
        });
      } else {
        return createErrorResult(new AuthenticationError('Token refresh failed', {
          code: 'TOKEN_REFRESH_FAILED',
          cause: refreshResult.error
        }));
      }
    }

    // Proceed with normal connection logic...
    const response = await this.gmail?.users.getProfile({ userId: 'me' });
    return createSuccessResult({ connected: true, connectedAt: new Date() });

  } catch (error) {
    return this.callWithErrorHandling('connect', error, () =>
      createErrorResult(new NetworkError('Gmail connection failed'))
    );
  }
}
```

### Integration Points

```yaml
STARTUP_INTEGRATION:
  - integrate_with: src/renderer/src/services/StartupOrchestrator.ts
  - pattern: 'Add Gmail auth validation to checkAllProviders() method'
  - timing: 'Run proactive refresh before provider status check'

IPC_HANDLERS:
  - add_to: src/main/ipc.ts
  - handlers: ['gmail:get-auth-state', 'gmail:refresh-connection', 'gmail:reset-auth']
  - pattern: 'Follow existing OAuth handler security patterns'

PRELOAD_TYPES:
  - add_to: src/preload/index.ts
  - pattern: 'Extend oauth interface with auth state methods'
  - security: 'Maintain context isolation, Result<T> return types'

TOKEN_ROTATION:
  - integrate_with: src/main/security/TokenRotationService.ts
  - enhancement: 'Add proactive refresh during startup sequence'
  - preserve: 'Existing 5-minute buffer configuration'

UI_STATE_MANAGEMENT:
  - integrate_with: src/renderer/src/machines/startupMachine.ts
  - pattern: 'Add gmail auth states to provider status interface'
  - maintain: 'Existing XState patterns and transitions'
```

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# TypeScript validation with specific files
npm run type-check                          # Full project type checking
npx tsc --noEmit src/main/security/GmailAuthStateManager.ts
npx tsc --noEmit src/main/services/GmailHealthService.ts
npx tsc --noEmit src/renderer/src/hooks/useGmailAuthState.ts

# ESLint validation
npm run lint                                # Full project linting
npx eslint src/main/oauth/GmailOAuthManager.ts --fix
npx eslint src/main/security/GmailAuthStateManager.ts --fix
npx eslint src/renderer/src/machines/gmailAuthMachine.ts --fix

# Format validation
npm run format                              # Format all files
npx prettier src/main/security/GmailAuthStateManager.ts --write
npx prettier src/renderer/src/hooks/useGmailAuthState.ts --write

# Expected: Zero errors. TypeScript strict mode compliance required.
```

### Level 2: Unit Tests (Component Validation)

```bash
# OAuth Manager Tests - Enhanced refresh functionality
npm run test __tests__/oauth/GmailOAuthManager.test.ts

# Security Tests - Auth state management
npm run test __tests__/main/security/GmailAuthStateManager.test.ts
npm run test __tests__/main/security/TokenRotationService.test.ts

# Integration Tests - Full OAuth flow with refresh
npm run test __tests__/oauth/gmail-auth-integration.test.ts

# UI Tests - React component and hook testing
npm run test __tests__/renderer/gmail-connection-flow.test.ts

# Coverage validation - Maintain 90% global coverage
npm run test:coverage

# Type Tests - Ensure type safety
npm run test:types

# Expected: All tests pass, coverage thresholds met, no security vulnerabilities in token handling
```

### Level 3: Integration Testing (System Validation)

```bash
# Application startup with Gmail auth validation
npm run dev &
sleep 5  # Allow startup sequence completion

# Gmail connection health check via IPC
node -e "
const { app } = require('electron');
app.whenReady().then(() => {
  const { ipcMain } = require('electron');
  ipcMain.handle('test-gmail-health', async () => {
    const result = await gmailHealthService.performHealthCheck();
    console.log('Gmail Health:', result.success ? 'OK' : result.error.message);
    return result;
  });
});
"

# OAuth flow integration test
node -e "
// Test complete OAuth flow including refresh scenarios
const testOAuthFlow = async () => {
  // Simulate expired token scenario
  // Verify automatic refresh triggers
  // Confirm UI state updates
};
testOAuthFlow();
"

# Provider status validation
curl -f http://localhost:8080/api/providers/gmail/status || echo "Provider status check failed"

# Security audit log validation
# Verify all OAuth operations logged without sensitive data
tail -f data/security-audit.log | grep -E "(oauth|token|refresh)" | head -10

# Expected: Smooth OAuth flows, proper error handling, complete security logging
```

### Level 4: Creative & Domain-Specific Validation

```bash
# Gmail OAuth Error Simulation
# Test various OAuth error scenarios to ensure proper user experience
node scripts/test-oauth-errors.js \
  --scenarios "invalid_grant,network_timeout,consent_revoked" \
  --validate-ui-states

# Token Expiration Simulation
# Test token refresh behavior with controlled expiration
node scripts/simulate-token-expiration.js \
  --buffer-minutes 2 \
  --test-automatic-refresh

# Multi-Instance Concurrent Testing
# Ensure thread-safe token refresh across multiple app instances
node scripts/test-concurrent-oauth.js \
  --instances 3 \
  --refresh-conflicts

# Security Compliance Validation
npm audit                                   # Security vulnerability scan
bandit -r src/main/security/               # Security pattern analysis (if available)

# Performance Testing - OAuth flow latency
node scripts/measure-oauth-performance.js \
  --operations "refresh,validate,store" \
  --iterations 50

# User Experience Testing
# Automated UI testing for OAuth flow states
npx playwright test tests/oauth-user-flow.spec.ts

# Offline/Network Resilience Testing
# Test behavior during network interruptions
node scripts/test-network-resilience.js \
  --simulate-offline \
  --test-retry-logic

# Expected: All error scenarios handled gracefully, performance within acceptable limits, security compliance maintained
```

## Final Validation Checklist

### Technical Validation

- [ ] All 4 validation levels completed successfully
- [ ] All tests pass: `npm run test`
- [ ] No linting errors: `npm run lint`
- [ ] No type errors: `npm run type-check`
- [ ] No formatting issues: `npm run format:check`
- [ ] Coverage thresholds met: `npm run test:coverage`

### Feature Validation

- [ ] Expired access tokens trigger automatic refresh with no user errors
- [ ] Failed refresh scenarios show clear "Sign in again" messaging
- [ ] Setup UI displays all connection states (Connected/Refreshing/Needs Re-Auth)
- [ ] Re-authentication flow works with single-click OAuth initiation
- [ ] All existing OAuth security patterns preserved (PKCE, encryption, audit logging)
- [ ] Integration with existing TokenRotationService and provider architecture

### Code Quality Validation

- [ ] Follows existing Result<T> pattern consistently
- [ ] All OAuth operations include comprehensive security audit logging
- [ ] File placement matches desired codebase tree structure
- [ ] MUI v7 Grid syntax used correctly in UI components
- [ ] XState patterns maintained in auth state management
- [ ] No sensitive data exposed in logs or error messages

### Documentation & Deployment

- [ ] All new TypeScript interfaces properly documented
- [ ] Security patterns clearly commented in OAuth code
- [ ] Error categorization logic documented for future maintenance
- [ ] IPC handler security validated and documented

---

## Anti-Patterns to Avoid

- ❌ Don't throw exceptions - use Result<T> pattern consistently
- ❌ Don't log sensitive OAuth tokens or credentials
- ❌ Don't skip security audit logging for any credential operations
- ❌ Don't use direct OAuth errors in UI - categorize for user-friendly messaging
- ❌ Don't break existing TokenRotationService integration
- ❌ Don't use deprecated MUI Grid syntax - use size={{ xs: 12 }} pattern
- ❌ Don't bypass existing SecureStorageManager for token operations
- ❌ Don't ignore existing provider health check patterns in startup flow

---

**Confidence Score**: 9/10 - This PRP provides comprehensive implementation guidance built on extensive codebase analysis, proven patterns, and complete integration context for successful one-pass implementation.
