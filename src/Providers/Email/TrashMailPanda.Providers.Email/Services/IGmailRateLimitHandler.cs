using System;
using System.Threading;
using System.Threading.Tasks;
using TrashMailPanda.Shared.Base;

namespace TrashMailPanda.Providers.Email.Services;

/// <summary>
/// Interface for Gmail API rate limiting and retry handling
/// Provides exponential backoff and retry logic for Gmail API operations
/// </summary>
public interface IGmailRateLimitHandler
{
    /// <summary>
    /// Executes an operation with automatic retry and exponential backoff on rate limiting errors
    /// </summary>
    /// <typeparam name="T">The return type of the operation</typeparam>
    /// <param name="operation">The operation to execute</param>
    /// <param name="cancellationToken">Cancellation token for the operation</param>
    /// <returns>A result containing the operation outcome</returns>
    Task<Result<T>> ExecuteWithRetryAsync<T>(
        Func<Task<T>> operation,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Executes an operation that returns a Result with automatic retry and exponential backoff
    /// </summary>
    /// <typeparam name="T">The return type of the operation</typeparam>
    /// <param name="operation">The operation to execute</param>
    /// <param name="cancellationToken">Cancellation token for the operation</param>
    /// <returns>A result containing the operation outcome</returns>
    Task<Result<T>> ExecuteWithRetryAsync<T>(
        Func<Task<Result<T>>> operation,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Calculates the delay for the next retry attempt using exponential backoff
    /// </summary>
    /// <param name="attemptNumber">The current attempt number (zero-based)</param>
    /// <param name="baseDelay">The base delay for the first retry</param>
    /// <param name="maxDelay">The maximum delay allowed</param>
    /// <returns>The calculated delay duration</returns>
    TimeSpan CalculateDelay(int attemptNumber, TimeSpan baseDelay, TimeSpan maxDelay);
}