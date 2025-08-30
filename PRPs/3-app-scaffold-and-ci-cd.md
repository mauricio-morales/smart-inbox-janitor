# Initialize App Scaffold and CI/CD Pipeline

## Goal

**Feature Goal**: Create a complete, production-ready Electron + React + TypeScript application scaffold with comprehensive CI/CD pipeline that enables rapid development of the Smart Inbox Janitor desktop application.

**Deliverable**: Fully functional development environment with main/renderer processes, build pipeline, code quality tools, and automated CI/CD workflows that build cross-platform distributions.

**Success Definition**: Developer can run `npm run dev` to launch a working Electron app with React UI, all linting/testing passes, and CI/CD pipeline successfully builds and tests on all target platforms (Windows, macOS, Linux).

## User Persona

**Target User**: Full-stack developers building the Smart Inbox Janitor application

**Use Case**: Setting up a modern desktop application development environment that supports Gmail integration, AI classification, and cross-platform distribution

**User Journey**:

1. Clone repository
2. Run `npm install`
3. Run `npm run dev` → Electron app launches with React UI
4. Make code changes → Hot reload works
5. Push to GitHub → CI pipeline runs tests and builds artifacts
6. Create release tag → Automated distribution to GitHub releases

**Pain Points Addressed**: Eliminates complex Electron + React setup, prevents build configuration issues, ensures code quality consistency, automates testing and distribution

## Why

- **Business Value**: Enables rapid development of the core Smart Inbox Janitor desktop application with professional development workflow
- **Integration**: Leverages existing provider interfaces and type system while adding the missing application layer
- **Problems Solved**: Eliminates the complex setup of Electron + React + TypeScript + CI/CD pipeline that often causes weeks of development delays

## What

A complete application scaffold that transforms the current backend-focused codebase into a fully functional desktop application with modern development workflow.

### Success Criteria

- [ ] Electron main process successfully launches and creates application window
- [ ] React renderer process loads with Material-UI components and routing
- [ ] Hot module replacement works for both main and renderer processes
- [ ] All linting, formatting, and type checking passes without errors
- [ ] Jest tests run successfully with proper coverage reporting
- [ ] GitHub Actions CI/CD pipeline builds successfully for Windows, macOS, and Linux
- [ ] Code signing configuration is ready for distribution (placeholder certificates)
- [ ] Auto-update mechanism is configured and testable

## All Needed Context

### Context Completeness Check

_This PRP provides everything needed to implement a complete Electron app scaffold from the current backend-only codebase, including specific file patterns, configurations, and validation steps._

### Documentation & References

```yaml
- url: https://electron-vite.org/guide/
  why: Modern build tool configuration patterns for Electron + Vite + TypeScript
  critical: electron.vite.config.ts structure and process separation

- url: https://www.electronjs.org/docs/latest/tutorial/tutorial-prerequisites
  why: Official Electron architecture patterns and security best practices
  critical: Main/renderer/preload process communication patterns

- url: https://github.com/alex8088/electron-vite/tree/master/packages/create-electron
  why: Project scaffolding patterns and directory structure
  critical: Proper src/main, src/preload, src/renderer organization

- file: /Users/mmorales/Dev/smart-inbox-janitor/package.json
  why: Existing build scripts and electron-builder configuration to preserve
  pattern: Build scripts and electron-builder settings are already configured
  gotcha: Must preserve existing provider dependencies (googleapis, keytar, better-sqlite3)

- file: /Users/mmorales/Dev/smart-inbox-janitor/tsconfig.json
  why: Existing TypeScript configuration with path mapping to extend
  pattern: Strict typing with path aliases for @shared/* and @providers/*
  gotcha: Must maintain compatibility with existing provider interfaces

- file: /Users/mmorales/Dev/smart-inbox-janitor/src/shared/types/index.ts
  why: Complete type system that must be imported into Electron processes
  pattern: Result<T> pattern for error handling across all provider operations
  gotcha: IPC communication must preserve type safety for provider interfaces

- docfile: PRPs/ai_docs/electron_vite_patterns.md
  why: Electron-Vite configuration patterns and TypeScript setup
  section: Configuration structure and security best practices

- docfile: PRPs/ai_docs/electron_react_architecture.md
  why: Modern Electron + React architecture patterns and IPC communication
  section: Process separation and secure API bridge patterns
```

### Current Codebase Tree

```bash
smart-inbox-janitor/
├── PRPs/                           # Project requirements and docs
├── __tests__/                      # Jest test infrastructure (EXISTS)
├── src/
│   ├── providers/                  # Provider interfaces (EMPTY - needs implementation)
│   └── shared/                     # Complete type system (EXISTS)
│       ├── types/                  # Comprehensive interfaces (COMPLETE)
│       ├── schemas/                # Zod validation schemas (EXISTS)
│       └── utils/                  # Shared utilities (EMPTY)
├── package.json                    # Electron + build scripts configured (EXISTS)
├── tsconfig.json                   # Strict TypeScript config (EXISTS)
├── jest.config.js                  # Test configuration (EXISTS - needs fixes)
└── .eslintrc.js                    # ESLint configuration (EXISTS - needs fixes)
```

### Desired Codebase Tree with Files to be Added

```bash
smart-inbox-janitor/
├── electron.vite.config.ts         # Electron-Vite build configuration
├── src/
│   ├── main/                       # Electron main process
│   │   ├── index.ts                # Main process entry point
│   │   ├── window.ts               # BrowserWindow management
│   │   ├── ipc.ts                  # IPC handler setup
│   │   ├── security.ts             # Security policy configuration
│   │   └── menu.ts                 # Application menu
│   ├── preload/                    # Preload scripts
│   │   ├── index.ts                # Secure IPC bridge
│   │   └── types.ts                # Renderer-side type definitions
│   ├── renderer/                   # React application
│   │   ├── index.html              # HTML template
│   │   ├── src/
│   │   │   ├── main.tsx            # React entry point
│   │   │   ├── App.tsx             # Root component with routing
│   │   │   ├── components/         # Reusable UI components
│   │   │   │   ├── Layout/         # App layout components
│   │   │   │   ├── EmailList/      # Email listing components
│   │   │   │   └── ConnectionStatus/ # Provider connection status
│   │   │   ├── pages/              # Route-based page components
│   │   │   │   ├── Dashboard/      # Main email triage interface
│   │   │   │   ├── Settings/       # Configuration interface
│   │   │   │   └── Onboarding/     # Setup wizard
│   │   │   ├── hooks/              # Custom React hooks
│   │   │   │   ├── useElectronAPI.ts # Electron API wrapper
│   │   │   │   └── useEmailQueries.ts # React Query integration
│   │   │   ├── contexts/           # React context providers
│   │   │   │   └── AppContext.tsx  # Global application state
│   │   │   └── utils/              # Renderer utilities
│   │   └── tsconfig.json           # Renderer TypeScript config
│   └── providers/                  # Provider implementations (PLACEHOLDER STUBS)
│       ├── email/
│       │   └── gmail/
│       │       └── GmailProvider.ts # Stub implementation
│       ├── llm/
│       │   └── openai/
│       │       └── OpenAIProvider.ts # Stub implementation
│       └── storage/
│           └── sqlite/
│               └── SQLiteProvider.ts # Stub implementation
├── .github/
│   └── workflows/
│       ├── ci.yml                  # Continuous integration pipeline
│       ├── release.yml             # Release automation
│       └── security.yml            # Security scanning
├── .prettierrc.json                # Prettier configuration
├── .editorconfig                   # Editor consistency
└── .husky/                         # Git hooks
    ├── pre-commit                  # Pre-commit linting
    └── commit-msg                  # Commit message validation
```

### Known Gotchas & Library Quirks

```typescript
// CRITICAL: Electron-Vite requires external native dependencies in build config
// example: better-sqlite3, keytar must be externalized
export default defineConfig({
  main: {
    build: {
      rollupOptions: {
        external: ['better-sqlite3', 'keytar', 'googleapis'],
      },
    },
  },
});

// CRITICAL: IPC communication must preserve Result<T> type safety
// Pattern from existing codebase - all provider methods return Result<T>
const result = await window.electronAPI.email.list(options);
if (result.success) {
  // result.data is typed correctly
} else {
  // result.error contains ProviderError
}

// GOTCHA: React components in Electron need explicit base URL for assets
// Context isolation prevents direct file:// access to assets

// CRITICAL: Path aliases must be consistent across main/preload/renderer
// Existing tsconfig.json has @shared/* and @providers/* mappings

// GOTCHA: Main process modules like 'googleapis' cannot be imported in renderer
// Must use IPC communication for all provider operations
```

## Implementation Blueprint

### Data Models and Structure

The existing type system is complete and comprehensive. The scaffold will leverage existing interfaces:

```typescript
// Existing types to be used throughout application
import type {
  EmailProvider,
  StorageProvider,
  LLMProvider,
  Result,
  EmailSummary,
  EmailClassification,
  UserRules,
} from '@shared/types';

// New types needed for Electron IPC
interface ElectronAPI {
  email: {
    list: (options?: ListOptions) => Promise<Result<ListEmailsResult>>;
    get: (emailId: string) => Promise<Result<EmailFull>>;
    batchModify: (request: BatchModifyRequest) => Promise<Result<BatchOperationResult>>;
  };
  storage: {
    getUserRules: () => Promise<Result<UserRules>>;
    updateUserRules: (rules: UserRules) => Promise<Result<void>>;
  };
  llm: {
    classify: (input: ClassifyInput) => Promise<Result<ClassifyOutput>>;
  };
}
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: CREATE electron.vite.config.ts
  - IMPLEMENT: Multi-process Vite configuration for main/preload/renderer
  - FOLLOW pattern: PRPs/ai_docs/electron_vite_patterns.md (basic configuration)
  - NAMING: Default export with main/preload/renderer process configs
  - EXTERNAL: better-sqlite3, keytar, googleapis for main process
  - PLACEMENT: Root directory

Task 2: CREATE src/main/index.ts
  - IMPLEMENT: Electron main process entry point with app lifecycle
  - FOLLOW pattern: PRPs/ai_docs/electron_react_architecture.md (main process patterns)
  - NAMING: Main process follows Electron conventions
  - DEPENDENCIES: Import window management and IPC setup
  - PLACEMENT: Main process directory

Task 3: CREATE src/main/window.ts
  - IMPLEMENT: BrowserWindow creation and management
  - FOLLOW pattern: PRPs/ai_docs/electron_react_architecture.md (window management)
  - NAMING: createMainWindow function export
  - SECURITY: Context isolation enabled, node integration disabled
  - PLACEMENT: Main process directory

Task 4: CREATE src/preload/index.ts
  - IMPLEMENT: Secure IPC bridge using contextBridge
  - FOLLOW pattern: PRPs/ai_docs/electron_react_architecture.md (secure API bridge)
  - NAMING: ElectronAPI interface exposed to renderer
  - TYPE_SAFETY: Preserve Result<T> pattern from existing provider interfaces
  - PLACEMENT: Preload directory

Task 5: CREATE src/main/ipc.ts
  - IMPLEMENT: IPC handlers for provider operations
  - FOLLOW pattern: PRPs/ai_docs/electron_react_architecture.md (IPC communication)
  - NAMING: setupIPC function with provider instances
  - INTEGRATION: Use existing provider interfaces from @shared/types
  - PLACEMENT: Main process directory

Task 6: CREATE src/renderer/index.html
  - IMPLEMENT: HTML template for React application
  - FOLLOW pattern: Standard Electron renderer HTML with CSP headers
  - CSP: Secure content security policy for external API access
  - ENTRY: React mount point and Vite script injection
  - PLACEMENT: Renderer root

Task 7: CREATE src/renderer/src/main.tsx
  - IMPLEMENT: React application entry point with providers
  - FOLLOW pattern: PRPs/ai_docs/electron_react_architecture.md (React entry)
  - PROVIDERS: Material-UI ThemeProvider, React Query, React Router
  - NAMING: Standard React main.tsx entry point
  - PLACEMENT: Renderer src directory

Task 8: CREATE src/renderer/src/App.tsx
  - IMPLEMENT: Root React component with routing
  - FOLLOW pattern: PRPs/ai_docs/electron_react_architecture.md (main app component)
  - ROUTING: React Router with Dashboard, Settings, Onboarding routes
  - LAYOUT: Material-UI layout components
  - PLACEMENT: Renderer src directory

Task 9: CREATE src/renderer/src/hooks/useElectronAPI.ts
  - IMPLEMENT: React hook wrapper for Electron IPC
  - FOLLOW pattern: PRPs/ai_docs/electron_react_architecture.md (React hook patterns)
  - TYPE_SAFETY: Strongly typed wrapper preserving Result<T> pattern
  - ERROR_HANDLING: Convert Result<T> errors to thrown exceptions
  - PLACEMENT: Renderer hooks directory

Task 10: CREATE src/providers/email/gmail/GmailProvider.ts
  - IMPLEMENT: Stub Gmail provider implementation
  - FOLLOW pattern: src/shared/types/email.types.ts (EmailProvider interface)
  - METHODS: Implement all required interface methods with placeholder logic
  - RETURN_TYPE: Always return Result<T> with success: false, error: "Not implemented"
  - PLACEMENT: Email provider directory

Task 11: FIX .eslintrc.js configuration
  - MODIFY: Fix missing @typescript-eslint dependencies and configuration errors
  - FIND pattern: Current .eslintrc.js has correct structure but missing deps
  - INSTALL: @typescript-eslint/eslint-plugin@latest @typescript-eslint/parser@latest
  - PRESERVE: Existing naming conventions and custom rules
  - VALIDATE: Run eslint with no errors

Task 12: FIX jest.config.js configuration
  - MODIFY: Fix moduleNameMapping typo and Jest configuration errors
  - FIND pattern: Current jest.config.js has correct structure but config errors
  - CHANGE: moduleNameMapping → moduleNameMapping
  - PRESERVE: Existing coverage thresholds and path mappings
  - VALIDATE: Jest runs without configuration errors

Task 13: CREATE .prettierrc.json
  - IMPLEMENT: Prettier configuration for consistent formatting
  - SETTINGS: semi: true, singleQuote: true, trailingComma: es5
  - INTEGRATION: Compatible with existing ESLint rules
  - PLACEMENT: Root directory

Task 14: CREATE .github/workflows/ci.yml
  - IMPLEMENT: Comprehensive CI pipeline for testing and building
  - FOLLOW pattern: PRPs/ai_docs/electron_ci_patterns.md (CI/CD workflows)
  - MATRIX: Windows, macOS, Linux builds with Node.js 18, 20
  - JOBS: Lint, test, type-check, build for all platforms
  - PLACEMENT: GitHub workflows directory

Task 15: CREATE .github/workflows/release.yml
  - IMPLEMENT: Automated release pipeline with electron-builder
  - FOLLOW pattern: PRPs/ai_docs/electron_ci_patterns.md (release automation)
  - TRIGGER: Git tags matching v*
  - ARTIFACTS: Cross-platform distributable packages
  - PLACEMENT: GitHub workflows directory

Task 16: CREATE basic React page components
  - IMPLEMENT: Dashboard, Settings, Onboarding page stubs
  - FOLLOW pattern: Material-UI component patterns
  - ROUTING: Proper React Router integration
  - STATE: Basic component state without complex business logic
  - PLACEMENT: Renderer pages directory

Task 17: CREATE development npm scripts
  - MODIFY: package.json to add development and testing scripts
  - SCRIPTS: dev, build, preview, test:fix, lint:fix, format, type-check
  - INTEGRATION: Electron-vite commands for development workflow
  - PRESERVE: Existing build scripts for electron-builder
```

### Implementation Patterns & Key Details

```typescript
// Electron-Vite Configuration Pattern
export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        external: ['better-sqlite3', 'keytar', 'googleapis'],
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src'),
        '@shared': resolve('src/shared'),
        '@providers': resolve('src/providers'),
      },
    },
    plugins: [react()],
  },
});

// IPC Type-Safe Communication Pattern
// CRITICAL: Must preserve existing Result<T> pattern from provider interfaces
const api: ElectronAPI = {
  email: {
    list: (options) => ipcRenderer.invoke('email:list', options),
    get: (emailId) => ipcRenderer.invoke('email:get', emailId),
  },
};

// React Hook Error Handling Pattern
// PATTERN: Convert Result<T> to thrown exceptions for React Query
const listEmails = useCallback(async (options?: ListOptions) => {
  const result = await window.electronAPI.email.list(options);
  if (result.success) {
    return result.data;
  }
  throw new Error(result.error?.message || 'Failed to list emails');
}, []);

// Stub Provider Implementation Pattern
// RETURN: Consistent Result<T> with not implemented error
export class GmailProviderStub implements EmailProvider {
  async list(options?: ListOptions): Promise<Result<ListEmailsResult>> {
    return createErrorResult(new ConfigurationError('GmailProvider not implemented yet'));
  }
}
```

### Integration Points

```yaml
ELECTRON_BUILDER:
  - preserve: Existing build configuration in package.json
  - extend: Add development scripts for electron-vite workflow

TYPESCRIPT:
  - extend: Create process-specific tsconfig.json files
  - preserve: Existing path mappings and strict configuration

MATERIAL_UI:
  - add: Theme provider and component library setup
  - integrate: With existing application design requirements

REACT_ROUTER:
  - configure: Routes for Dashboard, Settings, Onboarding
  - integrate: With Material-UI layout components

GITHUB_ACTIONS:
  - matrix: Multi-platform builds (Windows, macOS, Linux)
  - cache: Node modules and electron dependencies for speed
```

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Fix configuration errors first
npm install --save-dev @typescript-eslint/eslint-plugin@latest @typescript-eslint/parser@latest

# Run after each major file creation
npm run lint                         # ESLint with auto-fix
npm run type-check                   # TypeScript compilation check
npm run format                       # Prettier formatting

# Expected: Zero linting/typing/formatting errors
```

### Level 2: Unit Tests (Component Validation)

```bash
# Test configuration fixes
npm test                             # Jest should run without config errors

# Test React components as created
npm run test:watch                   # Watch mode for component development

# Test Electron processes
npm run test:main                    # Main process tests (if applicable)
npm run test:renderer                # Renderer process tests

# Expected: All tests pass, no configuration errors
```

### Level 3: Integration Testing (System Validation)

```bash
# Development server validation
npm run dev                          # Electron app should launch with React UI

# Build validation
npm run build                        # All processes should build successfully
npm run build:win                    # Windows build (on Windows or with cross-compilation)
npm run build:mac                    # macOS build (on macOS)
npm run build:linux                  # Linux build

# Hot reload validation
# 1. Run npm run dev
# 2. Modify React component → UI should update without restart
# 3. Modify main process → App should restart automatically

# Expected: App launches, UI loads, hot reload works, builds succeed
```

### Level 4: CI/CD Validation

```bash
# GitHub Actions validation (run locally with act if possible)
# Push to feature branch → CI should run tests and builds

# Release workflow validation
# Create and push tag: git tag v0.1.0 && git push origin v0.1.0
# Release workflow should build and create GitHub release

# Security scanning validation
npm audit                            # Check for vulnerability issues
npm run lint:security                # Security-focused linting

# Expected: CI passes, release artifacts created, no security issues
```

## Final Validation Checklist

### Technical Validation

- [ ] Electron app launches successfully: `npm run dev`
- [ ] React UI loads with Material-UI components and routing
- [ ] Hot module replacement works for renderer changes
- [ ] Main process restarts on changes during development
- [ ] All processes build successfully: `npm run build`
- [ ] No linting errors: `npm run lint`
- [ ] No type errors: `npm run type-check`
- [ ] No formatting issues: `npm run format`
- [ ] Jest runs without configuration errors: `npm test`

### Feature Validation

- [ ] Electron main process creates and manages application window
- [ ] IPC communication works between main and renderer processes
- [ ] React Router navigation works between pages
- [ ] Material-UI theme and components render correctly
- [ ] Provider stub implementations return proper Result<T> types
- [ ] Type safety maintained across process boundaries
- [ ] Security configuration (CSP, context isolation) properly implemented

### CI/CD Validation

- [ ] GitHub Actions CI pipeline runs on push/PR
- [ ] Multi-platform builds succeed (Windows, macOS, Linux)
- [ ] Release pipeline creates distributable packages
- [ ] Code quality checks pass in CI
- [ ] Dependencies and security scanning complete
- [ ] Artifacts properly uploaded and accessible

### Code Quality Validation

- [ ] Follows existing codebase patterns and naming conventions
- [ ] File placement matches desired directory structure
- [ ] ESLint configuration fixed and working
- [ ] Prettier formatting consistent across codebase
- [ ] Jest configuration fixed and tests runnable
- [ ] TypeScript strict mode maintained
- [ ] Provider interfaces properly integrated

### Development Workflow Validation

- [ ] `npm install` → `npm run dev` workflow works for new developers
- [ ] Development server starts quickly with hot reload
- [ ] Build process completes in reasonable time
- [ ] Git hooks prevent commits with linting/formatting issues
- [ ] VS Code/editor integration works with TypeScript and ESLint

---

## Anti-Patterns to Avoid

- ❌ Don't disable context isolation or node integration in renderer
- ❌ Don't import main process modules directly in renderer
- ❌ Don't skip type checking for IPC communication
- ❌ Don't modify existing provider interfaces
- ❌ Don't break existing Result<T> error handling pattern
- ❌ Don't hardcode file paths - use proper path resolution
- ❌ Don't commit with failing linting or type errors
- ❌ Don't create deep component hierarchies without proper organization
- ❌ Don't skip security headers and CSP configuration
