# Debug Provider Initialization System - Console Mode Validation & Enhanced Debugging

---

## Goal

**Feature Goal**: Implement a console-mode provider initialization validator that can run without UI, providing comprehensive debug output for automated testing and AI agent monitoring of provider health, token validation, and initialization sequences.

**Deliverable**:

- **Console-mode entry point** that initializes providers and outputs structured debug information
- **Command-line interface** with flags for selective provider testing and verbose output
- **Enhanced debugging system** with structured logging, performance profiling, and automated diagnostics
- **AI-agent friendly** output format for automated monitoring and validation

**Success Definition**:

- AI agents can start app with `npm run debug:providers` and monitor console output to validate provider status
- All provider initialization issues detectable from console output without UI or DevTools
- Complete provider health validation (tokens, connectivity, configuration) in <30 seconds
- Structured JSON output suitable for automated analysis and alerting

## User Persona

**Primary User**: AI agents and automated testing systems

**Secondary User**: Software developers debugging provider issues

**Use Cases**:

- **AI Agent Monitoring**: Automated validation of provider initialization status
- **CI/CD Integration**: Provider health checks in automated testing pipelines
- **Development Debugging**: Fast provider diagnosis without opening UI
- **Production Diagnostics**: Remote provider validation through console commands

**User Journey**:

1. AI agent runs `npm run debug:providers --mode=console --verbose`
2. Console displays structured initialization progress with timing and status
3. Each provider shows detailed connection status, token validity, and health metrics
4. Final summary provides complete system status in JSON format
5. Exit code indicates success/failure for automated decision making

**Pain Points Addressed**:

- **No automated way** to validate provider initialization without UI interaction
- **DevTools dependency** makes remote debugging and CI/CD integration difficult
- **Inconsistent logging** makes it hard for AI agents to parse provider status
- **Manual verification** required to check token renewal and provider connectivity

## Why

- **Automated Testing**: Enable CI/CD pipelines to validate provider connectivity before deployment
- **AI Agent Integration**: Provide structured output that AI agents can monitor and respond to
- **Development Velocity**: Faster debugging without launching full Electron UI
- **Production Monitoring**: Remote provider health validation through command-line interface
- **Debugging Enhancement**: Comprehensive provider state visibility through enhanced logging system

## What

Console-mode provider validation system with enhanced debugging capabilities:

### Core Console Features

- **Headless Mode**: Run Electron in console-only mode with `--headless` flag
- **Provider CLI**: Command-line interface for selective provider testing
- **Structured Output**: JSON-formatted progress and status for AI parsing
- **Exit Codes**: Meaningful exit codes for automated decision making
- **Verbose Logging**: Detailed initialization flow with timing and error details

### Enhanced Debugging System

- **Structured Logging**: Replace console logs with correlation ID tracking
- **Performance Profiling**: Automatic detection of slow initialization and memory issues
- **Circuit Breaker Integration**: Graceful failure handling and recovery
- **Debug Export**: Comprehensive debug data export for offline analysis

### Success Criteria

- [ ] `npm run debug:providers` runs without UI and outputs structured provider status
- [ ] Command-line flags control which providers to test and output verbosity level
- [ ] All provider status (connected, token valid, health check) visible in console output
- [ ] JSON output format suitable for AI agent parsing and automated decision making
- [ ] Exit codes indicate specific failure types (auth, network, configuration, etc.)
- [ ] Token renewal attempts logged with success/failure status and error details
- [ ] Complete validation cycle completes in <30 seconds with detailed timing information

## All Needed Context

### Context Completeness Check

_If someone knew nothing about this codebase, would they have everything needed to implement this successfully?_

✅ **YES** - This PRP provides comprehensive codebase analysis, console-mode implementation patterns, structured logging examples, and detailed integration guidance.

### Documentation & References

```yaml
# MUST READ - Include these in your context window
- url: https://www.electronjs.org/docs/latest/tutorial/testing-on-headless-ci#configuring-the-virtual-display-server
  why: Electron headless mode configuration for console-only operation
  critical: Must use xvfb-maybe wrapper for true headless operation, --disable-gpu flag required

- url: https://nodejs.org/api/process.html#process_exit_codes
  why: Standard Node.js exit codes for automated tooling integration
  critical: Use specific exit codes for different failure types (auth=1, network=2, config=3)

- url: https://github.com/pinojs/pino#cli
  why: Structured JSON logging that AI agents can parse reliably
  critical: Must use JSON output format, avoid plain text for automated parsing

- url: https://github.com/yargs/yargs#readme
  why: Command-line argument parsing for provider selection and output control
  critical: Consistent CLI patterns, help text, and validation required

- file: src/main/index.ts
  why: Main Electron entry point with provider initialization sequence
  pattern: Provider instantiation, app.whenReady() event handling, window creation
  gotcha: Must prevent window creation in console mode, preserve provider initialization

- file: src/shared/base/BaseProvider.ts
  why: Core provider architecture with health checks and initialization methods
  pattern: Abstract base class with Result<T> pattern, lifecycle hooks, state management
  gotcha: healthCheck() method returns Result<HealthStatus>, never throws exceptions

- file: src/renderer/src/services/StartupOrchestrator.ts
  why: Provider health check coordination with parallel execution and timeout handling
  pattern: Promise.allSettled for parallel checks, individual 5-second timeouts, comprehensive error handling
  gotcha: Returns ProviderStatus[] with connected/disconnected states, handles API not ready scenarios

- file: src/main/security/TokenRotationService.ts
  why: Automatic token renewal logic for OAuth providers like Gmail
  pattern: Token expiry checking, refresh token usage, error categorization
  gotcha: Handles various OAuth error scenarios (expired refresh token, network issues, API changes)

- file: src/providers/email/gmail/GmailProvider.ts
  why: Gmail-specific initialization, OAuth flow, and error handling patterns
  pattern: OAuth token validation, Gmail API connection testing, rate limit handling
  gotcha: Requires specific scopes, handles 401/403/429 errors differently

- file: src/providers/llm/openai/OpenAIProvider.ts
  why: OpenAI API key validation and connection testing patterns
  pattern: API key validation through lightweight model listing, usage tracking
  gotcha: API key validation must use models.list() call, not chat completions

- file: src/providers/storage/sqlite/SQLiteProvider.ts
  why: Database connection health checks and encryption status validation
  pattern: Database connectivity testing, schema validation, encryption status checking
  gotcha: SQLCipher encryption requires specific connection parameters and validation

- docfile: PRPs/ai_docs/provider_debugging_comprehensive.md
  why: Detailed analysis of current debugging capabilities and implementation patterns
  section: All sections contain critical implementation details for console mode integration
```

### Current Codebase Tree (Provider System Core)

```bash
src/
├── main/
│   ├── index.ts                    # Provider initialization, Electron app setup
│   ├── ipc.ts                      # IPC handlers for provider methods
│   └── security/
│       ├── SecureStorageManager.ts # Credential management
│       ├── TokenRotationService.ts # OAuth token renewal
│       └── GmailOAuthManager.ts    # Gmail OAuth flow handling
├── shared/
│   ├── base/
│   │   └── BaseProvider.ts         # Abstract provider with health checks
│   ├── types/
│   │   ├── base.types.ts           # Result<T> pattern definitions
│   │   └── *.types.ts              # Provider-specific type definitions
│   └── utils/
│       └── provider-initialization.utils.ts # Advanced initialization utilities
├── providers/
│   ├── email/gmail/GmailProvider.ts         # Gmail API integration
│   ├── llm/openai/OpenAIProvider.ts         # OpenAI API integration
│   └── storage/sqlite/SQLiteProvider.ts     # SQLite database integration
└── renderer/src/
    ├── services/StartupOrchestrator.ts      # Provider health coordination
    └── hooks/useProviderStatus.ts           # Real-time provider monitoring
```

### Desired Codebase Tree with Console Mode Files

```bash
src/
├── console/                        # NEW: Console-mode entry point
│   ├── ConsoleApp.ts               # Main console application with CLI
│   ├── ProviderValidator.ts        # Provider validation orchestration
│   ├── ConsoleLogger.ts            # Structured console output formatter
│   └── ExitCodes.ts                # Standard exit codes for automation
├── main/
│   ├── index.ts                    # ENHANCED: Support console mode flag
│   └── ConsoleMode.ts              # NEW: Headless Electron configuration
├── shared/
│   ├── debugging/                  # NEW: Enhanced debugging utilities
│   │   ├── StructuredLogger.ts     # JSON logging for AI parsing
│   │   ├── PerformanceProfiler.ts  # Timing and memory profiling
│   │   └── DebugExporter.ts        # Debug data export utilities
│   └── cli/                        # NEW: Command-line interface utilities
│       ├── CommandParser.ts        # Yargs-based command parsing
│       └── OutputFormatter.ts      # JSON/table output formatting
└── package.json                    # ENHANCED: Add console mode scripts
```

### Known Gotchas of our Codebase & Library Quirks

```typescript
// CRITICAL: Electron requires display even in headless mode
// ✅ Correct headless setup
process.env.DISPLAY = ':99'; // Virtual display
app.commandLine.appendSwitch('--headless');
app.commandLine.appendSwitch('--disable-gpu');
// ❌ Don't assume Electron works without display server

// CRITICAL: BaseProvider healthCheck() uses Result<T> pattern
// ✅ Correct health check handling
const result = await provider.healthCheck();
if (result.success) {
  console.log('Provider healthy:', result.data);
} else {
  console.error('Provider failed:', result.error);
}
// ❌ Never try/catch provider methods - they don't throw

// CRITICAL: StartupOrchestrator expects ElectronAPI availability
// ✅ Console mode adaptation required
class ConsoleStartupOrchestrator extends StartupOrchestrator {
  // Override methods to work without renderer process
  protected async getElectronAPI() {
    return mockElectronAPI; // Provide direct provider access
  }
}

// CRITICAL: Provider initialization state is global and persists
// Must reset between runs for accurate testing
beforeEach(() => {
  resetAllInitializationStates();
});

// CRITICAL: Gmail OAuth requires browser for initial setup
// Console mode can only validate existing tokens, not obtain new ones
if (!existingTokens && isConsoleMode) {
  console.warn('Gmail requires initial OAuth setup through UI');
  process.exit(4); // Specific exit code for setup required
}

// CRITICAL: Console output must be parseable JSON for AI agents
// ✅ Correct structured output
console.log(
  JSON.stringify({
    timestamp: new Date().toISOString(),
    provider: 'gmail',
    status: 'connected',
    details: { tokenValid: true, apiResponding: true },
  }),
);
// ❌ Don't mix JSON with plain text output
```

## Implementation Blueprint

### Data Models and Structure

Console-mode data models for structured output and automation:

```typescript
// Console command configuration
interface ConsoleConfig {
  mode: 'console' | 'headless';
  providers: string[]; // ['gmail', 'openai', 'storage'] or ['all']
  verbose: boolean;
  outputFormat: 'json' | 'table' | 'compact';
  timeout: number; // Global timeout in seconds
  exitOnFailure: boolean;
}

// Provider validation result for console output
interface ProviderValidationResult {
  providerId: string;
  status: 'connected' | 'disconnected' | 'error' | 'timeout';
  health: 'healthy' | 'degraded' | 'unhealthy';
  details: {
    configurationValid: boolean;
    authenticationValid: boolean;
    connectivityTest: boolean;
    tokenRenewalAttempted?: boolean;
    tokenRenewalSucceeded?: boolean;
    lastError?: string;
    responseTime?: number;
  };
  timing: {
    startTime: string;
    endTime: string;
    durationMs: number;
  };
}

// Console validation summary
interface ValidationSummary {
  timestamp: string;
  totalProviders: number;
  connectedProviders: number;
  failedProviders: number;
  totalDurationMs: number;
  exitCode: number;
  results: ProviderValidationResult[];
  systemInfo: {
    nodeVersion: string;
    electronVersion: string;
    platform: string;
    memory: NodeJS.MemoryUsage;
  };
}

// Exit code definitions for automation
enum ExitCodes {
  SUCCESS = 0,
  AUTHENTICATION_FAILURE = 1,
  NETWORK_FAILURE = 2,
  CONFIGURATION_ERROR = 3,
  SETUP_REQUIRED = 4,
  TIMEOUT_ERROR = 5,
  UNKNOWN_ERROR = 99,
}
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: CREATE src/console/ExitCodes.ts
  - IMPLEMENT: Standard exit code definitions for different failure scenarios
  - FOLLOW pattern: Node.js standard exit codes with provider-specific extensions
  - NAMING: ExitCodes enum, getExitCodeForError() helper function
  - PLACEMENT: Console utilities in src/console/
  - DEPENDENCIES: None (foundational)

Task 2: CREATE src/shared/cli/CommandParser.ts
  - IMPLEMENT: Yargs-based command-line argument parsing with validation
  - FOLLOW pattern: src/shared/types/config.types.ts (configuration validation)
  - NAMING: CommandParser class, parseConsoleArgs(), validateArgs() methods
  - PLACEMENT: CLI utilities in src/shared/cli/
  - DEPENDENCIES: Install yargs, @types/yargs

Task 3: CREATE src/shared/debugging/StructuredLogger.ts
  - IMPLEMENT: JSON-structured logging system for console output and AI parsing
  - FOLLOW pattern: src/shared/types/base.types.ts (Result<T> pattern consistency)
  - NAMING: StructuredLogger class, logProviderEvent(), formatJSON() methods
  - PLACEMENT: Debugging utilities in src/shared/debugging/
  - DEPENDENCIES: Install pino for high-performance JSON logging

Task 4: CREATE src/console/ConsoleLogger.ts
  - IMPLEMENT: Console-specific output formatting with structured JSON and table views
  - FOLLOW pattern: StructuredLogger from Task 3 for consistent data structures
  - NAMING: ConsoleLogger class, logProviderResult(), printSummary() methods
  - PLACEMENT: Console output in src/console/
  - DEPENDENCIES: Import StructuredLogger from Task 3, cli-table3 for table formatting

Task 5: CREATE src/console/ProviderValidator.ts
  - IMPLEMENT: Provider validation orchestration adapted from StartupOrchestrator
  - FOLLOW pattern: src/renderer/src/services/StartupOrchestrator.ts (parallel execution, timeout handling)
  - NAMING: ProviderValidator class, validateAllProviders(), validateProvider() methods
  - PLACEMENT: Console validation logic in src/console/
  - DEPENDENCIES: Import BaseProvider pattern, utilize existing provider instances

Task 6: CREATE src/main/ConsoleMode.ts
  - IMPLEMENT: Headless Electron configuration and console-mode app setup
  - FOLLOW pattern: src/main/index.ts (app initialization, provider setup)
  - NAMING: ConsoleMode class, configureHeadless(), runConsoleMode() methods
  - PLACEMENT: Main process console support in src/main/
  - DEPENDENCIES: Electron headless configuration

Task 7: ENHANCE src/main/index.ts
  - INTEGRATE: Console mode detection and routing to ConsoleMode from Task 6
  - FOLLOW pattern: Existing app.whenReady() and provider initialization
  - NAMING: Preserve existing structure, add isConsoleMode() detection
  - PRESERVE: All existing functionality, maintain provider initialization order
  - DEPENDENCIES: Import ConsoleMode from Task 6

Task 8: CREATE src/console/ConsoleApp.ts
  - IMPLEMENT: Main console application entry point with CLI integration
  - FOLLOW pattern: src/main/index.ts (provider coordination) + CommandParser from Task 2
  - NAMING: ConsoleApp class, run(), processResults() methods
  - PLACEMENT: Console application root in src/console/
  - DEPENDENCIES: All previous console tasks, provider validation logic

Task 9: ENHANCE package.json
  - ADD: Console mode npm scripts for easy execution
  - FOLLOW pattern: Existing dev/build scripts with additional console-specific commands
  - NAMING: "debug:providers", "validate:console", "test:providers" scripts
  - PRESERVE: All existing scripts and dependencies
  - DEPENDENCIES: Add yargs, cli-table3, pino dependencies

Task 10: CREATE __tests__/console/console-validation.test.ts
  - IMPLEMENT: Integration tests for console mode provider validation
  - FOLLOW pattern: __tests__/initialization/initialization-performance.test.ts (provider testing)
  - NAMING: test_console_mode_validation, test_structured_output, test_exit_codes
  - COVERAGE: All console functionality including error scenarios and timeout handling
  - PLACEMENT: Console tests in __tests__/console/
```

### Implementation Patterns & Key Details

```typescript
// Console mode detection and setup pattern
// In main/index.ts
const isConsoleMode = process.argv.includes('--console') || process.argv.includes('--headless');

if (isConsoleMode) {
  // CRITICAL: Configure headless mode before app ready
  app.commandLine.appendSwitch('--headless');
  app.commandLine.appendSwitch('--disable-gpu');
  app.commandLine.appendSwitch('--no-sandbox');

  const consoleMode = new ConsoleMode();
  app.whenReady().then(() => consoleMode.run());
} else {
  // Normal Electron UI mode
  app.whenReady().then(createMainWindow);
}

// Structured console logging pattern for AI parsing
export class ConsoleLogger {
  private logger: pino.Logger;

  constructor(options: { verbose: boolean; format: 'json' | 'table' }) {
    this.logger = pino({
      level: options.verbose ? 'debug' : 'info',
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: false, // No ANSI colors for AI parsing
          singleLine: true,
          ignore: 'pid,hostname'
        }
      }
    });
  }

  logProviderResult(result: ProviderValidationResult): void {
    // CRITICAL: Structured output for AI agent parsing
    const logEntry = {
      timestamp: new Date().toISOString(),
      type: 'provider_result',
      provider: result.providerId,
      status: result.status,
      health: result.health,
      durationMs: result.timing.durationMs,
      details: result.details
    };

    // Always output JSON for AI parsing, even in table mode
    console.log(JSON.stringify(logEntry));

    // Optional human-readable table output
    if (this.options.format === 'table') {
      console.table([{
        Provider: result.providerId,
        Status: result.status,
        Health: result.health,
        Duration: `${result.timing.durationMs}ms`,
        Auth: result.details.authenticationValid ? '✓' : '✗',
        Connection: result.details.connectivityTest ? '✓' : '✗'
      }]);
    }
  }
}

// Provider validation adapted for console mode
export class ProviderValidator {
  private logger: ConsoleLogger;

  async validateAllProviders(config: ConsoleConfig): Promise<ValidationSummary> {
    const startTime = Date.now();
    const results: ProviderValidationResult[] = [];

    // PATTERN: Parallel provider validation with individual timeouts
    const providerPromises = config.providers.map(async (providerId) => {
      const result = await Promise.race([
        this.validateProvider(providerId),
        this.createTimeoutPromise(config.timeout * 1000, providerId)
      ]);

      results.push(result);
      this.logger.logProviderResult(result);
      return result;
    });

    await Promise.allSettled(providerPromises);

    const summary: ValidationSummary = {
      timestamp: new Date().toISOString(),
      totalProviders: results.length,
      connectedProviders: results.filter(r => r.status === 'connected').length,
      failedProviders: results.filter(r => r.status === 'error').length,
      totalDurationMs: Date.now() - startTime,
      exitCode: this.calculateExitCode(results),
      results,
      systemInfo: {
        nodeVersion: process.version,
        electronVersion: process.versions.electron || 'N/A',
        platform: process.platform,
        memory: process.memoryUsage()
      }
    };

    // CRITICAL: Final JSON output for AI parsing
    console.log(JSON.stringify({ type: 'validation_summary', ...summary }));
    return summary;
  }

  private async validateProvider(providerId: string): Promise<ProviderValidationResult> {
    const startTime = Date.now();
    let provider: BaseProvider<any>;

    try {
      // PATTERN: Direct provider access without renderer process
      switch (providerId) {
        case 'gmail':
          provider = new GmailProvider();
          break;
        case 'openai':
          provider = new OpenAIProvider();
          break;
        case 'storage':
          provider = new SQLiteProvider();
          break;
        default:
          throw new Error(`Unknown provider: ${providerId}`);
      }

      // CRITICAL: Use Result<T> pattern, don't try/catch
      const healthResult = await provider.healthCheck();
      const configResult = await provider.validateConfiguration(provider.getConfig());

      // Additional provider-specific checks
      const additionalChecks = await this.performProviderSpecificChecks(providerId, provider);

      return {
        providerId,
        status: healthResult.success ? 'connected' : 'error',
        health: this.calculateHealth(healthResult, configResult),
        details: {
          configurationValid: configResult.success,
          authenticationValid: additionalChecks.authValid,
          connectivityTest: healthResult.success,
          tokenRenewalAttempted: additionalChecks.tokenRenewalAttempted,
          tokenRenewalSucceeded: additionalChecks.tokenRenewalSucceeded,
          lastError: healthResult.success ? undefined : healthResult.error.message,
          responseTime: additionalChecks.responseTime
        },
        timing: {
          startTime: new Date(startTime).toISOString(),
          endTime: new Date().toISOString(),
          durationMs: Date.now() - startTime
        }
      };

    } catch (error) {
      return this.createErrorResult(providerId, startTime, error);
    }
  }

  private calculateExitCode(results: ProviderValidationResult[]): number {
    // PATTERN: Specific exit codes for different failure types
    const hasAuthFailures = results.some(r => !r.details.authenticationValid);
    const hasNetworkFailures = results.some(r => !r.details.connectivityTest);
    const hasConfigErrors = results.some(r => !r.details.configurationValid);
    const hasTimeouts = results.some(r => r.status === 'timeout');

    if (results.every(r => r.status === 'connected')) return ExitCodes.SUCCESS;
    if (hasAuthFailures) return ExitCodes.AUTHENTICATION_FAILURE;
    if (hasNetworkFailures) return ExitCodes.NETWORK_FAILURE;
    if (hasConfigErrors) return ExitCodes.CONFIGURATION_ERROR;
    if (hasTimeouts) return ExitCodes.TIMEOUT_ERROR;

    return ExitCodes.UNKNOWN_ERROR;
  }
}

// Console application main entry point
export class ConsoleApp {
  private validator: ProviderValidator;
  private logger: ConsoleLogger;

  async run(): Promise<void> {
    try {
      // PATTERN: Command-line parsing with validation
      const config = CommandParser.parseConsoleArgs(process.argv);

      this.logger = new ConsoleLogger({
        verbose: config.verbose,
        format: config.outputFormat
      });

      this.validator = new ProviderValidator(this.logger);

      // CRITICAL: Initialize providers before validation
      await this.initializeProviders();

      // PATTERN: Run validation and handle results
      const summary = await this.validator.validateAllProviders(config);

      // Exit with appropriate code for automation
      process.exit(summary.exitCode);

    } catch (error) {
      console.error(JSON.stringify({
        type: 'console_error',
        timestamp: new Date().toISOString(),
        error: error.message,
        stack: error.stack
      }));
      process.exit(ExitCodes.UNKNOWN_ERROR);
    }
  }
}

// Package.json script integration
{
  "scripts": {
    "debug:providers": "electron . --console --verbose",
    "debug:providers:json": "electron . --console --format=json",
    "debug:gmail": "electron . --console --providers=gmail --verbose",
    "validate:console": "electron . --console --timeout=60 --exit-on-failure",
    "test:providers:ci": "npm run debug:providers:json | jq '.type == \"validation_summary\"'"
  }
}
```

### Integration Points

```yaml
PACKAGE_JSON:
  - add dependencies: "yargs", "cli-table3", "pino", "pino-pretty"
  - add scripts: "debug:providers", "validate:console", "test:providers:ci"
  - add engines: "node": ">=18.0.0" for modern console features

ELECTRON_MAIN:
  - add: Console mode detection in main process startup
  - integrate: Headless configuration with virtual display setup
  - preserve: All existing provider initialization and IPC setup

PROVIDER_SYSTEM:
  - integrate: Direct provider access without renderer process dependency
  - enhance: Provider-specific validation checks (token renewal, API connectivity)
  - preserve: All existing Result<T> patterns and health check methods

GITHUB_ACTIONS:
  - add: Console mode validation in CI/CD pipeline
  - integrate: Provider health checks before deployment
  - use: Exit codes for automated decision making

DOCUMENTATION:
  - add: Console mode usage instructions in README
  - document: Command-line flags and exit code meanings
  - provide: AI agent integration examples
```

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run after each console file creation - fix before proceeding
npm run lint                         # ESLint with console file patterns
npm run type-check                   # TypeScript validation for console modules
npm run format                       # Prettier formatting

# Console-specific validation
npx tsc --noEmit src/console/*.ts    # Type check console modules
npx eslint src/console/ --fix        # Lint console code
npx eslint src/shared/cli/ --fix     # Lint CLI utilities

# Expected: Zero errors. Console modules follow existing patterns.
```

### Level 2: Unit Tests (Component Validation)

```bash
# Test console components individually
npm run test __tests__/console/ConsoleApp.test.ts
npm run test __tests__/console/ProviderValidator.test.ts
npm run test __tests__/console/ConsoleLogger.test.ts

# Integration testing with provider system
npm run test __tests__/initialization/ # Ensure no regression in provider initialization
npm run test __tests__/providers/      # Ensure provider compatibility

# Exit code validation
node -e "
const { ExitCodes } = require('./dist/console/ExitCodes.js');
console.log('Exit codes defined:', Object.keys(ExitCodes).length > 5);
process.exit(0);
"

# Expected: All tests pass, console modules properly tested with mocked providers
```

### Level 3: Integration Testing (System Validation)

```bash
# Console mode execution validation
npm run debug:providers --timeout=30 &
CONSOLE_PID=$!
sleep 35  # Allow timeout + buffer
kill -0 $CONSOLE_PID 2>/dev/null && echo "Console mode should have exited" || echo "Console mode exited properly"

# Structured output validation
npm run debug:providers:json | jq '.type' | head -5
# Should output: "provider_result" entries followed by "validation_summary"

# Exit code validation for different scenarios
npm run debug:providers --providers=nonexistent; echo "Exit code: $?"
# Should exit with code 3 (configuration error)

# Provider-specific validation
npm run debug:gmail --verbose | grep -o '"status":"[^"]*"' | sort | uniq
# Should show provider status values

# AI agent parsing simulation
npm run debug:providers:json > /tmp/provider_output.json
jq '.type == "validation_summary"' /tmp/provider_output.json
# Should output: true (indicating valid JSON structure)

# Timeout handling validation
timeout 10 npm run debug:providers --timeout=20
echo "Timeout test exit code: $?"
# Should exit cleanly with timeout handling

# Expected: Console mode runs without UI, produces parseable JSON, exits with meaningful codes
```

### Level 4: Creative & Domain-Specific Validation

```bash
# AI Agent Simulation Testing
# Simulate AI agent monitoring console output
npm run debug:providers:json | while read -r line; do
  echo "$line" | jq -r 'select(.type == "provider_result") | "\(.provider): \(.status)"'
done
# Should produce: "gmail: connected", "openai: connected", etc.

# CI/CD Pipeline Simulation
# Test in automated environment without display
DISPLAY= xvfb-run -a npm run validate:console
echo "CI validation exit code: $?"
# Should work without X11 display

# Performance Validation Under Load
# Test console mode performance with multiple rapid invocations
for i in {1..5}; do
  timeout 30 npm run debug:providers:json &
done
wait
# All should complete within timeout

# Memory Usage Validation
# Monitor memory usage during console validation
npm run debug:providers --verbose &
CONSOLE_PID=$!
while kill -0 $CONSOLE_PID 2>/dev/null; do
  ps -p $CONSOLE_PID -o pid,vsz,rss,comm
  sleep 5
done
# Memory should remain stable, not grow excessively

# Token Renewal Validation (Gmail-specific)
# Test token renewal handling in console mode
# (Requires valid but near-expired Gmail tokens)
npm run debug:gmail --verbose | grep -i "token.*renew"
# Should show token renewal attempts and results

# Cross-platform Validation
# Test on different platforms (if available)
npm run debug:providers # Should work on macOS, Linux, Windows

# JSON Schema Validation
# Validate output conforms to expected schema
npm run debug:providers:json | jq '.type, .timestamp, .results' > /dev/null
echo "JSON validation: $?"
# Should exit 0 (valid JSON structure)

# Expected: AI agents can parse output, CI/CD integration works, performance acceptable
```

## Final Validation Checklist

### Technical Validation

- [ ] All 4 validation levels completed successfully
- [ ] All tests pass: `npm run test`
- [ ] No linting errors: `npm run lint`
- [ ] No type errors: `npm run type-check`
- [ ] Console mode runs without UI: `npm run debug:providers`
- [ ] Structured JSON output parseable by AI agents
- [ ] Exit codes properly indicate different failure types
- [ ] Headless mode works without display server

### Feature Validation

- [ ] AI agents can run `npm run debug:providers` and parse output
- [ ] All provider status visible in console without DevTools
- [ ] Token renewal attempts logged with success/failure details
- [ ] Complete validation cycle completes in <30 seconds
- [ ] Command-line flags control provider selection and output format
- [ ] Exit codes enable automated decision making (0=success, 1=auth, 2=network, etc.)
- [ ] Verbose mode provides detailed initialization flow and timing

### Code Quality Validation

- [ ] Follows existing BaseProvider patterns and Result<T> error handling
- [ ] File placement matches desired codebase tree structure
- [ ] No breaking changes to existing provider implementations
- [ ] Console code only active when --console flag used
- [ ] All console utilities properly typed with TypeScript strict mode
- [ ] JSON output consistent and parseable across all scenarios
- [ ] Provider initialization preserved in both UI and console modes

### Documentation & Deployment

- [ ] Console mode usage documented with command examples
- [ ] Exit code meanings documented for automation integration
- [ ] AI agent integration examples provided
- [ ] Command-line flags documented with help text
- [ ] CI/CD pipeline integration instructions available

---

## Anti-Patterns to Avoid

- ❌ Don't assume Electron works without display - use xvfb or virtual display
- ❌ Don't mix JSON output with plain text - AI agents need consistent parsing
- ❌ Don't use generic exit codes - use specific codes for different failure types
- ❌ Don't break existing provider patterns when adding console support
- ❌ Don't timeout without cleanup - ensure providers shut down properly
- ❌ Don't log sensitive data in console output - sanitize tokens and credentials
- ❌ Don't ignore provider Result<T> patterns - console mode must handle errors consistently
