# TrashMailPanda Tests

This directory contains the test suite for TrashMailPanda, including unit tests, integration tests, and platform-specific tests.

## Test Structure

### Categories

- **Unit**: Fast, isolated unit tests with no external dependencies
- **Integration**: Tests that verify interactions between components
- **Security**: Tests focused on security functionality and encryption
- **Platform**: Platform-specific tests that only run on their target platforms
- **CrossPlatform**: Tests that run on all platforms but may behave differently

### Platform-Specific Testing

The application uses platform-specific security implementations:

- **Windows**: DPAPI (Data Protection API)
- **macOS**: Keychain Services
- **Linux**: libsecret/GNOME Keyring

#### Platform Test Structure

```
Integration/
├── Platform/
│   ├── WindowsDpapiIntegrationTests.cs    # Windows DPAPI tests
│   ├── MacOSKeychainIntegrationTests.cs   # macOS Keychain tests
│   └── LinuxLibSecretIntegrationTests.cs  # Linux libsecret tests
└── SecureStorageIntegrationTests.cs       # Cross-platform tests
```

#### Custom Test Attributes

- `[PlatformSpecificFact(OSPlatform.Windows)]` - Only runs on Windows
- `[PlatformSpecificFact(OSPlatform.OSX)]` - Only runs on macOS
- `[PlatformSpecificFact(OSPlatform.Linux)]` - Only runs on Linux
- `[PlatformSpecificTheory(...)]` - Theory version for parameterized tests

#### Platform Detection Utilities

The `PlatformTestHelper` class provides utilities for platform-specific testing:

- `GetCurrentPlatform()` - Returns current platform name
- `IsCurrentPlatform(params OSPlatform[])` - Checks if current platform matches
- `IsWindowsDpapiAvailable()` - Checks Windows DPAPI availability
- `IsMacOSKeychainAvailable()` - Checks macOS Keychain availability
- `IsLinuxLibSecretAvailable()` - Checks Linux libsecret availability
- `GetPlatformSpecificTimeout()` - Returns appropriate timeout for platform
- `GetExpectedEncryptionMethod()` - Returns expected encryption method name

## Running Tests

### All Tests
```bash
dotnet test
```

### By Category
```bash
# Unit tests only
dotnet test --filter "Category=Unit"

# Integration tests only
dotnet test --filter "Category=Integration"

# Security tests only
dotnet test --filter "Category=Security"

# Platform-specific tests only
dotnet test --filter "Category=Platform"

# Cross-platform tests only
dotnet test --filter "Category=CrossPlatform"
```

### By Platform
```bash
# Windows platform tests only
dotnet test --filter "Platform=Windows"

# macOS platform tests only
dotnet test --filter "Platform=macOS"

# Linux platform tests only
dotnet test --filter "Platform=Linux"
```

### Combined Filters
```bash
# Integration tests for a specific platform
dotnet test --filter "Category=Integration&Platform=Windows"

# Security tests excluding platform-specific
dotnet test --filter "Category=Security&Category!=Platform"
```

## CI/CD Integration

### GitHub Actions Workflows

1. **ci.yml** - Main CI/CD pipeline with cross-platform testing
2. **platform-integration-tests.yml** - Dedicated platform-specific integration tests

### Platform Matrix

The CI/CD pipeline runs tests on:
- **Windows**: windows-latest with DPAPI tests
- **macOS**: macos-latest with Keychain tests  
- **Linux**: ubuntu-latest with libsecret tests (headless setup)

### Environment Setup

Each platform has specific setup requirements in CI/CD:

#### Windows
- No additional setup (DPAPI available by default)
- Timeout: 30 seconds

#### macOS  
- Keychain Services available by default
- May require keychain unlock in some scenarios
- Timeout: 60 seconds (allows for potential user interaction)

#### Linux
- Requires libsecret installation: `libsecret-1-0 libsecret-1-dev libsecret-tools`
- Requires keyring daemon: `gnome-keyring`
- Headless keyring setup for CI environment
- Timeout: 45 seconds

## Test Data and Cleanup

### Test Credentials
- All test credentials use prefixed names like `test-`, `integration-`, `concurrent-`
- Test data includes Unicode, special characters, and large payloads
- Cleanup is performed in test disposal methods

### Platform Persistence
- **Windows DPAPI**: Encrypted data tied to user account, automatically cleaned
- **macOS Keychain**: Entries may persist, manual cleanup may be needed in development
- **Linux libsecret**: Entries stored in keyring, cleaned during test execution

## Troubleshooting

### Windows Tests
- DPAPI tests should always pass on Windows
- If failing, check user permissions and Windows version

### macOS Tests  
- Tests may skip if keychain is locked
- In development, you may be prompted to allow keychain access
- Failed tests often indicate keychain access issues

### Linux Tests
- Tests may skip if libsecret is not installed
- Tests may skip in headless environments without proper keyring setup
- Check gnome-keyring daemon status if tests fail

### Common Issues
- **Timeout errors**: Platform-specific operations taking longer than expected
- **Permission errors**: Keychain/keyring access denied
- **Missing dependencies**: Platform security libraries not installed
- **CI/CD environment**: Headless environments may lack required services

## Coverage

Platform-specific tests contribute to overall code coverage but are measured separately:
- Cross-platform tests provide baseline coverage
- Platform-specific tests provide additional platform validation
- Combined coverage ensures comprehensive security testing

## Development Guidelines

1. **Add platform traits** to new platform-specific tests
2. **Use appropriate timeouts** for platform operations  
3. **Handle graceful failures** in CI/CD environments
4. **Clean up test artifacts** in disposal methods
5. **Document platform requirements** for new security features
6. **Test Unicode and special characters** for international support
7. **Verify thread safety** for concurrent operations
8. **Test error conditions** and edge cases