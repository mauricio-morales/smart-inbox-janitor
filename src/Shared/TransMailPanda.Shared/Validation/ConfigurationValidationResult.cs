using System;
using System.Collections.Generic;

namespace TransMailPanda.Shared.Validation;

/// <summary>
/// Result of configuration validation
/// </summary>
public sealed record ConfigurationValidationResult
{
    /// <summary>
    /// Gets a value indicating whether validation was successful
    /// </summary>
    public bool IsValid { get; init; }

    /// <summary>
    /// Gets validation errors
    /// </summary>
    public List<ConfigurationValidationError> Errors { get; init; } = new();

    /// <summary>
    /// Gets validation warnings
    /// </summary>
    public List<ConfigurationValidationWarning> Warnings { get; init; } = new();

    /// <summary>
    /// Gets validation suggestions for improvement
    /// </summary>
    public List<ConfigurationValidationSuggestion> Suggestions { get; init; } = new();

    /// <summary>
    /// Gets the validation duration
    /// </summary>
    public TimeSpan ValidationDuration { get; init; }

    /// <summary>
    /// Gets additional validation metadata
    /// </summary>
    public Dictionary<string, object> Metadata { get; init; } = new();

    /// <summary>
    /// Gets the validation timestamp
    /// </summary>
    public DateTime ValidatedAt { get; init; } = DateTime.UtcNow;

    /// <summary>
    /// Gets the validation rules that were applied
    /// </summary>
    public List<string> AppliedRules { get; init; } = new();

    /// <summary>
    /// Creates a successful validation result
    /// </summary>
    /// <param name="duration">Validation duration</param>
    /// <param name="appliedRules">Rules that were applied</param>
    /// <returns>A successful validation result</returns>
    public static ConfigurationValidationResult Success(TimeSpan? duration = null, List<string>? appliedRules = null)
    {
        return new ConfigurationValidationResult
        {
            IsValid = true,
            ValidationDuration = duration ?? TimeSpan.Zero,
            AppliedRules = appliedRules ?? new List<string>()
        };
    }

    /// <summary>
    /// Creates a failed validation result
    /// </summary>
    /// <param name="errors">Validation errors</param>
    /// <param name="duration">Validation duration</param>
    /// <param name="appliedRules">Rules that were applied</param>
    /// <returns>A failed validation result</returns>
    public static ConfigurationValidationResult Failure(
        List<ConfigurationValidationError> errors,
        TimeSpan? duration = null,
        List<string>? appliedRules = null)
    {
        return new ConfigurationValidationResult
        {
            IsValid = false,
            Errors = errors,
            ValidationDuration = duration ?? TimeSpan.Zero,
            AppliedRules = appliedRules ?? new List<string>()
        };
    }

    /// <summary>
    /// Gets a summary of the validation result
    /// </summary>
    /// <returns>A validation summary</returns>
    public string GetSummary()
    {
        if (IsValid)
            return $"Configuration is valid ({Warnings.Count} warnings, {Suggestions.Count} suggestions)";
        return $"Configuration is invalid ({Errors.Count} errors, {Warnings.Count} warnings)";
    }
}