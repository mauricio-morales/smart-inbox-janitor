using System.Collections.Generic;

namespace TrashMailPanda.Shared.Validation;

/// <summary>
/// Schema definition for configuration validation
/// </summary>
public sealed record ConfigurationValidationSchema
{
    /// <summary>
    /// Gets the configuration type name
    /// </summary>
    public string TypeName { get; init; } = string.Empty;

    /// <summary>
    /// Gets the schema version
    /// </summary>
    public string Version { get; init; } = "1.0";

    /// <summary>
    /// Gets the property schemas
    /// </summary>
    public Dictionary<string, PropertyValidationSchema> Properties { get; init; } = new();

    /// <summary>
    /// Gets the validation rules for this schema
    /// </summary>
    public List<ConfigurationValidationRule> Rules { get; init; } = new();

    /// <summary>
    /// Gets schema-level metadata
    /// </summary>
    public Dictionary<string, object> Metadata { get; init; } = new();
}