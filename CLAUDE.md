# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Smart Inbox Janitor is an AI-powered email triage assistant built as an Electron desktop application. It helps users clean their Gmail inbox safely through intelligent classification and bulk operations. The project uses a provider-agnostic architecture with TypeScript throughout.

**Key Technologies**: Electron, React, TypeScript, XState (v5), SQLite (better-sqlite3), Gmail API, OpenAI API, Material-UI (v7)

## Development Commands

### Essential Daily Commands

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build the application for production
- `npm run type-check` - Run TypeScript type checking
- `npm run lint` - Run ESLint (use `npm run lint:fix` to auto-fix)
- `npm run format` - Format code with Prettier
- `npm run test` - Run Jest tests (use `npm run test:watch` for watch mode)

### CI/CD Validation (Before Push)

- `npm run ci:quick` - Fast validation: lint + type-check + build
- `npm run ci:check` - Full CI validation matching GitHub Actions
- `npm run ci:quality` - Code quality checks only
- `npm run ci:security` - Security audit

### VS Code Tasks (Cmd+Shift+P → "Tasks: Run Task")

- **🔍 Full CI/CD Check** (`Ctrl+Shift+C`) - Complete validation
- **⚡ Quick Check** (`Ctrl+Shift+Q`) - Fast lint/build/type-check
- **🧪 Code Quality Check** (`Ctrl+Shift+T`) - Linting and formatting
- **🧽 Clean & Fresh Install** - Reset node_modules

### Testing Commands

- `npm run test:types` - Test type definitions
- `npm run test:schemas` - Test Zod schemas
- `npm run test:factories` - Test data factories
- `npm run test:coverage` - Generate coverage report

### Build Commands

- `npm run build:win` / `npm run build:mac` / `npm run build:linux` - Platform builds
- `npm run clean` - Remove build artifacts

## Architecture Overview

### Provider-Agnostic Design

The application uses a sophisticated provider pattern with BaseProvider architecture providing common functionality:

1. **EmailProvider** (`src/providers/email/`) - Gmail API integration (future: IMAP)
2. **LLMProvider** (`src/providers/llm/`) - OpenAI GPT-4o-mini (future: Claude, local)
3. **StorageProvider** (`src/providers/storage/`) - SQLite with encryption (future: IndexedDB)

### BaseProvider Architecture

All providers extend the `BaseProvider<TConfig>` abstract class (`src/shared/base/BaseProvider.ts`) which provides:

- **Lifecycle Management**: Initialize, shutdown, configuration updates with hooks
- **State Management**: Centralized initialization state tracking
- **Performance Monitoring**: Built-in metrics collection and caching
- **Dependency Management**: Initialization dependency resolution
- **Health Checks**: Enhanced health checks with state and metrics
- **Configuration Validation**: Cached validation with startup checks

### XState State Machine Architecture

The application uses **XState v5** for robust UI state management:

- **StartupMachine** (`src/renderer/src/machines/startupMachine.ts`) - Manages application startup flow
- **State Machine Integration** - Prevents infinite loops and provides deterministic UI states
- **Provider Status Management** - Tracks individual provider health and setup requirements
- **Timeout Handling** - Built-in timeout management for provider checks

Key states: `initializing`, `checking_providers`, `dashboard_ready`, `setup_required`, `setup_timeout`

### Startup Orchestration System

Coordinates provider health checks and app readiness:

- **StartupOrchestrator** (`src/renderer/src/services/StartupOrchestrator.ts`) - Orchestrates provider checks
- **StartupStateMachine** (`src/renderer/src/components/StartupStateMachine.tsx`) - React integration with XState
- **Parallel Provider Checks** - All provider health checks run concurrently
- **Individual Timeouts** - Each provider has independent timeout handling

### Project Structure

```
src/
├── main/           # Electron main process (Node.js)
├── renderer/       # React UI (browser context)
├── preload/        # Secure IPC bridge with type-safe interfaces
├── shared/         # Shared types and utilities
│   ├── base/       # BaseProvider architecture
│   ├── types/      # TypeScript interfaces
│   ├── schemas/    # Zod validation schemas
│   ├── factories/  # Test data factories
│   └── utils/      # Shared utilities & provider initialization
├── providers/      # Provider implementations
└── renderer/src/
    ├── machines/   # XState state machines
    ├── services/   # Orchestration services
    ├── hooks/      # Custom React hooks
    └── components/ # React components with state management
```

### Result Pattern

**CRITICAL**: All provider methods use the `Result<T>` pattern instead of throwing exceptions:

```typescript
// ✅ Correct
const result = await provider.getEmails();
if (result.success) {
  console.log(result.data);
} else {
  console.error(result.error);
}

// ❌ Never do this
try {
  const emails = await provider.getEmails();
} catch (error) {
  // Providers don't throw!
}
```

## React Integration Patterns

### Custom Hooks

- **useElectronAPI** (`src/renderer/src/hooks/useElectronAPI.ts`) - Provides type-safe access to Electron APIs
- **useProviderStatus** (`src/renderer/src/hooks/useProviderStatus.ts`) - Real-time provider health monitoring
- **useMachine** (from @xstate/react) - XState integration for state management

### State Management

- **XState v5**: Finite state machines for complex UI flows
- **Provider Status**: Real-time health monitoring and setup requirements
- **Modal Management**: Coordinated setup flows for different providers
- **Error Boundaries**: Graceful error handling with state recovery

### Component Architecture

- **StartupStateMachine**: Central orchestrator for application startup
- **ProviderSetupCard**: Reusable provider status and setup components
- **Modal Coordination**: OpenAI and Gmail setup modals with state synchronization

## Key Development Patterns

### TypeScript Configuration

- **Strict mode enabled** - All strict TypeScript checks active
- **Path mapping**: Use `@shared/*`, `@providers/*`, `@tests/*`
- **No `any` types** - Use proper typing or `unknown`
- **Explicit return types** required on functions

### Error Handling

- Use `Result<T, E>` for all async operations
- Import error utilities from `@shared/types`
- Error classes: `ConfigurationError`, `AuthenticationError`, `NetworkError`, `ValidationError`
- Use `createSuccessResult()` and `createErrorResult()` helpers

### Provider Implementation

When implementing new providers, follow the BaseProvider architecture:

1. **Extend BaseProvider**: `class MyProvider extends BaseProvider<MyConfig>`
2. **Implement Abstract Methods**:
   - `performInitialization(config)`: Provider-specific setup
   - `performShutdown()`: Cleanup and resource deallocation
   - `performConfigurationValidation(config)`: Config validation logic
   - `performHealthCheck()`: Provider health assessment
3. **Use Lifecycle Hooks** (optional):
   - `onPreInitialize()`, `onPostInitialize()`: Setup hooks
   - `onPreShutdown()`, `onPostShutdown()`: Cleanup hooks
   - `onConfigurationChanged()`: Config update handling
4. **Configuration**:
   - Define typed configuration extending `BaseProviderConfig`
   - Use `getStartupValidationConfig()` for validation rules
   - Implement `getInitializationDependencies()` if needed
5. **State Management**: Use `ensureInitialized()` in methods requiring initialization
6. **Performance**: Enable metrics with `enablePerformanceMetrics: true` in config

### XState Machine Development

When creating new state machines:

1. **Define States**: Use explicit finite states, avoid boolean flags
2. **Type Safety**: Define context interfaces and event types
3. **Actors**: Use `fromPromise` for async operations
4. **Guards**: Implement state transition logic in guards
5. **Actions**: Use `assign` for context updates, separate actions for side effects
6. **Integration**: Use `useMachine` hook with `.provide()` for implementations

### Security Considerations

- **Never log or expose sensitive data** (tokens, emails, API keys)
- Use the `CredentialEncryption` service for secure token storage
- All database operations use parameterized queries
- Implement proper rate limiting for external APIs

## Console Mode Provider Validation & Debugging

**IMPORTANT FOR AI AGENTS**: Smart Inbox Janitor includes a console-mode provider validation system for debugging and automated testing without UI dependencies.

### Console Mode Commands

**Primary debugging commands for AI agents:**

```bash
# Basic console validation (recommended for AI agents)
npm run debug:providers

# JSON output only (ideal for AI parsing)
npm run debug:providers:json

# Test specific providers
npm run debug:gmail           # Gmail provider only
npm run debug:openai         # OpenAI provider only
npm run debug:storage        # Storage provider only

# CI/CD integration
npm run test:providers:ci    # Headless with JSON output & 30s timeout
npm run validate:console     # Exit on first failure with 60s timeout
```

### Console Mode Features

- **Headless Operation**: Runs without UI, only console output
- **Structured JSON Output**: AI-agent parseable status and results
- **Exit Codes**: Meaningful exit codes for automation (0=success, 1=auth, 2=network, 3=config, etc.)
- **Provider Health Checks**: Direct provider validation without IPC
- **Environment Variable Validation**: Checks required OAuth and API keys
- **Timeout Handling**: Configurable timeouts with graceful failure

### AI Agent Integration

The console mode is specifically designed for AI agents to validate provider status:

```bash
# AI agent usage pattern
npm run debug:providers:json | jq '.type == "validation_summary"'
echo "Exit code: $?"
```

**Expected JSON Output Types:**

- `validation_start` - Validation beginning
- `provider_result` - Individual provider status
- `validation_summary` - Final summary with exit code
- `console_app_summary` - Application-level summary

**Exit Codes for Automation:**

- `0` - All providers healthy
- `1` - Authentication failures (OAuth tokens invalid)
- `2` - Network connectivity issues
- `3` - Configuration errors (missing env vars)
- `4` - Setup required (initial OAuth setup needed)
- `5` - Timeout errors
- `99` - Unknown errors

### Environment Variables Required

For console mode provider validation:

```bash
# Gmail Provider (required for gmail validation)
GMAIL_CLIENT_ID=your_gmail_oauth_client_id
GMAIL_CLIENT_SECRET=your_gmail_oauth_client_secret

# OpenAI Provider (required for openai validation)
OPENAI_API_KEY=your_openai_api_key

# Optional
GMAIL_REDIRECT_URI=http://localhost:8080/oauth/callback
DATABASE_PATH=./data/console-validation.db
```

### Console Mode Usage Examples

```bash
# 1. Basic validation with human-readable output
npm run debug:providers --verbose --format=table

# 2. AI agent monitoring
npm run debug:providers:json > provider_status.json
EXIT_CODE=$?
jq '.type, .exitCode, .connectedProviders' provider_status.json

# 3. Retry on failure with timeout
npm run debug:providers --retry --retry-attempts=3 --timeout=90

# 4. Single provider deep validation
npm run debug:gmail --verbose
```

### Troubleshooting Console Mode

**Issue: App icon appears but no UI** ✅ **This is correct behavior**

- Console mode successfully prevents UI creation
- App may appear in dock/taskbar but no windows should open
- Process will exit automatically after validation

**Issue: Exit code 3 (Configuration Error)**

- Missing required environment variables
- Run `npm run debug:providers --verbose` to see which env vars are missing

**Issue: Exit code 4 (Setup Required)**

- Providers need initial OAuth setup through UI mode
- Run normal app first: `npm run dev`
- Complete OAuth flows, then retry console mode

**Issue: Exit code 5 (Timeout)**

- Network connectivity issues or slow API responses
- Increase timeout: `npm run debug:providers --timeout=120`

### Console Mode Architecture

**Key Files:**

- `src/console/` - Console-mode implementation
- `src/shared/cli/CommandParser.ts` - Command-line argument parsing
- `src/main/ConsoleMode.ts` - Headless Electron configuration
- `src/console/ProviderValidator.ts` - Direct provider validation without IPC

**Integration Point:**

- `src/main/index.ts` - Console mode detection and routing
- Detects `--console` or `--headless` flags and prevents UI creation

## Advanced Security Architecture

The application implements a comprehensive multi-layer security system:

### SecureStorageManager (`src/main/security/SecureStorageManager.ts`)

- **ZERO-PASSWORD Experience**: Uses OS-level security (keychain) for transparent authentication
- **Hybrid Storage**: Combines OS keychain with encrypted SQLite for optimal security
- **Automatic Token Rotation**: Built-in lifecycle management for OAuth tokens
- **Security Audit Logging**: Comprehensive logging for compliance and monitoring
- **Recovery Procedures**: Handles corrupted storage scenarios gracefully

### CredentialEncryption (`src/main/security/CredentialEncryption.ts`)

- **OS Keychain Integration**: Platform-specific secure storage (keytar)
- **Encryption at Rest**: SQLCipher encryption for database storage
- **Master Key Management**: Derived from system entropy
- **Token Rotation Service**: Automated credential renewal

### SecurityAuditLogger (`src/main/security/SecurityAuditLogger.ts`)

- **Operation Logging**: All credential operations are audited
- **Security Event Tracking**: Failed authentications, unauthorized access attempts
- **Compliance Features**: Audit trails for security compliance requirements

### OAuth Management

- **GmailOAuthManager**: Handles Gmail OAuth2 flow with refresh tokens
- **TokenRotationService**: Automatic token renewal before expiration
- **Secure Token Storage**: Encrypted tokens with automatic cleanup

## Provider Initialization System

Sophisticated initialization utilities (`src/shared/utils/provider-initialization.utils.ts`):

### Features

- **Caching System**: Configuration validation caching to improve performance
- **Lazy Initialization**: Providers initialize only when needed
- **Performance Monitoring**: Built-in metrics collection and timing
- **Dependency Management**: Initialization dependency resolution
- **State Tracking**: Centralized initialization state management

### Decorators

- `@CachedInitialization`: Caches method results based on provider state
- `@LazyInitialization`: Defers initialization until first use
- `@MonitorInitialization`: Collects performance metrics

### Validation

- **Startup Validation**: Comprehensive configuration validation at startup
- **Cached Results**: Validation results cached with configurable TTL
- **Custom Validators**: Extensible validation system

## IPC Bridge Architecture

Secure Inter-Process Communication between main and renderer processes:

### Preload Bridge (`src/preload/index.ts`)

- **Type-Safe Interfaces**: Full TypeScript coverage for all IPC operations
- **Context Isolation**: Uses Electron's contextBridge for security
- **Provider Abstraction**: Direct mapping to provider methods
- **Result Pattern Integration**: Consistent error handling across IPC boundary

### API Surface

```typescript
interface ElectronAPI {
  email: EmailProvider; // Gmail operations
  storage: StorageProvider; // Database operations
  llm: LLMProvider; // AI operations
  app: AppControls; // Window management
  oauth: OAuthOperations; // Authentication flows
}
```

## Database & Storage

### SQLite Database

- Uses `better-sqlite3` with SQLCipher encryption
- Database file: `app-data.db` (encrypted)
- Migration system in place - check `migrate()` methods
- Always use parameterized queries to prevent SQL injection

### Data Models

Key tables/entities:

- `user_rules` - Email classification rules
- `email_metadata` - Processed email information
- `classification_history` - AI classification results
- `encrypted_tokens` - OAuth tokens and API keys
- `config` - Application configuration

## Testing Strategy

### Test Structure

- Unit tests: `__tests__/**/*.test.ts`
- Type tests: `__tests__/types/`
- Schema tests: `__tests__/schemas/`
- Factory tests: `__tests__/factories/`

### Coverage Requirements

- Global: 90% coverage required
- Types: 100% coverage required
- Schemas: 95% coverage required
- Use `npm run test:coverage` to check

## Security & Encryption

### Credential Storage

- OAuth tokens encrypted using OS keychain (keytar)
- Master key derived from system entropy
- Token rotation service for automated renewal
- Security audit logging for all credential operations

### Email Safety

- Never permanently delete emails without explicit user approval
- All actions are reversible from Gmail trash
- Content sanitization during processing
- Rate limiting to respect API quotas

## Common Issues & Solutions

### ESLint/TypeScript Errors

- Run `npm run type-check` to see all TypeScript errors
- Use `npm run lint:fix` for auto-fixable ESLint issues
- Check `eslint.config.js` for current rules
- Strict boolean expressions required - use explicit checks

### XState Issues

- **State Machine Not Updating**: Check that events are properly typed and guards return boolean
- **Async Operations**: Use `fromPromise` actors for async operations, not direct promises
- **Context Updates**: Use `assign()` for context updates, not direct mutation
- **Type Issues**: Ensure event types match machine definition

### Provider Issues

- **BaseProvider Errors**: Ensure `performInitialization()` and other abstract methods are implemented
- **Result Pattern**: All async operations must return `Result<T>` types
- **Health Checks**: Use enhanced health checks from BaseProvider for debugging
- **Initialization State**: Check `getInitializationState()` for provider state debugging
- **Performance**: Use `getInitializationMetrics()` to analyze initialization performance

### Security Issues

- **Token Storage**: Use `SecureStorageManager` for all credential operations
- **Audit Logging**: Check `SecurityAuditLogger` for credential operation logs
- **Encryption**: Verify `CredentialEncryption` setup if storage operations fail
- **OAuth Flows**: Use `GmailOAuthManager` for Gmail authentication issues

### Database Issues

- Check encryption setup if database won't open
- Use `healthCheck()` methods to diagnose provider issues
- Check migrations if schema errors occur
- Use `SecureStorageManager.healthCheck()` for storage diagnostics

### IPC Communication Issues

- **Type Safety**: Ensure renderer types match preload bridge definitions
- **Result Handling**: All IPC calls return `Result<T>` - check `.success` property
- **Context Isolation**: Use `window.electronAPI` in renderer, never `ipcRenderer` directly

## Build & Deployment

### Electron Build Process

1. `npm run build` - Compiles TypeScript and bundles React
2. `electron-builder` - Creates platform-specific installers
3. Uses `electron-vite` for optimized builds

### Platform Support

- macOS: `.dmg` installer
- Windows: NSIS installer
- Linux: AppImage

## Environment Variables & Config

### Configuration Files

- TypeScript: `tsconfig.json` (strict mode)
- ESLint: `eslint.config.js` (comprehensive rules)
- Jest: `jest.config.js` (with path mapping)
- Electron: `electron.vite.config.ts`

### Runtime Configuration

- App settings stored in encrypted SQLite
- User preferences in local database
- No environment variables for secrets (use OS keychain)

## Integration Points

### Gmail API

- OAuth2 flow with refresh tokens
- Batch operations for efficiency
- Respectful rate limiting
- Folder/label management

### OpenAI API

- GPT-4o-mini for cost optimization
- Structured prompts for email classification
- Token usage tracking
- Error handling for rate limits/quotas

## MUI Usage Rules

**CRITICAL**: This project uses MUI v7+ with new Grid syntax:

```tsx
// ✅ Correct - New MUI v7 syntax
import Grid from '@mui/material/Grid';

<Grid container spacing={2}>
  <Grid size={{ xs: 12, sm: 6, md: 4 }}>Content here</Grid>
</Grid>;

// ❌ Never use these (old/deprecated):
// - Grid2 component
// - <Grid xs={12} sm={6}> (direct props)
// - <Grid item> (item prop)
```

Use `Box` with CSS Grid for complex layouts when Grid component is insufficient.

## Performance Considerations

### Email Processing

- Batch operations for Gmail API efficiency
- Streaming for large email sets
- Progress tracking for long operations
- Cancellation support for user interruption

### Database Operations

- Use prepared statements for repeated queries
- Implement proper indexing
- Transaction management for consistency
- Connection pooling where needed

## Debugging Tips

### Common Debug Commands

- `npm run ci:quick` before committing
- Check VS Code Problems panel for TypeScript issues
- Use React DevTools for renderer debugging
- Electron DevTools for main process debugging

### State Machine Debugging

- **XState Inspector**: Use browser XState inspector for state visualization
- **Console Logging**: State machines log transitions and context changes
- **State Matching**: Use `state.matches('stateName')` for debugging current state
- **Event Debugging**: Log events sent to state machines

### Provider Debugging

- **Initialization State**: Check `provider.getInitializationState()` for detailed state
- **Performance Metrics**: Use `provider.getInitializationMetrics()` for performance analysis
- **Health Checks**: Enhanced health checks include initialization metrics and state
- **Configuration**: Use `provider.getConfig()` to verify current configuration

### Security Debugging

- **Audit Logs**: Check `SecurityAuditLogger` for credential operation history
- **Storage Status**: Use `SecureStorageManager.getSecureStorageStatus()` for diagnostics
- **Encryption**: Verify `CredentialEncryption` health check for encryption status

### Log Analysis

- Security audit logs in database with detailed operation tracking
- Console logging available (warn level in production)
- Error tracking through Result pattern with detailed error contexts
- Performance metrics collection with timing and caching statistics
- State machine transition logging for UI flow analysis
