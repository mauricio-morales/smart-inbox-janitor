using System;
using System.Threading;
using System.Threading.Tasks;
using TrashMailPanda.Shared.Base;

namespace TrashMailPanda.Shared.Security;

/// <summary>
/// Interface for automatic token rotation service
/// Provides timer-based scheduling and provider-specific token refresh
/// </summary>
public interface ITokenRotationService
{
    /// <summary>
    /// Gets a value indicating whether the rotation scheduler is currently running
    /// </summary>
    bool IsRunning { get; }

    /// <summary>
    /// Gets the interval between rotation checks
    /// </summary>
    TimeSpan CheckInterval { get; }

    /// <summary>
    /// Gets the number of tokens that have been rotated
    /// </summary>
    int TotalRotations { get; }

    /// <summary>
    /// Event fired when a token is rotated
    /// </summary>
    event EventHandler<TokenRotatedEventArgs>? TokenRotated;

    /// <summary>
    /// Event fired when a token rotation fails
    /// </summary>
    event EventHandler<TokenRotationFailedEventArgs>? TokenRotationFailed;

    /// <summary>
    /// Start the automatic token rotation scheduler
    /// </summary>
    /// <param name="cancellationToken">Cancellation token for the operation</param>
    /// <returns>Result indicating whether the scheduler was started successfully</returns>
    Task<Result<bool>> StartRotationSchedulerAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Stop the automatic token rotation scheduler
    /// </summary>
    /// <param name="cancellationToken">Cancellation token for the operation</param>
    /// <returns>Result indicating whether the scheduler was stopped successfully</returns>
    Task<Result<bool>> StopRotationSchedulerAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Manually rotate tokens for a specific provider
    /// </summary>
    /// <param name="providerName">Name of the provider to rotate tokens for</param>
    /// <param name="cancellationToken">Cancellation token for the operation</param>
    /// <returns>Result containing token rotation details</returns>
    Task<Result<TokenRotationResult>> RotateTokensAsync(string providerName, CancellationToken cancellationToken = default);

    /// <summary>
    /// Check if tokens for a specific provider are near expiry
    /// </summary>
    /// <param name="providerName">Name of the provider to check</param>
    /// <param name="cancellationToken">Cancellation token for the operation</param>
    /// <returns>Result indicating whether tokens are near expiry</returns>
    Task<Result<bool>> IsTokenNearExpiryAsync(string providerName, CancellationToken cancellationToken = default);

    /// <summary>
    /// Get the next scheduled rotation time for a provider
    /// </summary>
    /// <param name="providerName">Name of the provider to check</param>
    /// <param name="cancellationToken">Cancellation token for the operation</param>
    /// <returns>Result containing the next rotation time, or null if no rotation is scheduled</returns>
    Task<Result<DateTime?>> GetNextRotationTimeAsync(string providerName, CancellationToken cancellationToken = default);

    /// <summary>
    /// Configure rotation settings for a specific provider
    /// </summary>
    /// <param name="providerName">Name of the provider</param>
    /// <param name="settings">Rotation settings to apply</param>
    /// <param name="cancellationToken">Cancellation token for the operation</param>
    /// <returns>Result indicating whether the configuration was successful</returns>
    Task<Result<bool>> ConfigureProviderRotationAsync(string providerName, TokenRotationSettings settings, CancellationToken cancellationToken = default);

    /// <summary>
    /// Get rotation statistics for all providers
    /// </summary>
    /// <param name="cancellationToken">Cancellation token for the operation</param>
    /// <returns>Result containing rotation statistics</returns>
    Task<Result<TokenRotationStatistics>> GetRotationStatisticsAsync(CancellationToken cancellationToken = default);
}

/// <summary>
/// Settings for token rotation for a specific provider
/// </summary>
public sealed record TokenRotationSettings
{
    /// <summary>
    /// Gets whether rotation is enabled for this provider
    /// </summary>
    public bool IsEnabled { get; init; } = true;

    /// <summary>
    /// Gets the minimum time before expiry to trigger rotation
    /// </summary>
    public TimeSpan ExpiryThreshold { get; init; } = TimeSpan.FromHours(24);

    /// <summary>
    /// Gets the interval between rotation checks for this provider
    /// </summary>
    public TimeSpan CheckInterval { get; init; } = TimeSpan.FromHours(6);

    /// <summary>
    /// Gets the maximum number of retry attempts for failed rotations
    /// </summary>
    public int MaxRetries { get; init; } = 3;

    /// <summary>
    /// Gets the delay between retry attempts
    /// </summary>
    public TimeSpan RetryDelay { get; init; } = TimeSpan.FromMinutes(15);

    /// <summary>
    /// Gets whether to notify on successful rotations
    /// </summary>
    public bool NotifyOnSuccess { get; init; } = true;

    /// <summary>
    /// Gets whether to notify on failed rotations
    /// </summary>
    public bool NotifyOnFailure { get; init; } = true;
}

/// <summary>
/// Result of a token rotation operation
/// </summary>
public sealed record TokenRotationResult
{
    /// <summary>
    /// Gets the provider name
    /// </summary>
    public string ProviderName { get; init; } = string.Empty;

    /// <summary>
    /// Gets whether the token was actually rotated
    /// </summary>
    public bool WasRotated { get; init; }

    /// <summary>
    /// Gets the reason why rotation was or wasn't performed
    /// </summary>
    public string Reason { get; init; } = string.Empty;

    /// <summary>
    /// Gets the new expiry date if rotation was successful
    /// </summary>
    public DateTime? NewExpiryDate { get; init; }

    /// <summary>
    /// Gets the old expiry date before rotation
    /// </summary>
    public DateTime? PreviousExpiryDate { get; init; }

    /// <summary>
    /// Gets any error message if rotation failed
    /// </summary>
    public string? ErrorMessage { get; init; }

    /// <summary>
    /// Gets the timestamp when the rotation was attempted
    /// </summary>
    public DateTime AttemptedAt { get; init; } = DateTime.UtcNow;

    /// <summary>
    /// Gets the duration of the rotation operation
    /// </summary>
    public TimeSpan Duration { get; init; }
}

/// <summary>
/// Statistics about token rotations across all providers
/// </summary>
public sealed record TokenRotationStatistics
{
    /// <summary>
    /// Gets the total number of successful rotations
    /// </summary>
    public int TotalRotations { get; init; } = 0;

    /// <summary>
    /// Gets the total number of failed rotations
    /// </summary>
    public int TotalFailures { get; init; } = 0;

    /// <summary>
    /// Gets the average time taken for rotations
    /// </summary>
    public TimeSpan AverageRotationTime { get; init; } = TimeSpan.Zero;

    /// <summary>
    /// Gets the last successful rotation time
    /// </summary>
    public DateTime? LastSuccessfulRotation { get; init; }

    /// <summary>
    /// Gets the last failed rotation time
    /// </summary>
    public DateTime? LastFailedRotation { get; init; }

    /// <summary>
    /// Gets per-provider rotation statistics
    /// </summary>
    public Dictionary<string, ProviderRotationStatistics> ProviderStatistics { get; init; } = new();

    /// <summary>
    /// Gets the timestamp when these statistics were collected
    /// </summary>
    public DateTime CollectedAt { get; init; } = DateTime.UtcNow;
}

/// <summary>
/// Rotation statistics for a specific provider
/// </summary>
public sealed record ProviderRotationStatistics
{
    /// <summary>
    /// Gets the provider name
    /// </summary>
    public string ProviderName { get; init; } = string.Empty;

    /// <summary>
    /// Gets the number of successful rotations for this provider
    /// </summary>
    public int SuccessfulRotations { get; init; } = 0;

    /// <summary>
    /// Gets the number of failed rotations for this provider
    /// </summary>
    public int FailedRotations { get; init; } = 0;

    /// <summary>
    /// Gets the last successful rotation time for this provider
    /// </summary>
    public DateTime? LastSuccessfulRotation { get; init; }

    /// <summary>
    /// Gets the next scheduled rotation time for this provider
    /// </summary>
    public DateTime? NextScheduledRotation { get; init; }

    /// <summary>
    /// Gets the current token expiry time
    /// </summary>
    public DateTime? CurrentTokenExpiry { get; init; }

    /// <summary>
    /// Gets whether rotation is currently enabled for this provider
    /// </summary>
    public bool IsRotationEnabled { get; init; } = true;
}

/// <summary>
/// Event arguments for successful token rotation
/// </summary>
public sealed record TokenRotatedEventArgs
{
    /// <summary>
    /// Gets the provider name
    /// </summary>
    public string ProviderName { get; init; } = string.Empty;

    /// <summary>
    /// Gets the rotation result
    /// </summary>
    public TokenRotationResult Result { get; init; } = new();

    /// <summary>
    /// Gets the timestamp of the event
    /// </summary>
    public DateTime Timestamp { get; init; } = DateTime.UtcNow;
}

/// <summary>
/// Event arguments for failed token rotation
/// </summary>
public sealed record TokenRotationFailedEventArgs
{
    /// <summary>
    /// Gets the provider name
    /// </summary>
    public string ProviderName { get; init; } = string.Empty;

    /// <summary>
    /// Gets the error message
    /// </summary>
    public string ErrorMessage { get; init; } = string.Empty;

    /// <summary>
    /// Gets the exception if available
    /// </summary>
    public Exception? Exception { get; init; }

    /// <summary>
    /// Gets the number of retry attempts made
    /// </summary>
    public int RetryCount { get; init; } = 0;

    /// <summary>
    /// Gets whether this was the final retry attempt
    /// </summary>
    public bool IsFinalAttempt { get; init; } = true;

    /// <summary>
    /// Gets the timestamp of the event
    /// </summary>
    public DateTime Timestamp { get; init; } = DateTime.UtcNow;
}