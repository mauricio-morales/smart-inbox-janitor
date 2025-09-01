using System;
using System.Threading;
using System.Threading.Tasks;

namespace TrashMailPanda.Services;

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