using System.Collections.Generic;

namespace TrashMailPanda.Shared.Factories;

/// <summary>
/// Describes the capabilities and features of a provider
/// </summary>
public sealed record ProviderCapabilities
{
    /// <summary>
    /// Gets the provider name
    /// </summary>
    public string ProviderName { get; init; } = string.Empty;

    /// <summary>
    /// Gets the provider version
    /// </summary>
    public string Version { get; init; } = string.Empty;

    /// <summary>
    /// Gets the supported operations
    /// </summary>
    public List<string> SupportedOperations { get; init; } = new();

    /// <summary>
    /// Gets the supported configuration options
    /// </summary>
    public List<string> SupportedConfigurationOptions { get; init; } = new();

    /// <summary>
    /// Gets the required dependencies
    /// </summary>
    public List<string> RequiredDependencies { get; init; } = new();

    /// <summary>
    /// Gets the optional dependencies
    /// </summary>
    public List<string> OptionalDependencies { get; init; } = new();

    /// <summary>
    /// Gets performance characteristics
    /// </summary>
    public Dictionary<string, object> PerformanceCharacteristics { get; init; } = new();

    /// <summary>
    /// Gets security features
    /// </summary>
    public List<string> SecurityFeatures { get; init; } = new();

    /// <summary>
    /// Gets compliance standards supported
    /// </summary>
    public List<string> ComplianceStandards { get; init; } = new();

    /// <summary>
    /// Gets platform compatibility information
    /// </summary>
    public PlatformCompatibility PlatformCompatibility { get; init; } = new();

    /// <summary>
    /// Gets additional capabilities metadata
    /// </summary>
    public Dictionary<string, object> AdditionalMetadata { get; init; } = new();
}