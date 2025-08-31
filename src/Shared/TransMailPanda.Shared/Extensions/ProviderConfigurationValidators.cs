using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using Microsoft.Extensions.Options;
using TransMailPanda.Shared.Base;
using TransMailPanda.Shared.Models;

namespace TransMailPanda.Shared.Extensions;

/// <summary>
/// Configuration validator for provider system settings
/// Validates system-wide provider configuration options
/// </summary>
public sealed class ProviderSystemConfigurationValidator : IValidateOptions<ProviderSystemConfiguration>
{
    /// <summary>
    /// Validates provider system configuration
    /// </summary>
    /// <param name="name">The configuration name</param>
    /// <param name="options">The configuration options</param>
    /// <returns>Validation result</returns>
    public ValidateOptionsResult Validate(string? name, ProviderSystemConfiguration options)
    {
        var failures = new List<string>();

        // Validate timeout configuration
        if (options.DefaultProviderTimeout <= TimeSpan.Zero)
        {
            failures.Add("DefaultProviderTimeout must be greater than zero");
        }

        if (options.DefaultProviderTimeout > TimeSpan.FromMinutes(30))
        {
            failures.Add("DefaultProviderTimeout should not exceed 30 minutes for optimal performance");
        }

        // Validate concurrency configuration
        if (options.MaxConcurrentOperations <= 0)
        {
            failures.Add("MaxConcurrentOperations must be greater than zero");
        }

        if (options.MaxConcurrentOperations > Environment.ProcessorCount * 10)
        {
            failures.Add($"MaxConcurrentOperations ({options.MaxConcurrentOperations}) is very high compared to processor count ({Environment.ProcessorCount}). Consider reducing for better performance.");
        }

        // Validate additional configuration if provided
        if (options.AdditionalConfiguration.Any())
        {
            foreach (var kvp in options.AdditionalConfiguration)
            {
                if (string.IsNullOrWhiteSpace(kvp.Key))
                {
                    failures.Add("AdditionalConfiguration keys cannot be null or empty");
                    break;
                }
            }
        }

        return failures.Count == 0 
            ? ValidateOptionsResult.Success 
            : ValidateOptionsResult.Fail(failures);
    }
}

/// <summary>
/// Generic configuration validator using DataAnnotations
/// Provides standardized validation for any provider configuration type
/// </summary>
/// <typeparam name="TOptions">The configuration type to validate</typeparam>
public sealed class DataAnnotationValidateOptions<TOptions> : IValidateOptions<TOptions> where TOptions : class
{
    /// <summary>
    /// Validates configuration using DataAnnotations attributes
    /// </summary>
    /// <param name="name">The configuration name</param>
    /// <param name="options">The configuration options</param>
    /// <returns>Validation result with detailed error information</returns>
    public ValidateOptionsResult Validate(string? name, TOptions options)
    {
        if (options == null)
        {
            return ValidateOptionsResult.Fail("Configuration cannot be null");
        }

        var validationResults = new List<ValidationResult>();
        var validationContext = new ValidationContext(options);

        var isValid = Validator.TryValidateObject(options, validationContext, validationResults, validateAllProperties: true);

        if (isValid)
        {
            return ValidateOptionsResult.Success;
        }

        var failures = validationResults
            .Select(result => $"{string.Join(", ", result.MemberNames)}: {result.ErrorMessage}")
            .Where(failure => !string.IsNullOrEmpty(failure))
            .ToList();

        if (failures.Count == 0)
        {
            failures.Add("Validation failed but no specific errors were provided");
        }

        return ValidateOptionsResult.Fail(failures);
    }
}

/// <summary>
/// Specialized configuration validator for BaseProviderConfig and derived types
/// Provides enhanced validation for provider-specific configuration
/// </summary>
/// <typeparam name="TProviderConfig">The provider configuration type</typeparam>
public sealed class ProviderConfigurationValidator<TProviderConfig> : IValidateOptions<TProviderConfig> 
    where TProviderConfig : BaseProviderConfig
{
    /// <summary>
    /// Validates provider configuration with enhanced checks
    /// </summary>
    /// <param name="name">The configuration name</param>
    /// <param name="options">The configuration options</param>
    /// <returns>Validation result with provider-specific validation</returns>
    public ValidateOptionsResult Validate(string? name, TProviderConfig options)
    {
        if (options == null)
        {
            return ValidateOptionsResult.Fail("Provider configuration cannot be null");
        }

        var failures = new List<string>();

        try
        {
            // Use the provider's built-in validation
            var validationResult = options.ValidateConfiguration();
            if (validationResult.IsFailure)
            {
                failures.Add($"Provider validation failed: {validationResult.Error}");
            }

            // Perform DataAnnotations validation
            var dataAnnotationValidator = new DataAnnotationValidateOptions<TProviderConfig>();
            var dataAnnotationResult = dataAnnotationValidator.Validate(name, options);
            
            if (!dataAnnotationResult.Succeeded && dataAnnotationResult.Failures != null)
            {
                failures.AddRange(dataAnnotationResult.Failures);
            }

            // Additional provider-specific validation
            ValidateProviderSpecificConfiguration(options, failures);
        }
        catch (Exception ex)
        {
            failures.Add($"Configuration validation failed with exception: {ex.Message}");
        }

        return failures.Count == 0 
            ? ValidateOptionsResult.Success 
            : ValidateOptionsResult.Fail(failures);
    }

    /// <summary>
    /// Performs provider-specific validation that goes beyond DataAnnotations
    /// </summary>
    /// <param name="options">The configuration options</param>
    /// <param name="failures">List to add validation failures to</param>
    private static void ValidateProviderSpecificConfiguration(TProviderConfig options, List<string> failures)
    {
        // Validate timeout settings if present
        if (options.GetType().GetProperty("Timeout")?.GetValue(options) is TimeSpan timeout)
        {
            if (timeout <= TimeSpan.Zero)
            {
                failures.Add("Provider timeout must be greater than zero");
            }
            else if (timeout > TimeSpan.FromMinutes(10))
            {
                failures.Add("Provider timeout should not exceed 10 minutes");
            }
        }

        // Validate retry settings if present
        if (options.GetType().GetProperty("MaxRetryAttempts")?.GetValue(options) is int maxRetries)
        {
            if (maxRetries < 0)
            {
                failures.Add("MaxRetryAttempts cannot be negative");
            }
            else if (maxRetries > 10)
            {
                failures.Add("MaxRetryAttempts should not exceed 10 for optimal performance");
            }
        }

        // Validate connection strings or URLs if present
        var urlProperties = options.GetType().GetProperties()
            .Where(p => p.Name.Contains("Url", StringComparison.OrdinalIgnoreCase) || 
                       p.Name.Contains("Endpoint", StringComparison.OrdinalIgnoreCase))
            .Where(p => p.PropertyType == typeof(string));

        foreach (var urlProperty in urlProperties)
        {
            if (urlProperty.GetValue(options) is string urlValue && !string.IsNullOrEmpty(urlValue))
            {
                if (!Uri.TryCreate(urlValue, UriKind.Absolute, out var uri))
                {
                    failures.Add($"{urlProperty.Name} is not a valid URL: {urlValue}");
                }
                else if (uri.Scheme != "https" && uri.Scheme != "http")
                {
                    failures.Add($"{urlProperty.Name} must use HTTP or HTTPS scheme: {urlValue}");
                }
            }
        }

        // Validate API key or token properties (should not be empty if required)
        var credentialProperties = options.GetType().GetProperties()
            .Where(p => p.Name.Contains("ApiKey", StringComparison.OrdinalIgnoreCase) ||
                       p.Name.Contains("Token", StringComparison.OrdinalIgnoreCase) ||
                       p.Name.Contains("Secret", StringComparison.OrdinalIgnoreCase))
            .Where(p => p.PropertyType == typeof(string));

        foreach (var credentialProperty in credentialProperties)
        {
            // Check if the property has a Required attribute
            var requiredAttribute = credentialProperty.GetCustomAttributes(typeof(RequiredAttribute), false).FirstOrDefault() as RequiredAttribute;
            if (requiredAttribute != null)
            {
                if (credentialProperty.GetValue(options) is not string credentialValue || string.IsNullOrWhiteSpace(credentialValue))
                {
                    failures.Add($"{credentialProperty.Name} is required but was not provided");
                }
                else if (credentialValue.Length < 8)
                {
                    failures.Add($"{credentialProperty.Name} appears to be too short for a valid credential");
                }
            }
        }
    }
}