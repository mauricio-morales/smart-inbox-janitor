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