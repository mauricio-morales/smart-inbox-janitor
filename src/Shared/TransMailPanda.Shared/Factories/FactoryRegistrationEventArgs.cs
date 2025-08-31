using System;

namespace TransMailPanda.Shared.Factories;

/// <summary>
/// Event arguments for factory registration events
/// </summary>
public sealed record FactoryRegistrationEventArgs
{
    public string FactoryName { get; init; } = string.Empty;
    public IProviderFactory Factory { get; init; } = null!;
    public DateTime RegistrationTime { get; init; } = DateTime.UtcNow;
}