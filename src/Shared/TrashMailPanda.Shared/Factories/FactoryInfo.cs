using System;
using System.Collections.Generic;
using TrashMailPanda.Shared.Models;

namespace TrashMailPanda.Shared.Factories;

/// <summary>
/// Information about a registered factory
/// </summary>
public sealed record FactoryInfo
{
    public string FactoryName { get; init; } = string.Empty;
    public Type ProviderType { get; init; } = typeof(object);
    public Type ConfigurationType { get; init; } = typeof(object);
    public ProviderCapabilities Capabilities { get; init; } = new();
    public IReadOnlyDictionary<string, object> Metadata { get; init; } = new Dictionary<string, object>();
}