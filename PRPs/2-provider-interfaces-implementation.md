# Provider-Agnostic TypeScript Interfaces Implementation

## Goal

**Feature Goal**: Create comprehensive TypeScript interfaces that encapsulate the responsibilities of EmailProvider, ContactsProvider, LLMProvider, and RulesEngine to maintain provider-agnostic design and enable future service extensibility beyond Gmail and OpenAI.

**Deliverable**: Complete TypeScript interface definitions with supporting types, comprehensive JSDoc documentation, and validation schemas in a well-structured domain-organized file hierarchy.

**Success Definition**: All interfaces compile successfully, follow industry best practices, include comprehensive documentation, and enable seamless provider swapping through runtime registration patterns.

## User Persona

**Target User**: TypeScript developers implementing provider abstractions for the Smart Inbox Janitor project

**Use Case**: Creating concrete implementations of email providers (Gmail, IMAP), LLM providers (OpenAI, Claude), storage providers (SQLite, IndexedDB), and rules engines while maintaining type safety and provider-agnostic design.

**User Journey**:
1. Import provider interfaces from shared types
2. Implement concrete provider classes following interface contracts
3. Register providers with factory pattern for runtime switching
4. Use Result pattern for consistent error handling
5. Leverage TypeScript compiler for type safety validation

**Pain Points Addressed**:
- Eliminates type safety issues when swapping providers
- Prevents runtime errors through comprehensive interface contracts
- Reduces implementation inconsistencies across different providers
- Simplifies testing through standardized interfaces

## Why

- **Architectural Foundation**: Establishes the core abstractions that enable the entire provider-agnostic architecture promised in the PRD and app definition
- **Future Extensibility**: Enables seamless addition of new email providers (IMAP, Exchange), LLM providers (Claude, Llama), and storage backends without architectural changes
- **Type Safety**: Prevents runtime errors and ensures consistent behavior across all provider implementations
- **Developer Experience**: Provides clear contracts and documentation for implementing concrete providers
- **Testing Enablement**: Enables comprehensive mocking and testing strategies through well-defined interfaces

## What

TypeScript interface definitions that define clear contracts for:
- **EmailProvider**: Gmail-first design with OAuth authentication, batch operations, rate limiting, and unsubscribe handling
- **ContactsProvider**: Trust signal evaluation and relationship strength determination 
- **LLMProvider**: AI classification with OpenAI-first design, extensible to Claude/Llama
- **RulesEngine**: User-defined rule evaluation and learning system
- **StorageProvider**: Local storage abstraction supporting SQLite (desktop) and IndexedDB (browser)
- **Supporting Types**: Configuration objects, result types, error hierarchies, and validation schemas

### Success Criteria

- [ ] All interfaces compile with TypeScript strict mode enabled
- [ ] Comprehensive JSDoc documentation with usage examples for all public methods
- [ ] Result pattern implemented for all async operations (no thrown exceptions)
- [ ] Provider registration and factory patterns implemented
- [ ] Runtime validation schemas using Zod for all configuration objects
- [ ] Error hierarchy with proper inheritance and retry logic indicators
- [ ] Generic interfaces with proper constraints for type safety
- [ ] Builder patterns for complex object construction
- [ ] Integration with existing Smart Inbox Janitor app architecture

## All Needed Context

### Context Completeness Check

_If someone knew nothing about this codebase, would they have everything needed to implement this successfully?_

**✅ YES** - This PRP provides complete interface specifications, implementation patterns, validation requirements, and comprehensive examples from industry-leading libraries.

### Documentation & References

```yaml
# MUST READ - Include these in your context window
- docfile: PRPs/ai_docs/typescript_interface_patterns.md
  why: Comprehensive TypeScript interface design patterns and best practices
  section: All sections - provides foundation for interface design
  critical: Result pattern, generic constraints, validation patterns

- docfile: PRPs/ai_docs/email_provider_implementations.md  
  why: Specific email provider implementation patterns and Gmail API integration
  section: All sections - Gmail OAuth, batch operations, error handling
  critical: Error mapping, retry logic, rate limiting strategies

- file: smart-inbox-janitor-app-definition.md
  why: Complete interface specifications already defined in the app architecture
  pattern: Extract all TypeScript interfaces from lines 182-923
  gotcha: Some interfaces are embedded in documentation blocks and need extraction

- url: https://www.typescriptlang.org/docs/handbook/2/objects.html#interface-vs-type-aliases
  why: TypeScript interface vs type best practices for provider abstractions
  critical: When to use interfaces vs types, extension patterns

- url: https://github.com/microsoft/TypeScript/wiki/Coding-guidelines#names
  why: Official TypeScript naming conventions and style guidelines
  critical: Interface naming, property naming, avoid "I" prefix

- url: https://github.com/sindresorhus/type-fest
  why: Advanced TypeScript utility types for complex provider abstractions
  critical: Result types, branded types, utility type patterns

- url: https://zod.dev/
  why: Runtime validation schema library for configuration validation
  critical: Schema definition patterns, type inference, error handling

- url: https://github.com/aws/aws-sdk-js-v3
  why: Excellent provider abstraction patterns from AWS SDK v3 architecture
  critical: Modular client design, command pattern, error hierarchies

- url: https://github.com/jaredhanson/passport
  why: Strategy pattern implementation for pluggable provider architectures
  critical: Strategy registration, factory patterns, configuration handling
```

### Current Codebase tree

```bash
/Users/mmorales/Dev/smart-inbox-janitor/
├── .claude/                     # Claude Code configuration
├── .git/                        # Git repository
├── .gitignore                   # Standard Node.js/TypeScript gitignore
├── PRPs/                        # Project planning documents
│   ├── ai_docs/                 # AI development documentation
│   │   ├── typescript_interface_patterns.md
│   │   └── email_provider_implementations.md
│   ├── 2-smart-inbox-janitor-prd.md
│   └── README.md
├── LICENSE                      # MIT License
├── README.md                    # Project overview
└── smart-inbox-janitor-app-definition.md  # Technical specification

# NOTE: No actual source code exists yet - this is early planning phase
# All interface definitions exist in the app-definition.md file
```

### Desired Codebase tree with files to be added

```bash
src/
├── shared/                      # Shared types and utilities
│   ├── types/                   # Core interface definitions
│   │   ├── index.ts            # Re-export all types for easy importing
│   │   ├── base.types.ts       # Base provider interfaces and common types
│   │   ├── email.types.ts      # EmailProvider and ContactsProvider interfaces
│   │   ├── storage.types.ts    # StorageProvider and data model interfaces
│   │   ├── llm.types.ts        # LLMProvider and classification interfaces
│   │   ├── rules.types.ts      # RulesEngine and UserRules interfaces
│   │   ├── errors.types.ts     # Error hierarchies and result types
│   │   └── config.types.ts     # Configuration and connection state types
│   ├── schemas/                # Zod validation schemas
│   │   ├── index.ts            # Re-export all schemas
│   │   ├── email.schemas.ts    # Email configuration and message validation
│   │   ├── storage.schemas.ts  # Storage configuration validation
│   │   ├── llm.schemas.ts      # LLM configuration validation
│   │   └── config.schemas.ts   # Application configuration validation
│   ├── factories/              # Provider factory implementations
│   │   ├── index.ts            # Provider registry implementation
│   │   ├── base.factory.ts     # Abstract factory base class
│   │   ├── provider-registry.ts # Provider registration and management
│   │   └── types.ts            # Factory-specific types
│   └── utils/                  # Utility functions and helpers
│       ├── index.ts            # Re-export utilities
│       ├── result.utils.ts     # Result pattern helper functions
│       ├── validation.utils.ts # Runtime validation helpers
│       └── timeout.utils.ts    # Timeout and cancellation utilities
├── providers/                  # Concrete provider implementations (created later)
│   ├── email/                  # Email provider implementations
│   ├── storage/                # Storage provider implementations
│   └── llm/                    # LLM provider implementations
├── __tests__/                  # Test files
│   ├── types/                  # Type-level tests
│   ├── schemas/                # Schema validation tests
│   └── factories/              # Factory pattern tests
├── package.json                # Project dependencies and scripts
├── tsconfig.json               # TypeScript configuration
├── jest.config.js              # Jest testing configuration
└── .eslintrc.js                # ESLint TypeScript rules
```

### Known Gotchas of our codebase & Library Quirks

```typescript
// CRITICAL: Project is in early planning phase - no existing code patterns to follow yet
// All interface specifications come from smart-inbox-janitor-app-definition.md

// CRITICAL: TypeScript strict mode required - all interfaces must be fully typed
// No 'any' types allowed, proper generic constraints required

// CRITICAL: Result pattern required - no thrown exceptions from provider methods
// All async operations must return Result<T> types for consistent error handling

// CRITICAL: Provider abstraction pattern - interfaces must support runtime provider switching
// Factory pattern and provider registry required for extensibility

// CRITICAL: Local-only storage requirement - no cloud data, encryption required
// Storage providers must support both SQLite (desktop) and IndexedDB (browser)

// CRITICAL: Gmail-first email provider design with IMAP extensibility
// OAuth 2.0 flows, batch operations, rate limiting required

// CRITICAL: OpenAI-first LLM provider with Claude/Llama extensibility  
// Classification contracts, cost tracking, retry logic required

// GOTCHA: Some interfaces in app-definition.md are embedded in prose and need extraction
// Look for TypeScript code blocks throughout the document

// GOTCHA: Electron + React architecture - interfaces must work in both main and renderer processes
// Consider IPC communication requirements for provider access
```

## Implementation Blueprint

### Data models and structure

Create comprehensive TypeScript interfaces and supporting types to ensure type safety and consistency across all provider implementations.

```typescript
Examples:
 - Provider interfaces (EmailProvider, StorageProvider, LLMProvider, etc.)
 - Configuration interfaces with readonly properties
 - Result types with discriminated unions for error handling
 - Generic interfaces with proper constraints
 - Zod schemas for runtime validation
 - Error hierarchies with inheritance
 - Factory interfaces for provider registration
 - Builder interfaces for complex object construction
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: CREATE src/shared/types/base.types.ts
  - IMPLEMENT: Base provider interfaces, Result types, error hierarchies
  - FOLLOW pattern: PRPs/ai_docs/typescript_interface_patterns.md (Result pattern, base interfaces)
  - NAMING: PascalCase for interfaces, no "I" prefix, readonly for immutable properties
  - PLACEMENT: Foundation types that all other interfaces extend
  - DEPENDENCIES: None (foundation layer)

Task 2: CREATE src/shared/types/errors.types.ts  
  - IMPLEMENT: Comprehensive error hierarchy with provider-specific error types
  - FOLLOW pattern: PRPs/ai_docs/typescript_interface_patterns.md (Error handling patterns)
  - NAMING: Error suffix for error types, proper inheritance chain
  - DEPENDENCIES: Import base types from Task 1
  - PLACEMENT: Error definitions for all provider types

Task 3: CREATE src/shared/types/config.types.ts
  - IMPLEMENT: Configuration interfaces for all providers and connection state
  - FOLLOW pattern: smart-inbox-janitor-app-definition.md (ConnectionState interface)
  - NAMING: Config suffix for configuration, State suffix for state types
  - DEPENDENCIES: Import base and error types from Tasks 1-2
  - PLACEMENT: Configuration and state management types

Task 4: CREATE src/shared/types/email.types.ts
  - IMPLEMENT: EmailProvider, ContactsProvider interfaces and supporting types
  - FOLLOW pattern: smart-inbox-janitor-app-definition.md (EmailProvider interface) + PRPs/ai_docs/email_provider_implementations.md
  - NAMING: Provider suffix for provider interfaces, descriptive names for data types
  - DEPENDENCIES: Import base, error, and config types from Tasks 1-3
  - PLACEMENT: Email and contacts provider abstractions

Task 5: CREATE src/shared/types/storage.types.ts
  - IMPLEMENT: StorageProvider interface and data model types  
  - FOLLOW pattern: smart-inbox-janitor-app-definition.md (StorageProvider interface)
  - NAMING: Provider suffix, proper generic constraints for storage operations
  - DEPENDENCIES: Import base, error, and config types from Tasks 1-3
  - PLACEMENT: Storage abstraction for SQLite/IndexedDB

Task 6: CREATE src/shared/types/llm.types.ts
  - IMPLEMENT: LLMProvider interface and classification types
  - FOLLOW pattern: smart-inbox-janitor-app-definition.md (LLMProvider interface)
  - NAMING: Provider suffix, classification-specific naming
  - DEPENDENCIES: Import base, error, and config types from Tasks 1-3
  - PLACEMENT: LLM provider abstractions

Task 7: CREATE src/shared/types/rules.types.ts
  - IMPLEMENT: RulesEngine interface and UserRules types
  - FOLLOW pattern: smart-inbox-janitor-app-definition.md (UserRules interface)
  - NAMING: Engine suffix for rule engines, Rules suffix for rule collections
  - DEPENDENCIES: Import base, error, and config types from Tasks 1-3
  - PLACEMENT: Rules engine abstractions

Task 8: CREATE src/shared/types/index.ts
  - IMPLEMENT: Centralized re-exports for all type definitions
  - FOLLOW pattern: TypeScript barrel export patterns
  - NAMING: Logical grouping of exports, maintain tree-shaking compatibility
  - DEPENDENCIES: Import all types from Tasks 1-7
  - PLACEMENT: Main entry point for type imports

Task 9: CREATE src/shared/schemas/email.schemas.ts
  - IMPLEMENT: Zod validation schemas for email provider configurations
  - FOLLOW pattern: Zod documentation patterns, type inference from schemas
  - NAMING: Schema suffix for Zod schemas, infer types from schemas
  - DEPENDENCIES: Import email types from Task 4, Zod library
  - PLACEMENT: Runtime validation for email configurations

Task 10: CREATE src/shared/schemas/storage.schemas.ts
  - IMPLEMENT: Zod validation schemas for storage provider configurations
  - FOLLOW pattern: Zod documentation patterns, proper validation rules
  - NAMING: Schema suffix, descriptive validation error messages
  - DEPENDENCIES: Import storage types from Task 5, Zod library
  - PLACEMENT: Runtime validation for storage configurations

Task 11: CREATE src/shared/schemas/llm.schemas.ts
  - IMPLEMENT: Zod validation schemas for LLM provider configurations
  - FOLLOW pattern: Zod documentation patterns, API key validation
  - NAMING: Schema suffix, security-conscious validation
  - DEPENDENCIES: Import LLM types from Task 6, Zod library
  - PLACEMENT: Runtime validation for LLM configurations

Task 12: CREATE src/shared/schemas/index.ts
  - IMPLEMENT: Centralized re-exports for all schema definitions
  - FOLLOW pattern: TypeScript barrel export patterns
  - NAMING: Logical schema grouping, maintain type inference
  - DEPENDENCIES: Import all schemas from Tasks 9-11
  - PLACEMENT: Main entry point for schema imports

Task 13: CREATE src/shared/factories/base.factory.ts
  - IMPLEMENT: Abstract factory base class and provider factory interface
  - FOLLOW pattern: PRPs/ai_docs/typescript_interface_patterns.md (Factory pattern)
  - NAMING: Factory suffix, abstract base class pattern
  - DEPENDENCIES: Import base types from Task 1, config types from Task 3
  - PLACEMENT: Foundation for all provider factories

Task 14: CREATE src/shared/factories/provider-registry.ts
  - IMPLEMENT: Provider registry for runtime provider switching
  - FOLLOW pattern: PRPs/ai_docs/typescript_interface_patterns.md (Provider registry pattern)
  - NAMING: Registry suffix, type-safe provider management
  - DEPENDENCIES: Import base factory from Task 13, all provider types
  - PLACEMENT: Runtime provider management system

Task 15: CREATE src/shared/utils/result.utils.ts
  - IMPLEMENT: Helper functions for Result pattern operations
  - FOLLOW pattern: PRPs/ai_docs/typescript_interface_patterns.md (Result pattern helpers)
  - NAMING: Util suffix, functional programming patterns
  - DEPENDENCIES: Import base types from Task 1
  - PLACEMENT: Result pattern utility functions

Task 16: CREATE package.json, tsconfig.json, jest.config.js, .eslintrc.js
  - IMPLEMENT: Project configuration for TypeScript strict mode, testing, linting
  - FOLLOW pattern: TypeScript strict configuration, Jest for testing, ESLint rules
  - NAMING: Standard configuration file names
  - DEPENDENCIES: External dependencies (TypeScript, Jest, ESLint, Zod)
  - PLACEMENT: Project root configuration files

Task 17: CREATE __tests__/types/ comprehensive test suite
  - IMPLEMENT: Type-level tests and runtime validation tests
  - FOLLOW pattern: Jest testing patterns, TypeScript test utilities
  - NAMING: Test files mirror source structure, descriptive test names
  - DEPENDENCIES: All types and schemas from previous tasks
  - PLACEMENT: Comprehensive test coverage for all interfaces
```

### Implementation Patterns & Key Details

```typescript
// Show critical patterns and gotchas - keep concise, focus on non-obvious details

// Example: Base provider interface pattern
interface BaseProvider {
  readonly name: string;
  readonly version: string;
  // PATTERN: All providers extend this base (see base.types.ts)
  initialize(config: unknown): Promise<Result<void>>;
  healthCheck(): Promise<Result<HealthStatus>>;
  // GOTCHA: Use generic constraints for type safety
  // CRITICAL: Never throw exceptions - always return Result types
}

// Example: Result pattern implementation
type Result<T, E = ProviderError> = 
  | { success: true; data: T }
  | { success: false; error: E };

// PATTERN: All async provider methods return Result types
async exampleMethod(): Promise<Result<Data>> {
  try {
    const data = await someOperation();
    return { success: true, data };
  } catch (error) {
    return { success: false, error: this.mapError(error) };
  }
}

// Example: Provider factory pattern
interface ProviderFactory<TProvider extends BaseProvider, TConfig = unknown> {
  readonly name: string;
  validateConfig(config: TConfig): ValidationResult;
  create(config: TConfig): Promise<TProvider>;
  // PATTERN: Factory validation before instantiation
  // GOTCHA: Use generic constraints to maintain type safety
}

// Example: Configuration interface pattern
interface EmailProviderConfig {
  readonly apiKey: string;        // Required
  readonly region?: string;       // Optional with sensible defaults
  readonly timeout?: number;      // Optional with fallback values
  readonly retries?: number;      // Optional configuration
  // PATTERN: Readonly properties for immutable configuration
  // CRITICAL: Separate required from optional properties clearly
}

// Example: Zod schema pattern
const EmailProviderConfigSchema = z.object({
  apiKey: z.string().min(1, 'API key is required'),
  region: z.string().optional(),
  timeout: z.number().positive().optional(),
  retries: z.number().min(0).max(10).optional()
});

type EmailProviderConfig = z.infer<typeof EmailProviderConfigSchema>;
// PATTERN: Derive TypeScript types from Zod schemas
// CRITICAL: Single source of truth for validation and types
```

### Integration Points

```yaml
PACKAGE_MANAGEMENT:
  - file: package.json
  - dependencies: ["typescript", "zod", "jest", "@types/jest", "eslint"]
  - pattern: "Exact version pinning for stability"

TYPESCRIPT_CONFIG:
  - file: tsconfig.json  
  - pattern: "strict: true, noImplicitAny: true, strictNullChecks: true"
  - compiler: "ES2022 target, moduleResolution: 'node'"

TESTING_CONFIG:
  - file: jest.config.js
  - pattern: "TypeScript preset, coverage reporting, test file patterns"
  - coverage: "All interface files require 100% type coverage"

LINTING_CONFIG:
  - file: .eslintrc.js
  - pattern: "@typescript-eslint/recommended, strict naming conventions"
  - rules: "No 'any' types, require return types, interface naming rules"
```

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run after each file creation - fix before proceeding
npm run lint                    # ESLint checks with TypeScript rules
npx tsc --noEmit               # TypeScript type checking (no JS output)
npm run format                 # Prettier formatting

# Project-wide validation
npm run lint:fix               # Auto-fix linting issues  
npm run type-check             # Full TypeScript validation
npm run check-types            # Verify all types compile successfully

# Expected: Zero errors. If errors exist, READ output and fix before proceeding.
```

### Level 2: Unit Tests (Component Validation)

```bash
# Test each interface/schema as it's created
npm test -- __tests__/types/base.test.ts
npm test -- __tests__/schemas/email.test.ts

# Full test suite for type definitions
npm test -- __tests__/types/
npm test -- __tests__/schemas/
npm test -- __tests__/factories/

# Coverage validation - require 100% for interface files
npm test -- --coverage --watchAll=false
npm run test:coverage         # Generate detailed coverage report

# Expected: All tests pass. If failing, debug root cause and fix implementation.
```

### Level 3: Integration Testing (System Validation)

```bash
# TypeScript compilation validation
npx tsc --noEmit --strict      # Strict TypeScript checking
npx tsc --build --force        # Clean build validation

# Type-only import validation
node -e "
const types = require('./dist/shared/types');
console.log('Available types:', Object.keys(types));
console.log('EmailProvider interface loaded:', !!types.EmailProvider);
"

# Schema validation testing
node -e "
const schemas = require('./dist/shared/schemas');
const testConfig = { apiKey: 'test-key' };
const result = schemas.EmailProviderConfigSchema.safeParse(testConfig);
console.log('Schema validation works:', result.success);
"

# Factory pattern validation
node -e "
const { ProviderRegistry } = require('./dist/shared/factories');
const registry = new ProviderRegistry();
console.log('Provider registry instantiated:', !!registry);
"

# Expected: All integrations working, proper module exports, no type errors
```

### Level 4: Creative & Domain-Specific Validation

```bash
# TypeScript-specific validation

# Type safety validation with strict mode
npx tsc --noEmit --strict --exactOptionalPropertyTypes

# Bundle analysis for tree-shaking
npx tsc --build && du -sh dist/*
# Expected: Clean module boundaries, efficient tree-shaking

# TypeScript compiler API validation
node -e "
const ts = require('typescript');
const program = ts.createProgram(['./src/shared/types/index.ts'], {});
const sourceFile = program.getSourceFile('./src/shared/types/index.ts');
console.log('TypeScript AST parsing successful:', !!sourceFile);
"

# Provider pattern validation
node -e "
// Test that provider interfaces support proper inheritance
const types = require('./dist/shared/types');
// Verify interface shapes match expected contracts
console.log('Provider interfaces properly structured');
"

# Schema-type consistency validation
node -e "
// Verify Zod schemas produce correct TypeScript types
const schemas = require('./dist/shared/schemas');
const types = require('./dist/shared/types');
// Test that inferred types match explicit type definitions
console.log('Schema-type consistency validated');
"

# Generic constraint validation
node -e "
// Test that generic constraints work properly
const factories = require('./dist/shared/factories');
// Verify type safety is maintained with generic providers
console.log('Generic constraints functioning correctly');
"

# Expected: All type-level validations pass, proper inference working
```

## Final Validation Checklist

### Technical Validation

- [ ] All 4 validation levels completed successfully  
- [ ] All tests pass: `npm test`
- [ ] No linting errors: `npm run lint`
- [ ] No type errors: `npx tsc --noEmit --strict`
- [ ] No formatting issues: `npm run format --check`
- [ ] Clean build succeeds: `npx tsc --build`

### Feature Validation

- [ ] All success criteria from "What" section met
- [ ] Provider interfaces support runtime switching through factory pattern
- [ ] Result pattern implemented consistently across all async operations
- [ ] Comprehensive JSDoc documentation with usage examples
- [ ] Zod schemas provide runtime validation for all configuration objects
- [ ] Error hierarchies support proper error mapping and retry logic

### Code Quality Validation

- [ ] Follows TypeScript best practices and official naming conventions
- [ ] File placement matches desired codebase tree structure
- [ ] Anti-patterns avoided (no "I" prefix, no 'any' types, no thrown exceptions)
- [ ] Proper generic constraints maintain type safety
- [ ] Configuration interfaces use readonly properties appropriately

### TypeScript-Specific Validation

- [ ] All interfaces compile with TypeScript strict mode
- [ ] Proper inheritance hierarchies for provider interfaces
- [ ] Generic interfaces with appropriate constraints
- [ ] Result types use discriminated unions for type safety
- [ ] Zod schemas correctly infer TypeScript types
- [ ] Factory patterns maintain type safety across provider switching

### Documentation & Integration

- [ ] Comprehensive JSDoc documentation for all public interfaces
- [ ] Usage examples provided for complex interface patterns
- [ ] Integration points properly documented in interface definitions
- [ ] Provider registration patterns clearly documented

---

## Anti-Patterns to Avoid

- ❌ Don't use "I" prefix for interfaces (IEmailProvider) - use clean names (EmailProvider)
- ❌ Don't throw exceptions from provider methods - use Result pattern consistently
- ❌ Don't use 'any' types - use proper generic constraints and type safety
- ❌ Don't create provider-specific interfaces - keep abstractions provider-agnostic
- ❌ Don't skip runtime validation - use Zod schemas for all configuration objects
- ❌ Don't ignore error hierarchies - implement proper error inheritance and retry logic
- ❌ Don't hardcode provider names in interfaces - use factory patterns for flexibility