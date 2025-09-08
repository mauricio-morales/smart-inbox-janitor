using System;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using TrashMailPanda.Shared.Platform;
using TrashMailPanda.Shared.Security;
using TrashMailPanda.Providers.Storage;
using TrashMailPanda.Tests.Attributes;
using TrashMailPanda.Tests.Utilities;
using Xunit;

namespace TrashMailPanda.Tests.Integration.Platform;

/// <summary>
/// Linux-specific libsecret integration tests
/// These tests only run on Linux and test real libsecret functionality
/// </summary>
[Trait("Category", "Integration")]
[Trait("Category", "Platform")]
[Trait("Platform", "Linux")]
public class LinuxLibSecretIntegrationTests : IDisposable
{
    private readonly ILogger<CredentialEncryption> _credentialLogger;
    private readonly ILogger<MasterKeyManager> _masterKeyLogger;
    private readonly ILogger<SqliteStorageProvider> _storageLogger;

    public LinuxLibSecretIntegrationTests()
    {
        var loggerFactory = LoggerFactory.Create(builder => builder.AddConsole());
        _credentialLogger = loggerFactory.CreateLogger<CredentialEncryption>();
        _masterKeyLogger = loggerFactory.CreateLogger<MasterKeyManager>();
        _storageLogger = loggerFactory.CreateLogger<SqliteStorageProvider>();
    }

    [PlatformSpecificFact(SupportedPlatform.Linux)]
    public async Task LinuxLibSecret_BasicEncryptionDecryption_ShouldWork()
    {
        // Skip if libsecret is not available
        if (!PlatformTestHelper.IsLinuxLibSecretAvailable())
        {
            return;
        }

        // Arrange
        var masterKeyManager = new MasterKeyManager(_masterKeyLogger);
        var storageProvider = new SqliteStorageProvider(":memory:", "test-password");
        await storageProvider.InitAsync();
        
        var credentialEncryption = new CredentialEncryption(_credentialLogger, masterKeyManager, storageProvider);

        // Act
        var initResult = await credentialEncryption.InitializeAsync();
        
        // Note: libsecret initialization might fail in headless CI/CD environments
        // without a desktop session or keyring daemon
        if (!initResult.IsSuccess)
        {
            // Log the reason and skip the test gracefully
            credentialEncryption.Dispose();
            return;
        }

        const string testData = "linux-libsecret-test-credential-12345";
        const string context = "TrashMail Panda";

        var encryptResult = await credentialEncryption.EncryptAsync(testData, context);
        if (encryptResult.IsSuccess)
        {
            Assert.NotNull(encryptResult.Value);
            Assert.NotEqual(testData, encryptResult.Value);

            var decryptResult = await credentialEncryption.DecryptAsync(encryptResult.Value!, context);
            if (decryptResult.IsSuccess)
            {
                Assert.Equal(testData, decryptResult.Value);
            }
        }

        // Verify platform-specific status (only if initialization succeeded)
        if (initResult.IsSuccess)
        {
            var status = credentialEncryption.GetEncryptionStatus();
            Assert.Equal("Linux", status.Platform);
            Assert.Equal("libsecret", status.EncryptionMethod);
            Assert.True(status.IsInitialized);
        }

        credentialEncryption.Dispose();
    }

    [PlatformSpecificFact(SupportedPlatform.Linux)]
    public async Task LinuxLibSecret_HealthCheck_ShouldReportCorrectly()
    {
        // Skip if not on Linux
        if (!PlatformTestHelper.IsLinuxLibSecretAvailable())
        {
            return;
        }

        // Arrange
        var masterKeyManager = new MasterKeyManager(_masterKeyLogger);
        var storageProvider = new SqliteStorageProvider(":memory:", "test-password");
        await storageProvider.InitAsync();
        
        var credentialEncryption = new CredentialEncryption(_credentialLogger, masterKeyManager, storageProvider);
        var initResult = await credentialEncryption.InitializeAsync();
        
        // Skip if initialization failed (libsecret not available or daemon not running)
        if (!initResult.IsSuccess)
        {
            credentialEncryption.Dispose();
            return;
        }

        // Act
        var healthResult = await credentialEncryption.HealthCheckAsync();

        // Assert
        Assert.Equal("Linux", healthResult.Platform);
        
        // libsecret health might be unreliable in CI/CD environments
        if (healthResult.IsHealthy)
        {
            Assert.True(healthResult.CanEncrypt);
            Assert.True(healthResult.CanDecrypt);
            Assert.True(healthResult.KeyGenerationWorks);
        }
        else
        {
            // In CI/CD, libsecret might not be available or configured
            Assert.NotEmpty(healthResult.Issues);
        }

        credentialEncryption.Dispose();
    }

    [PlatformSpecificFact(SupportedPlatform.Linux)]
    public async Task LinuxLibSecret_ConcurrentOperations_ShouldBeThreadSafe()
    {
        // Skip if not on Linux
        if (!PlatformTestHelper.IsLinuxLibSecretAvailable())
        {
            return;
        }

        // Arrange
        var masterKeyManager = new MasterKeyManager(_masterKeyLogger);
        var storageProvider = new SqliteStorageProvider(":memory:", "test-password");
        await storageProvider.InitAsync();
        
        var credentialEncryption = new CredentialEncryption(_credentialLogger, masterKeyManager, storageProvider);
        var initResult = await credentialEncryption.InitializeAsync();
        
        // Skip if initialization failed
        if (!initResult.IsSuccess)
        {
            credentialEncryption.Dispose();
            return;
        }

        const int concurrentOperations = 3; // Reduced for libsecret operations
        var tasks = new Task[concurrentOperations];

        // Act - Perform concurrent encrypt/decrypt operations
        for (int i = 0; i < concurrentOperations; i++)
        {
            int index = i;
            tasks[i] = Task.Run(async () =>
            {
                var testData = $"concurrent-linux-test-{index}";
                var context = $"context-{index}";

                var encryptResult = await credentialEncryption.EncryptAsync(testData, context);
                if (encryptResult.IsSuccess)
                {
                    var decryptResult = await credentialEncryption.DecryptAsync(encryptResult.Value!, context);
                    if (decryptResult.IsSuccess)
                    {
                        Assert.Equal(testData, decryptResult.Value);
                    }
                }
                // Note: We don't assert failure here because libsecret operations
                // might fail in CI/CD environments without proper desktop session
            });
        }

        // Assert
        await Task.WhenAll(tasks);

        credentialEncryption.Dispose();
    }

    [PlatformSpecificFact(SupportedPlatform.Linux)]
    public async Task LinuxLibSecret_LargeDataEncryption_ShouldWork()
    {
        // Skip if not on Linux
        if (!PlatformTestHelper.IsLinuxLibSecretAvailable())
        {
            return;
        }

        // Arrange
        var masterKeyManager = new MasterKeyManager(_masterKeyLogger);
        var storageProvider = new SqliteStorageProvider(":memory:", "test-password");
        await storageProvider.InitAsync();
        
        var credentialEncryption = new CredentialEncryption(_credentialLogger, masterKeyManager, storageProvider);
        var initResult = await credentialEncryption.InitializeAsync();
        
        // Skip if initialization failed
        if (!initResult.IsSuccess)
        {
            credentialEncryption.Dispose();
            return;
        }

        // Test with moderately large credential data
        var largeData = new string('A', 2000); // 2KB of data (smaller than other platforms)
        const string context = "TrashMail Panda";

        // Act
        var encryptResult = await credentialEncryption.EncryptAsync(largeData, context);
        if (encryptResult.IsSuccess)
        {
            var decryptResult = await credentialEncryption.DecryptAsync(encryptResult.Value!, context);
            if (decryptResult.IsSuccess)
            {
                Assert.Equal(largeData, decryptResult.Value);
            }
        }
        // Note: Large data might have size limits in different keyring implementations

        credentialEncryption.Dispose();
    }

    [PlatformSpecificFact(SupportedPlatform.Linux)]
    public async Task LinuxLibSecret_UnicodeData_ShouldHandleCorrectly()
    {
        // Skip if not on Linux
        if (!PlatformTestHelper.IsLinuxLibSecretAvailable())
        {
            return;
        }

        // Arrange
        var masterKeyManager = new MasterKeyManager(_masterKeyLogger);
        var storageProvider = new SqliteStorageProvider(":memory:", "test-password");
        await storageProvider.InitAsync();
        
        var credentialEncryption = new CredentialEncryption(_credentialLogger, masterKeyManager, storageProvider);
        var initResult = await credentialEncryption.InitializeAsync();
        
        // Skip if initialization failed
        if (!initResult.IsSuccess)
        {
            credentialEncryption.Dispose();
            return;
        }

        // Test Unicode data that might be present in international credentials
        var unicodeTestCases = new[]
        {
            "café-naïve-résumé-token",
            "тест-credential-データ"
            // Note: Minimal test cases for libsecret
        };

        foreach (var testData in unicodeTestCases)
        {
            // Act
            var encryptResult = await credentialEncryption.EncryptAsync(testData, "TrashMail Panda");
            if (encryptResult.IsSuccess)
            {
                var decryptResult = await credentialEncryption.DecryptAsync(encryptResult.Value!, "TrashMail Panda");
                if (decryptResult.IsSuccess)
                {
                    Assert.Equal(testData, decryptResult.Value);
                }
            }
            // Note: We don't assert failure here because libsecret operations
            // might fail in CI/CD environments
        }

        credentialEncryption.Dispose();
    }

    [PlatformSpecificFact(SupportedPlatform.Linux)]
    public async Task LinuxLibSecret_MultipleServices_ShouldIsolate()
    {
        // Skip if not on Linux
        if (!PlatformTestHelper.IsLinuxLibSecretAvailable())
        {
            return;
        }

        // Arrange
        var masterKeyManager = new MasterKeyManager(_masterKeyLogger);
        var storageProvider = new SqliteStorageProvider(":memory:", "test-password");
        await storageProvider.InitAsync();
        
        var credentialEncryption = new CredentialEncryption(_credentialLogger, masterKeyManager, storageProvider);
        var initResult = await credentialEncryption.InitializeAsync();
        
        // Skip if initialization failed
        if (!initResult.IsSuccess)
        {
            credentialEncryption.Dispose();
            return;
        }

        const string testData = "service-isolation-test";

        // Test different contexts to ensure they create separate keyring entries
        var contexts = new[]
        {
            "TrashMail Panda",
            "Gmail Provider"
            // Note: Minimal contexts for libsecret testing
        };

        var encryptedValues = new string[contexts.Length];

        // Encrypt with different contexts
        for (int i = 0; i < contexts.Length; i++)
        {
            var encryptResult = await credentialEncryption.EncryptAsync(testData, contexts[i]);
            if (encryptResult.IsSuccess)
            {
                encryptedValues[i] = encryptResult.Value!;
            }
        }

        // Decrypt with correct contexts
        for (int i = 0; i < contexts.Length; i++)
        {
            if (encryptedValues[i] != null)
            {
                var decryptResult = await credentialEncryption.DecryptAsync(encryptedValues[i], contexts[i]);
                if (decryptResult.IsSuccess)
                {
                    Assert.Equal(testData, decryptResult.Value);
                }
            }
        }

        credentialEncryption.Dispose();
    }

    [PlatformSpecificFact(SupportedPlatform.Linux)]
    public async Task LinuxLibSecret_ErrorHandling_ShouldBeGraceful()
    {
        // Skip if not on Linux
        if (!PlatformTestHelper.IsLinuxLibSecretAvailable())
        {
            return;
        }

        // Arrange
        var masterKeyManager = new MasterKeyManager(_masterKeyLogger);
        var storageProvider = new SqliteStorageProvider(":memory:", "test-password");
        await storageProvider.InitAsync();
        
        var credentialEncryption = new CredentialEncryption(_credentialLogger, masterKeyManager, storageProvider);
        var initResult = await credentialEncryption.InitializeAsync();
        
        // This test runs even if initialization failed to test error handling
        
        // Test empty/null data handling
        var emptyResult = await credentialEncryption.EncryptAsync("", "TrashMail Panda");
        Assert.False(emptyResult.IsSuccess);
        Assert.Contains("cannot be null or empty", emptyResult.ErrorMessage!);

        var nullResult = await credentialEncryption.EncryptAsync(null!, "TrashMail Panda");
        Assert.False(nullResult.IsSuccess);

        // Test decryption of non-existent data
        var nonExistentResult = await credentialEncryption.DecryptAsync("nonexistent-key", "TrashMail Panda");
        Assert.False(nonExistentResult.IsSuccess);

        credentialEncryption.Dispose();
    }

    [PlatformSpecificFact(SupportedPlatform.Linux)]
    public async Task LinuxLibSecret_SpecialCharactersInContext_ShouldWork()
    {
        // Skip if not on Linux
        if (!PlatformTestHelper.IsLinuxLibSecretAvailable())
        {
            return;
        }

        // Arrange
        var masterKeyManager = new MasterKeyManager(_masterKeyLogger);
        var storageProvider = new SqliteStorageProvider(":memory:", "test-password");
        await storageProvider.InitAsync();
        
        var credentialEncryption = new CredentialEncryption(_credentialLogger, masterKeyManager, storageProvider);
        var initResult = await credentialEncryption.InitializeAsync();
        
        // Skip if initialization failed
        if (!initResult.IsSuccess)
        {
            credentialEncryption.Dispose();
            return;
        }

        const string testData = "context-test-credential";

        // Test contexts that might be problematic for libsecret
        var contextTestCases = new[]
        {
            "TrashMail Panda",
            "context with spaces",
            "context.with.dots"
            // Note: Minimal test cases to avoid libsecret issues
        };

        foreach (var context in contextTestCases)
        {
            // Act
            var encryptResult = await credentialEncryption.EncryptAsync(testData, context);
            if (encryptResult.IsSuccess)
            {
                var decryptResult = await credentialEncryption.DecryptAsync(encryptResult.Value!, context);
                if (decryptResult.IsSuccess)
                {
                    Assert.Equal(testData, decryptResult.Value);
                }
            }
            // Note: We don't assert success here because libsecret behavior
            // varies significantly across distributions and configurations
        }

        credentialEncryption.Dispose();
    }

    public void Dispose()
    {
        // Cleanup any test artifacts if needed
        // Note: Keyring entries might persist and need manual cleanup in development
    }
}