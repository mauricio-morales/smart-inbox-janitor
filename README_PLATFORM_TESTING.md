# Multi-Platform Testing Setup

This setup allows developers to test platform-specific functionality locally using Docker containers, regardless of their host operating system.

## Quick Start

### For All Developers (Linux/macOS/Windows):
```bash
# Test cross-platform functionality
./scripts/run-cross-platform-tests.sh

# Test Linux-specific libsecret integration
./scripts/run-linux-tests.sh
```

### VS Code Integration
- `Cmd+Shift+P` → "Tasks: Run Task" → **🐳 Multi-Platform Docker Tests**
- `Cmd+Shift+P` → "Tasks: Run Task" → **🐧 Linux Platform Tests**
- `Cmd+Shift+P` → "Tasks: Run Task" → **🔄 Full Platform Test Suite**

## Platform Coverage

| Platform | Local Testing | CI/CD Testing | Docker Support |
|----------|---------------|---------------|----------------|
| **Linux (libsecret)** | ✅ Docker | ✅ Native Ubuntu runners | ✅ Full support |
| **Windows (DPAPI)** | ⚠️ Windows hosts only | ✅ Native Windows runners | ⚠️ Windows containers only |
| **macOS (Keychain)** | ✅ macOS hosts only | ✅ Native macOS runners | ❌ Not possible |
| **Cross-Platform** | ✅ Docker | ✅ All runners | ✅ Full support |

## Developer Benefits

### 🐧 **Linux Developers**
- ✅ Test Windows functionality via CI/CD
- ✅ Test macOS functionality via CI/CD  
- ✅ Test Linux libsecret via Docker
- ✅ Full local cross-platform testing

### 🪟 **Windows Developers**
- ✅ Test Windows DPAPI locally
- ✅ Test Linux libsecret via Docker
- ✅ Test macOS functionality via CI/CD
- ✅ Full local cross-platform testing

### 🍎 **macOS Developers**
- ✅ Test macOS Keychain locally
- ✅ Test Linux libsecret via Docker
- ✅ Test Windows functionality via CI/CD
- ✅ Full local cross-platform testing

## Architecture

The CI/CD uses **native platform runners** for authentic testing:
- `ubuntu-latest` → Native Linux + libsecret
- `windows-latest` → Native Windows + DPAPI
- `macos-latest` → Native macOS + Keychain Services

The Docker setup enables **local cross-platform development**:
- Any developer can test Linux libsecret functionality
- Any developer can run cross-platform tests
- Consistent environment regardless of host OS

## Files Added

```
docker/
├── Dockerfile.linux-tests       # Linux + libsecret container
├── Dockerfile.windows-tests     # Windows + DPAPI container (Windows hosts only)

scripts/
├── run-cross-platform-tests.sh  # Cross-platform tests via Docker
├── run-linux-tests.sh          # Linux libsecret tests via Docker  
├── run-macos-tests.sh           # Native macOS tests
└── run-windows-tests.ps1        # Windows container tests

.github/workflows/
└── docker-platform-tests.yml    # Optional Docker-based CI workflow

docs/
└── PLATFORM_TESTING.md          # Comprehensive documentation

docker-compose.tests.yml         # Docker orchestration
README_PLATFORM_TESTING.md       # This file
```

This setup ensures robust platform testing while maintaining developer productivity across different development environments.