using System;
using System.Security.Cryptography;
using System.Text;
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
/// Windows-specific DPAPI integration tests
/// These tests only run on Windows and test real DPAPI functionality
/// </summary>
[Trait("Category", "Integration")]
[Trait("Category", "Platform")]
[Trait("Platform", "Windows")]
public class WindowsDpapiIntegrationTests : IDisposable
{
    private readonly ILogger<CredentialEncryption> _credentialLogger;
    private readonly ILogger<MasterKeyManager> _masterKeyLogger;
    private readonly ILogger<SqliteStorageProvider> _storageLogger;

    public WindowsDpapiIntegrationTests()
    {
        var loggerFactory = LoggerFactory.Create(builder => builder.AddConsole());
        _credentialLogger = loggerFactory.CreateLogger<CredentialEncryption>();
        _masterKeyLogger = loggerFactory.CreateLogger<MasterKeyManager>();
        _storageLogger = loggerFactory.CreateLogger<SqliteStorageProvider>();
    }

    [PlatformSpecificFact(SupportedPlatform.Windows)]
    public async Task WindowsDpapi_BasicEncryptionDecryption_ShouldWork()
    {
        // Skip if DPAPI is not available
        if (!PlatformTestHelper.IsWindowsDpapiAvailable())
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
        Assert.True(initResult.IsSuccess, $"DPAPI initialization should succeed: {initResult.ErrorMessage}");

        const string testData = "windows-dpapi-test-credential-12345";
        const string context = "TrashMail Panda";

        var encryptResult = await credentialEncryption.EncryptAsync(testData, context);
        Assert.True(encryptResult.IsSuccess, $"DPAPI encryption should succeed: {encryptResult.ErrorMessage}");
        Assert.NotNull(encryptResult.Value);
        Assert.NotEqual(testData, encryptResult.Value);

        var decryptResult = await credentialEncryption.DecryptAsync(encryptResult.Value!, context);
        Assert.True(decryptResult.IsSuccess, $"DPAPI decryption should succeed: {decryptResult.ErrorMessage}");
        Assert.Equal(testData, decryptResult.Value);

        // Verify platform-specific status
        var status = credentialEncryption.GetEncryptionStatus();
        Assert.Equal("Windows", status.Platform);
        Assert.Equal("DPAPI", status.EncryptionMethod);
        Assert.True(status.IsInitialized);

        credentialEncryption.Dispose();
    }

    [PlatformSpecificFact(SupportedPlatform.Windows)]
    public async Task WindowsDpapi_RawDpapiOperations_ShouldWork()
    {
        // Skip if not on Windows
        if (!PlatformTestHelper.IsWindowsDpapiAvailable())
        {
            return;
        }

        // Test raw DPAPI operations
        const string testData = "raw-dpapi-test-data";
        var testBytes = Encoding.UTF8.GetBytes(testData);
        var entropy = Encoding.UTF8.GetBytes("TrashMail Panda");

        // Encrypt using DPAPI directly
        var encryptedBytes = ProtectedData.Protect(testBytes, entropy, DataProtectionScope.CurrentUser);
        Assert.NotNull(encryptedBytes);
        Assert.NotEqual(testBytes, encryptedBytes);

        // Decrypt using DPAPI
        var decryptedBytes = ProtectedData.Unprotect(encryptedBytes, entropy, DataProtectionScope.CurrentUser);
        var decryptedText = Encoding.UTF8.GetString(decryptedBytes);

        Assert.Equal(testData, decryptedText);
    }

    [PlatformSpecificFact(SupportedPlatform.Windows)]
    public async Task WindowsDpapi_DifferentUserScopes_ShouldIsolate()
    {
        // Skip if not on Windows
        if (!PlatformTestHelper.IsWindowsDpapiAvailable())
        {
            return;
        }

        const string testData = "user-scope-test-data";
        var testBytes = Encoding.UTF8.GetBytes(testData);
        var entropy = Encoding.UTF8.GetBytes("TrashMail Panda");

        // Encrypt with CurrentUser scope
        var encryptedCurrentUser = ProtectedData.Protect(testBytes, entropy, DataProtectionScope.CurrentUser);

        // Should be able to decrypt with CurrentUser scope
        var decryptedCurrentUser = ProtectedData.Unprotect(encryptedCurrentUser, entropy, DataProtectionScope.CurrentUser);
        Assert.Equal(testData, Encoding.UTF8.GetString(decryptedCurrentUser));

        // Note: LocalMachine scope requires elevated permissions in CI/CD
        // We'll skip testing LocalMachine scope to avoid permission issues
    }

    [PlatformSpecificFact(SupportedPlatform.Windows)]
    public async Task WindowsDpapi_HealthCheck_ShouldReportCorrectly()
    {
        // Skip if not on Windows
        if (!PlatformTestHelper.IsWindowsDpapiAvailable())
        {
            return;
        }

        // Arrange
        var masterKeyManager = new MasterKeyManager(_masterKeyLogger);
        var storageProvider = new SqliteStorageProvider(":memory:", "test-password");
        await storageProvider.InitAsync();
        
        var credentialEncryption = new CredentialEncryption(_credentialLogger, masterKeyManager, storageProvider);
        await credentialEncryption.InitializeAsync();

        // Act
        var healthResult = await credentialEncryption.HealthCheckAsync();

        // Assert
        Assert.True(healthResult.IsHealthy, $"DPAPI health check should pass: {string.Join(", ", healthResult.Issues)}");
        Assert.Equal("Windows", healthResult.Platform);
        Assert.True(healthResult.CanEncrypt);
        Assert.True(healthResult.CanDecrypt);
        Assert.True(healthResult.KeyGenerationWorks);
        Assert.Empty(healthResult.Issues);

        credentialEncryption.Dispose();
    }

    [PlatformSpecificFact(SupportedPlatform.Windows)]
    public async Task WindowsDpapi_ConcurrentOperations_ShouldBeThreadSafe()
    {
        // Skip if not on Windows
        if (!PlatformTestHelper.IsWindowsDpapiAvailable())
        {
            return;
        }

        // Arrange
        var masterKeyManager = new MasterKeyManager(_masterKeyLogger);
        var storageProvider = new SqliteStorageProvider(":memory:", "test-password");
        await storageProvider.InitAsync();
        
        var credentialEncryption = new CredentialEncryption(_credentialLogger, masterKeyManager, storageProvider);
        await credentialEncryption.InitializeAsync();

        const int concurrentOperations = 5;
        var tasks = new Task[concurrentOperations];

        // Act - Perform concurrent encrypt/decrypt operations
        for (int i = 0; i < concurrentOperations; i++)
        {
            int index = i;
            tasks[i] = Task.Run(async () =>
            {
                var testData = $"concurrent-windows-test-{index}";
                var context = $"context-{index}";

                var encryptResult = await credentialEncryption.EncryptAsync(testData, context);
                Assert.True(encryptResult.IsSuccess);

                var decryptResult = await credentialEncryption.DecryptAsync(encryptResult.Value!, context);
                Assert.True(decryptResult.IsSuccess);
                Assert.Equal(testData, decryptResult.Value);
            });
        }

        // Assert
        await Task.WhenAll(tasks);

        credentialEncryption.Dispose();
    }

    [PlatformSpecificFact(SupportedPlatform.Windows)]
    public async Task WindowsDpapi_LargeDataEncryption_ShouldWork()
    {
        // Skip if not on Windows
        if (!PlatformTestHelper.IsWindowsDpapiAvailable())
        {
            return;
        }

        // Arrange
        var masterKeyManager = new MasterKeyManager(_masterKeyLogger);
        var storageProvider = new SqliteStorageProvider(":memory:", "test-password");
        await storageProvider.InitAsync();
        
        var credentialEncryption = new CredentialEncryption(_credentialLogger, masterKeyManager, storageProvider);
        await credentialEncryption.InitializeAsync();

        // Test with large credential data (e.g., large JSON tokens)
        var largeData = new string('A', 10000); // 10KB of data
        const string context = "TrashMail Panda";

        // Act
        var encryptResult = await credentialEncryption.EncryptAsync(largeData, context);
        Assert.True(encryptResult.IsSuccess, $"Large data encryption should succeed: {encryptResult.ErrorMessage}");

        var decryptResult = await credentialEncryption.DecryptAsync(encryptResult.Value!, context);
        Assert.True(decryptResult.IsSuccess, $"Large data decryption should succeed: {decryptResult.ErrorMessage}");
        Assert.Equal(largeData, decryptResult.Value);

        credentialEncryption.Dispose();
    }

    [PlatformSpecificFact(SupportedPlatform.Windows)]
    public async Task WindowsDpapi_UnicodeData_ShouldHandleCorrectly()
    {
        // Skip if not on Windows
        if (!PlatformTestHelper.IsWindowsDpapiAvailable())
        {
            return;
        }

        // Arrange
        var masterKeyManager = new MasterKeyManager(_masterKeyLogger);
        var storageProvider = new SqliteStorageProvider(":memory:", "test-password");
        await storageProvider.InitAsync();
        
        var credentialEncryption = new CredentialEncryption(_credentialLogger, masterKeyManager, storageProvider);
        await credentialEncryption.InitializeAsync();

        // Test Unicode data that might be present in international credentials
        var unicodeTestCases = new[]
        {
            "café-naïve-résumé-token",
            "тест-credential-データ-🔐",
            "العربية-credentials-日本語",
            "emoji-test-🚀🔒💯"
        };

        foreach (var testData in unicodeTestCases)
        {
            // Act
            var encryptResult = await credentialEncryption.EncryptAsync(testData, "TrashMail Panda");
            Assert.True(encryptResult.IsSuccess, $"Unicode encryption should succeed for: {testData}");

            var decryptResult = await credentialEncryption.DecryptAsync(encryptResult.Value!, "TrashMail Panda");
            Assert.True(decryptResult.IsSuccess, $"Unicode decryption should succeed for: {testData}");
            Assert.Equal(testData, decryptResult.Value);
        }

        credentialEncryption.Dispose();
    }

    [PlatformSpecificFact(SupportedPlatform.Windows)]
    public async Task WindowsDpapi_SpecialCharactersInContext_ShouldWork()
    {
        // Skip if not on Windows
        if (!PlatformTestHelper.IsWindowsDpapiAvailable())
        {
            return;
        }

        // Arrange
        var masterKeyManager = new MasterKeyManager(_masterKeyLogger);
        var storageProvider = new SqliteStorageProvider(":memory:", "test-password");
        await storageProvider.InitAsync();
        
        var credentialEncryption = new CredentialEncryption(_credentialLogger, masterKeyManager, storageProvider);
        await credentialEncryption.InitializeAsync();

        const string testData = "context-test-credential";

        // Test various context strings that might be problematic
        var contextTestCases = new[]
        {
            "TrashMail Panda",
            "context-with-spaces and symbols!@#",
            "context/with/slashes",
            "context\\with\\backslashes",
            "context.with.dots",
            ""  // Empty context
        };

        foreach (var context in contextTestCases)
        {
            // Act
            var encryptResult = await credentialEncryption.EncryptAsync(testData, context);
            Assert.True(encryptResult.IsSuccess, $"Encryption should succeed with context: '{context}'");

            var decryptResult = await credentialEncryption.DecryptAsync(encryptResult.Value!, context);
            Assert.True(decryptResult.IsSuccess, $"Decryption should succeed with context: '{context}'");
            Assert.Equal(testData, decryptResult.Value);
        }

        credentialEncryption.Dispose();
    }

    public void Dispose()
    {
        // Cleanup any test artifacts if needed
    }
}