using System;
using System.Collections.Generic;

namespace TrashMailPanda.Services;

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