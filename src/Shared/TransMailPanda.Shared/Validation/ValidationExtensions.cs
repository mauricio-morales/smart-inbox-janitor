using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Reflection;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Options;
using TransMailPanda.Shared.Base;
using TransMailPanda.Shared.Models;

namespace TransMailPanda.Shared.Validation;

/// <summary>
/// Extension methods for configuration validation
/// </summary>
public static class ValidationExtensions
{
    /// <summary>
    /// Validates a configuration object using DataAnnotations
    /// </summary>
    /// <typeparam name="TConfig">The configuration type</typeparam>
    /// <param name="config">The configuration to validate</param>
    /// <returns>A result containing validation information</returns>
    public static Result<ConfigurationValidationResult> ValidateDataAnnotations<TConfig>(this TConfig config)
        where TConfig : BaseProviderConfig
    {
        var validationResults = new List<ValidationResult>();
        var validationContext = new ValidationContext(config, null, null);
        
        var isValid = Validator.TryValidateObject(config, validationContext, validationResults, validateAllProperties: true);
        
        if (isValid)
        {
            return Result<ConfigurationValidationResult>.Success(
                ConfigurationValidationResult.Success(appliedRules: new List<string> { "DataAnnotations" })
            );
        }

        var errors = validationResults.Select(vr => new ConfigurationValidationError
        {
            PropertyName = vr.MemberNames.FirstOrDefault() ?? "Unknown",
            ErrorMessage = vr.ErrorMessage ?? "Validation failed",
            ErrorCode = "DATA_ANNOTATION_VALIDATION",
            RuleName = "DataAnnotations",
            AttemptedValue = GetPropertyValue(config, vr.MemberNames.FirstOrDefault())
        }).ToList();

        var result = ConfigurationValidationResult.Failure(
            errors,
            appliedRules: new List<string> { "DataAnnotations" }
        );

        return Result<ConfigurationValidationResult>.Success(result);
    }

    /// <summary>
    /// Validates a configuration object using a custom validator
    /// </summary>
    /// <typeparam name="TConfig">The configuration type</typeparam>
    /// <param name="config">The configuration to validate</param>
    /// <param name="validator">The validator to use</param>
    /// <param name="context">Optional validation context</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>A result containing validation information</returns>
    public static async Task<Result<ConfigurationValidationResult>> ValidateAsync<TConfig>(
        this TConfig config,
        IConfigurationValidator<TConfig> validator,
        ProviderConfigurationContext? context = null,
        CancellationToken cancellationToken = default)
        where TConfig : BaseProviderConfig
    {
        try
        {
            return await validator.ValidateAsync(typeof(TConfig).Name, config, context, cancellationToken);
        }
        catch (Exception ex)
        {
            return Result<ConfigurationValidationResult>.Failure(ex.ToProviderError("Configuration validation failed"));
        }
    }

    /// <summary>
    /// Combines multiple validation results into a single result
    /// </summary>
    /// <param name="results">The validation results to combine</param>
    /// <returns>A combined validation result</returns>
    public static ConfigurationValidationResult Combine(this IEnumerable<ConfigurationValidationResult> results)
    {
        var resultsList = results.ToList();
        if (!resultsList.Any())
            return ConfigurationValidationResult.Success();

        var allErrors = resultsList.SelectMany(r => r.Errors).ToList();
        var allWarnings = resultsList.SelectMany(r => r.Warnings).ToList();
        var allSuggestions = resultsList.SelectMany(r => r.Suggestions).ToList();
        var allRules = resultsList.SelectMany(r => r.AppliedRules).Distinct().ToList();
        var totalDuration = resultsList.Aggregate(TimeSpan.Zero, (acc, r) => acc.Add(r.ValidationDuration));
        
        var isValid = allErrors.Count == 0;

        return new ConfigurationValidationResult
        {
            IsValid = isValid,
            Errors = allErrors,
            Warnings = allWarnings,
            Suggestions = allSuggestions,
            ValidationDuration = totalDuration,
            AppliedRules = allRules,
            Metadata = new Dictionary<string, object>
            {
                { "CombinedResults", resultsList.Count },
                { "TotalErrors", allErrors.Count },
                { "TotalWarnings", allWarnings.Count },
                { "TotalSuggestions", allSuggestions.Count }
            }
        };
    }

    /// <summary>
    /// Converts a ValidateOptionsResult to a ConfigurationValidationResult
    /// </summary>
    /// <param name="validateResult">The ValidateOptionsResult to convert</param>
    /// <param name="appliedRules">Rules that were applied</param>
    /// <returns>A ConfigurationValidationResult</returns>
    public static ConfigurationValidationResult ToConfigurationValidationResult(
        this ValidateOptionsResult validateResult,
        List<string>? appliedRules = null)
    {
        if (validateResult.Failed)
        {
            var errors = validateResult.Failures.Select(failure => new ConfigurationValidationError
            {
                PropertyName = "Configuration",
                ErrorMessage = failure,
                ErrorCode = "OPTIONS_VALIDATION",
                RuleName = "IValidateOptions"
            }).ToList();

            return ConfigurationValidationResult.Failure(errors, appliedRules: appliedRules ?? new List<string> { "IValidateOptions" });
        }

        return ConfigurationValidationResult.Success(appliedRules: appliedRules ?? new List<string> { "IValidateOptions" });
    }

    /// <summary>
    /// Creates a validation schema from a configuration type using reflection and DataAnnotations
    /// </summary>
    /// <typeparam name="TConfig">The configuration type</typeparam>
    /// <returns>A configuration validation schema</returns>
    public static ConfigurationValidationSchema CreateSchemaFromType<TConfig>()
        where TConfig : BaseProviderConfig
    {
        var configType = typeof(TConfig);
        var properties = configType.GetProperties(BindingFlags.Public | BindingFlags.Instance);
        var propertySchemas = new Dictionary<string, PropertyValidationSchema>();

        foreach (var property in properties)
        {
            var attributes = property.GetCustomAttributes<ValidationAttribute>().ToList();
            var schema = new PropertyValidationSchema
            {
                PropertyName = property.Name,
                PropertyType = property.PropertyType,
                IsRequired = attributes.OfType<RequiredAttribute>().Any(),
                ValidationAttributes = attributes
            };

            // Extract additional constraints from attributes
            foreach (var attr in attributes)
            {
                switch (attr)
                {
                    case RangeAttribute range:
                        schema = schema with { MinValue = range.Minimum, MaxValue = range.Maximum };
                        break;
                    case StringLengthAttribute stringLength:
                        schema = schema with { MinLength = stringLength.MinimumLength, MaxLength = stringLength.MaximumLength };
                        break;
                    case RegularExpressionAttribute regex:
                        schema = schema with { Pattern = regex.Pattern };
                        break;
                }
            }

            propertySchemas[property.Name] = schema;
        }

        return new ConfigurationValidationSchema
        {
            TypeName = configType.Name,
            Properties = propertySchemas,
            Rules = CreateDefaultRulesForType<TConfig>()
        };
    }

    /// <summary>
    /// Creates default validation rules for a configuration type
    /// </summary>
    /// <typeparam name="TConfig">The configuration type</typeparam>
    /// <returns>A list of default validation rules</returns>
    public static List<ConfigurationValidationRule> CreateDefaultRulesForType<TConfig>()
        where TConfig : BaseProviderConfig
    {
        var rules = new List<ConfigurationValidationRule>
        {
            new ConfigurationValidationRule
            {
                Name = "RequiredFields",
                Description = "Validates that all required fields are provided",
                Category = ValidationRuleCategory.Structure,
                Severity = ValidationRuleSeverity.Error
            },
            new ConfigurationValidationRule
            {
                Name = "DataTypes",
                Description = "Validates that all fields have correct data types",
                Category = ValidationRuleCategory.Structure,
                Severity = ValidationRuleSeverity.Error
            },
            new ConfigurationValidationRule
            {
                Name = "ValueRanges",
                Description = "Validates that numeric values are within acceptable ranges",
                Category = ValidationRuleCategory.Business,
                Severity = ValidationRuleSeverity.Warning
            },
            new ConfigurationValidationRule
            {
                Name = "StringFormats",
                Description = "Validates that string values match expected formats",
                Category = ValidationRuleCategory.Structure,
                Severity = ValidationRuleSeverity.Error
            }
        };

        // Add type-specific rules based on common patterns
        var configTypeName = typeof(TConfig).Name;
        if (configTypeName.Contains("Email", StringComparison.OrdinalIgnoreCase))
        {
            rules.Add(new ConfigurationValidationRule
            {
                Name = "EmailConnectivity",
                Description = "Validates connectivity to email services",
                Category = ValidationRuleCategory.Connectivity,
                Severity = ValidationRuleSeverity.Warning,
                RequiresConnectivity = true
            });
        }

        if (configTypeName.Contains("Database", StringComparison.OrdinalIgnoreCase) || 
            configTypeName.Contains("Storage", StringComparison.OrdinalIgnoreCase))
        {
            rules.Add(new ConfigurationValidationRule
            {
                Name = "DatabaseConnectivity",
                Description = "Validates connectivity to database services",
                Category = ValidationRuleCategory.Connectivity,
                Severity = ValidationRuleSeverity.Error,
                RequiresConnectivity = true
            });
        }

        return rules;
    }

    /// <summary>
    /// Validates that a configuration has no sensitive information in plain text
    /// </summary>
    /// <typeparam name="TConfig">The configuration type</typeparam>
    /// <param name="config">The configuration to validate</param>
    /// <returns>A validation result focusing on security issues</returns>
    public static ConfigurationValidationResult ValidateSecurity<TConfig>(this TConfig config)
        where TConfig : BaseProviderConfig
    {
        var warnings = new List<ConfigurationValidationWarning>();
        var suggestions = new List<ConfigurationValidationSuggestion>();

        var properties = typeof(TConfig).GetProperties(BindingFlags.Public | BindingFlags.Instance);
        var sensitivePropertyNames = new[] { "password", "secret", "key", "token", "credential" };

        foreach (var property in properties)
        {
            if (property.PropertyType == typeof(string))
            {
                var propertyName = property.Name.ToLowerInvariant();
                var value = property.GetValue(config)?.ToString();

                if (sensitivePropertyNames.Any(sensitive => propertyName.Contains(sensitive)) && 
                    !string.IsNullOrEmpty(value))
                {
                    warnings.Add(new ConfigurationValidationWarning
                    {
                        PropertyName = property.Name,
                        WarningMessage = "Sensitive information should be encrypted or stored securely",
                        WarningCode = "SENSITIVE_DATA_PLAINTEXT",
                        RuleName = "SecurityValidation",
                        CurrentValue = "***REDACTED***",
                        RecommendedActions = new List<string>
                        {
                            "Use secure configuration providers",
                            "Encrypt sensitive values",
                            "Use environment variables or secure key vaults"
                        }
                    });

                    suggestions.Add(new ConfigurationValidationSuggestion
                    {
                        PropertyName = property.Name,
                        SuggestionMessage = "Consider using ISecureStorageManager for this sensitive value",
                        Category = ConfigurationSuggestionCategory.Security,
                        Priority = ConfigurationSuggestionPriority.High,
                        Rationale = "Sensitive information should not be stored in plain text configuration",
                        ExpectedImpact = "Improved security and compliance with security best practices"
                    });
                }
            }
        }

        return new ConfigurationValidationResult
        {
            IsValid = true,
            Warnings = warnings,
            Suggestions = suggestions,
            AppliedRules = new List<string> { "SecurityValidation" }
        };
    }

    /// <summary>
    /// Validates that a configuration follows performance best practices
    /// </summary>
    /// <typeparam name="TConfig">The configuration type</typeparam>
    /// <param name="config">The configuration to validate</param>
    /// <returns>A validation result focusing on performance issues</returns>
    public static ConfigurationValidationResult ValidatePerformance<TConfig>(this TConfig config)
        where TConfig : BaseProviderConfig
    {
        var warnings = new List<ConfigurationValidationWarning>();
        var suggestions = new List<ConfigurationValidationSuggestion>();

        // Check timeout values
        if (config.TimeoutSeconds > 300) // 5 minutes
        {
            warnings.Add(new ConfigurationValidationWarning
            {
                PropertyName = nameof(config.TimeoutSeconds),
                WarningMessage = "Timeout value is very high, which may impact user experience",
                WarningCode = "HIGH_TIMEOUT_VALUE",
                RuleName = "PerformanceValidation",
                CurrentValue = config.TimeoutSeconds,
                RecommendedActions = new List<string>
                {
                    "Consider reducing timeout to improve responsiveness",
                    "Implement proper cancellation handling",
                    "Use shorter timeouts with retry logic"
                }
            });
        }

        // Check retry configuration
        if (config.MaxRetryAttempts > 5)
        {
            suggestions.Add(new ConfigurationValidationSuggestion
            {
                PropertyName = nameof(config.MaxRetryAttempts),
                SuggestionMessage = "High retry count may cause delays in failure scenarios",
                Category = ConfigurationSuggestionCategory.Performance,
                Priority = ConfigurationSuggestionPriority.Medium,
                CurrentValue = config.MaxRetryAttempts,
                SuggestedValue = 3,
                Rationale = "Excessive retries can compound failure scenarios",
                ExpectedImpact = "Faster failure detection and better user experience"
            });
        }

        // Check retry delay
        if (config.RetryDelayMilliseconds > 10000) // 10 seconds
        {
            warnings.Add(new ConfigurationValidationWarning
            {
                PropertyName = nameof(config.RetryDelayMilliseconds),
                WarningMessage = "Long retry delays may impact system responsiveness",
                WarningCode = "HIGH_RETRY_DELAY",
                RuleName = "PerformanceValidation",
                CurrentValue = config.RetryDelayMilliseconds,
                RecommendedActions = new List<string>
                {
                    "Use exponential backoff for retry delays",
                    "Consider shorter initial delays",
                    "Implement jitter to avoid thundering herd problems"
                }
            });
        }

        return new ConfigurationValidationResult
        {
            IsValid = true,
            Warnings = warnings,
            Suggestions = suggestions,
            AppliedRules = new List<string> { "PerformanceValidation" }
        };
    }

    /// <summary>
    /// Gets the value of a property by name using reflection
    /// </summary>
    /// <param name="obj">The object to get the property value from</param>
    /// <param name="propertyName">The name of the property</param>
    /// <returns>The property value or null if not found</returns>
    private static object? GetPropertyValue(object obj, string? propertyName)
    {
        if (string.IsNullOrEmpty(propertyName))
            return null;

        var property = obj.GetType().GetProperty(propertyName, BindingFlags.Public | BindingFlags.Instance);
        return property?.GetValue(obj);
    }

    /// <summary>
    /// Validates multiple configurations and returns a combined result
    /// </summary>
    /// <param name="configurations">The configurations to validate</param>
    /// <returns>A combined validation result</returns>
    public static async Task<Result<ConfigurationValidationResult>> ValidateAllAsync(
        this IEnumerable<(object Config, object Validator)> configurations)
    {
        var tasks = configurations.Select(async item =>
        {
            try
            {
                if (item.Validator is IConfigurationValidator<BaseProviderConfig> genericValidator &&
                    item.Config is BaseProviderConfig config)
                {
                    return await genericValidator.ValidateAsync(item.Config.GetType().Name, config);
                }

                // Fallback to basic DataAnnotations validation
                if (item.Config is BaseProviderConfig baseConfig)
                {
                    return baseConfig.ValidateDataAnnotations();
                }

                return Result<ConfigurationValidationResult>.Failure(
                    new ValidationError("Unsupported configuration type for validation"));
            }
            catch (Exception ex)
            {
                return Result<ConfigurationValidationResult>.Failure(
                    ex.ToProviderError("Configuration validation failed"));
            }
        });

        var results = await Task.WhenAll(tasks);
        var successResults = results.Where(r => r.IsSuccess).Select(r => r.Value);
        var failureResults = results.Where(r => r.IsFailure);

        if (failureResults.Any())
        {
            var firstFailure = failureResults.First();
            return Result<ConfigurationValidationResult>.Failure(firstFailure.Error);
        }

        var combinedResult = successResults.Combine();
        return Result<ConfigurationValidationResult>.Success(combinedResult);
    }
}