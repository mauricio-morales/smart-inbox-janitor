using System.Collections.Generic;

namespace TrashMailPanda.Shared.Validation;

/// <summary>
/// Represents a configuration validation suggestion for improvement
/// </summary>
public sealed record ConfigurationValidationSuggestion
{
    /// <summary>
    /// Gets the property name related to the suggestion
    /// </summary>
    public string PropertyName { get; init; } = string.Empty;

    /// <summary>
    /// Gets the suggestion message
    /// </summary>
    public string SuggestionMessage { get; init; } = string.Empty;

    /// <summary>
    /// Gets the suggestion code for programmatic handling
    /// </summary>
    public string SuggestionCode { get; init; } = string.Empty;

    /// <summary>
    /// Gets the validation rule that generated this suggestion
    /// </summary>
    public string RuleName { get; init; } = string.Empty;

    /// <summary>
    /// Gets the current value that could be improved
    /// </summary>
    public object? CurrentValue { get; init; }

    /// <summary>
    /// Gets suggested values that would be better
    /// </summary>
    public List<object> SuggestedValues { get; init; } = new();

    /// <summary>
    /// Gets the priority of this suggestion
    /// </summary>
    public SuggestionPriority Priority { get; init; } = SuggestionPriority.Low;

    /// <summary>
    /// Gets the category of this suggestion
    /// </summary>
    public SuggestionCategory Category { get; init; } = SuggestionCategory.Optimization;

    /// <summary>
    /// Gets the potential benefits of implementing this suggestion
    /// </summary>
    public List<string> Benefits { get; init; } = new();

    /// <summary>
    /// Gets additional suggestion context
    /// </summary>
    public Dictionary<string, object> Context { get; init; } = new();

    /// <summary>
    /// Gets estimated impact of implementing this suggestion
    /// </summary>
    public string ImpactDescription { get; init; } = string.Empty;

    /// <summary>
    /// Gets a single suggested value (for compatibility with existing code)
    /// </summary>
    public object? SuggestedValue { get; init; }

    /// <summary>
    /// Gets the rationale for this suggestion
    /// </summary>
    public string Rationale { get; init; } = string.Empty;

    /// <summary>
    /// Gets the expected impact of implementing this suggestion
    /// </summary>
    public string ExpectedImpact { get; init; } = string.Empty;

    /// <summary>
    /// Returns a string representation of the suggestion
    /// </summary>
    /// <returns>A string representation</returns>
    public override string ToString()
    {
        return $"{PropertyName}: {SuggestionMessage} (Priority: {Priority}, Category: {Category})";
    }
}

/// <summary>
/// Represents the priority level of a validation suggestion
/// </summary>
public enum SuggestionPriority
{
    /// <summary>
    /// Low priority - nice to have improvement
    /// </summary>
    Low,

    /// <summary>
    /// Medium priority - recommended improvement
    /// </summary>
    Medium,

    /// <summary>
    /// High priority - important improvement
    /// </summary>
    High,

    /// <summary>
    /// Critical priority - highly recommended improvement
    /// </summary>
    Critical
}

/// <summary>
/// Represents the category of a validation suggestion
/// </summary>
public enum SuggestionCategory
{
    /// <summary>
    /// Performance optimization suggestion
    /// </summary>
    Performance,

    /// <summary>
    /// Security enhancement suggestion
    /// </summary>
    Security,

    /// <summary>
    /// Reliability improvement suggestion
    /// </summary>
    Reliability,

    /// <summary>
    /// Maintainability improvement suggestion
    /// </summary>
    Maintainability,

    /// <summary>
    /// General optimization suggestion
    /// </summary>
    Optimization,

    /// <summary>
    /// Best practices suggestion
    /// </summary>
    BestPractices,

    /// <summary>
    /// Compliance-related suggestion
    /// </summary>
    Compliance
}

/// <summary>
/// Type alias for ConfigurationSuggestionCategory to maintain compatibility
/// </summary>
public static class ConfigurationSuggestionCategory
{
    public const SuggestionCategory Performance = SuggestionCategory.Performance;
    public const SuggestionCategory Security = SuggestionCategory.Security;
    public const SuggestionCategory Reliability = SuggestionCategory.Reliability;
    public const SuggestionCategory Maintainability = SuggestionCategory.Maintainability;
    public const SuggestionCategory Optimization = SuggestionCategory.Optimization;
    public const SuggestionCategory BestPractices = SuggestionCategory.BestPractices;
    public const SuggestionCategory Compliance = SuggestionCategory.Compliance;
}

/// <summary>
/// Type alias for ConfigurationSuggestionPriority to maintain compatibility
/// </summary>
public static class ConfigurationSuggestionPriority
{
    public const SuggestionPriority Low = SuggestionPriority.Low;
    public const SuggestionPriority Medium = SuggestionPriority.Medium;
    public const SuggestionPriority High = SuggestionPriority.High;
    public const SuggestionPriority Critical = SuggestionPriority.Critical;
}