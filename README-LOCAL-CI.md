# 🚀 Local CI/CD Validation Guide

This guide helps you run comprehensive CI/CD validation locally before pushing to GitHub, ensuring your changes will pass the remote CI pipeline.

## 📋 Quick Start

### VS Code Integration (Recommended)

1. **Open Command Palette** (`Cmd+Shift+P` on macOS, `Ctrl+Shift+P` on Windows/Linux)
2. Type "Tasks: Run Task"
3. Select one of the available CI tasks:

#### Available Tasks:

- **🔍 Full CI/CD Check** - Complete validation matching GitHub Actions
- **⚡ Quick Check** - Fast validation (lint, type-check, build)
- **🧪 Code Quality Check** - Linting, type checking, formatting
- **🏗️ Build All Targets** - Multi-platform Electron builds
- **🔐 Security Audit** - Dependency and security scanning
- **📦 Package Check** - Dependency validation
- **🧽 Clean & Fresh Install** - Reset environment

#### Keyboard Shortcuts:

- `Ctrl+Shift+C` - Full CI/CD Check
- `Ctrl+Shift+Q` - Quick Check
- `Ctrl+Shift+T` - Code Quality Check
- `Ctrl+Shift+B` - Build All Targets
- `Ctrl+Shift+S` - Security Audit

### Command Line Usage

#### Full Validation (Recommended before push):

```bash
npm run ci:check
```

#### Quick Validation:

```bash
npm run ci:quick
```

#### Individual Steps:

```bash
npm run ci:quality    # Code quality only
npm run ci:build      # Build validation
npm run ci:security   # Security audit
npm run ci:package    # Dependency check
```

#### Shell Script (Advanced):

```bash
# Standard validation
./scripts/local-ci.sh

# Clean install + validation
./scripts/local-ci.sh --clean

# Full validation with platform builds
./scripts/local-ci.sh --full
```

## 🔧 What Gets Validated

### 1. Code Quality ✅

- **ESLint** - Code style and potential issues
- **TypeScript** - Type checking and compilation
- **Prettier** - Code formatting consistency
- **Dependencies** - Package resolution and conflicts

### 2. Build Process ✅

- **Vite Build** - Renderer process bundling
- **Electron Build** - Main/preload process compilation
- **Platform Builds** - Multi-OS Electron packaging (optional)

### 3. Testing ✅

- **Jest** - Unit and integration tests
- **Coverage** - Code coverage reporting (when available)
- **Type Tests** - TypeScript interface validation

### 4. Security & Dependencies ✅

- **NPM Audit** - Vulnerability scanning
- **Dependency Check** - Package integrity
- **Outdated Packages** - Update recommendations

## 🎯 CI/CD Pipeline Matching

The local validation closely matches the GitHub Actions CI pipeline:

| CI Step         | Local Command              | Description              |
| --------------- | -------------------------- | ------------------------ |
| Setup Node      | `npm ci`                   | Fresh dependency install |
| Lint            | `npm run lint`             | ESLint validation        |
| Type Check      | `npm run type-check`       | TypeScript compilation   |
| Format Check    | `npm run format:check`     | Prettier validation      |
| Test            | `npm run test`             | Jest test execution      |
| Build           | `npm run build`            | Vite/Electron build      |
| Security Audit  | `npm audit`                | Vulnerability scan       |
| Platform Builds | `npm run build:electron:*` | Multi-OS packaging       |

## 🚨 Common Issues & Solutions

### ESLint Errors

```bash
npm run lint          # See errors
npm run lint -- --fix # Auto-fix issues
```

### TypeScript Errors

```bash
npm run type-check    # See type errors
# Fix manually in VS Code with IntelliSense
```

### Formatting Issues

```bash
npm run format:check  # Check formatting
npm run format        # Fix formatting
```

### Dependency Conflicts

```bash
npm run ci:clean      # Fresh install
npm run ci:deps-check # Validate dependencies
```

### Build Failures

```bash
npm run clean         # Clear build artifacts
npm run build         # Rebuild
```

### Security Vulnerabilities

```bash
npm audit                    # View vulnerabilities
npm audit fix                # Auto-fix low severity
npm audit fix --force        # Force fix (review changes)
```

## 💡 Development Workflow

### Before Each Commit:

```bash
npm run ci:quick      # Fast validation
```

### Before Push to Main:

```bash
npm run ci:check      # Full validation
```

### After Dependency Changes:

```bash
npm run ci:clean      # Fresh environment test
npm run ci:security   # Security validation
```

### Before Release:

```bash
./scripts/local-ci.sh --full    # Complete validation with builds
```

## 🔍 Debugging Failed Validations

### View Detailed Output:

- VS Code: Check Terminal panel for detailed logs
- Command line: Remove `> /dev/null 2>&1` from failing commands

### Common Debug Steps:

1. **Clean Environment**: `npm run ci:clean`
2. **Check Dependencies**: `npm run ci:deps-check`
3. **Validate Individual Steps**: Run each CI command separately
4. **Review Recent Changes**: `git diff` to see what changed

## ⚡ Performance Tips

- Use **Quick Check** during active development
- Use **Full CI/CD Check** before important commits
- Run **Clean Install** weekly or after major dependency changes
- Use VS Code tasks for integrated experience

## 🎊 Success Indicators

When validation passes, you should see:

- ✅ All linting rules passed
- ✅ TypeScript compilation successful
- ✅ All builds completed
- ✅ No security vulnerabilities
- ✅ All tests passed (when available)

**You're ready to push!** 🚀

The GitHub Actions CI pipeline should now pass without issues.
