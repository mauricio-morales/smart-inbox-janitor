using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using TrashMailPanda.Shared.Models;

namespace TrashMailPanda.Shared.Base;

/// <summary>
/// Generic base interface for all providers in the TrashMail Panda system
/// Provides consistent lifecycle management, error handling, and health monitoring
/// </summary>
/// <typeparam name="TConfig">The configuration type for this provider</typeparam>
public interface IProvider<TConfig> where TConfig : BaseProviderConfig
{
    /// <summary>
    /// Gets the unique name identifier for this provider
    /// </summary>
    string Name { get; }

    /// <summary>
    /// Gets the version of this provider implementation
    /// </summary>
    string Version { get; }

    /// <summary>
    /// Gets the current state of the provider
    /// </summary>
    ProviderState State { get; }

    /// <summary>
    /// Gets detailed information about the current provider state
    /// </summary>
    ProviderStateInfo StateInfo { get; }

    /// <summary>
    /// Gets the current configuration for this provider
    /// </summary>
    TConfig? Configuration { get; }

    /// <summary>
    /// Gets a value indicating whether the provider is currently healthy and can accept operations
    /// </summary>
    bool IsHealthy { get; }

    /// <summary>
    /// Gets a value indicating whether the provider can accept new operations
    /// </summary>
    bool CanAcceptOperations { get; }

    /// <summary>
    /// Gets the timestamp of the last successful operation
    /// </summary>
    DateTime? LastSuccessfulOperation { get; }

    /// <summary>
    /// Gets metrics and performance data for this provider
    /// </summary>
    IReadOnlyDictionary<string, double> Metrics { get; }

    /// <summary>
    /// Gets additional metadata about this provider
    /// </summary>
    IReadOnlyDictionary<string, object> Metadata { get; }

    /// <summary>
    /// Event fired when the provider state changes
    /// </summary>
    event EventHandler<ProviderStateChangedEventArgs>? StateChanged;

    /// <summary>
    /// Event fired when a provider operation completes (success or failure)
    /// </summary>
    event EventHandler<ProviderOperationEventArgs>? OperationCompleted;

    /// <summary>
    /// Event fired when provider metrics are updated
    /// </summary>
    event EventHandler<ProviderMetricsEventArgs>? MetricsUpdated;

    /// <summary>
    /// Initializes the provider with the specified configuration
    /// </summary>
    /// <param name="config">The configuration to use for initialization</param>
    /// <param name="cancellationToken">Cancellation token for the operation</param>
    /// <returns>A result indicating whether initialization was successful</returns>
    Task<Result<bool>> InitializeAsync(TConfig config, CancellationToken cancellationToken = default);

    /// <summary>
    /// Shuts down the provider gracefully, cleaning up resources
    /// </summary>
    /// <param name="cancellationToken">Cancellation token for the operation</param>
    /// <returns>A result indicating whether shutdown was successful</returns>
    Task<Result<bool>> ShutdownAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Validates the provided configuration without initializing the provider
    /// </summary>
    /// <param name="config">The configuration to validate</param>
    /// <param name="cancellationToken">Cancellation token for the operation</param>
    /// <returns>A result indicating whether the configuration is valid</returns>
    Task<Result<bool>> ValidateConfigurationAsync(TConfig config, CancellationToken cancellationToken = default);

    /// <summary>
    /// Performs a health check on the provider
    /// </summary>
    /// <param name="cancellationToken">Cancellation token for the operation</param>
    /// <returns>A result containing the health check results</returns>
    Task<Result<HealthCheckResult>> HealthCheckAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Updates the provider configuration at runtime
    /// </summary>
    /// <param name="config">The new configuration to apply</param>
    /// <param name="cancellationToken">Cancellation token for the operation</param>
    /// <returns>A result indicating whether the configuration update was successful</returns>
    Task<Result<bool>> UpdateConfigurationAsync(TConfig config, CancellationToken cancellationToken = default);

    /// <summary>
    /// Resets the provider to a clean state, typically after an error
    /// </summary>
    /// <param name="cancellationToken">Cancellation token for the operation</param>
    /// <returns>A result indicating whether the reset was successful</returns>
    Task<Result<bool>> ResetAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Suspends the provider temporarily (e.g., due to rate limiting)
    /// </summary>
    /// <param name="duration">Optional duration for the suspension</param>
    /// <param name="reason">Reason for the suspension</param>
    /// <param name="cancellationToken">Cancellation token for the operation</param>
    /// <returns>A result indicating whether the suspension was successful</returns>
    Task<Result<bool>> SuspendAsync(TimeSpan? duration = null, string? reason = null, CancellationToken cancellationToken = default);

    /// <summary>
    /// Resumes the provider from a suspended state
    /// </summary>
    /// <param name="cancellationToken">Cancellation token for the operation</param>
    /// <returns>A result indicating whether the resume was successful</returns>
    Task<Result<bool>> ResumeAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets comprehensive diagnostic information about the provider
    /// </summary>
    /// <param name="cancellationToken">Cancellation token for the operation</param>
    /// <returns>A result containing diagnostic information</returns>
    Task<Result<ProviderDiagnostics>> GetDiagnosticsAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Records a metric value for this provider
    /// </summary>
    /// <param name="name">The metric name</param>
    /// <param name="value">The metric value</param>
    /// <param name="tags">Optional tags for the metric</param>
    void RecordMetric(string name, double value, Dictionary<string, string>? tags = null);

    /// <summary>
    /// Gets the current metrics snapshot
    /// </summary>
    /// <returns>A snapshot of current metrics</returns>
    ProviderMetricsSnapshot GetMetricsSnapshot();

    /// <summary>
    /// Clears all recorded metrics
    /// </summary>
    void ClearMetrics();

    /// <summary>
    /// Waits for the provider to reach a specific state
    /// </summary>
    /// <param name="targetState">The state to wait for</param>
    /// <param name="timeout">Maximum time to wait</param>
    /// <param name="cancellationToken">Cancellation token for the operation</param>
    /// <returns>A result indicating whether the state was reached within the timeout</returns>
    Task<Result<bool>> WaitForStateAsync(ProviderState targetState, TimeSpan timeout, CancellationToken cancellationToken = default);
}

/// <summary>
/// Event arguments for provider state changes
/// </summary>
public sealed record ProviderStateChangedEventArgs
{
    /// <summary>
    /// Gets the provider name
    /// </summary>
    public string ProviderName { get; init; } = string.Empty;

    /// <summary>
    /// Gets the previous state
    /// </summary>
    public ProviderState PreviousState { get; init; }

    /// <summary>
    /// Gets the new state
    /// </summary>
    public ProviderState NewState { get; init; }

    /// <summary>
    /// Gets the new state information
    /// </summary>
    public ProviderStateInfo StateInfo { get; init; } = new();

    /// <summary>
    /// Gets the timestamp when the state changed
    /// </summary>
    public DateTime Timestamp { get; init; } = DateTime.UtcNow;

    /// <summary>
    /// Gets additional context about the state change
    /// </summary>
    public Dictionary<string, object> Context { get; init; } = new();
}

/// <summary>
/// Event arguments for provider operations
/// </summary>
public sealed record ProviderOperationEventArgs
{
    /// <summary>
    /// Gets the provider name
    /// </summary>
    public string ProviderName { get; init; } = string.Empty;

    /// <summary>
    /// Gets the operation name
    /// </summary>
    public string OperationName { get; init; } = string.Empty;

    /// <summary>
    /// Gets a value indicating whether the operation was successful
    /// </summary>
    public bool IsSuccess { get; init; }

    /// <summary>
    /// Gets the operation duration
    /// </summary>
    public TimeSpan Duration { get; init; }

    /// <summary>
    /// Gets the error if the operation failed
    /// </summary>
    public ProviderError? Error { get; init; }

    /// <summary>
    /// Gets the operation result metadata
    /// </summary>
    public Dictionary<string, object> Metadata { get; init; } = new();

    /// <summary>
    /// Gets the timestamp when the operation completed
    /// </summary>
    public DateTime Timestamp { get; init; } = DateTime.UtcNow;
}

/// <summary>
/// Event arguments for provider metrics updates
/// </summary>
public sealed record ProviderMetricsEventArgs
{
    /// <summary>
    /// Gets the provider name
    /// </summary>
    public string ProviderName { get; init; } = string.Empty;

    /// <summary>
    /// Gets the updated metrics
    /// </summary>
    public Dictionary<string, double> Metrics { get; init; } = new();

    /// <summary>
    /// Gets the timestamp when the metrics were updated
    /// </summary>
    public DateTime Timestamp { get; init; } = DateTime.UtcNow;
}

/// <summary>
/// Comprehensive diagnostic information about a provider
/// </summary>
public sealed record ProviderDiagnostics
{
    /// <summary>
    /// Gets the provider name
    /// </summary>
    public string ProviderName { get; init; } = string.Empty;

    /// <summary>
    /// Gets the provider version
    /// </summary>
    public string Version { get; init; } = string.Empty;

    /// <summary>
    /// Gets the current state information
    /// </summary>
    public ProviderStateInfo StateInfo { get; init; } = new();

    /// <summary>
    /// Gets the provider configuration (sanitized)
    /// </summary>
    public BaseProviderConfig? Configuration { get; init; }

    /// <summary>
    /// Gets the last health check result
    /// </summary>
    public HealthCheckResult? LastHealthCheck { get; init; }

    /// <summary>
    /// Gets current metrics
    /// </summary>
    public Dictionary<string, double> Metrics { get; init; } = new();

    /// <summary>
    /// Gets operational statistics
    /// </summary>
    public ProviderStatistics Statistics { get; init; } = new();

    /// <summary>
    /// Gets recent errors
    /// </summary>
    public List<ProviderError> RecentErrors { get; init; } = new();

    /// <summary>
    /// Gets performance history
    /// </summary>
    public List<PerformanceDataPoint> PerformanceHistory { get; init; } = new();

    /// <summary>
    /// Gets additional diagnostic details
    /// </summary>
    public Dictionary<string, object> Details { get; init; } = new();

    /// <summary>
    /// Gets the timestamp when diagnostics were collected
    /// </summary>
    public DateTime CollectedAt { get; init; } = DateTime.UtcNow;
}

/// <summary>
/// Operational statistics for a provider
/// </summary>
public sealed record ProviderStatistics
{
    /// <summary>
    /// Gets the total number of operations performed
    /// </summary>
    public long TotalOperations { get; init; } = 0;

    /// <summary>
    /// Gets the number of successful operations
    /// </summary>
    public long SuccessfulOperations { get; init; } = 0;

    /// <summary>
    /// Gets the number of failed operations
    /// </summary>
    public long FailedOperations { get; init; } = 0;

    /// <summary>
    /// Gets the success rate as a percentage
    /// </summary>
    public double SuccessRate => TotalOperations > 0 ? (double)SuccessfulOperations / TotalOperations * 100 : 0;

    /// <summary>
    /// Gets the average operation duration
    /// </summary>
    public TimeSpan AverageOperationDuration { get; init; } = TimeSpan.Zero;

    /// <summary>
    /// Gets the uptime since last initialization
    /// </summary>
    public TimeSpan Uptime { get; init; } = TimeSpan.Zero;

    /// <summary>
    /// Gets the number of times the provider has been reset
    /// </summary>
    public int ResetCount { get; init; } = 0;

    /// <summary>
    /// Gets the timestamp when statistics were reset
    /// </summary>
    public DateTime StatisticsResetAt { get; init; } = DateTime.UtcNow;
}

/// <summary>
/// A point-in-time performance measurement
/// </summary>
public sealed record PerformanceDataPoint
{
    /// <summary>
    /// Gets the timestamp for this data point
    /// </summary>
    public DateTime Timestamp { get; init; } = DateTime.UtcNow;

    /// <summary>
    /// Gets the operation being measured
    /// </summary>
    public string Operation { get; init; } = string.Empty;

    /// <summary>
    /// Gets the duration of the operation
    /// </summary>
    public TimeSpan Duration { get; init; }

    /// <summary>
    /// Gets a value indicating whether the operation was successful
    /// </summary>
    public bool Success { get; init; }

    /// <summary>
    /// Gets additional performance metadata
    /// </summary>
    public Dictionary<string, object> Metadata { get; init; } = new();
}

/// <summary>
/// Snapshot of provider metrics at a point in time
/// </summary>
public sealed record ProviderMetricsSnapshot
{
    /// <summary>
    /// Gets the provider name
    /// </summary>
    public string ProviderName { get; init; } = string.Empty;

    /// <summary>
    /// Gets the metrics values
    /// </summary>
    public Dictionary<string, double> Metrics { get; init; } = new();

    /// <summary>
    /// Gets the timestamp when the snapshot was taken
    /// </summary>
    public DateTime SnapshotAt { get; init; } = DateTime.UtcNow;

    /// <summary>
    /// Gets the time window for these metrics
    /// </summary>
    public TimeSpan TimeWindow { get; init; } = TimeSpan.Zero;

    /// <summary>
    /// Gets additional snapshot metadata
    /// </summary>
    public Dictionary<string, object> Metadata { get; init; } = new();
}