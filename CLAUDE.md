# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Smart Inbox Janitor is an AI-powered email triage assistant built as an Electron desktop application. It helps users clean their Gmail inbox safely through intelligent classification and bulk operations. The project uses a provider-agnostic architecture with TypeScript throughout.

**Key Technologies**: Electron, React, TypeScript, SQLite (better-sqlite3), Gmail API, OpenAI API

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

The application uses a clean provider pattern with three main categories:

1. **EmailProvider** (`src/providers/email/`) - Gmail API integration (future: IMAP)
2. **LLMProvider** (`src/providers/llm/`) - OpenAI GPT-4o-mini (future: Claude, local)
3. **StorageProvider** (`src/providers/storage/`) - SQLite with encryption (future: IndexedDB)

### Project Structure

```
src/
├── main/           # Electron main process (Node.js)
├── renderer/       # React UI (browser context)
├── preload/        # Secure IPC bridge
├── shared/         # Shared types and utilities
│   ├── types/      # TypeScript interfaces
│   ├── schemas/    # Zod validation schemas
│   ├── factories/  # Test data factories
│   └── utils/      # Shared utilities
└── providers/      # Provider implementations
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

When implementing new providers, follow existing patterns:

1. Extend the appropriate base interface (`EmailProvider`, `LLMProvider`, `StorageProvider`)
2. Implement all required methods with proper return types
3. Use the `Result` pattern consistently
4. Add comprehensive error handling with appropriate error types
5. Include health checks and graceful shutdown

### Security Considerations

- **Never log or expose sensitive data** (tokens, emails, API keys)
- Use the `CredentialEncryption` service for secure token storage
- All database operations use parameterized queries
- Implement proper rate limiting for external APIs

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

### Database Issues

- Check encryption setup if database won't open
- Use `healthCheck()` methods to diagnose provider issues
- Check migrations if schema errors occur

### Provider Issues

- All providers must implement the `Result` pattern
- Use `healthCheck()` to verify provider status
- Check configuration objects match expected interfaces

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

### Log Analysis

- Security audit logs in database
- Console logging available (warn level in production)
- Error tracking through Result pattern
- Performance metrics collection available
