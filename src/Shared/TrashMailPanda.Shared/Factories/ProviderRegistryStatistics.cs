using System;
using System.Collections.Generic;

namespace TrashMailPanda.Shared.Factories;

/// <summary>
/// Statistics about the provider registry
/// </summary>
public sealed record ProviderRegistryStatistics
{
    public int TotalFactories { get; init; } = 0;
    public int TotalProviderTypes { get; init; } = 0;
    public int TotalInstances { get; init; } = 0;
    public int ActiveInstances { get; init; } = 0;
    public int InactiveInstances { get; init; } = 0;
    public List<string> FactoryNames { get; init; } = new();
    public List<string> ProviderTypes { get; init; } = new();
    public DateTime CreatedAt { get; init; } = DateTime.UtcNow;
}