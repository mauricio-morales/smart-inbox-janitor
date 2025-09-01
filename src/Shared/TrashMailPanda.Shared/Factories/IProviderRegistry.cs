using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using TrashMailPanda.Shared.Base;
using TrashMailPanda.Shared.Models;

namespace TrashMailPanda.Shared.Factories;

/// <summary>
/// Interface for provider registry operations
/// Defines contract for managing provider factories and runtime provider creation
/// </summary>
public interface IProviderRegistry : IDisposable
{
    /// <summary>
    /// Gets all registered factory names
    /// </summary>
    IReadOnlyCollection<string> RegisteredFactories { get; }

    /// <summary>
    /// Gets all registered provider types
    /// </summary>
    IReadOnlyCollection<Type> RegisteredProviderTypes { get; }

    /// <summary>
    /// Gets the total number of registered factories
    /// </summary>
    int FactoryCount { get; }

    /// <summary>
    /// Gets the total number of active provider instances
    /// </summary>
    int ActiveInstanceCount { get; }

    /// <summary>
    /// Event fired when a new factory is registered
    /// </summary>
    event EventHandler<FactoryRegistrationEventArgs>? FactoryRegistered;

    /// <summary>
    /// Event fired when a factory is unregistered
    /// </summary>
    event EventHandler<FactoryRegistrationEventArgs>? FactoryUnregistered;

    /// <summary>
    /// Event fired when a provider instance is created
    /// </summary>
    event EventHandler<ProviderInstanceEventArgs>? ProviderInstanceCreated;

    /// <summary>
    /// Event fired when a provider instance is disposed
    /// </summary>
    event EventHandler<ProviderInstanceEventArgs>? ProviderInstanceDisposed;

    /// <summary>
    /// Registers a provider factory with the registry
    /// </summary>
    /// <param name="factory">The factory to register</param>
    /// <returns>A result indicating whether registration was successful</returns>
    Result<bool> RegisterFactory(IProviderFactory factory);

    /// <summary>
    /// Unregisters a provider factory from the registry
    /// </summary>
    /// <param name="factoryName">The name of the factory to unregister</param>
    /// <returns>A result indicating whether unregistration was successful</returns>
    Result<bool> UnregisterFactory(string factoryName);

    /// <summary>
    /// Creates a provider instance using the appropriate factory
    /// </summary>
    /// <typeparam name="TProvider">The provider interface type</typeparam>
    /// <param name="config">The configuration for the provider</param>
    /// <param name="logger">Logger for the provider</param>
    /// <param name="instanceName">Optional name for the instance (for tracking)</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>A result containing the created provider</returns>
    Task<Result<TProvider>> CreateProviderAsync<TProvider>(
        BaseProviderConfig config,
        ILogger logger,
        string? instanceName = null,
        CancellationToken cancellationToken = default)
        where TProvider : class;

    /// <summary>
    /// Gets a factory by name
    /// </summary>
    /// <param name="factoryName">The name of the factory</param>
    /// <returns>A result containing the factory</returns>
    Result<IProviderFactory> GetFactory(string factoryName);

    /// <summary>
    /// Gets a factory for the specified provider type
    /// </summary>
    /// <param name="providerType">The provider type</param>
    /// <returns>A result containing the factory</returns>
    Result<IProviderFactory> GetFactoryForProviderType(Type providerType);

    /// <summary>
    /// Gets information about all registered factories
    /// </summary>
    /// <returns>A list of factory information</returns>
    IReadOnlyList<FactoryInfo> GetFactoryInfos();

    /// <summary>
    /// Gets information about a specific provider instance
    /// </summary>
    /// <param name="instanceName">The name of the instance</param>
    /// <returns>A result containing instance information</returns>
    Result<ProviderInstanceInfo> GetProviderInstanceInfo(string instanceName);

    /// <summary>
    /// Gets information about all provider instances
    /// </summary>
    /// <param name="activeOnly">Whether to return only active instances</param>
    /// <returns>A list of provider instance information</returns>
    IReadOnlyList<ProviderInstanceInfo> GetProviderInstanceInfos(bool activeOnly = false);

    /// <summary>
    /// Disposes a provider instance
    /// </summary>
    /// <param name="instanceName">The name of the instance to dispose</param>
    /// <returns>A result indicating success or failure</returns>
    Result<bool> DisposeProviderInstance(string instanceName);

    /// <summary>
    /// Validates that a provider can be created with the specified configuration
    /// </summary>
    /// <param name="providerType">The provider type</param>
    /// <param name="config">The configuration</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>A result indicating whether the provider can be created</returns>
    Task<Result<bool>> ValidateProviderCreationAsync(Type providerType, object config, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets registry statistics
    /// </summary>
    /// <returns>Registry statistics</returns>
    ProviderRegistryStatistics GetStatistics();
}

