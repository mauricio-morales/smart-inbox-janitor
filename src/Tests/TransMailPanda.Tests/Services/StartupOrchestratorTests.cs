using Microsoft.Extensions.Logging;
using Moq;
using TransMailPanda.Services;
using TransMailPanda.Shared;
using TransMailPanda.Shared.Security;
using Xunit;

namespace TransMailPanda.Tests.Services;

public class StartupOrchestratorTests
{
    private readonly Mock<ILogger<StartupOrchestrator>> _mockLogger;
    private readonly Mock<IStorageProvider> _mockStorageProvider;
    private readonly Mock<ISecureStorageManager> _mockSecureStorageManager;
    private readonly Mock<IEmailProvider> _mockEmailProvider;
    private readonly Mock<ILLMProvider> _mockLlmProvider;
    private readonly Mock<IProviderStatusService> _mockProviderStatusService;
    private readonly Mock<IProviderBridgeService> _mockProviderBridgeService;

    public StartupOrchestratorTests()
    {
        _mockLogger = new Mock<ILogger<StartupOrchestrator>>();
        _mockStorageProvider = new Mock<IStorageProvider>();
        _mockSecureStorageManager = new Mock<ISecureStorageManager>();
        _mockEmailProvider = new Mock<IEmailProvider>();
        _mockLlmProvider = new Mock<ILLMProvider>();
        _mockProviderStatusService = new Mock<IProviderStatusService>();
        _mockProviderBridgeService = new Mock<IProviderBridgeService>();
    }

    private StartupOrchestrator CreateOrchestrator()
    {
        return new StartupOrchestrator(
            _mockLogger.Object,
            _mockStorageProvider.Object,
            _mockSecureStorageManager.Object,
            _mockEmailProvider.Object,
            _mockLlmProvider.Object,
            _mockProviderStatusService.Object,
            _mockProviderBridgeService.Object);
    }

    private void SetupSuccessfulInitialization()
    {
        _mockStorageProvider.Setup(x => x.InitAsync())
            .Returns(Task.CompletedTask);

        _mockSecureStorageManager.Setup(x => x.InitializeAsync())
            .ReturnsAsync(Result<bool>.Success(true));

        _mockProviderBridgeService.Setup(x => x.GetEmailProviderStatusAsync())
            .ReturnsAsync(Result<ProviderStatus>.Success(new ProviderStatus
            {
                Name = "Email",
                IsHealthy = true,
                Status = "Connected"
            }));

        _mockProviderBridgeService.Setup(x => x.GetLLMProviderStatusAsync())
            .ReturnsAsync(Result<ProviderStatus>.Success(new ProviderStatus
            {
                Name = "LLM",
                IsHealthy = true,
                Status = "Connected"
            }));

        _mockProviderBridgeService.Setup(x => x.GetAllProviderStatusAsync())
            .ReturnsAsync(new Dictionary<string, ProviderStatus>
            {
                { "Email", new ProviderStatus { Name = "Email", IsHealthy = true, Status = "Connected" } },
                { "LLM", new ProviderStatus { Name = "LLM", IsHealthy = true, Status = "Connected" } }
            });

        _mockProviderStatusService.Setup(x => x.RefreshProviderStatusAsync())
            .Returns(Task.CompletedTask);
    }

    [Fact]
    public void Constructor_WithValidParameters_ShouldSucceed()
    {
        // Act & Assert - Should not throw
        var orchestrator = CreateOrchestrator();
        Assert.NotNull(orchestrator);
    }

    [Fact]
    public void Constructor_WithNullLogger_ShouldThrowArgumentNullException()
    {
        // Act & Assert
        Assert.Throws<ArgumentNullException>(() =>
            new StartupOrchestrator(
                null!,
                _mockStorageProvider.Object,
                _mockSecureStorageManager.Object,
                _mockEmailProvider.Object,
                _mockLlmProvider.Object,
                _mockProviderStatusService.Object,
                _mockProviderBridgeService.Object));
    }

    [Fact]
    public void Constructor_WithNullStorageProvider_ShouldThrowArgumentNullException()
    {
        // Act & Assert
        Assert.Throws<ArgumentNullException>(() =>
            new StartupOrchestrator(
                _mockLogger.Object,
                null!,
                _mockSecureStorageManager.Object,
                _mockEmailProvider.Object,
                _mockLlmProvider.Object,
                _mockProviderStatusService.Object,
                _mockProviderBridgeService.Object));
    }

    [Fact]
    public async Task ExecuteStartupAsync_WithSuccessfulInitialization_ShouldReturnSuccess()
    {
        // Arrange
        SetupSuccessfulInitialization();
        var orchestrator = CreateOrchestrator();

        // Act
        var result = await orchestrator.ExecuteStartupAsync();

        // Assert
        Assert.True(result.IsSuccess);
        Assert.Equal("Startup completed successfully", result.Status);
        Assert.True(result.Duration > TimeSpan.Zero);
    }

    [Fact]
    public async Task ExecuteStartupAsync_WithStorageInitializationFailure_ShouldReturnFailure()
    {
        // Arrange
        _mockStorageProvider.Setup(x => x.InitAsync())
            .ThrowsAsync(new InvalidOperationException("Storage init failed"));

        var orchestrator = CreateOrchestrator();

        // Act
        var result = await orchestrator.ExecuteStartupAsync();

        // Assert
        Assert.False(result.IsSuccess);
        Assert.Equal(StartupFailureReason.UnknownError, result.FailureReason);
        Assert.Contains("Storage initialization failed", result.ErrorMessage);
    }

    [Fact]
    public async Task ExecuteStartupAsync_WithSecurityInitializationFailure_ShouldReturnFailure()
    {
        // Arrange
        _mockStorageProvider.Setup(x => x.InitAsync())
            .Returns(Task.CompletedTask);

        _mockSecureStorageManager.Setup(x => x.InitializeAsync())
            .ReturnsAsync(Result<bool>.Failure(new Exception("Security init failed")));

        var orchestrator = CreateOrchestrator();

        // Act
        var result = await orchestrator.ExecuteStartupAsync();

        // Assert
        Assert.False(result.IsSuccess);
        Assert.Equal(StartupFailureReason.UnknownError, result.FailureReason);
        Assert.Contains("Security initialization failed", result.ErrorMessage);
    }

    [Fact]
    public async Task ExecuteStartupAsync_WithCancellation_ShouldReturnCancelledFailure()
    {
        // Arrange
        SetupSuccessfulInitialization();
        var orchestrator = CreateOrchestrator();

        using var cts = new CancellationTokenSource();
        cts.Cancel();

        // Act
        var result = await orchestrator.ExecuteStartupAsync(cts.Token);

        // Assert
        Assert.False(result.IsSuccess);
        Assert.Equal(StartupFailureReason.Cancelled, result.FailureReason);
        Assert.Equal("Startup was cancelled", result.ErrorMessage);
    }

    [Fact]
    public async Task ExecuteStartupAsync_WithTimeout_ShouldReturnTimeoutFailure()
    {
        // Arrange
        _mockStorageProvider.Setup(x => x.InitAsync())
            .Returns(async () =>
            {
                await Task.Delay(TimeSpan.FromMinutes(6)); // Longer than default timeout
            });

        var orchestrator = CreateOrchestrator();

        // Act
        var result = await orchestrator.ExecuteStartupAsync();

        // Assert
        Assert.False(result.IsSuccess);
        Assert.Equal(StartupFailureReason.Timeout, result.FailureReason);
        Assert.Contains("timed out after", result.ErrorMessage);
    }

    [Fact]
    public void GetProgress_InitialState_ShouldReturnInitializingProgress()
    {
        // Arrange
        var orchestrator = CreateOrchestrator();

        // Act
        var progress = orchestrator.GetProgress();

        // Assert
        Assert.Equal(StartupStep.Initializing, progress.CurrentStep);
        Assert.Equal(0, progress.CompletedSteps);
        Assert.False(progress.IsComplete);
        Assert.False(progress.HasError);
    }

    [Fact]
    public async Task ExecuteStartupAsync_ShouldProgressThroughAllSteps()
    {
        // Arrange
        SetupSuccessfulInitialization();
        var orchestrator = CreateOrchestrator();
        var progressEvents = new List<StartupProgressChangedEventArgs>();

        orchestrator.ProgressChanged += (sender, e) => progressEvents.Add(e);

        // Act
        var result = await orchestrator.ExecuteStartupAsync();

        // Assert
        Assert.True(result.IsSuccess);
        Assert.True(progressEvents.Count >= 6); // Should have at least 6 progress updates

        // Check final progress
        var finalProgress = progressEvents.Last().Progress;
        Assert.Equal(StartupStep.Ready, finalProgress.CurrentStep);
        Assert.True(finalProgress.IsComplete);
        Assert.Equal(100.0, finalProgress.ProgressPercentage);
    }

    [Fact]
    public async Task ExecuteStartupAsync_WithEmailProviderStatusFailure_ShouldContinue()
    {
        // Arrange - Email provider fails but others succeed
        _mockStorageProvider.Setup(x => x.InitAsync())
            .Returns(Task.CompletedTask);

        _mockSecureStorageManager.Setup(x => x.InitializeAsync())
            .ReturnsAsync(Result<bool>.Success(true));

        _mockProviderBridgeService.Setup(x => x.GetEmailProviderStatusAsync())
            .ReturnsAsync(Result<ProviderStatus>.Failure(new Exception("Email provider failed")));

        _mockProviderBridgeService.Setup(x => x.GetLLMProviderStatusAsync())
            .ReturnsAsync(Result<ProviderStatus>.Success(new ProviderStatus
            {
                Name = "LLM",
                IsHealthy = true,
                Status = "Connected"
            }));

        _mockProviderBridgeService.Setup(x => x.GetAllProviderStatusAsync())
            .ReturnsAsync(new Dictionary<string, ProviderStatus>
            {
                { "LLM", new ProviderStatus { Name = "LLM", IsHealthy = true, Status = "Connected" } }
            });

        _mockProviderStatusService.Setup(x => x.RefreshProviderStatusAsync())
            .Returns(Task.CompletedTask);

        var orchestrator = CreateOrchestrator();

        // Act
        var result = await orchestrator.ExecuteStartupAsync();

        // Assert
        Assert.True(result.IsSuccess); // Should still succeed even with email provider failure
    }

    [Fact]
    public async Task ExecuteStartupAsync_WithHealthCheckFailure_ShouldReturnFailure()
    {
        // Arrange
        _mockStorageProvider.Setup(x => x.InitAsync())
            .Returns(Task.CompletedTask);

        _mockSecureStorageManager.Setup(x => x.InitializeAsync())
            .ReturnsAsync(Result<bool>.Success(true));

        _mockProviderBridgeService.Setup(x => x.GetEmailProviderStatusAsync())
            .ReturnsAsync(Result<ProviderStatus>.Success(new ProviderStatus()));

        _mockProviderBridgeService.Setup(x => x.GetLLMProviderStatusAsync())
            .ReturnsAsync(Result<ProviderStatus>.Success(new ProviderStatus()));

        _mockProviderBridgeService.Setup(x => x.GetAllProviderStatusAsync())
            .ThrowsAsync(new InvalidOperationException("Health check failed"));

        var orchestrator = CreateOrchestrator();

        // Act
        var result = await orchestrator.ExecuteStartupAsync();

        // Assert
        Assert.False(result.IsSuccess);
        Assert.Contains("Health checks failed", result.ErrorMessage);
    }

    [Fact]
    public async Task ExecuteStartupAsync_WithNoHealthyProviders_ShouldStillSucceed()
    {
        // Arrange - All providers are unhealthy but startup should still complete
        _mockStorageProvider.Setup(x => x.InitAsync())
            .Returns(Task.CompletedTask);

        _mockSecureStorageManager.Setup(x => x.InitializeAsync())
            .ReturnsAsync(Result<bool>.Success(true));

        _mockProviderBridgeService.Setup(x => x.GetEmailProviderStatusAsync())
            .ReturnsAsync(Result<ProviderStatus>.Success(new ProviderStatus
            {
                Name = "Email",
                IsHealthy = false,
                Status = "Setup Required"
            }));

        _mockProviderBridgeService.Setup(x => x.GetLLMProviderStatusAsync())
            .ReturnsAsync(Result<ProviderStatus>.Success(new ProviderStatus
            {
                Name = "LLM",
                IsHealthy = false,
                Status = "Setup Required"
            }));

        _mockProviderBridgeService.Setup(x => x.GetAllProviderStatusAsync())
            .ReturnsAsync(new Dictionary<string, ProviderStatus>
            {
                { "Email", new ProviderStatus { Name = "Email", IsHealthy = false, Status = "Setup Required" } },
                { "LLM", new ProviderStatus { Name = "LLM", IsHealthy = false, Status = "Setup Required" } }
            });

        _mockProviderStatusService.Setup(x => x.RefreshProviderStatusAsync())
            .Returns(Task.CompletedTask);

        var orchestrator = CreateOrchestrator();

        // Act
        var result = await orchestrator.ExecuteStartupAsync();

        // Assert
        Assert.True(result.IsSuccess); // Should succeed even if no providers are healthy
    }

    [Fact]
    public async Task ExecuteStartupAsync_ShouldCallRefreshProviderStatusService()
    {
        // Arrange
        SetupSuccessfulInitialization();
        var orchestrator = CreateOrchestrator();

        // Act
        await orchestrator.ExecuteStartupAsync();

        // Assert
        _mockProviderStatusService.Verify(x => x.RefreshProviderStatusAsync(), Times.Once);
    }
}