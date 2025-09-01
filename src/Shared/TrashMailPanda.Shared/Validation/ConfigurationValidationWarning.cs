using System.Collections.Generic;

namespace TrashMailPanda.Shared.Validation;

/// <summary>
/// Represents a configuration validation warning
/// </summary>
public sealed record ConfigurationValidationWarning
{
    /// <summary>
    /// Gets the property name that triggered the warning
    /// </summary>
    public string PropertyName { get; init; } = string.Empty;

    /// <summary>
    /// Gets the warning message
    /// </summary>
    public string WarningMessage { get; init; } = string.Empty;

    /// <summary>
    /// Gets the warning code for programmatic handling
    /// </summary>
    public string WarningCode { get; init; } = string.Empty;

    /// <summary>
    /// Gets the validation rule that triggered the warning
    /// </summary>
    public string RuleName { get; init; } = string.Empty;

    /// <summary>
    /// Gets the current value that triggered the warning
    /// </summary>
    public object? CurrentValue { get; init; }

    /// <summary>
    /// Gets the severity level of the warning
    /// </summary>
    public WarningSeverity Severity { get; init; } = WarningSeverity.Low;

    /// <summary>
    /// Gets recommended actions to address the warning
    /// </summary>
    public List<string> RecommendedActions { get; init; } = new();

    /// <summary>
    /// Gets additional warning context
    /// </summary>
    public Dictionary<string, object> Context { get; init; } = new();

    /// <summary>
    /// Returns a string representation of the warning
    /// </summary>
    /// <returns>A string representation</returns>
    public override string ToString()
    {
        return $"{PropertyName}: {WarningMessage} (Severity: {Severity}, Rule: {RuleName})";
    }
}

/// <summary>
/// Represents the severity level of a validation warning
/// </summary>
public enum WarningSeverity
{
    /// <summary>
    /// Low severity warning - informational
    /// </summary>
    Low,

    /// <summary>
    /// Medium severity warning - recommended to address
    /// </summary>
    Medium,

    /// <summary>
    /// High severity warning - should be addressed soon
    /// </summary>
    High,

    /// <summary>
    /// Critical severity warning - should be addressed immediately
    /// </summary>
    Critical
}