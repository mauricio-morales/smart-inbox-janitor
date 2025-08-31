using System.Collections.Generic;

namespace TransMailPanda.Shared.Factories;

/// <summary>
/// Platform compatibility information
/// </summary>
public sealed record PlatformCompatibility
{
    /// <summary>
    /// Gets supported operating systems
    /// </summary>
    public List<string> SupportedOperatingSystems { get; init; } = new();

    /// <summary>
    /// Gets supported .NET versions
    /// </summary>
    public List<string> SupportedDotNetVersions { get; init; } = new();

    /// <summary>
    /// Gets supported architectures
    /// </summary>
    public List<string> SupportedArchitectures { get; init; } = new();

    /// <summary>
    /// Gets additional platform requirements
    /// </summary>
    public Dictionary<string, string> AdditionalRequirements { get; init; } = new();
}