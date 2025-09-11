using System;
using System.Collections.Generic;
using TrashMailPanda.Shared.Models;
using TrashMailPanda.Providers.Contacts.Services;

namespace TrashMailPanda.Providers.Contacts.Models;

/// <summary>
/// Result of a contacts synchronization operation
/// </summary>
public class ContactsSyncResult
{
    /// <summary>
    /// Whether the sync operation was successful overall
    /// </summary>
    public bool IsSuccessful { get; set; }

    /// <summary>
    /// Total number of contacts synchronized across all adapters
    /// </summary>
    public int ContactsSynced { get; set; }

    /// <summary>
    /// Type of sync performed (Full, Incremental)
    /// </summary>
    public string SyncType { get; set; } = string.Empty;

    /// <summary>
    /// Timestamp when the sync was completed
    /// </summary>
    public DateTime SyncedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Individual results from each contact source adapter
    /// </summary>
    public List<AdapterSyncResult> AdapterResults { get; set; } = new();

    /// <summary>
    /// Any error messages from the sync operation
    /// </summary>
    public string? ErrorMessage { get; set; }

    /// <summary>
    /// Additional metadata about the sync operation
    /// </summary>
    public Dictionary<string, object> Metadata { get; set; } = new();
}

/// <summary>
/// Result of synchronization from a specific contact source adapter
/// </summary>
public class AdapterSyncResult
{
    /// <summary>
    /// The contact source type this result applies to
    /// </summary>
    public ContactSourceType SourceType { get; set; }

    /// <summary>
    /// Whether the sync from this adapter was successful
    /// </summary>
    public bool IsSuccessful { get; set; }

    /// <summary>
    /// Number of contacts synchronized from this adapter
    /// </summary>
    public int ContactsSynced { get; set; }

    /// <summary>
    /// Next sync token for incremental synchronization
    /// </summary>
    public string? NextSyncToken { get; set; }

    /// <summary>
    /// Error message if the sync failed
    /// </summary>
    public string? ErrorMessage { get; set; }

    /// <summary>
    /// Duration of the sync operation
    /// </summary>
    public TimeSpan? Duration { get; set; }

    /// <summary>
    /// Timestamp when this adapter sync was completed
    /// </summary>
    public DateTime SyncedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// Overall status of the contacts provider
/// </summary>
public class ContactsProviderStatus
{
    /// <summary>
    /// Whether the contacts provider is enabled
    /// </summary>
    public bool IsEnabled { get; set; }

    /// <summary>
    /// Whether the provider is in a healthy state
    /// </summary>
    public bool IsHealthy { get; set; }

    /// <summary>
    /// Total number of contacts synchronized since startup
    /// </summary>
    public long TotalContactsSynced { get; set; }

    /// <summary>
    /// Total number of trust signals computed since startup
    /// </summary>
    public long TrustSignalsComputed { get; set; }

    /// <summary>
    /// Timestamp of the last full synchronization
    /// </summary>
    public DateTime? LastFullSync { get; set; }

    /// <summary>
    /// Timestamp of the last incremental synchronization
    /// </summary>
    public DateTime? LastIncrementalSync { get; set; }

    /// <summary>
    /// Status information for each contact source adapter
    /// </summary>
    public List<AdapterSyncStatus> AdapterStatuses { get; set; } = new();

    /// <summary>
    /// Cache performance statistics
    /// </summary>
    public CacheStatistics CacheStatistics { get; set; } = new();

    /// <summary>
    /// Additional diagnostic information
    /// </summary>
    public Dictionary<string, object> Diagnostics { get; set; } = new();

    /// <summary>
    /// Configuration information (sanitized)
    /// </summary>
    public object? Configuration { get; set; }
}