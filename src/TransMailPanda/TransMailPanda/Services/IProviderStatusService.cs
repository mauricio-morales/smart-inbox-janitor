using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace TransMailPanda.Services;

/// <summary>
/// Interface for monitoring provider status and health
/// </summary>
public interface IProviderStatusService
{
    /// <summary>
    /// Get the status of all providers
    /// </summary>
    Task<Dictionary<string, ProviderStatus>> GetAllProviderStatusAsync();

    /// <summary>
    /// Get the status of a specific provider
    /// </summary>
    Task<ProviderStatus?> GetProviderStatusAsync(string providerName);

    /// <summary>
    /// Check if all providers are healthy
    /// </summary>
    Task<bool> AreAllProvidersHealthyAsync();

    /// <summary>
    /// Refresh provider status information
    /// </summary>
    Task RefreshProviderStatusAsync();

    /// <summary>
    /// Event that fires when provider status changes
    /// </summary>
    event EventHandler<ProviderStatusChangedEventArgs>? ProviderStatusChanged;
}

/// <summary>
/// Status information for a provider
/// </summary>
public record ProviderStatus
{
    public string Name { get; init; } = string.Empty;
    public bool IsHealthy { get; init; }
    public bool IsInitialized { get; init; }
    public bool RequiresSetup { get; init; }
    public string Status { get; init; } = string.Empty;
    public string? ErrorMessage { get; init; }
    public DateTime LastCheck { get; init; } = DateTime.UtcNow;
    public Dictionary<string, object> Details { get; init; } = new();
}

/// <summary>
/// Event arguments for provider status changes
/// </summary>
public class ProviderStatusChangedEventArgs : EventArgs
{
    public string ProviderName { get; init; } = string.Empty;
    public ProviderStatus Status { get; init; } = new();
    public ProviderStatus? PreviousStatus { get; init; }
}