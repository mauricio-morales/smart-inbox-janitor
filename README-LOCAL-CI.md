# 🚀 Local CI/CD Validation Guide

This guide helps you run comprehensive CI/CD validation locally before pushing to GitHub, ensuring your changes will pass the remote CI pipeline.

## 📋 Quick Start

### VS Code Integration (Recommended)

1. **Open Command Palette** (`Cmd+Shift+P` on macOS, `Ctrl+Shift+P` on Windows/Linux)
2. Type "Tasks: Run Task"
3. Select one of the available CI tasks:

#### Available Tasks:

- **🔍 Full CI/CD Check** - Complete validation matching GitHub Actions
- **⚡ Quick Check** - Fast validation (build, test, format-check)
- **🧪 Code Quality Check** - Code analysis, formatting, testing
- **🏗️ Build All Targets** - Multi-platform .NET builds
- **🔐 Security Audit** - Dependency and security scanning
- **📦 Package Check** - NuGet package validation
- **🧽 Clean & Restore** - Reset build environment

#### Keyboard Shortcuts:

- `Ctrl+Shift+C` - Full CI/CD Check
- `Ctrl+Shift+Q` - Quick Check
- `Ctrl+Shift+T` - Code Quality Check
- `Ctrl+Shift+B` - Build All Targets
- `Ctrl+Shift+S` - Security Audit

### Command Line Usage

#### Full Validation (Recommended before push):

```bash
dotnet build --configuration Release && dotnet test --configuration Release
```

#### Quick Validation:

```bash
dotnet build && dotnet test --no-build
```

#### Individual Steps:

```bash
dotnet format --verify-no-changes  # Code quality only
dotnet build --configuration Release  # Build validation
dotnet list package --vulnerable     # Security audit
dotnet restore --force-evaluate      # Package validation
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

- **EditorConfig & .NET Format** - Code style and formatting
- **C# Compiler** - Type checking and compilation
- **Roslyn Analyzers** - Code analysis and best practices
- **Dependencies** - NuGet package resolution and conflicts

### 2. Build Process ✅

- **.NET Build** - Application compilation and IL generation
- **Avalonia Build** - XAML compilation and resource embedding
- **Platform Builds** - Multi-OS .NET publishing (optional)

### 3. Testing ✅

- **xUnit** - Unit and integration tests
- **Coverage** - Code coverage reporting with coverlet
- **Model Tests** - C# type and interface validation

### 4. Security & Dependencies ✅

- **NPM Audit** - Vulnerability scanning
- **Dependency Check** - Package integrity
- **Outdated Packages** - Update recommendations

## 🎯 CI/CD Pipeline Matching

The local validation closely matches the GitHub Actions CI pipeline:

| CI Step         | Local Command              | Description              |
| --------------- | -------------------------- | ------------------------ |
| Setup .NET      | `dotnet restore`           | Fresh dependency install |
| Format Check    | `dotnet format --verify-no-changes` | Code formatting validation |
| Build           | `dotnet build`             | C# compilation           |
| Test            | `dotnet test`              | xUnit test execution     |
| Security Audit  | `dotnet list package --vulnerable` | Vulnerability scan |
| Platform Builds | `dotnet publish -r <rid>`  | Multi-OS publishing      |

## 🚨 Common Issues & Solutions

### Code Analysis Errors

```bash
dotnet build          # See compiler errors and warnings
dotnet format --verify-no-changes # Check formatting
```

### Compilation Errors

```bash
dotnet build          # See compilation errors
# Fix manually in VS Code or Visual Studio with IntelliSense
```

### Formatting Issues

```bash
dotnet format --verify-no-changes  # Check formatting
dotnet format         # Fix formatting
```

### Dependency Conflicts

```bash
dotnet clean          # Clean build output
dotnet restore --force-evaluate # Fresh restore
```

### Build Failures

```bash
dotnet clean          # Clear build artifacts  
dotnet build          # Rebuild
```

### Security Vulnerabilities

```bash
dotnet list package --vulnerable      # View vulnerabilities
dotnet add package <PackageName>      # Update to secure version
# Review package updates manually
```

## 💡 Development Workflow

### Before Each Commit:

```bash
dotnet build && dotnet test --no-build  # Fast validation
```

### Before Push to Main:

```bash
dotnet build --configuration Release && dotnet test --configuration Release  # Full validation
```

### After Dependency Changes:

```bash
dotnet clean && dotnet restore --force-evaluate  # Fresh environment test
dotnet list package --vulnerable                # Security validation
```

### Before Release:

```bash
.\scripts\local-ci.ps1 -Full    # Complete validation with builds
```

## 🔍 Debugging Failed Validations

### View Detailed Output:

- VS Code: Check Terminal panel for detailed logs
- Command line: Add `--verbosity detailed` to dotnet commands for more info

### Common Debug Steps:

1. **Clean Environment**: `dotnet clean && dotnet restore`
2. **Check Dependencies**: `dotnet list package --vulnerable`
3. **Validate Individual Steps**: Run each CI command separately
4. **Review Recent Changes**: `git diff` to see what changed

## ⚡ Performance Tips

- Use **Quick Check** during active development
- Use **Full CI/CD Check** before important commits  
- Run **Clean & Restore** weekly or after major dependency changes
- Use VS Code tasks for integrated experience

## 🎊 Success Indicators

When validation passes, you should see:

- ✅ All code formatting rules passed
- ✅ C# compilation successful
- ✅ All builds completed
- ✅ No security vulnerabilities
- ✅ All tests passed

**You're ready to push!** 🚀

The GitHub Actions CI pipeline should now pass without issues.
