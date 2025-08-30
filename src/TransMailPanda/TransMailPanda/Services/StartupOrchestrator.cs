using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using TransMailPanda.Shared;
using TransMailPanda.Shared.Security;

namespace TransMailPanda.Services;

/// <summary>
/// Orchestrates the application startup sequence with provider initialization
/// </summary>
public class StartupOrchestrator : IStartupOrchestrator
{
    private readonly ILogger<StartupOrchestrator> _logger;
    private readonly IStorageProvider _storageProvider;
    private readonly ISecureStorageManager _secureStorageManager;
    private readonly IEmailProvider _emailProvider;
    private readonly ILLMProvider _llmProvider;
    private readonly IProviderStatusService _providerStatusService;

    private StartupProgress _currentProgress = new() { CurrentStep = StartupStep.Initializing };
    private readonly object _progressLock = new();

    public event EventHandler<StartupProgressChangedEventArgs>? ProgressChanged;

    private const int TotalSteps = 6;
    private const int DefaultTimeoutMinutes = 5;

    public StartupOrchestrator(
        ILogger<StartupOrchestrator> logger,
        IStorageProvider storageProvider,
        ISecureStorageManager secureStorageManager,
        IEmailProvider emailProvider,
        ILLMProvider llmProvider,
        IProviderStatusService providerStatusService)
    {
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _storageProvider = storageProvider ?? throw new ArgumentNullException(nameof(storageProvider));
        _secureStorageManager = secureStorageManager ?? throw new ArgumentNullException(nameof(secureStorageManager));
        _emailProvider = emailProvider ?? throw new ArgumentNullException(nameof(emailProvider));
        _llmProvider = llmProvider ?? throw new ArgumentNullException(nameof(llmProvider));
        _providerStatusService = providerStatusService ?? throw new ArgumentNullException(nameof(providerStatusService));
    }

    public async Task<StartupResult> ExecuteStartupAsync(CancellationToken cancellationToken = default)
    {
        var stopwatch = Stopwatch.StartNew();
        _logger.LogInformation("Starting application startup orchestration");

        // Apply timeout if none provided
        using var timeoutCts = new CancellationTokenSource(TimeSpan.FromMinutes(DefaultTimeoutMinutes));
        using var combinedCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken, timeoutCts.Token);

        try
        {
            // Execute startup sequence
            await ExecuteStartupSequenceAsync(combinedCts.Token);

            stopwatch.Stop();
            
            var successResult = new StartupResult
            {
                IsSuccess = true,
                Status = "Startup completed successfully",
                Duration = stopwatch.Elapsed,
                Details = new Dictionary<string, object>
                {
                    { "total_steps", TotalSteps },
                    { "completed_steps", TotalSteps },
                    { "final_step", StartupStep.Ready }
                }
            };

            _logger.LogInformation("Application startup completed successfully in {Duration}", stopwatch.Elapsed);
            return successResult;
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            return CreateFailureResult(stopwatch.Elapsed, StartupFailureReason.Cancelled, "Startup was cancelled");
        }
        catch (OperationCanceledException) when (timeoutCts.Token.IsCancellationRequested)
        {
            return CreateFailureResult(stopwatch.Elapsed, StartupFailureReason.Timeout, $"Startup timed out after {DefaultTimeoutMinutes} minutes");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception during startup orchestration");
            return CreateFailureResult(stopwatch.Elapsed, StartupFailureReason.UnknownError, ex.Message);
        }
    }

    public StartupProgress GetProgress()
    {
        lock (_progressLock)
        {
            return _currentProgress;
        }
    }

    private async Task ExecuteStartupSequenceAsync(CancellationToken cancellationToken)
    {
        // Step 1: Initialize Storage
        UpdateProgress(StartupStep.InitializingStorage, "Initializing storage provider", 1);
        await InitializeStorageAsync(cancellationToken);

        // Step 2: Initialize Security
        UpdateProgress(StartupStep.InitializingSecurity, "Initializing security services", 2);
        await InitializeSecurityAsync(cancellationToken);

        // Step 3: Initialize Email Provider
        UpdateProgress(StartupStep.InitializingEmailProvider, "Initializing email provider", 3);
        await InitializeEmailProviderAsync(cancellationToken);

        // Step 4: Initialize LLM Provider
        UpdateProgress(StartupStep.InitializingLLMProvider, "Initializing LLM provider", 4);
        await InitializeLLMProviderAsync(cancellationToken);

        // Step 5: Health Checks
        UpdateProgress(StartupStep.CheckingProviderHealth, "Checking provider health", 5);
        await PerformHealthChecksAsync(cancellationToken);

        // Step 6: Complete
        UpdateProgress(StartupStep.Ready, "Startup complete", TotalSteps, isComplete: true);
    }

    private async Task InitializeStorageAsync(CancellationToken cancellationToken)
    {
        try
        {
            _logger.LogDebug("Initializing storage provider");
            await _storageProvider.InitAsync();
            _logger.LogDebug("Storage provider initialized successfully");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to initialize storage provider");
            UpdateProgressWithError(StartupStep.InitializingStorage, "Storage initialization failed", ex.Message);
            throw new InvalidOperationException("Storage initialization failed", ex);
        }
    }

    private async Task InitializeSecurityAsync(CancellationToken cancellationToken)
    {
        try
        {
            _logger.LogDebug("Initializing security services");
            var result = await _secureStorageManager.InitializeAsync();
            
            if (!result.IsSuccess)
            {
                throw new InvalidOperationException($"Security initialization failed: {result.ErrorMessage}");
            }
            
            _logger.LogDebug("Security services initialized successfully");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to initialize security services");
            UpdateProgressWithError(StartupStep.InitializingSecurity, "Security initialization failed", ex.Message);
            throw new InvalidOperationException("Security initialization failed", ex);
        }
    }

    private async Task InitializeEmailProviderAsync(CancellationToken cancellationToken)
    {
        try
        {
            _logger.LogDebug("Initializing email provider");
            // TODO: Call provider initialization when interface is updated
            // For now, we'll assume it initializes successfully
            await Task.Delay(100, cancellationToken); // Simulate initialization
            _logger.LogDebug("Email provider initialized successfully");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to initialize email provider");
            UpdateProgressWithError(StartupStep.InitializingEmailProvider, "Email provider initialization failed", ex.Message);
            throw new InvalidOperationException("Email provider initialization failed", ex);
        }
    }

    private async Task InitializeLLMProviderAsync(CancellationToken cancellationToken)
    {
        try
        {
            _logger.LogDebug("Initializing LLM provider");
            // TODO: Call provider initialization when interface is updated
            // For now, we'll assume it initializes successfully
            await Task.Delay(100, cancellationToken); // Simulate initialization
            _logger.LogDebug("LLM provider initialized successfully");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to initialize LLM provider");
            UpdateProgressWithError(StartupStep.InitializingLLMProvider, "LLM provider initialization failed", ex.Message);
            throw new InvalidOperationException("LLM provider initialization failed", ex);
        }
    }

    private async Task PerformHealthChecksAsync(CancellationToken cancellationToken)
    {
        try
        {
            _logger.LogDebug("Performing provider health checks");
            
            // Refresh provider status to get current health
            await _providerStatusService.RefreshProviderStatusAsync();
            
            // Check if all providers are healthy
            var allHealthy = await _providerStatusService.AreAllProvidersHealthyAsync();
            if (!allHealthy)
            {
                var allStatus = await _providerStatusService.GetAllProviderStatusAsync();
                var unhealthyProviders = allStatus.Where(kvp => !kvp.Value.IsHealthy).Select(kvp => kvp.Key).ToArray();
                throw new InvalidOperationException($"Unhealthy providers: {string.Join(", ", unhealthyProviders)}");
            }
            
            _logger.LogDebug("All provider health checks passed");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Provider health checks failed");
            UpdateProgressWithError(StartupStep.CheckingProviderHealth, "Health checks failed", ex.Message);
            throw new InvalidOperationException("Health checks failed", ex);
        }
    }

    private void UpdateProgress(StartupStep step, string description, int completedSteps, bool isComplete = false)
    {
        var progress = new StartupProgress
        {
            CurrentStep = step,
            StepName = step.ToString(),
            StepDescription = description,
            CompletedSteps = completedSteps,
            TotalSteps = TotalSteps,
            ProgressPercentage = (double)completedSteps / TotalSteps * 100,
            IsComplete = isComplete,
            HasError = false
        };

        lock (_progressLock)
        {
            _currentProgress = progress;
        }

        OnProgressChanged(progress);
        _logger.LogDebug("Startup progress: {Step} - {Description} ({Completed}/{Total})", 
            step, description, completedSteps, TotalSteps);
    }

    private void UpdateProgressWithError(StartupStep step, string description, string errorMessage)
    {
        var progress = new StartupProgress
        {
            CurrentStep = StartupStep.Failed,
            StepName = step.ToString(),
            StepDescription = description,
            CompletedSteps = _currentProgress.CompletedSteps,
            TotalSteps = TotalSteps,
            ProgressPercentage = (double)_currentProgress.CompletedSteps / TotalSteps * 100,
            IsComplete = false,
            HasError = true,
            ErrorMessage = errorMessage
        };

        lock (_progressLock)
        {
            _currentProgress = progress;
        }

        OnProgressChanged(progress);
    }

    private void OnProgressChanged(StartupProgress progress)
    {
        try
        {
            ProgressChanged?.Invoke(this, new StartupProgressChangedEventArgs { Progress = progress });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception firing progress changed event");
        }
    }

    private StartupResult CreateFailureResult(TimeSpan duration, StartupFailureReason reason, string errorMessage)
    {
        return new StartupResult
        {
            IsSuccess = false,
            Status = "Startup failed",
            FailureReason = reason,
            ErrorMessage = errorMessage,
            Duration = duration,
            Details = new Dictionary<string, object>
            {
                { "total_steps", TotalSteps },
                { "completed_steps", _currentProgress.CompletedSteps },
                { "failed_step", _currentProgress.CurrentStep }
            }
        };
    }
}