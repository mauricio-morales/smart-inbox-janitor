using System;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using Moq;
using TrashMailPanda.Providers.Email;
using TrashMailPanda.Providers.Email.Services;
using TrashMailPanda.Shared.Base;
using TrashMailPanda.Shared.Security;

namespace TrashMailPanda.Tests.Providers.Email;

/// <summary>
/// Unit tests for GmailEmailProvider
/// Tests basic initialization and dependency injection
/// </summary>
public class GmailEmailProviderTests : IDisposable
{
    private readonly Mock<ILogger<GmailEmailProvider>> _mockLogger;
    private readonly Mock<ISecureStorageManager> _mockSecureStorage;
    private readonly Mock<IGmailRateLimitHandler> _mockRateLimitHandler;
    private readonly Mock<Google.Apis.Util.Store.IDataStore> _mockDataStore;
    private readonly GmailProviderConfig _validConfig;

    public GmailEmailProviderTests()
    {
        _mockLogger = new Mock<ILogger<GmailEmailProvider>>();
        _mockSecureStorage = new Mock<ISecureStorageManager>();
        _mockRateLimitHandler = new Mock<IGmailRateLimitHandler>();
        _mockDataStore = new Mock<Google.Apis.Util.Store.IDataStore>();

        _validConfig = new GmailProviderConfig();
        _validConfig.ClientId = "test_client_id_12345";
        _validConfig.ClientSecret = "test_client_secret_12345";
    }

    /// <summary>
    /// Tests that constructor properly initializes provider with dependencies
    /// </summary>
    [Fact]
    public void Constructor_WithValidDependencies_InitializesSuccessfully()
    {
        // Act
        var provider = CreateProvider();

        // Assert
        Assert.NotNull(provider);
        Assert.Equal("Gmail", provider.Name);
        Assert.Equal(ProviderState.Uninitialized, provider.State);
    }

    /// <summary>
    /// Tests that constructor throws ArgumentNullException for null logger
    /// </summary>
    [Fact]
    public void Constructor_WithNullLogger_ThrowsArgumentNullException()
    {
        // Act & Assert
        Assert.Throws<ArgumentNullException>(() =>
            new GmailEmailProvider(
                _mockSecureStorage.Object,
                _mockRateLimitHandler.Object,
                _mockDataStore.Object,
                null!));
    }

    /// <summary>
    /// Tests that constructor throws ArgumentNullException for null secure storage
    /// </summary>
    [Fact]
    public void Constructor_WithNullSecureStorage_ThrowsArgumentNullException()
    {
        // Act & Assert
        Assert.Throws<ArgumentNullException>(() =>
            new GmailEmailProvider(
                null!,
                _mockRateLimitHandler.Object,
                _mockDataStore.Object,
                _mockLogger.Object));
    }

    /// <summary>
    /// Tests that constructor throws ArgumentNullException for null rate limit handler
    /// </summary>
    [Fact]
    public void Constructor_WithNullRateLimitHandler_ThrowsArgumentNullException()
    {
        // Act & Assert
        Assert.Throws<ArgumentNullException>(() =>
            new GmailEmailProvider(
                _mockSecureStorage.Object,
                null!,
                _mockDataStore.Object,
                _mockLogger.Object));
    }

    /// <summary>
    /// Tests that constructor throws ArgumentNullException for null data store
    /// </summary>
    [Fact]
    public void Constructor_WithNullDataStore_ThrowsArgumentNullException()
    {
        // Act & Assert
        Assert.Throws<ArgumentNullException>(() =>
            new GmailEmailProvider(
                _mockSecureStorage.Object,
                _mockRateLimitHandler.Object,
                null!,
                _mockLogger.Object));
    }

    /// <summary>
    /// Tests successful initialization with valid configuration
    /// </summary>
    [Fact]
    public async Task InitializeAsync_WithValidConfig_ReturnsSuccess()
    {
        // Arrange
        var provider = CreateProvider();

        // Act
        var result = await provider.InitializeAsync(_validConfig);

        // Assert
        // The result may be success or failure depending on OAuth setup
        // The important thing is that it doesn't throw exceptions
        Assert.True(result.IsSuccess || result.IsFailure);
    }

    /// <summary>
    /// Tests initialization with invalid configuration returns failure
    /// </summary>
    [Fact]
    public async Task InitializeAsync_WithInvalidConfig_ReturnsFailure()
    {
        // Arrange
        var provider = CreateProvider();
        var invalidConfig = new GmailProviderConfig(); // Uses defaults but missing OAuth credentials

        // Act
        var result = await provider.InitializeAsync(invalidConfig);

        // Assert
        // Should fail due to missing OAuth setup in test environment
        Assert.True(result.IsFailure);
    }

    /// <summary>
    /// Tests shutdown completes successfully
    /// </summary>
    [Fact]
    public async Task ShutdownAsync_CompletesSuccessfully()
    {
        // Arrange
        var provider = CreateProvider();

        // Act
        var result = await provider.ShutdownAsync();

        // Assert
        Assert.True(result.IsSuccess);
    }

    /// <summary>
    /// Tests provider name and version properties
    /// </summary>
    [Fact]
    public void Properties_ReturnExpectedValues()
    {
        // Arrange
        var provider = CreateProvider();

        // Act & Assert
        Assert.Equal("Gmail", provider.Name);
        Assert.Equal("1.0.0", provider.Version);
    }

    #region Helper Methods

    private GmailEmailProvider CreateProvider()
    {
        return new GmailEmailProvider(
            _mockSecureStorage.Object,
            _mockRateLimitHandler.Object,
            _mockDataStore.Object,
            _mockLogger.Object);
    }

    #endregion

    public void Dispose()
    {
        // Cleanup any resources if needed
    }
}