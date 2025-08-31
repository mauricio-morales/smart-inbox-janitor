using System;
using TransMailPanda.Shared.Base;
using TransMailPanda.Shared.Models;

namespace TransMailPanda.Shared.Factories;

/// <summary>
/// Information about a provider instance
/// </summary>
public sealed record ProviderInstanceInfo
{
    public string InstanceName { get; init; } = string.Empty;
    public Type ProviderType { get; init; } = typeof(object);
    public string FactoryName { get; init; } = string.Empty;
    public BaseProviderConfig? Configuration { get; init; }
    public DateTime CreatedAt { get; init; } = DateTime.UtcNow;
    public DateTime? LastAccessedAt { get; init; }
    public bool IsActive { get; init; } = true;
}