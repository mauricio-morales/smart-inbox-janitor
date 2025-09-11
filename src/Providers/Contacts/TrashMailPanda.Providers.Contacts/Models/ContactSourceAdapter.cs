using TrashMailPanda.Shared.Base;
using TrashMailPanda.Shared.Models;

namespace TrashMailPanda.Providers.Contacts.Models;

/// <summary>
/// Interface for platform-specific contact source adapters
/// Enables pluggable architecture for different contact platforms (Google, Apple, Windows, etc.)
/// </summary>
public interface IContactSourceAdapter
{
    /// <summary>
    /// The type of contact source this adapter handles
    /// </summary>
    ContactSourceType SourceType { get; }

    /// <summary>
    /// Whether this adapter is enabled and available
    /// </summary>
    bool IsEnabled { get; }

    /// <summary>
    /// Display name for this contact source
    /// </summary>
    string DisplayName { get; }

    /// <summary>
    /// Whether this adapter supports incremental synchronization
    /// </summary>
    bool SupportsIncrementalSync { get; }

    /// <summary>
    /// Fetches contacts from the source platform
    /// </summary>
    /// <param name="syncToken">Optional sync token for incremental sync</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Contacts and next sync token, or error</returns>
    Task<Result<(IEnumerable<Contact> Contacts, string? NextSyncToken)>> FetchContactsAsync(
        string? syncToken = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Validates the adapter configuration and connectivity
    /// </summary>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Result indicating validation success/failure</returns>
    Task<Result<bool>> ValidateAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets the current sync status and metadata
    /// </summary>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Sync status information</returns>
    Task<Result<AdapterSyncStatus>> GetSyncStatusAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Performs a health check on the adapter
    /// </summary>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Health check result</returns>
    Task<Result<HealthCheckResult>> HealthCheckAsync(CancellationToken cancellationToken = default);
}

/// <summary>
/// Sync status information for a contact source adapter
/// </summary>
public record AdapterSyncStatus
{
    /// <summary>
    /// Whether the adapter is currently synchronizing
    /// </summary>
    public bool IsSyncing { get; init; } = false;

    /// <summary>
    /// Timestamp of the last successful sync
    /// </summary>
    public DateTime? LastSuccessfulSync { get; init; }

    /// <summary>
    /// Timestamp of the last sync attempt (successful or failed)
    /// </summary>
    public DateTime? LastSyncAttempt { get; init; }

    /// <summary>
    /// Number of contacts currently cached from this source
    /// </summary>
    public int ContactCount { get; init; } = 0;

    /// <summary>
    /// Current sync token for incremental sync
    /// </summary>
    public string? CurrentSyncToken { get; init; }

    /// <summary>
    /// Error message from the last sync attempt, if any
    /// </summary>
    public string? LastSyncError { get; init; }

    /// <summary>
    /// Additional status metadata
    /// </summary>
    public Dictionary<string, object> Metadata { get; init; } = new();

    /// <summary>
    /// Whether the adapter is healthy and ready for sync operations
    /// </summary>
    public bool IsHealthy => string.IsNullOrEmpty(LastSyncError) &&
                            (LastSuccessfulSync == null || LastSuccessfulSync > DateTime.UtcNow.AddHours(-24));
}