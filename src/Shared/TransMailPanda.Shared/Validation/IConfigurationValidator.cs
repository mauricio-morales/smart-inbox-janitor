using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Options;
using TransMailPanda.Shared.Base;
using TransMailPanda.Shared.Models;

namespace TransMailPanda.Shared.Validation;

/// <summary>
/// Interface for validating provider configurations
/// Extends Microsoft.Extensions.Options.IValidateOptions with additional async capabilities
/// </summary>
/// <typeparam name="TConfig">The configuration type to validate</typeparam>
public interface IConfigurationValidator<TConfig> : IValidateOptions<TConfig>
    where TConfig : BaseProviderConfig
{
    /// <summary>
    /// Asynchronously validates the configuration with external dependencies
    /// </summary>
    /// <param name="name">The name of the configuration instance</param>
    /// <param name="config">The configuration to validate</param>
    /// <param name="context">Optional validation context</param>
    /// <param name="cancellationToken">Cancellation token for the operation</param>
    /// <returns>A result containing validation details</returns>
    Task<Result<ConfigurationValidationResult>> ValidateAsync(
        string name,
        TConfig config,
        ProviderConfigurationContext? context = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Validates that the configuration can connect to external dependencies
    /// </summary>
    /// <param name="config">The configuration to test</param>
    /// <param name="cancellationToken">Cancellation token for the operation</param>
    /// <returns>A result indicating whether connectivity is successful</returns>
    Task<Result<bool>> ValidateConnectivityAsync(TConfig config, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets the supported validation rules for this configuration type
    /// </summary>
    /// <returns>A list of supported validation rules</returns>
    IReadOnlyList<ConfigurationValidationRule> GetSupportedValidationRules();

    /// <summary>
    /// Gets the validation schema for this configuration type
    /// </summary>
    /// <returns>The validation schema</returns>
    ConfigurationValidationSchema GetValidationSchema();
}

