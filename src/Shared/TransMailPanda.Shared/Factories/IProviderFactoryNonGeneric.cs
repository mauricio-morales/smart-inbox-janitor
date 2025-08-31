using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using TransMailPanda.Shared.Base;
using TransMailPanda.Shared.Models;

namespace TransMailPanda.Shared.Factories;

/// <summary>
/// Non-generic factory interface for runtime provider creation
/// Enables creating providers when types are only known at runtime
/// </summary>
public interface IProviderFactory
{
    /// <summary>
    /// Gets the provider type that this factory creates
    /// </summary>
    Type ProviderType { get; }

    /// <summary>
    /// Gets the configuration type for the provider
    /// </summary>
    Type ConfigurationType { get; }

    /// <summary>
    /// Gets the factory name identifier
    /// </summary>
    string FactoryName { get; }

    /// <summary>
    /// Gets a value indicating whether this factory supports the specified provider and configuration types
    /// </summary>
    /// <param name="providerType">The provider type to check</param>
    /// <param name="configurationType">The configuration type to check</param>
    /// <returns>True if the factory supports both types</returns>
    bool SupportsTypes(Type providerType, Type configurationType);

    /// <summary>
    /// Creates a new provider instance with the specified configuration
    /// </summary>
    /// <param name="config">The configuration for the provider</param>
    /// <param name="logger">Logger for the provider</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>A result containing the created provider or an error</returns>
    Task<Result<object>> CreateProviderAsync(object config, ILogger logger, CancellationToken cancellationToken = default);

    /// <summary>
    /// Validates that the factory can create a provider with the specified configuration
    /// </summary>
    /// <param name="config">The configuration to validate</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>A result indicating whether the provider can be created</returns>
    Task<Result<bool>> ValidateProviderCreationAsync(object config, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets the capabilities and features supported by providers created by this factory
    /// </summary>
    /// <returns>A description of provider capabilities</returns>
    ProviderCapabilities GetProviderCapabilities();

    /// <summary>
    /// Gets metadata about this factory
    /// </summary>
    /// <returns>Factory metadata</returns>
    IReadOnlyDictionary<string, object> GetFactoryMetadata();
}