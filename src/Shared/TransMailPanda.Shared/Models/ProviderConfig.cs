using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using TransMailPanda.Shared.Base;

namespace TransMailPanda.Shared.Models;

/// <summary>
/// Base configuration class for all providers
/// Provides common configuration properties and validation patterns
/// </summary>
public abstract class BaseProviderConfig
{
    /// <summary>
    /// Gets or sets the provider name identifier
    /// </summary>
    [Required(ErrorMessage = "Provider name is required")]
    [StringLength(100, MinimumLength = 1, ErrorMessage = "Provider name must be between 1 and 100 characters")]
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets whether the provider is enabled
    /// </summary>
    public bool IsEnabled { get; set; } = true;

    /// <summary>
    /// Gets or sets the timeout in seconds for provider operations
    /// </summary>
    [Range(1, 3600, ErrorMessage = "Timeout must be between 1 and 3600 seconds")]
    public int TimeoutSeconds { get; set; } = 30;

    /// <summary>
    /// Gets or sets the maximum retry attempts for transient failures
    /// </summary>
    [Range(0, 10, ErrorMessage = "Max retry attempts must be between 0 and 10")]
    public int MaxRetryAttempts { get; set; } = 3;

    /// <summary>
    /// Gets or sets the retry delay in milliseconds
    /// </summary>
    [Range(100, 60000, ErrorMessage = "Retry delay must be between 100ms and 60000ms")]
    public int RetryDelayMilliseconds { get; set; } = 1000;

    /// <summary>
    /// Gets or sets additional configuration properties
    /// </summary>
    public Dictionary<string, object> AdditionalProperties { get; set; } = new();

    /// <summary>
    /// Gets or sets tags for categorizing and filtering providers
    /// </summary>
    public List<string> Tags { get; set; } = new();

    /// <summary>
    /// Gets or sets the configuration version for schema evolution
    /// </summary>
    public string ConfigVersion { get; set; } = "1.0";

    /// <summary>
    /// Gets or sets when this configuration was last updated
    /// </summary>
    public DateTime LastUpdated { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Validates the configuration and returns any validation errors
    /// </summary>
    /// <returns>A result indicating whether the configuration is valid</returns>
    public virtual Result ValidateConfiguration()
    {
        var validationResults = new List<ValidationResult>();
        var validationContext = new ValidationContext(this);
        
        if (!Validator.TryValidateObject(this, validationContext, validationResults, true))
        {
            var errors = string.Join("; ", validationResults.Select(r => r.ErrorMessage));
            return Result.Failure(new ValidationError($"Configuration validation failed: {errors}"));
        }

        return Result.Success();
    }

    /// <summary>
    /// Performs custom validation logic specific to the provider type
    /// Override in derived classes for provider-specific validation
    /// </summary>
    /// <returns>A result indicating whether the custom validation passed</returns>
    protected virtual Result ValidateCustomLogic()
    {
        return Result.Success();
    }

    /// <summary>
    /// Gets a copy of the configuration with sensitive information removed
    /// Override in derived classes to mask sensitive properties
    /// </summary>
    /// <returns>A sanitized copy of the configuration</returns>
    public virtual BaseProviderConfig GetSanitizedCopy()
    {
        // Create a shallow copy by default
        // Derived classes should override to properly sanitize sensitive data
        return (BaseProviderConfig)MemberwiseClone();
    }

    /// <summary>
    /// Merges this configuration with another configuration
    /// Properties from the other configuration take precedence
    /// </summary>
    /// <param name="other">The configuration to merge with</param>
    /// <returns>A result containing the merged configuration or an error</returns>
    public virtual Result<BaseProviderConfig> MergeWith(BaseProviderConfig other)
    {
        if (other == null)
            return Result<BaseProviderConfig>.Failure(new ValidationError("Cannot merge with null configuration"));

        if (other.GetType() != GetType())
            return Result<BaseProviderConfig>.Failure(new ValidationError($"Cannot merge configurations of different types: {GetType().Name} and {other.GetType().Name}"));

        try
        {
            var merged = (BaseProviderConfig)MemberwiseClone();
            merged.IsEnabled = other.IsEnabled;
            merged.TimeoutSeconds = other.TimeoutSeconds;
            merged.MaxRetryAttempts = other.MaxRetryAttempts;
            merged.RetryDelayMilliseconds = other.RetryDelayMilliseconds;
            merged.Tags = new List<string>(other.Tags);
            merged.ConfigVersion = other.ConfigVersion;
            merged.LastUpdated = DateTime.UtcNow;

            // Merge additional properties
            merged.AdditionalProperties = new Dictionary<string, object>(AdditionalProperties);
            foreach (var kvp in other.AdditionalProperties)
            {
                merged.AdditionalProperties[kvp.Key] = kvp.Value;
            }

            return Result<BaseProviderConfig>.Success(merged);
        }
        catch (Exception ex)
        {
            return Result<BaseProviderConfig>.Failure(ex.ToProviderError("Failed to merge configurations"));
        }
    }

    /// <summary>
    /// Returns a string representation of the configuration
    /// </summary>
    /// <returns>A string representation</returns>
    public override string ToString()
    {
        return $"{Name} (Enabled: {IsEnabled}, Version: {ConfigVersion})";
    }
}

/// <summary>
/// Configuration validation context for providers
/// </summary>
public sealed class ProviderConfigurationContext
{
    /// <summary>
    /// Gets or sets the environment (Development, Staging, Production)
    /// </summary>
    public string Environment { get; set; } = "Development";

    /// <summary>
    /// Gets or sets the application instance identifier
    /// </summary>
    public string InstanceId { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets configuration-specific metadata
    /// </summary>
    public Dictionary<string, object> Metadata { get; set; } = new();

    /// <summary>
    /// Gets or sets external configuration sources
    /// </summary>
    public List<string> ConfigurationSources { get; set; } = new();

    /// <summary>
    /// Gets or sets validation requirements for this context
    /// </summary>
    public ConfigurationValidationOptions ValidationOptions { get; set; } = new();
}

/// <summary>
/// Options for configuration validation
/// </summary>
public sealed class ConfigurationValidationOptions
{
    /// <summary>
    /// Gets or sets whether strict validation should be performed
    /// </summary>
    public bool StrictValidation { get; set; } = true;

    /// <summary>
    /// Gets or sets whether to validate external dependencies
    /// </summary>
    public bool ValidateExternalDependencies { get; set; } = true;

    /// <summary>
    /// Gets or sets whether to validate network connectivity
    /// </summary>
    public bool ValidateNetworkConnectivity { get; set; } = false;

    /// <summary>
    /// Gets or sets custom validation rules
    /// </summary>
    public List<string> CustomValidationRules { get; set; } = new();

    /// <summary>
    /// Gets or sets the validation timeout in seconds
    /// </summary>
    [Range(1, 300, ErrorMessage = "Validation timeout must be between 1 and 300 seconds")]
    public int ValidationTimeoutSeconds { get; set; } = 30;
}