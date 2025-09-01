using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace TrashMailPanda.Shared.Validation;

/// <summary>
/// Represents a configuration validation rule
/// </summary>
public sealed record ConfigurationValidationRule
{
    /// <summary>
    /// Gets the unique name of the validation rule
    /// </summary>
    public string Name { get; init; } = string.Empty;

    /// <summary>
    /// Gets the display name for the rule
    /// </summary>
    public string DisplayName { get; init; } = string.Empty;

    /// <summary>
    /// Gets the description of what this rule validates
    /// </summary>
    public string Description { get; init; } = string.Empty;

    /// <summary>
    /// Gets the category of this validation rule
    /// </summary>
    public ValidationRuleCategory Category { get; init; } = ValidationRuleCategory.General;

    /// <summary>
    /// Gets the severity level if this rule fails
    /// </summary>
    public ValidationRuleSeverity Severity { get; init; } = ValidationRuleSeverity.Error;

    /// <summary>
    /// Gets the property names this rule applies to (empty means all properties)
    /// </summary>
    public List<string> ApplicableProperties { get; init; } = new();

    /// <summary>
    /// Gets the conditions under which this rule should be applied
    /// </summary>
    public List<string> Conditions { get; init; } = new();

    /// <summary>
    /// Gets the validation function delegate
    /// </summary>
    public Func<object, ValidationRuleContext, Task<ValidationRuleResult>>? ValidationFunction { get; init; }

    /// <summary>
    /// Gets the error message template for validation failures
    /// </summary>
    public string ErrorMessageTemplate { get; init; } = "Validation rule '{RuleName}' failed for property '{PropertyName}'";

    /// <summary>
    /// Gets the warning message template for validation warnings
    /// </summary>
    public string WarningMessageTemplate { get; init; } = "Validation rule '{RuleName}' generated a warning for property '{PropertyName}'";

    /// <summary>
    /// Gets suggested fixes when this rule fails
    /// </summary>
    public List<string> SuggestedFixes { get; init; } = new();

    /// <summary>
    /// Gets rule-specific metadata
    /// </summary>
    public Dictionary<string, object> Metadata { get; init; } = new();

    /// <summary>
    /// Gets a value indicating whether this rule is enabled
    /// </summary>
    public bool IsEnabled { get; init; } = true;

    /// <summary>
    /// Gets the priority/order for rule execution (lower numbers execute first)
    /// </summary>
    public int ExecutionPriority { get; init; } = 100;

    /// <summary>
    /// Gets the timeout for rule execution in milliseconds
    /// </summary>
    public int TimeoutMs { get; init; } = 5000;

    /// <summary>
    /// Gets a value indicating whether this rule requires network connectivity
    /// </summary>
    public bool RequiresConnectivity { get; init; } = false;

    /// <summary>
    /// Returns a string representation of the validation rule
    /// </summary>
    /// <returns>A string representation</returns>
    public override string ToString()
    {
        return $"{Name} ({Category}, {Severity}): {Description}";
    }
}

/// <summary>
/// Context information for validation rule execution
/// </summary>
public sealed class ValidationRuleContext
{
    /// <summary>
    /// Gets or sets the property name being validated
    /// </summary>
    public string PropertyName { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the property value being validated
    /// </summary>
    public object? PropertyValue { get; set; }

    /// <summary>
    /// Gets or sets the entire configuration object being validated
    /// </summary>
    public object? ConfigurationObject { get; set; }

    /// <summary>
    /// Gets or sets the property schema being used for validation
    /// </summary>
    public PropertyValidationSchema? PropertySchema { get; set; }

    /// <summary>
    /// Gets or sets the validation options
    /// </summary>
    public Dictionary<string, object> ValidationOptions { get; set; } = new();

    /// <summary>
    /// Gets or sets the cancellation token for async validation
    /// </summary>
    public CancellationToken CancellationToken { get; set; } = default;

    /// <summary>
    /// Gets or sets additional context metadata
    /// </summary>
    public Dictionary<string, object> Metadata { get; set; } = new();
}

/// <summary>
/// Result of validation rule execution
/// </summary>
public sealed class ValidationRuleResult
{
    /// <summary>
    /// Gets or sets a value indicating whether validation passed
    /// </summary>
    public bool IsValid { get; set; } = true;

    /// <summary>
    /// Gets or sets the validation message
    /// </summary>
    public string Message { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the result severity
    /// </summary>
    public ValidationRuleSeverity Severity { get; set; } = ValidationRuleSeverity.Info;

    /// <summary>
    /// Gets or sets suggested fixes for validation failures
    /// </summary>
    public List<string> SuggestedFixes { get; set; } = new();

    /// <summary>
    /// Gets or sets additional result metadata
    /// </summary>
    public Dictionary<string, object> Metadata { get; set; } = new();

    /// <summary>
    /// Creates a successful validation result
    /// </summary>
    /// <param name="message">Optional success message</param>
    /// <returns>A successful validation result</returns>
    public static ValidationRuleResult Success(string message = "")
    {
        return new ValidationRuleResult
        {
            IsValid = true,
            Message = message,
            Severity = ValidationRuleSeverity.Info
        };
    }

    /// <summary>
    /// Creates a failed validation result
    /// </summary>
    /// <param name="message">Error message</param>
    /// <param name="severity">Severity level</param>
    /// <param name="suggestedFixes">Suggested fixes</param>
    /// <returns>A failed validation result</returns>
    public static ValidationRuleResult Failure(string message, ValidationRuleSeverity severity = ValidationRuleSeverity.Error, List<string>? suggestedFixes = null)
    {
        return new ValidationRuleResult
        {
            IsValid = false,
            Message = message,
            Severity = severity,
            SuggestedFixes = suggestedFixes ?? new List<string>()
        };
    }
}

/// <summary>
/// Categories for validation rules
/// </summary>
public enum ValidationRuleCategory
{
    /// <summary>
    /// General validation rules
    /// </summary>
    General,

    /// <summary>
    /// Security-related validation rules
    /// </summary>
    Security,

    /// <summary>
    /// Performance-related validation rules
    /// </summary>
    Performance,

    /// <summary>
    /// Data format validation rules
    /// </summary>
    Format,

    /// <summary>
    /// Business logic validation rules
    /// </summary>
    Business,

    /// <summary>
    /// Compliance-related validation rules
    /// </summary>
    Compliance,

    /// <summary>
    /// Configuration-specific validation rules
    /// </summary>
    Configuration,

    /// <summary>
    /// Data structure validation rules
    /// </summary>
    Structure,

    /// <summary>
    /// Connectivity-related validation rules
    /// </summary>
    Connectivity
}

/// <summary>
/// Severity levels for validation rules
/// </summary>
public enum ValidationRuleSeverity
{
    /// <summary>
    /// Informational message
    /// </summary>
    Info,

    /// <summary>
    /// Warning message
    /// </summary>
    Warning,

    /// <summary>
    /// Error message
    /// </summary>
    Error,

    /// <summary>
    /// Critical error message
    /// </summary>
    Critical
}