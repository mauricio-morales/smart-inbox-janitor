using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace TransMailPanda.Services;

/// <summary>
/// Interface for application-level services and coordination
/// </summary>
public interface IApplicationService
{
    /// <summary>
    /// Initialize the application and all its services
    /// </summary>
    Task<bool> InitializeAsync();

    /// <summary>
    /// Shutdown the application gracefully
    /// </summary>
    Task ShutdownAsync();

    /// <summary>
    /// Get the current application status
    /// </summary>
    ApplicationStatus GetStatus();

    /// <summary>
    /// Check if the application is ready to use
    /// </summary>
    bool IsReady { get; }
}

/// <summary>
/// Application status information
/// </summary>
public class ApplicationStatus
{
    public bool IsInitialized { get; init; }
    public bool IsReady { get; init; }
    public string Status { get; init; } = string.Empty;
    public DateTime LastUpdate { get; init; } = DateTime.UtcNow;
    public Dictionary<string, object> Details { get; init; } = new();
}