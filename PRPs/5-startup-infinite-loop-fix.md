name: "Startup Infinite Loop Fix - Dashboard-First State Machine Implementation"
description: |
Fix infinite loop in startup/onboarding flow by implementing dashboard-first architecture with proper state management

---

## Goal

**Feature Goal**: Eliminate infinite loop in startup process and implement dashboard-first architecture with proper provider state management

**Deliverable**:

- State machine-based startup flow that properly transitions between checking credentials and showing dashboard
- Dashboard-first UX that always loads main interface with optional provider setup cards
- Elimination of race conditions between App.tsx and Onboarding.tsx useEffect hooks

**Success Definition**:

- App startup always leads to dashboard within 5 seconds
- No infinite console logs of "Partial setup check useEffect triggered"
- Provider connection failures show as warning cards, not blocking screens
- Setup flows are independent per provider (Gmail, OpenAI can be configured separately)

## User Persona

**Target User**: Smart Inbox Janitor desktop application user

**Use Case**: User launches application and expects to either see their dashboard or complete quick setup

**User Journey**:

1. Launch app → Loading spinner shows (max 5 seconds)
2. If providers configured → Dashboard with inbox/settings
3. If providers missing → Dashboard with setup cards for missing providers
4. User clicks setup card → Modal/overlay flow for that specific provider
5. After setup → Card disappears, provider functionality enabled

**Pain Points Addressed**:

- App stuck in infinite startup loop preventing usage
- Forced through wizard even when only one provider needs setup
- No clear indication of what's blocking app from working
- Unable to use any app features while waiting for all providers

## Why

- **Critical Bug**: App currently unusable due to infinite loop preventing dashboard access
- **User Experience**: Dashboard-first approach allows immediate app exploration even with incomplete setup
- **Scalability**: Independent provider setup supports future providers (Anthropic Claude, IMAP, etc.)
- **Developer Experience**: State machine eliminates race conditions and makes flow predictable
- **Production Readiness**: Proper error handling and graceful degradation for provider failures

## What

Replace boolean flag-based startup orchestration with:

1. **Dashboard-First Architecture**: Always load main UI, show provider status as cards
2. **State Machine**: XState-based state management for predictable transitions
3. **Independent Provider Setup**: Each provider (Gmail, OpenAI) configured separately via modals
4. **Graceful Degradation**: App functional even with provider failures
5. **Loading States**: Clear loading indicators during provider health checks

### Success Criteria

- [ ] App loads to dashboard within 5 seconds on first launch
- [ ] No infinite console loops during startup
- [ ] Provider failures show warning cards, don't block dashboard
- [ ] Each provider can be set up independently via setup cards
- [ ] State transitions are deterministic and logged for debugging
- [ ] All existing functionality preserved (no regression)
- [ ] Startup flow works with partial configurations (only Gmail or only OpenAI)

## All Needed Context

### Context Completeness Check

_This PRP provides complete implementation context including: Root cause analysis, exact file locations of issues, provider patterns, state management approach, external research on dashboard-first patterns, and step-by-step implementation tasks with specific code patterns to follow._

### Documentation & References

```yaml
# MUST READ - Include these in your context window

# XState Documentation for State Machine Implementation
- url: https://xstate.js.org/docs/guides/start.html#finite-state-machines
  why: State machine pattern for startup flow to prevent infinite loops
  critical: createMachine(), assign(), spawn() patterns for service orchestration
  section: "Finite State Machines" and "Services" sections

- url: https://xstate.js.org/docs/guides/actors.html
  why: Actor pattern for independent provider management
  critical: Each provider (Gmail, OpenAI, Storage) as separate actors preventing coupling

# VS Code Authentication Patterns
- url: https://github.com/microsoft/vscode/blob/main/src/vs/workbench/services/authentication/browser/authenticationService.ts
  why: Multi-provider authentication service pattern in Electron desktop app
  critical: Dynamic provider registration and event-driven state updates

# Dashboard-First UX Research
- url: https://github.com/getinsomnia/insomnia
  why: Example of dashboard-first desktop app with optional integrations
  critical: Local-first approach with progressive enhancement pattern

# Current Problematic Code Files
- file: src/renderer/src/App.tsx
  why: Root component with boolean flag navigation causing race conditions
  pattern: useEffect on mount checking credentials, conditional rendering based on isOnboardingComplete
  gotcha: Multiple async credential checks race with Onboarding.tsx checks

- file: src/renderer/src/pages/Onboarding/index.tsx
  why: SOURCE OF INFINITE LOOP - lines 69-149 useEffect with hasCheckedSetup guard
  pattern: Partial setup checking logic with async operations triggering state updates
  gotcha: useEffect with empty dependency array still retriggering due to component remounting

# Provider Implementation Patterns
- file: src/providers/email/gmail/GmailProvider.ts
  why: Provider healthCheck() pattern and Result<T> return type
  pattern: async healthCheck(): Promise<Result<HealthStatus>> with connection validation
  gotcha: Provider initialization can be expensive, health checks should be lightweight

- file: src/providers/llm/openai/OpenAIProvider.ts
  why: Provider configuration validation and connection testing patterns
  pattern: testConnection() method using models.list() for lightweight validation
  gotcha: API key validation includes format checking (sk- prefix) before network calls

# Credential Management Architecture
- file: src/main/security/SecureStorageManager.ts
  why: Secure credential storage and retrieval patterns
  pattern: storeGmailTokens(), getGmailTokens(), storeOpenAIKey() methods
  gotcha: Hybrid encryption with OS keychain + SQLite, fallback handling required

- file: src/main/oauth/GmailOAuthManager.ts
  why: OAuth token refresh vs full reconfiguration logic
  pattern: PKCE flow with refreshTokens() method and fallback to re-authentication
  gotcha: Token expiration vs client credential failures need different user flows

# IPC Communication Patterns
- file: src/main/ipc.ts
  why: Electron IPC handlers for credential checking - lines 518-631 (Gmail), 724-804 (OpenAI)
  pattern: gmail:check-connection and openai:check-connection handlers returning Result<T>
  gotcha: These handlers called repeatedly in current infinite loop

# React Hook Patterns
- file: src/renderer/src/hooks/useElectronAPI.ts
  why: Converting Result<T> pattern to React-friendly exception throwing
  pattern: useCallback wrapped IPC calls with error handling
  gotcha: Exception throwing pattern conflicts with boolean flag navigation in App.tsx

# Configuration Types
- file: src/shared/types/config.types.ts
  why: Configuration interfaces and connection state types
  pattern: ConnectionState, GmailProviderConfig, OpenAIConfig type definitions
  gotcha: Onboarding steps enum may need updating for new flow: 'gmail-signin' | 'openai-setup' | 'preferences' | 'first-scan' | 'ready'
```

### Current Codebase Structure (Key Areas)

```bash
src/
├── main/                          # Electron main process
│   ├── ipc.ts                    # IPC handlers with credential checking (INFINITE LOOP SOURCE)
│   ├── security/
│   │   └── SecureStorageManager.ts  # Credential storage patterns
│   └── oauth/
│       └── GmailOAuthManager.ts     # OAuth token management patterns
├── renderer/                      # React UI
│   ├── src/
│   │   ├── App.tsx               # Root component with boolean flag routing (PROBLEMATIC)
│   │   ├── pages/
│   │   │   └── Onboarding/
│   │   │       └── index.tsx     # Wizard with infinite loop useEffect (MAIN ISSUE)
│   │   └── hooks/
│   │       └── useElectronAPI.ts # Result<T> to exception conversion
├── shared/
│   └── types/
│       └── config.types.ts       # Configuration interfaces
└── providers/                     # Provider implementation patterns
    ├── email/gmail/
    │   └── GmailProvider.ts      # Provider healthCheck patterns
    └── llm/openai/
        └── OpenAIProvider.ts     # Connection validation patterns
```

### Desired Codebase Structure (New Files)

```bash
src/
├── renderer/src/
│   ├── components/
│   │   ├── StartupStateMachine.tsx    # XState machine component
│   │   └── ProviderSetupCard.tsx      # Individual provider setup cards
│   ├── machines/
│   │   └── startupMachine.ts          # XState startup flow definition
│   ├── services/
│   │   └── StartupOrchestrator.ts     # Service to coordinate provider checks
│   └── pages/
│       ├── Dashboard/
│       │   └── components/
│       │       └── ProviderStatusCards.tsx  # Provider status in dashboard
│       └── Setup/
│           ├── GmailSetupModal.tsx    # Independent Gmail setup
│           └── OpenAISetupModal.tsx   # Independent OpenAI setup
```

### Known Gotchas & Library Quirks

```typescript
// CRITICAL: React useEffect with empty deps can still retrigger due to component remounting
// Current problematic pattern in Onboarding/index.tsx:
useEffect(() => {
  if (hasCheckedSetup) return; // This guard doesn't prevent component remount loops
  // async operations here cause infinite loops
}, []); // Empty deps don't prevent all retriggering scenarios

// XState Machine Pattern Required:
// State machines prevent infinite loops by having explicit finite states
const startupMachine = createMachine({
  id: 'startup',
  initial: 'checking',
  states: {
    checking: {
      /* can only transition to loaded or error */
    },
    loaded: {
      /* final state */
    },
    error: {
      /* final state */
    },
  },
});

// Provider Independence Requirement:
// Each provider must be checkable independently without coupling
// Gmail failure should NOT block OpenAI provider functionality

// Result<T> Pattern Throughout Codebase:
// All providers return Result<T> - never throw exceptions
// Convert at React boundary in hooks, not in components
const result = await provider.healthCheck();
if (result.success) {
  /* use result.data */
} else {
  /* handle result.error */
}
```

## Implementation Blueprint

### Data Models and Structure

Define startup flow state management and provider status models:

```typescript
// State machine states and events
type StartupState = 'initializing' | 'checking_providers' | 'dashboard_ready' | 'setup_required';
type StartupEvent =
  | { type: 'PROVIDERS_CHECKED'; providers: ProviderStatus[] }
  | { type: 'PROVIDER_SETUP_COMPLETE'; providerId: string }
  | { type: 'RETRY_PROVIDER_CHECK' };

// Provider status for dashboard cards
interface ProviderStatus {
  id: 'gmail' | 'openai' | 'storage';
  status: 'connected' | 'disconnected' | 'error' | 'checking';
  message?: string;
  lastChecked: Date;
  requiresSetup: boolean;
  setupType: 'token_refresh' | 'full_reconfiguration' | 'initial_setup';
}

// Startup orchestrator service interface
interface StartupOrchestrator {
  checkAllProviders(): Promise<ProviderStatus[]>;
  checkProvider(providerId: string): Promise<ProviderStatus>;
  isAppUsable(providers: ProviderStatus[]): boolean;
}
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: CREATE src/renderer/src/machines/startupMachine.ts
  - IMPLEMENT: XState machine definition for startup flow
  - INSTALL: npm install xstate @xstate/react
  - STATES: initializing -> checking_providers -> (dashboard_ready | setup_required)
  - ACTIONS: checkProviders, updateProviderStatus, logStateTransition
  - SERVICES: providerCheckService that calls StartupOrchestrator
  - GUARDS: isAppUsable guard to determine if dashboard can be shown
  - NAMING: startupMachine export, consistent with XState conventions

Task 2: CREATE src/renderer/src/services/StartupOrchestrator.ts
  - IMPLEMENT: StartupOrchestrator class coordinating provider health checks
  - FOLLOW pattern: src/providers/ Result<T> pattern for all async operations
  - METHODS: checkAllProviders(), checkProvider(), isAppUsable()
  - DEPENDENCIES: useElectronAPI for IPC calls to main process
  - ERROR HANDLING: Aggregate provider failures, never throw exceptions
  - TIMEOUT: 5-second timeout per provider check to prevent hanging

Task 3: CREATE src/renderer/src/components/StartupStateMachine.tsx
  - IMPLEMENT: React component using @xstate/react to manage startup flow
  - FOLLOW pattern: XState React integration with useMachine hook
  - STATES: Show loading spinner during checking, dashboard when ready, setup cards when needed
  - PROPS: onDashboardReady callback for parent App.tsx
  - STATE DEBUGGING: Log all state transitions for debugging
  - REPLACE: Boolean flag logic in App.tsx

Task 4: CREATE src/renderer/src/components/ProviderSetupCard.tsx
  - IMPLEMENT: Reusable setup card component for individual providers
  - PROPS: ProviderStatus, onSetupClick, onDismiss callbacks
  - VARIANTS: Different card styles for token_refresh vs full_reconfiguration vs initial_setup
  - FOLLOW pattern: MUI Card component patterns in existing codebase (remember: MUI v7 Grid size prop syntax)
  - ICONS: Provider-specific icons (Gmail, OpenAI logos)
  - ACTIONS: "Setup Now", "Reconnect", "Dismiss" buttons based on setupType

Task 5: CREATE src/renderer/src/pages/Setup/GmailSetupModal.tsx
  - IMPLEMENT: Modal component for independent Gmail OAuth setup
  - FOLLOW pattern: Existing OAuth flow in pages/Onboarding/index.tsx (lines with Google API setup)
  - PROPS: open, onClose, onSuccess callbacks for modal management
  - STATES: Local state for setup progress, error handling
  - INTEGRATION: Use existing GmailOAuthManager via IPC calls
  - ERROR HANDLING: Distinguish token refresh vs client credential failures

Task 6: CREATE src/renderer/src/pages/Setup/OpenAISetupModal.tsx
  - IMPLEMENT: Modal component for independent OpenAI API key setup
  - FOLLOW pattern: Existing OpenAI setup in pages/Onboarding/index.tsx
  - PROPS: open, onClose, onSuccess callbacks
  - VALIDATION: API key format validation (sk- prefix) before network test
  - INTEGRATION: Use existing OpenAI provider test connection via IPC
  - USER FEEDBACK: Clear error messages for invalid keys vs network failures

Task 7: CREATE src/renderer/src/pages/Dashboard/components/ProviderStatusCards.tsx
  - IMPLEMENT: Dashboard component showing provider status cards
  - PROPS: providers array from StartupStateMachine state
  - LAYOUT: Grid of provider cards using MUI Grid with proper v7 size prop syntax
  - ACTIONS: Setup buttons that open respective setup modals
  - REAL-TIME: Subscribe to provider status updates via machine state
  - FILTERING: Only show cards for providers that need attention

Task 8: MODIFY src/renderer/src/App.tsx
  - REPLACE: Boolean flag navigation logic with StartupStateMachine component
  - REMOVE: useEffect hook with credential checking (lines causing race conditions)
  - SIMPLIFY: Component becomes simple router based on machine state
  - PRESERVE: Error handling and loading states
  - INTEGRATION: Pass dashboard ready callback to StartupStateMachine

Task 9: MODIFY src/renderer/src/pages/Onboarding/index.tsx
  - REMOVE: Problematic useEffect causing infinite loop (lines 69-149)
  - REFACTOR: Extract OAuth flows into reusable modal components
  - DEPRECATE: Multi-step wizard approach in favor of independent provider modals
  - PRESERVE: Existing OAuth integration code for reuse in modals
  - CLEAN UP: Remove hasCheckedSetup state and related race condition logic

Task 10: CREATE src/renderer/src/hooks/useProviderStatus.ts
  - IMPLEMENT: React hook for real-time provider status updates
  - INTEGRATION: Subscribe to StartupStateMachine state changes
  - METHODS: refreshProvider(id), refreshAllProviders()
  - CACHING: Prevent excessive provider health checks
  - RETURN: Current provider statuses and update methods for components
```

### Implementation Patterns & Key Details

```typescript
// XState Machine Pattern - Prevents Infinite Loops
import { createMachine, assign } from 'xstate';

const startupMachine = createMachine({
  id: 'startup',
  initial: 'initializing',
  context: {
    providers: [] as ProviderStatus[],
    error: null as string | null
  },
  states: {
    initializing: {
      entry: 'logStateTransition',
      after: {
        100: 'checking_providers' // Small delay to show loading
      }
    },
    checking_providers: {
      entry: 'logStateTransition',
      invoke: {
        id: 'checkProviders',
        src: 'providerCheckService',
        onDone: {
          target: 'dashboard_ready',
          cond: 'isAppUsable',
          actions: assign({
            providers: (_, event) => event.data
          })
        },
        onError: {
          target: 'setup_required',
          actions: assign({
            error: (_, event) => event.data.message
          })
        }
      }
    },
    dashboard_ready: {
      entry: 'logStateTransition',
      type: 'final' // Prevents any further transitions
    },
    setup_required: {
      entry: 'logStateTransition',
      on: {
        PROVIDER_SETUP_COMPLETE: {
          target: 'checking_providers' // Re-check after setup
        }
      }
    }
  }
});

// StartupOrchestrator Service Pattern
class StartupOrchestrator {
  constructor(private electronAPI: ElectronAPI) {}

  async checkAllProviders(): Promise<ProviderStatus[]> {
    const checks = [
      this.checkProvider('gmail'),
      this.checkProvider('openai'),
      this.checkProvider('storage')
    ];

    // PATTERN: Run all checks in parallel with timeout
    const results = await Promise.allSettled(
      checks.map(check =>
        Promise.race([
          check,
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Timeout')), 5000)
          )
        ])
      )
    );

    return results.map((result, i) =>
      result.status === 'fulfilled'
        ? result.value
        : this.createErrorStatus(['gmail', 'openai', 'storage'][i])
    );
  }

  // CRITICAL: This determines when app is usable vs needs setup
  isAppUsable(providers: ProviderStatus[]): boolean {
    // App is usable if storage works - Gmail/OpenAI optional
    const storage = providers.find(p => p.id === 'storage');
    return storage?.status === 'connected';
  }
}

// React Component Integration Pattern
function StartupStateMachine({ onDashboardReady }: Props) {
  const [state, send] = useMachine(startupMachine, {
    services: {
      providerCheckService: () => orchestrator.checkAllProviders()
    },
    guards: {
      isAppUsable: (context) =>
        orchestrator.isAppUsable(context.providers)
    },
    actions: {
      logStateTransition: (context, event) =>
        console.log('Startup state:', state.value, { context, event })
    }
  });

  // PATTERN: Effect only for final state callback
  useEffect(() => {
    if (state.matches('dashboard_ready')) {
      onDashboardReady();
    }
  }, [state.value, onDashboardReady]);

  if (state.matches('checking_providers')) {
    return <LoadingSpinner message="Checking provider connections..." />;
  }

  if (state.matches('setup_required')) {
    return <ProviderStatusCards providers={state.context.providers} />;
  }

  return null; // Parent handles dashboard_ready state
}
```

### Integration Points

```yaml
DEPENDENCIES:
  - add: 'npm install xstate @xstate/react'
  - version: 'xstate@^5.0.0 @xstate/react@^4.0.0'

STATE_MANAGEMENT:
  - replace: Boolean flag orchestration in App.tsx
  - pattern: 'Single state machine controls entire startup flow'

ROUTING:
  - modify: src/renderer/src/App.tsx routing logic
  - pattern: 'Route based on machine state, not boolean flags'

MODALS:
  - add to: existing modal system or create new modal management
  - pattern: 'Independent provider setup modals, not coupled wizard'

PROVIDER_HEALTH:
  - utilize: existing healthCheck() methods in providers
  - pattern: 'Aggregate health checks through StartupOrchestrator'
```

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run after each file creation - fix before proceeding
npm run type-check                    # TypeScript checking
npm run lint                         # ESLint validation
npm run format                       # Prettier formatting

# Expected: Zero errors. If errors exist, READ output and fix before proceeding.
```

### Level 2: Unit Tests (Component Validation)

```bash
# Test state machine logic
npm run test -- machines/startupMachine.test.ts
npm run test -- services/StartupOrchestrator.test.ts

# Test React components
npm run test -- components/StartupStateMachine.test.tsx
npm run test -- components/ProviderSetupCard.test.tsx

# Full test suite
npm run test

# Expected: All tests pass. If failing, debug root cause and fix implementation.
```

### Level 3: Integration Testing (System Validation)

```bash
# Development server validation
npm run dev &
sleep 5  # Allow startup time

# Manual startup flow testing:
# 1. Clear all stored credentials
# 2. Launch app → should show loading then setup cards
# 3. Complete Gmail setup → Gmail card disappears
# 4. Complete OpenAI setup → OpenAI card disappears
# 5. Dashboard should load with all providers connected

# Console log validation
# Expected: See "Startup state: dashboard_ready" in console
# Expected: NO "Partial setup check useEffect triggered" infinite logs

# Provider failure simulation
# 1. Break Gmail credentials → should show reconnect card on dashboard
# 2. Break OpenAI key → should show reconfigure card on dashboard
# 3. App should remain functional with degraded features

# Expected: All integrations working, no infinite loops, clean state transitions
```

### Level 4: Creative & Domain-Specific Validation

```bash
# Startup Performance Testing
# Measure time from app launch to dashboard
time npm run dev

# State Machine Visualization (Development)
# Use XState DevTools to visualize state machine
# Browser extension: XState DevTools for Chrome/Firefox

# Load Testing Provider Checks
# Simulate slow provider responses
# Add artificial delays to provider health checks
# Ensure 5-second timeout works correctly

# User Experience Testing
# 1. First-time user experience (no credentials)
# 2. Partial setup user (only Gmail configured)
# 3. Returning user (all credentials configured)
# 4. Credential rotation scenario (expired tokens)

# Cross-Platform Testing
# Test startup flow on macOS, Windows, Linux
# Ensure credential encryption works on all platforms

# Expected: Consistent UX across all scenarios, proper error handling
```

## Final Validation Checklist

### Technical Validation

- [ ] All 4 validation levels completed successfully
- [ ] All tests pass: `npm run test`
- [ ] No linting errors: `npm run lint`
- [ ] No type errors: `npm run type-check`
- [ ] No formatting issues: `npm run format`

### Feature Validation

- [ ] App loads to dashboard within 5 seconds on first launch
- [ ] No infinite console loops during startup (no "Partial setup check useEffect triggered")
- [ ] Provider failures show warning cards, don't block dashboard
- [ ] Gmail and OpenAI can be set up independently via setup cards
- [ ] State transitions are deterministic and logged for debugging
- [ ] All existing functionality preserved (inbox, settings, email operations)
- [ ] Startup flow works with partial configurations

### Code Quality Validation

- [ ] Follows existing codebase patterns (Result<T>, provider interfaces)
- [ ] XState machine properly prevents infinite loops
- [ ] Independent provider setup modals work correctly
- [ ] Dashboard-first approach maintains usability during provider failures
- [ ] Race conditions eliminated between App.tsx and onboarding logic
- [ ] Proper TypeScript types throughout state machine implementation

### User Experience Validation

- [ ] First-time users see clear setup cards for required providers
- [ ] Returning users with valid credentials go straight to dashboard
- [ ] Users with expired credentials see "Reconnect" flows, not full setup
- [ ] Provider failures are non-blocking with clear recovery paths
- [ ] Loading states provide clear feedback during provider checks

---

## Anti-Patterns to Avoid

- ❌ Don't use boolean flags for complex state orchestration
- ❌ Don't couple provider setup flows (Gmail + OpenAI independence required)
- ❌ Don't block dashboard when individual providers fail
- ❌ Don't use useEffect with empty dependencies for complex async flows
- ❌ Don't create race conditions between component initialization logic
- ❌ Don't skip timeout handling for provider health checks
- ❌ Don't ignore the existing Result<T> pattern for error handling
- ❌ Don't hardcode provider lists (support future provider additions)
