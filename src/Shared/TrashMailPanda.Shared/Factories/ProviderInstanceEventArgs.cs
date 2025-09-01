using System;

namespace TrashMailPanda.Shared.Factories;

/// <summary>
/// Event arguments for provider instance events
/// </summary>
public sealed record ProviderInstanceEventArgs
{
    public string InstanceName { get; init; } = string.Empty;
    public Type ProviderType { get; init; } = typeof(object);
    public string FactoryName { get; init; } = string.Empty;
    public DateTime EventTime { get; init; } = DateTime.UtcNow;
}