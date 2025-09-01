using System.Collections.Generic;

namespace TrashMailPanda.Shared.Validation;

/// <summary>
/// Represents a configuration validation error
/// </summary>
public sealed record ConfigurationValidationError
{
    /// <summary>
    /// Gets the property name that failed validation
    /// </summary>
    public string PropertyName { get; init; } = string.Empty;

    /// <summary>
    /// Gets the error message
    /// </summary>
    public string ErrorMessage { get; init; } = string.Empty;

    /// <summary>
    /// Gets the error code for programmatic handling
    /// </summary>
    public string ErrorCode { get; init; } = string.Empty;

    /// <summary>
    /// Gets the validation rule that failed
    /// </summary>
    public string RuleName { get; init; } = string.Empty;

    /// <summary>
    /// Gets the invalid value
    /// </summary>
    public object? AttemptedValue { get; init; }

    /// <summary>
    /// Gets suggested fixes for the error
    /// </summary>
    public List<string> SuggestedFixes { get; init; } = new();

    /// <summary>
    /// Gets additional error context
    /// </summary>
    public Dictionary<string, object> Context { get; init; } = new();

    /// <summary>
    /// Returns a string representation of the error
    /// </summary>
    /// <returns>A string representation</returns>
    public override string ToString()
    {
        return $"{PropertyName}: {ErrorMessage} (Rule: {RuleName})";
    }
}