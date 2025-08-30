using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace TransMailPanda.Services;

/// <summary>
/// Interface for orchestrating application startup sequence
/// </summary>
public interface IStartupOrchestrator
{
    /// <summary>
    /// Execute the startup orchestration sequence
    /// </summary>
    /// <param name="cancellationToken">Cancellation token for the operation</param>
    Task<StartupResult> ExecuteStartupAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Get the current startup progress
    /// </summary>
    StartupProgress GetProgress();

    /// <summary>
    /// Event that fires when startup progress changes
    /// </summary>
    event EventHandler<StartupProgressChangedEventArgs>? ProgressChanged;
}

/// <summary>
/// Result of the startup orchestration
/// </summary>
public class StartupResult
{
    public bool IsSuccess { get; init; }
    public string Status { get; init; } = string.Empty;
    public StartupFailureReason? FailureReason { get; init; }
    public string? ErrorMessage { get; init; }
    public TimeSpan Duration { get; init; }
    public Dictionary<string, object> Details { get; init; } = new();
}

/// <summary>
/// Current startup progress information
/// </summary>
public class StartupProgress
{
    public StartupStep CurrentStep { get; init; }
    public string StepName { get; init; } = string.Empty;
    public string StepDescription { get; init; } = string.Empty;
    public int CompletedSteps { get; init; }
    public int TotalSteps { get; init; }
    public double ProgressPercentage { get; init; }
    public bool IsComplete { get; init; }
    public bool HasError { get; init; }
    public string? ErrorMessage { get; init; }
}

/// <summary>
/// Startup steps enumeration
/// </summary>
public enum StartupStep
{
    Initializing,
    InitializingStorage,
    InitializingSecurity,
    InitializingEmailProvider,
    InitializingLLMProvider,
    CheckingProviderHealth,
    Ready,
    Failed
}

/// <summary>
/// Reasons for startup failure
/// </summary>
public enum StartupFailureReason
{
    StorageInitializationFailed,
    SecurityInitializationFailed,
    EmailProviderFailed,
    LLMProviderFailed,
    HealthCheckFailed,
    Timeout,
    Cancelled,
    UnknownError
}

/// <summary>
/// Event arguments for startup progress changes
/// </summary>
public class StartupProgressChangedEventArgs : EventArgs
{
    public StartupProgress Progress { get; init; } = new();
}