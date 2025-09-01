using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace TrashMailPanda.Services;

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