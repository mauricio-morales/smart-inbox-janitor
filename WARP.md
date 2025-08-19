# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

Smart Inbox Janitor is an AI-powered email triage assistant focused on Gmail-first support with extensible architecture for other email providers. The app helps users clean their mailbox through intelligent automation using GPT-4o-mini for classification, SQLite for local storage, and Electron + React + TypeScript for the desktop interface.

## Architecture

### Core Components
- **Email Provider Interface**: Gmail API integration with extensible interface for future IMAP support
- **LLM Provider Interface**: OpenAI GPT-4o-mini with pluggable interface for future Claude/Llama support
- **Storage Provider Interface**: SQLite with encrypted credentials, designed for future IndexedDB compatibility
- **Action Queue System**: Robust batch processing with rate limiting and retry logic

### Project Structure
```
smart-inbox-janitor/
├── src/
│   ├── main/          # Electron main process
│   ├── renderer/      # React UI components  
│   ├── shared/        # Shared types and utilities
│   └── providers/     # Email, LLM, and storage providers
├── migrations/        # Database schema migrations
├── PRPs/              # Product Requirement Prompts for AI development
└── docs/             # Additional documentation
```

## Development Commands

Since this project is in the specification phase without implemented code yet, standard commands would be:

```bash
# Install dependencies (when package.json exists)
npm install

# Development server (when implemented)
npm run dev

# Build for production (when implemented)  
npm run build

# Run tests (when implemented)
npm test

# Type checking (when implemented)
npm run type-check

# Linting (when implemented)
npm run lint

# Database migrations (when implemented)
npm run migrate

# Start Electron app (when implemented)
npm run electron:dev
```

## Development Approach

### Product Requirement Prompts (PRPs)
This project uses the PRP (Product Requirement Prompt) methodology for AI-assisted development:

- **PRPs Directory**: Contains structured prompts that supply AI coding agents with comprehensive context
- **Key PRP Files**:
  - `prp_base.md`: Core functionality specifications
  - `prp_base_typescript.md`: TypeScript-specific implementation guidelines
  - `prp_poc_react.md`: React proof-of-concept specifications
  - `prp_task.md`: Task template for breaking down implementation

### Implementation Strategy

**Phase 1: Core Foundation**
- Gmail OAuth integration with embedded authentication
- GPT-4o-mini email classification system
- SQLite local storage with encrypted credential management
- Basic email processing workflow with batch operations

**Phase 2: Enhanced UX**  
- Advanced bulk operations with undo capability
- Rule management interface for learning system
- Progress analytics and cost tracking
- Performance optimization and rate limiting

**Phase 3: Extensibility**
- IMAP support for other email providers
- Additional LLM backends (Claude, local Ollama)
- Browser-based version using IndexedDB
- Mobile companion app

## Technology Stack

### Core Technologies
- **Framework**: Electron + React + TypeScript
- **Database**: SQLite with better-sqlite3
- **Authentication**: Google OAuth with OS keychain storage
- **Build System**: Vite with electron-builder
- **UI Framework**: TailwindCSS with modern components
- **State Management**: Zustand with persistence

### Development Dependencies (Planned)
- `electron`: Desktop app framework
- `better-sqlite3`: High-performance SQLite with Node.js
- `keytar`: Secure credential storage using OS keychain
- `googleapis`: Official Google API client for Gmail integration
- `electron-builder`: App packaging and distribution
- `vite`: Fast build tool and dev server
- `electron-vite`: Vite integration for Electron

## Key Development Principles

### Security & Privacy
- **Local-first architecture**: All processing happens on user's device
- **Encrypted storage**: Credentials secured with OS keychain
- **No remote logging**: Email content never sent to external services
- **Minimal LLM context**: Only essential data sent for classification
- **Reversible actions**: Everything can be undone from Gmail trash

### Email Classification System
The AI categorizes emails into six types:
- **Keep**: Important emails from contacts, receipts, 2FA codes
- **Newsletter**: Legitimate newsletters with List-Unsubscribe headers  
- **Promotion**: Marketing emails and promotional content
- **Spam**: Unwanted bulk emails, mass mailings
- **Dangerous**: Phishing attempts, credential harvesting, malicious content
- **Unknown**: Uncertain classifications requiring manual review

### Supported Actions
- **KEEP**: Preserve important emails
- **UNSUBSCRIBE_AND_DELETE**: Safely unsubscribe then delete
- **DELETE_ONLY**: Move to trash without unsubscribing
- **REPORT_DANGEROUS**: Report phishing/spam then delete

## Development Guidelines

### Code Quality
- Follow TypeScript strict mode for type safety
- Use React best practices with functional components and hooks
- Implement proper error boundaries and loading states
- Design provider interfaces for extensibility

### Testing Strategy
- Unit tests for email classification logic
- Integration tests for Gmail API interactions
- E2E tests for critical user workflows
- Mock LLM responses for consistent testing

### Performance Considerations
- Batch processing for efficient API usage
- Rate limiting to respect Gmail API quotas
- Lazy loading for large email lists
- Background processing with progress tracking

## Database Schema

Key tables for persistent state management:
- `user_rules`: Learning system rules (always_keep, auto_trash, weights)
- `email_metadata`: Classification results and user actions
- `processing_state`: Resumable session state across app restarts
- `action_queue`: Queued email actions with retry logic
- `classification_history`: Analytics and learning feedback

## Getting Started

1. **Read the App Definition**: Start with `smart-inbox-janitor-app-definition.md` for comprehensive system specifications
2. **Review PRPs**: Check `PRPs/` directory for detailed implementation guidance
3. **Understand Architecture**: Focus on provider interfaces for extensibility
4. **Set Up Development Environment**: Install Node.js, configure TypeScript, set up Electron
5. **Implement Core Interfaces**: Start with storage and email provider abstractions
6. **Build Authentication Flow**: Implement Gmail OAuth with secure token storage
7. **Create Classification Pipeline**: Integrate OpenAI GPT-4o-mini for email analysis
8. **Develop UI Components**: Build React components for email triage interface

## Important Notes

- The project prioritizes safety with explicit user approval for all destructive actions
- All email processing uses sanitized content (no remote image/script loading)
- The learning system adapts to user preferences over time
- Cost optimization uses GPT-4o-mini for affordable large-scale processing
- Architecture supports future expansion to other email providers and LLM backends
