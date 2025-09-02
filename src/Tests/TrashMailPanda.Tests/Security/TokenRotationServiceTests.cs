using Microsoft.Extensions.Logging;
using Moq;
using TrashMailPanda.Shared.Base;
using TrashMailPanda.Shared.Security;
using Xunit;

namespace TrashMailPanda.Tests.Security;

/// <summary>
/// Tests for token rotation service functionality
/// </summary>
[Trait("Category", "Security")]
public class TokenRotationServiceTests : IDisposable
{
    private readonly Mock<ISecureStorageManager> _mockSecureStorageManager;
    private readonly Mock<ILogger<TokenRotationService>> _mockLogger;
    private readonly TokenRotationService _tokenRotationService;

    public TokenRotationServiceTests()
    {
        _mockSecureStorageManager = new Mock<ISecureStorageManager>();
        _mockLogger = new Mock<ILogger<TokenRotationService>>();
        _tokenRotationService = new TokenRotationService(_mockSecureStorageManager.Object, _mockLogger.Object);
    }

    [Fact]
    public void Constructor_WithValidParameters_ShouldInitialize()
    {
        // Act & Assert
        Assert.NotNull(_tokenRotationService);
        Assert.False(_tokenRotationService.IsRunning);
        Assert.Equal(0, _tokenRotationService.TotalRotations);
        Assert.Equal(TimeSpan.FromHours(6), _tokenRotationService.CheckInterval);
    }

    [Fact]
    public void Constructor_WithNullSecureStorageManager_ShouldThrowArgumentNullException()
    {
        // Act & Assert
        Assert.Throws<ArgumentNullException>(() =>
            new TokenRotationService(null!, _mockLogger.Object));
    }

    [Fact]
    public void Constructor_WithNullLogger_ShouldThrowArgumentNullException()
    {
        // Act & Assert
        Assert.Throws<ArgumentNullException>(() =>
            new TokenRotationService(_mockSecureStorageManager.Object, null!));
    }

    [Fact]
    public async Task StartRotationSchedulerAsync_WhenNotRunning_ShouldStartSuccessfully()
    {
        // Act
        var result = await _tokenRotationService.StartRotationSchedulerAsync();

        // Assert
        Assert.True(result.IsSuccess);
        Assert.True(_tokenRotationService.IsRunning);
    }

    [Fact]
    public async Task StartRotationSchedulerAsync_WhenAlreadyRunning_ShouldReturnSuccess()
    {
        // Arrange
        await _tokenRotationService.StartRotationSchedulerAsync();

        // Act
        var result = await _tokenRotationService.StartRotationSchedulerAsync();

        // Assert
        Assert.True(result.IsSuccess);
        Assert.True(_tokenRotationService.IsRunning);
    }

    [Fact]
    public async Task StopRotationSchedulerAsync_WhenRunning_ShouldStopSuccessfully()
    {
        // Arrange
        await _tokenRotationService.StartRotationSchedulerAsync();

        // Act
        var result = await _tokenRotationService.StopRotationSchedulerAsync();

        // Assert
        Assert.True(result.IsSuccess);
        Assert.False(_tokenRotationService.IsRunning);
    }

    [Fact]
    public async Task StopRotationSchedulerAsync_WhenNotRunning_ShouldReturnSuccess()
    {
        // Act
        var result = await _tokenRotationService.StopRotationSchedulerAsync();

        // Assert
        Assert.True(result.IsSuccess);
        Assert.False(_tokenRotationService.IsRunning);
    }

    [Fact]
    public async Task RotateTokensAsync_WithNullOrEmptyProviderName_ShouldFail()
    {
        // Act & Assert
        var nullResult = await _tokenRotationService.RotateTokensAsync(null!);
        Assert.False(nullResult.IsSuccess);
        Assert.Contains("cannot be null or empty", nullResult.Error!.Message);

        var emptyResult = await _tokenRotationService.RotateTokensAsync("");
        Assert.False(emptyResult.IsSuccess);
        Assert.Contains("cannot be null or empty", emptyResult.Error!.Message);
    }

    [Fact]
    public async Task RotateTokensAsync_ForGmailWithExistingTokens_ShouldSucceed()
    {
        // Arrange
        _mockSecureStorageManager
            .Setup(x => x.CredentialExistsAsync("gmail_access_token"))
            .ReturnsAsync(SecureStorageResult<bool>.Success(true));

        // Act
        var result = await _tokenRotationService.RotateTokensAsync("gmail");

        // Assert
        Assert.True(result.IsSuccess);
        Assert.NotNull(result.Value);
        Assert.Equal("gmail", result.Value.ProviderName);
        Assert.True(result.Value.WasRotated);
    }

    [Fact]
    public async Task RotateTokensAsync_ForGmailWithoutTokens_ShouldReturnNotNeeded()
    {
        // Arrange
        _mockSecureStorageManager
            .Setup(x => x.CredentialExistsAsync("gmail_access_token"))
            .ReturnsAsync(SecureStorageResult<bool>.Success(false));

        // Act
        var result = await _tokenRotationService.RotateTokensAsync("gmail");

        // Assert
        Assert.True(result.IsSuccess);
        Assert.NotNull(result.Value);
        Assert.Equal("gmail", result.Value.ProviderName);
        Assert.False(result.Value.WasRotated);
        Assert.Contains("not near expiry", result.Value.Reason);
    }

    [Fact]
    public async Task RotateTokensAsync_ForOpenAI_ShouldReturnNotNeeded()
    {
        // Arrange
        _mockSecureStorageManager
            .Setup(x => x.CredentialExistsAsync("openai_api_key"))
            .ReturnsAsync(SecureStorageResult<bool>.Success(true));

        // Act
        var result = await _tokenRotationService.RotateTokensAsync("openai");

        // Assert
        Assert.True(result.IsSuccess);
        Assert.NotNull(result.Value);
        Assert.Equal("openai", result.Value.ProviderName);
        Assert.False(result.Value.WasRotated);
        Assert.Contains("don't require automatic rotation", result.Value.Reason);
    }

    [Fact]
    public async Task RotateTokensAsync_ForUnsupportedProvider_ShouldFail()
    {
        // Act
        var result = await _tokenRotationService.RotateTokensAsync("unsupported-provider");

        // Assert
        Assert.False(result.IsSuccess);
        Assert.Contains("Unsupported provider", result.Error!.Message);
    }

    [Fact]
    public async Task IsTokenNearExpiryAsync_WithNullOrEmptyProviderName_ShouldFail()
    {
        // Act & Assert
        var nullResult = await _tokenRotationService.IsTokenNearExpiryAsync(null!);
        Assert.False(nullResult.IsSuccess);

        var emptyResult = await _tokenRotationService.IsTokenNearExpiryAsync("");
        Assert.False(emptyResult.IsSuccess);
    }

    [Fact]
    public async Task IsTokenNearExpiryAsync_ForGmailWithTokens_ShouldReturnTrue()
    {
        // Arrange
        _mockSecureStorageManager
            .Setup(x => x.CredentialExistsAsync("gmail_access_token"))
            .ReturnsAsync(SecureStorageResult<bool>.Success(true));

        // Act
        var result = await _tokenRotationService.IsTokenNearExpiryAsync("gmail");

        // Assert
        Assert.True(result.IsSuccess);
        Assert.True(result.Value);
    }

    [Fact]
    public async Task IsTokenNearExpiryAsync_ForGmailWithoutTokens_ShouldReturnFalse()
    {
        // Arrange
        _mockSecureStorageManager
            .Setup(x => x.CredentialExistsAsync("gmail_access_token"))
            .ReturnsAsync(SecureStorageResult<bool>.Success(false));

        // Act
        var result = await _tokenRotationService.IsTokenNearExpiryAsync("gmail");

        // Assert
        Assert.True(result.IsSuccess);
        Assert.False(result.Value);
    }

    [Fact]
    public async Task IsTokenNearExpiryAsync_ForOpenAI_ShouldReturnFalse()
    {
        // Arrange
        _mockSecureStorageManager
            .Setup(x => x.CredentialExistsAsync("openai_api_key"))
            .ReturnsAsync(SecureStorageResult<bool>.Success(true));

        // Act
        var result = await _tokenRotationService.IsTokenNearExpiryAsync("openai");

        // Assert
        Assert.True(result.IsSuccess);
        Assert.False(result.Value); // OpenAI keys don't typically expire
    }

    [Fact]
    public async Task ConfigureProviderRotationAsync_WithValidSettings_ShouldSucceed()
    {
        // Arrange
        var settings = new TokenRotationSettings
        {
            IsEnabled = true,
            ExpiryThreshold = TimeSpan.FromHours(12),
            CheckInterval = TimeSpan.FromHours(3)
        };

        // Act
        var result = await _tokenRotationService.ConfigureProviderRotationAsync("gmail", settings);

        // Assert
        Assert.True(result.IsSuccess);
    }

    [Fact]
    public async Task ConfigureProviderRotationAsync_WithNullOrEmptyProviderName_ShouldFail()
    {
        // Arrange
        var settings = new TokenRotationSettings();

        // Act & Assert
        var nullResult = await _tokenRotationService.ConfigureProviderRotationAsync(null!, settings);
        Assert.False(nullResult.IsSuccess);

        var emptyResult = await _tokenRotationService.ConfigureProviderRotationAsync("", settings);
        Assert.False(emptyResult.IsSuccess);
    }

    [Fact]
    public async Task GetRotationStatisticsAsync_ShouldReturnStatistics()
    {
        // Act
        var result = await _tokenRotationService.GetRotationStatisticsAsync();

        // Assert
        Assert.True(result.IsSuccess);
        Assert.NotNull(result.Value);
        Assert.Equal(0, result.Value.TotalRotations);
        Assert.Equal(0, result.Value.TotalFailures);
        Assert.NotNull(result.Value.ProviderStatistics);
    }

    [Fact]
    public async Task GetNextRotationTimeAsync_ForUnknownProvider_ShouldReturnNull()
    {
        // Act
        var result = await _tokenRotationService.GetNextRotationTimeAsync("unknown-provider");

        // Assert
        Assert.True(result.IsSuccess);
        Assert.Null(result.Value);
    }

    [Fact]
    public async Task TokenRotated_Event_ShouldFireOnSuccessfulRotation()
    {
        // Arrange
        var eventFired = false;
        TokenRotatedEventArgs? eventArgs = null;

        _tokenRotationService.TokenRotated += (sender, args) =>
        {
            eventFired = true;
            eventArgs = args;
        };

        _mockSecureStorageManager
            .Setup(x => x.CredentialExistsAsync("gmail_access_token"))
            .ReturnsAsync(SecureStorageResult<bool>.Success(true));

        // Act
        await _tokenRotationService.RotateTokensAsync("gmail");

        // Give event time to fire
        await Task.Delay(100);

        // Assert
        Assert.True(eventFired);
        Assert.NotNull(eventArgs);
        Assert.Equal("gmail", eventArgs.ProviderName);
        Assert.True(eventArgs.Result.WasRotated);
    }

    [Fact]
    public async Task TokenRotationFailed_Event_ShouldFireOnFailedRotation()
    {
        // Arrange
        var eventFired = false;
        TokenRotationFailedEventArgs? eventArgs = null;

        _tokenRotationService.TokenRotationFailed += (sender, args) =>
        {
            eventFired = true;
            eventArgs = args;
        };

        _mockSecureStorageManager
            .Setup(x => x.CredentialExistsAsync("gmail_access_token"))
            .ThrowsAsync(new Exception("Storage error"));

        // Act
        await _tokenRotationService.RotateTokensAsync("gmail");

        // Give event time to fire
        await Task.Delay(100);

        // Assert
        Assert.True(eventFired);
        Assert.NotNull(eventArgs);
        Assert.Equal("gmail", eventArgs.ProviderName);
        Assert.Contains("Storage error", eventArgs.ErrorMessage);
    }

    [Fact]
    public async Task MultipleRotations_ShouldIncrementTotalRotations()
    {
        // Arrange
        _mockSecureStorageManager
            .Setup(x => x.CredentialExistsAsync("gmail_access_token"))
            .ReturnsAsync(SecureStorageResult<bool>.Success(true));

        // Act
        await _tokenRotationService.RotateTokensAsync("gmail");
        await _tokenRotationService.RotateTokensAsync("gmail");
        await _tokenRotationService.RotateTokensAsync("gmail");

        var statistics = await _tokenRotationService.GetRotationStatisticsAsync();

        // Assert
        Assert.True(statistics.IsSuccess);
        Assert.Equal(3, _tokenRotationService.TotalRotations);
        Assert.Equal(3, statistics.Value!.TotalRotations);
    }

    [Fact]
    public async Task ConcurrentRotations_ShouldBeThreadSafe()
    {
        // Arrange
        _mockSecureStorageManager
            .Setup(x => x.CredentialExistsAsync("gmail_access_token"))
            .ReturnsAsync(SecureStorageResult<bool>.Success(true));

        var tasks = new List<Task>();

        // Act - Start multiple rotations concurrently
        for (int i = 0; i < 10; i++)
        {
            tasks.Add(_tokenRotationService.RotateTokensAsync("gmail"));
        }

        await Task.WhenAll(tasks);

        // Assert - Should complete without throwing
        Assert.True(true); // If we get here, the test passed

        var statistics = await _tokenRotationService.GetRotationStatisticsAsync();
        Assert.True(statistics.IsSuccess);
        Assert.Equal(10, statistics.Value!.TotalRotations);
    }

    [Fact]
    public void Dispose_ShouldCleanupResources()
    {
        // Act & Assert - Should not throw
        _tokenRotationService.Dispose();

        // Service should no longer be running after disposal
        Assert.False(_tokenRotationService.IsRunning);
    }

    [Fact]
    public async Task Dispose_WhileRunning_ShouldStopScheduler()
    {
        // Arrange
        await _tokenRotationService.StartRotationSchedulerAsync();
        Assert.True(_tokenRotationService.IsRunning);

        // Act
        _tokenRotationService.Dispose();

        // Assert
        Assert.False(_tokenRotationService.IsRunning);
    }

    [Theory]
    [InlineData("gmail")]
    [InlineData("openai")]
    public async Task RotateTokensAsync_WithDifferentProviders_ShouldHandleCorrectly(string providerName)
    {
        // Arrange
        var expectedExists = providerName == "gmail";
        var credentialKey = providerName == "gmail" ? "gmail_access_token" : "openai_api_key";

        _mockSecureStorageManager
            .Setup(x => x.CredentialExistsAsync(credentialKey))
            .ReturnsAsync(SecureStorageResult<bool>.Success(expectedExists));

        // Act
        var result = await _tokenRotationService.RotateTokensAsync(providerName);

        // Assert
        Assert.True(result.IsSuccess);
        Assert.Equal(providerName, result.Value!.ProviderName);

        if (providerName == "gmail" && expectedExists)
        {
            Assert.True(result.Value.WasRotated);
        }
        else
        {
            Assert.False(result.Value.WasRotated);
        }
    }

    [Fact]
    public async Task RotationStatistics_ShouldTrackProviderSpecificData()
    {
        // Arrange
        _mockSecureStorageManager
            .Setup(x => x.CredentialExistsAsync("gmail_access_token"))
            .ReturnsAsync(SecureStorageResult<bool>.Success(true));

        // Act
        await _tokenRotationService.RotateTokensAsync("gmail");
        var statistics = await _tokenRotationService.GetRotationStatisticsAsync();

        // Assert
        Assert.True(statistics.IsSuccess);
        Assert.NotNull(statistics.Value);
        Assert.True(statistics.Value.ProviderStatistics.ContainsKey("gmail"));

        var gmailStats = statistics.Value.ProviderStatistics["gmail"];
        Assert.Equal("gmail", gmailStats.ProviderName);
        Assert.Equal(1, gmailStats.SuccessfulRotations);
        Assert.Equal(0, gmailStats.FailedRotations);
        Assert.True(gmailStats.IsRotationEnabled);
    }

    public void Dispose()
    {
        _tokenRotationService?.Dispose();
    }
}