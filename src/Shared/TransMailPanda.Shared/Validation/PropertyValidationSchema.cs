using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace TransMailPanda.Shared.Validation;

/// <summary>
/// Schema definition for validating a specific property
/// </summary>
public sealed record PropertyValidationSchema
{
    /// <summary>
    /// Gets the property name
    /// </summary>
    public string PropertyName { get; init; } = string.Empty;

    /// <summary>
    /// Gets the property type
    /// </summary>
    public Type PropertyType { get; init; } = typeof(object);

    /// <summary>
    /// Gets a value indicating whether the property is required
    /// </summary>
    public bool IsRequired { get; init; } = false;

    /// <summary>
    /// Gets the default value for the property
    /// </summary>
    public object? DefaultValue { get; init; }

    /// <summary>
    /// Gets the minimum allowed value (for numeric types)
    /// </summary>
    public object? MinValue { get; init; }

    /// <summary>
    /// Gets the maximum allowed value (for numeric types)
    /// </summary>
    public object? MaxValue { get; init; }

    /// <summary>
    /// Gets the minimum allowed length (for strings and collections)
    /// </summary>
    public int? MinLength { get; init; }

    /// <summary>
    /// Gets the maximum allowed length (for strings and collections)
    /// </summary>
    public int? MaxLength { get; init; }

    /// <summary>
    /// Gets a regular expression pattern for string validation
    /// </summary>
    public string? Pattern { get; init; }

    /// <summary>
    /// Gets allowed values for the property
    /// </summary>
    public List<object> AllowedValues { get; init; } = new();

    /// <summary>
    /// Gets forbidden values for the property
    /// </summary>
    public List<object> ForbiddenValues { get; init; } = new();

    /// <summary>
    /// Gets custom validation rules for this property
    /// </summary>
    public List<ConfigurationValidationRule> ValidationRules { get; init; } = new();

    /// <summary>
    /// Gets the property description for documentation
    /// </summary>
    public string Description { get; init; } = string.Empty;

    /// <summary>
    /// Gets examples of valid values
    /// </summary>
    public List<object> Examples { get; init; } = new();

    /// <summary>
    /// Gets tags for categorizing this property
    /// </summary>
    public List<string> Tags { get; init; } = new();

    /// <summary>
    /// Gets a value indicating whether the property contains sensitive data
    /// </summary>
    public bool IsSensitive { get; init; } = false;

    /// <summary>
    /// Gets additional metadata about the property
    /// </summary>
    public Dictionary<string, object> Metadata { get; init; } = new();

    /// <summary>
    /// Gets validation attributes applied to this property
    /// </summary>
    public List<ValidationAttribute> ValidationAttributes { get; init; } = new();

    /// <summary>
    /// Gets validation options specific to this property
    /// </summary>
    public PropertyValidationOptions ValidationOptions { get; init; } = new();

    /// <summary>
    /// Returns a string representation of the property schema
    /// </summary>
    /// <returns>A string representation</returns>
    public override string ToString()
    {
        return $"{PropertyName} ({PropertyType.Name}): Required={IsRequired}, Rules={ValidationRules.Count}";
    }
}

/// <summary>
/// Options for property-specific validation
/// </summary>
public sealed class PropertyValidationOptions
{
    /// <summary>
    /// Gets or sets whether to perform strict type validation
    /// </summary>
    public bool StrictTypeValidation { get; set; } = true;

    /// <summary>
    /// Gets or sets whether to validate format for string properties
    /// </summary>
    public bool ValidateFormat { get; set; } = true;

    /// <summary>
    /// Gets or sets whether to validate range for numeric properties
    /// </summary>
    public bool ValidateRange { get; set; } = true;

    /// <summary>
    /// Gets or sets whether to validate length for string and collection properties
    /// </summary>
    public bool ValidateLength { get; set; } = true;

    /// <summary>
    /// Gets or sets whether to validate against allowed/forbidden values
    /// </summary>
    public bool ValidateAllowedValues { get; set; } = true;

    /// <summary>
    /// Gets or sets custom validation timeout in milliseconds
    /// </summary>
    public int ValidationTimeoutMs { get; set; } = 5000;
}