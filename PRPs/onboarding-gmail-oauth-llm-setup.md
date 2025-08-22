name: "Onboarding Flow: Gmail OAuth and LLM Setup Implementation PRP"
description: |
  Comprehensive implementation guide for multi-step onboarding with Gmail OAuth integration,
  OpenAI API key setup, and secure credential storage using existing Smart Inbox Janitor architecture.

---

## Goal

**Feature Goal**: Implement a complete onboarding flow that securely connects users to Gmail via OAuth 2.0 and configures OpenAI API access, enabling email triage functionality with persistent connection state management.

**Deliverable**: Working multi-step onboarding UI with Gmail OAuth integration, OpenAI API key validation, secure credential storage, and connection state persistence that bypasses onboarding for returning configured users.

**Success Definition**: Users can complete onboarding in under 5 minutes, Gmail tokens are stored securely and refresh automatically, OpenAI API keys are validated and stored encrypted, and returning users bypass onboarding with working provider connections.

## User Persona

**Target User**: Gmail users seeking AI-powered email management with security-conscious approach to credential handling.

**Use Case**: First-time app launch requires secure connection setup to Gmail and AI provider before accessing email triage functionality.

**User Journey**: 
1. Launch app → Welcome screen with clear explanation
2. Agree to terms → Gmail OAuth flow with scope explanation  
3. API key setup → OpenAI key entry with cost estimation
4. Completion → Dashboard access with working connections
5. Returning users → Direct dashboard access without re-onboarding

**Pain Points Addressed**: Complex OAuth setup, unclear API costs, credential security concerns, re-authentication friction on app restarts.

## Why

- **Essential Security**: OAuth tokens and API keys require secure storage before any email processing can begin
- **User Trust**: Clear onboarding builds confidence in the app's security and functionality approach
- **Provider Integration**: Gmail and OpenAI connections are prerequisites for core email triage features
- **Persistent Sessions**: Connection state persistence prevents repeated onboarding friction

## What

A comprehensive onboarding flow that replaces the existing stub implementation with full Gmail OAuth 2.0 integration, OpenAI API key validation, secure credential storage, and intelligent onboarding bypass logic.

### Success Criteria

- [ ] Multi-step onboarding UI with Welcome, Gmail OAuth, OpenAI setup, and completion steps
- [ ] Gmail OAuth with appropriate scopes (gmail.modify, gmail.labels) using googleapis library
- [ ] OpenAI API key validation with connection testing and cost estimation preview
- [ ] Secure credential storage using existing SecureStorageManager infrastructure
- [ ] Connection state persistence that bypasses onboarding for configured users
- [ ] Comprehensive error handling for OAuth failures, invalid API keys, and network issues
- [ ] Manual reconnection options accessible via Settings page

## All Needed Context

### Context Completeness Check

_This PRP provides complete implementation context including existing architectural patterns, specific file modifications, security integration points, UI component patterns, and validation approaches for one-pass implementation success._

### Documentation & References

```yaml
# MUST READ - Gmail OAuth Implementation
- url: https://developers.google.com/gmail/api/auth/scopes
  why: Specific OAuth scopes for gmail.modify and gmail.labels permissions
  critical: Scope selection determines app capabilities and user consent requirements

- url: https://developers.google.com/gmail/api/quickstart/nodejs
  why: googleapis library OAuth flow implementation patterns
  critical: Electron-specific OAuth considerations and security best practices

- url: https://github.com/googleapis/google-api-nodejs-client
  why: Authentication patterns and error handling for googleapis client
  critical: Token refresh automation and connection state management

# EXISTING PATTERNS - Follow these implementations exactly
- file: src/renderer/src/pages/Onboarding/index.tsx
  why: Existing onboarding UI structure, stepper pattern, error handling approach
  pattern: MUI Stepper with step content, state management, loading/error states
  gotcha: Uses stub providers - replace with real OAuth and API validation

- file: src/main/security/SecureStorageManager.ts  
  why: Secure credential storage patterns for Gmail tokens and OpenAI keys
  pattern: Result pattern, audit logging, hybrid OS keychain + encrypted storage
  gotcha: Must use existing storeGmailTokens() and storeOpenAIKey() methods

- file: src/shared/types/config.types.ts
  why: Provider configuration interfaces and connection state management
  pattern: GmailConnectionState, OpenAIConnectionState typed interfaces
  gotcha: Connection state must be persisted and checked on app startup

- file: src/providers/email/gmail/GmailProvider.ts
  why: Provider stub structure to replace with real Gmail OAuth implementation
  pattern: EmailProvider interface, Result pattern, comprehensive error handling
  gotcha: Current stub returns "not implemented" - needs full OAuth implementation

- file: src/providers/llm/openai/OpenAIProvider.ts
  why: OpenAI provider pattern for API key validation and connection testing
  pattern: LLMProvider interface, testConnection() method, usage tracking
  gotcha: Must implement real API key validation replacing stub responses

# SECURITY INTEGRATION - Critical for credential handling
- file: src/shared/types/errors.types.ts
  why: Comprehensive error hierarchy for OAuth and API failures
  pattern: AuthenticationError, NetworkError, ValidationError specific handling
  gotcha: Use existing error classes rather than generic Error throwing

- file: src/main/security/TokenRotationService.ts
  why: Automatic token refresh patterns for Gmail OAuth tokens
  pattern: Scheduled rotation, expiration buffer, retry logic with exponential backoff
  gotcha: Must integrate Gmail token refresh with existing rotation service
```

### Current Codebase Structure

```bash
src/
├── main/                    # Electron main process
│   ├── security/           # ✅ SecureStorageManager, encryption, audit logging
│   ├── ipc.ts             # ✅ IPC handlers for provider operations
│   └── index.ts           # ✅ Provider initialization and app startup
├── renderer/src/
│   ├── pages/
│   │   ├── Onboarding/    # 🔄 MODIFY: Replace stub with real OAuth/API setup
│   │   ├── Dashboard/     # ✅ Main app after onboarding completion
│   │   └── Settings/      # 🔄 ADD: Manual reconnection options
│   ├── components/
│   │   └── Layout/        # ✅ App layout with navigation
│   └── hooks/
│       └── useElectronAPI.ts # ✅ IPC communication wrapper
├── providers/
│   ├── email/gmail/       # 🔄 REPLACE: Stub with real Gmail OAuth provider
│   ├── llm/openai/        # 🔄 REPLACE: Stub with real API key validation
│   └── storage/sqlite/    # ✅ Database provider for configuration storage
└── shared/
    ├── types/             # ✅ Comprehensive type definitions
    ├── schemas/           # ✅ Zod validation schemas
    └── utils/             # ✅ Crypto utilities and helpers
```

### Desired Codebase Structure After Implementation

```bash
src/
├── main/
│   ├── security/
│   │   ├── SecureStorageManager.ts    # ✅ EXTEND: Add OAuth credential methods
│   │   └── TokenRotationService.ts    # ✅ EXTEND: Add Gmail token refresh
│   └── oauth/                         # 🆕 CREATE: OAuth flow handlers
│       └── GmailOAuthHandler.ts       # 🆕 Electron OAuth window management
├── renderer/src/
│   ├── pages/
│   │   ├── Onboarding/
│   │   │   ├── index.tsx              # 🔄 ENHANCE: Real OAuth integration
│   │   │   ├── GmailAuthStep.tsx      # 🆕 CREATE: Gmail OAuth step component
│   │   │   ├── OpenAISetupStep.tsx    # 🆕 CREATE: API key validation step
│   │   │   └── CompletionStep.tsx     # 🆕 CREATE: Success confirmation
│   │   └── Settings/
│   │       └── ConnectionSettings.tsx # 🆕 CREATE: Manual reconnection UI
│   └── components/
│       └── auth/                      # 🆕 CREATE: Reusable auth components
│           ├── OAuthButton.tsx        # 🆕 Gmail sign-in button
│           └── APIKeyInput.tsx        # 🆕 Secure API key input field
├── providers/
│   ├── email/gmail/
│   │   ├── GmailProvider.ts          # 🔄 REPLACE: Full OAuth implementation  
│   │   └── GmailOAuthClient.ts       # 🆕 CREATE: OAuth client wrapper
│   └── llm/openai/
│       └── OpenAIProvider.ts         # 🔄 REPLACE: Real API validation
```

### Known Gotchas & Library Quirks

```typescript
// CRITICAL: Gmail OAuth scopes must be requested exactly as specified
const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.modify',  // NOT gmail.all
  'https://www.googleapis.com/auth/gmail.labels'   // Separate scope for labels
];

// CRITICAL: Electron OAuth requires BrowserWindow with specific security settings
const authWindow = new BrowserWindow({
  webPreferences: {
    nodeIntegration: false,      // MUST be false for security
    contextIsolation: true       // MUST be true for security
  }
});

// CRITICAL: Result pattern is used throughout - never throw exceptions
// ❌ NEVER do this
throw new Error('OAuth failed');
// ✅ ALWAYS do this
return createErrorResult(new AuthenticationError('OAuth failed'));

// CRITICAL: MUI v7 Grid syntax - use size prop, not direct breakpoint props
// ❌ OLD syntax that will fail
<Grid xs={12} sm={6}>
// ✅ NEW syntax required
<Grid size={{ xs: 12, sm: 6 }}>

// CRITICAL: SecureStorageManager methods must be awaited and Result checked
const result = await secureStorageManager.storeGmailTokens(tokens);
if (!result.success) {
  // Handle error appropriately
}
```

## Implementation Blueprint

### Data Models and Structure

The existing type system provides comprehensive interfaces that should be used without modification:

```typescript
// USE EXISTING: src/shared/types/config.types.ts
interface GmailConnectionState {
  readonly isSignedIn: boolean;
  readonly accountEmail?: string;
  readonly accountName?: string;
  readonly sessionExpiresAt?: string;
  readonly needsReSignIn: boolean;
  readonly lastError?: string;
}

interface OpenAIConnectionState {
  readonly hasValidKey: boolean;
  readonly keyLastFour?: string;
  readonly lastValidated?: string;
  readonly monthlySpendingUSD?: number;
  readonly validationError?: string;
}

// USE EXISTING: src/shared/types/email.types.ts
interface GmailTokens {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly expiryDate?: number;
  readonly scope?: string;
  readonly tokenType?: string;
}
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: CREATE src/main/oauth/GmailOAuthHandler.ts
  - IMPLEMENT: ElectronGmailOAuth class with performOAuthFlow() method
  - FOLLOW pattern: BrowserWindow OAuth flow from research documentation
  - NAMING: ElectronGmailOAuth class, performOAuthFlow() method
  - DEPENDENCIES: googleapis library, Electron BrowserWindow
  - PLACEMENT: New oauth directory in main process
  - SCOPES: 'https://www.googleapis.com/auth/gmail.modify', 'https://www.googleapis.com/auth/gmail.labels'
  - REDIRECT_URI: 'http://localhost:3000/oauth/callback'

Task 2: MODIFY src/providers/email/gmail/GmailProvider.ts  
  - REPLACE: Stub implementation with full Gmail OAuth provider
  - IMPLEMENT: connect(), authenticate(), testConnection(), initialize() methods
  - FOLLOW pattern: EmailProvider interface, Result pattern from base.types.ts
  - NAMING: Keep GmailProvider class name, replace "Stub" suffix
  - DEPENDENCIES: googleapis library, GmailOAuthHandler from Task 1
  - INTEGRATION: SecureStorageManager for token storage, TokenRotationService for refresh

Task 3: MODIFY src/providers/llm/openai/OpenAIProvider.ts
  - REPLACE: Stub implementation with real OpenAI API validation
  - IMPLEMENT: testConnection(), validateAPIKey(), estimateCost() methods
  - FOLLOW pattern: LLMProvider interface, Result pattern, comprehensive error handling
  - NAMING: Keep OpenAIProvider class name, replace "Stub" suffix  
  - DEPENDENCIES: openai library, SecureStorageManager for key storage
  - VALIDATION: API key format (starts with 'sk-'), connection test, usage estimation

Task 4: CREATE src/renderer/src/pages/Onboarding/GmailAuthStep.tsx
  - IMPLEMENT: Gmail OAuth step component with sign-in button and status display
  - FOLLOW pattern: src/renderer/src/pages/Onboarding/index.tsx stepper content structure
  - NAMING: GmailAuthStep functional component
  - DEPENDENCIES: useElectronAPI hook, MUI components (Button, Alert, Typography)
  - UI_ELEMENTS: Sign-in button, connection status, error display, retry logic

Task 5: CREATE src/renderer/src/pages/Onboarding/OpenAISetupStep.tsx  
  - IMPLEMENT: OpenAI API key input with validation and cost estimation
  - FOLLOW pattern: TextField, Button, Alert pattern from existing onboarding
  - NAMING: OpenAISetupStep functional component
  - DEPENDENCIES: useElectronAPI hook, MUI TextField, validation logic
  - VALIDATION: API key format, connection test, cost estimation display

Task 6: MODIFY src/renderer/src/pages/Onboarding/index.tsx
  - INTEGRATE: New step components into existing stepper flow
  - ENHANCE: Connection state checking for onboarding bypass logic
  - FOLLOW pattern: Existing stepper structure, state management, error handling
  - PRESERVE: Existing UI patterns, MUI component usage, styling consistency
  - STEPS: Welcome → Gmail Auth → OpenAI Setup → Completion

Task 7: MODIFY src/main/security/SecureStorageManager.ts
  - ENHANCE: storeGmailTokens() and storeOpenAIKey() methods if needed
  - VERIFY: Existing methods support new OAuth flow requirements
  - FOLLOW pattern: Existing audit logging, encryption, error handling
  - PRESERVE: Existing security infrastructure and method signatures

Task 8: MODIFY src/main/security/TokenRotationService.ts
  - INTEGRATE: Gmail token refresh using googleapis refresh_token flow
  - IMPLEMENT: rotateGmailTokens() method with provider-specific refresh logic
  - FOLLOW pattern: Existing rotation interval, retry logic, error handling
  - DEPENDENCIES: GmailProvider from Task 2 for token refresh implementation

Task 9: MODIFY src/renderer/src/App.tsx
  - ENHANCE: Onboarding bypass logic based on connection state persistence
  - IMPLEMENT: Check both Gmail and OpenAI connection states on app startup
  - FOLLOW pattern: Existing conditional routing, state management
  - PRESERVE: Existing route structure and navigation patterns

Task 10: CREATE src/renderer/src/pages/Settings/ConnectionSettings.tsx
  - IMPLEMENT: Manual reconnection UI for Gmail and OpenAI providers
  - PROVIDE: Disconnect, reconnect, and status checking functionality
  - FOLLOW pattern: Settings page structure from src/renderer/src/pages/Settings/index.tsx
  - UI_ELEMENTS: Connection status cards, reconnect buttons, error displays
```

### Implementation Patterns & Key Details

```typescript
// Gmail OAuth Flow Pattern (Task 1)
export class ElectronGmailOAuth {
  async performOAuthFlow(): Promise<Result<GmailTokens>> {
    try {
      const authWindow = new BrowserWindow({
        width: 500,
        height: 600,
        show: false,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true
        }
      });

      const oAuth2Client = new google.auth.OAuth2(
        process.env.GMAIL_CLIENT_ID,
        process.env.GMAIL_CLIENT_SECRET,
        'http://localhost:3000/oauth/callback'
      );

      const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: ['https://www.googleapis.com/auth/gmail.modify', 'https://www.googleapis.com/auth/gmail.labels'],
        include_granted_scopes: true
      });

      return new Promise((resolve) => {
        authWindow.loadURL(authUrl);
        authWindow.show();

        authWindow.webContents.on('will-redirect', async (event, url) => {
          if (url.startsWith('http://localhost:3000/oauth/callback')) {
            event.preventDefault();
            const urlParams = new URLSearchParams(new URL(url).search);
            const code = urlParams.get('code');
            
            authWindow.close();
            
            if (code) {
              const { tokens } = await oAuth2Client.getToken(code);
              resolve(createSuccessResult({
                accessToken: tokens.access_token!,
                refreshToken: tokens.refresh_token!,
                expiryDate: tokens.expiry_date,
                scope: tokens.scope,
                tokenType: tokens.token_type
              }));
            }
          }
        });
      });
    } catch (error) {
      return createErrorResult(new AuthenticationError(
        'Gmail OAuth flow failed',
        true,
        { originalError: error }
      ));
    }
  }
}

// Provider Pattern (Task 2)
export class GmailProvider implements EmailProvider<GmailProviderConfig> {
  async connect(): Promise<Result<ConnectionInfo>> {
    // PATTERN: Check stored tokens first, then OAuth if needed
    const tokenResult = await this.secureStorageManager.getGmailTokens();
    
    if (!tokenResult.success || !tokenResult.data) {
      // Trigger OAuth flow
      const oauthResult = await this.gmailOAuthHandler.performOAuthFlow();
      if (!oauthResult.success) {
        return createErrorResult(oauthResult.error);
      }
      
      // Store tokens securely
      await this.secureStorageManager.storeGmailTokens(oauthResult.data);
    }

    // Test connection with stored/new tokens
    return this.testConnection();
  }

  async testConnection(): Promise<Result<ConnectionInfo>> {
    try {
      const auth = await this.getAuthenticatedClient();
      const gmail = google.gmail({ version: 'v1', auth });
      
      const profile = await gmail.users.getProfile({ userId: 'me' });
      
      return createSuccessResult({
        connected: true,
        accountEmail: profile.data.emailAddress,
        lastConnected: new Date(),
        connectionId: `gmail-${profile.data.emailAddress}`
      });
    } catch (error) {
      return this.handleGmailError(error, 'CONNECTION_TEST');
    }
  }
}

// React Component Pattern (Task 4)
export const GmailAuthStep: React.FC = () => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionState, setConnectionState] = useState<GmailConnectionState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const api = useElectronAPI();

  const handleGmailSignIn = async (): Promise<void> => {
    try {
      setIsConnecting(true);
      setError(null);
      
      const result = await api.email.connect();
      // PATTERN: Handle Result type response
      if (!result.success) {
        setError(result.error?.message || 'Connection failed');
        return;
      }
      
      // Update connection state
      const stateResult = await api.storage.getGmailConnectionState();
      if (stateResult.success) {
        setConnectionState(stateResult.data);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <Box>
      {!connectionState?.isSignedIn ? (
        <Button
          variant="contained"
          onClick={handleGmailSignIn}
          disabled={isConnecting}
          startIcon={<EmailIcon />}
          size="large"
        >
          {isConnecting ? 'Connecting...' : 'Sign in with Gmail'}
        </Button>
      ) : (
        <Alert severity="success">
          Connected as {connectionState.accountEmail}
        </Alert>
      )}
      {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
    </Box>
  );
};
```

### Integration Points

```yaml
IPC_HANDLERS:
  - add to: src/main/ipc.ts
  - methods: "email.connect, email.testConnection, llm.validateKey, storage.getConnectionStates"
  - pattern: "Existing provider IPC handler structure with Result pattern returns"

ENVIRONMENT_VARIABLES:
  - add to: development environment
  - vars: "GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET (from Google Cloud Console)"
  - pattern: "OAuth 2.0 Web Application credentials with localhost redirect URI"

ROUTING:
  - modify: src/renderer/src/App.tsx
  - pattern: "Conditional routing based on onboardingComplete AND provider connection states"
  - logic: "Check Gmail + OpenAI connection states before allowing dashboard access"
```

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run after each file creation/modification
npm run lint                    # ESLint with auto-fix for new files
npm run type-check             # TypeScript validation for all changes
npm run format                 # Prettier formatting consistency

# Expected: Zero errors. If errors exist, fix before proceeding to next task.
```

### Level 2: Unit Tests (Component Validation)

```bash
# Test provider implementations
npm run test src/providers/email/gmail/GmailProvider.test.ts
npm run test src/providers/llm/openai/OpenAIProvider.test.ts

# Test React components
npm run test src/renderer/src/pages/Onboarding/

# Test security integration
npm run test src/main/security/

# Full test suite validation
npm run test

# Expected: All tests pass. New OAuth and API validation logic should be thoroughly tested.
```

### Level 3: Integration Testing (System Validation)

```bash
# Start development environment
npm run dev

# Test onboarding flow manually:
# 1. Fresh app start should show onboarding
# 2. Gmail OAuth should open secure browser window
# 3. OAuth callback should store tokens securely
# 4. OpenAI API key validation should test connection
# 5. Completion should redirect to dashboard
# 6. App restart should bypass onboarding (connection state persisted)

# Test provider connections through DevTools console:
window.electronAPI.email.testConnection()
window.electronAPI.llm.testConnection()

# Test credential storage through IPC:
window.electronAPI.storage.getGmailConnectionState()
window.electronAPI.storage.getOpenAIConnectionState()

# Expected: Complete onboarding flow works, credentials stored securely, returning users bypass onboarding
```

### Level 4: Security & OAuth Validation

```bash
# Verify secure credential storage
npm run test src/main/security/SecureStorageManager.test.ts

# Test OAuth security settings (manual verification):
# - AuthWindow has nodeIntegration: false
# - AuthWindow has contextIsolation: true  
# - Tokens stored in OS keychain when available
# - No tokens visible in plain text logs or database

# Test error handling scenarios:
# - OAuth window closed by user
# - Invalid Gmail credentials
# - Network connectivity issues
# - Invalid OpenAI API keys
# - Quota exceeded scenarios

# Audit logging verification:
# Check that security events are logged for:
# - OAuth token storage
# - API key validation
# - Connection failures
# - Token refresh operations

# Expected: All security requirements met, comprehensive error handling works
```

## Final Validation Checklist

### Technical Validation

- [ ] All 4 validation levels completed successfully
- [ ] All tests pass: `npm run test`
- [ ] No linting errors: `npm run lint`
- [ ] No type errors: `npm run type-check`
- [ ] No formatting issues: `npm run format:check`

### Feature Validation

- [ ] Multi-step onboarding UI with Welcome, Gmail OAuth, OpenAI setup, completion steps
- [ ] Gmail OAuth requests correct scopes (gmail.modify, gmail.labels) and stores refresh tokens
- [ ] OpenAI API key validation with connection testing and error handling
- [ ] Secure credential storage using existing SecureStorageManager infrastructure
- [ ] Connection state persistence bypasses onboarding for returning configured users
- [ ] Comprehensive error handling for OAuth failures, invalid API keys, network issues
- [ ] Manual reconnection options accessible via Settings page

### User Experience Validation

- [ ] Onboarding completes in under 5 minutes for typical users
- [ ] Clear error messages for all failure scenarios with actionable next steps
- [ ] OAuth flow feels secure and professional (proper browser window, clear permissions)
- [ ] API key setup includes cost estimation and usage guidelines
- [ ] Returning users access dashboard immediately without friction
- [ ] Settings page allows manual disconnection and reconnection

### Security Validation

- [ ] OAuth tokens stored securely in OS keychain with encrypted database fallback
- [ ] API keys stored with proper encryption and audit logging
- [ ] No sensitive data visible in application logs or error messages
- [ ] Token refresh happens automatically without user intervention
- [ ] Security audit events logged for all credential operations
- [ ] OAuth browser window uses secure settings (no node integration, context isolation)

### Integration Validation

- [ ] Providers integrate correctly with existing SecureStorageManager
- [ ] TokenRotationService handles Gmail token refresh automatically
- [ ] Connection states persist correctly across app restarts
- [ ] IPC communication maintains Result pattern consistency
- [ ] UI follows existing MUI v7 patterns and component structure
- [ ] Error handling uses established error hierarchy and types

---

## Anti-Patterns to Avoid

- ❌ Don't use Gmail API scopes broader than necessary (avoid gmail.all)
- ❌ Don't store credentials in plain text or unencrypted locations
- ❌ Don't throw exceptions - always use Result pattern for provider methods
- ❌ Don't use MUI Grid v1 syntax - use new size prop syntax
- ❌ Don't skip connection state validation on app startup
- ❌ Don't ignore OAuth security settings (nodeIntegration, contextIsolation)
- ❌ Don't bypass existing SecureStorageManager - integrate with it
- ❌ Don't hardcode OAuth redirect URIs or API endpoints