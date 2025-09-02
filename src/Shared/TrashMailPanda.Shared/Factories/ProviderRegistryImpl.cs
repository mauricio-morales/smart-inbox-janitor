using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using TrashMailPanda.Shared.Base;
using TrashMailPanda.Shared.Models;

namespace TrashMailPanda.Shared.Factories;

/// <summary>
/// Registry for managing provider factories and enabling runtime provider creation
/// Provides type-safe provider lookup and creation with comprehensive error handling
/// </summary>
public class ProviderRegistryImpl : IProviderRegistry
{
    private readonly ILogger<ProviderRegistryImpl> _logger;
    private readonly ConcurrentDictionary<string, IProviderFactory> _factories = new();
    private readonly ConcurrentDictionary<Type, string> _typeToFactoryMap = new();
    private readonly ConcurrentDictionary<string, ProviderRegistryEntry> _providerInstances = new();
    private readonly object _registrationLock = new();
    private bool _disposed;

    /// <summary>
    /// Initializes a new instance of the ProviderRegistryImpl class
    /// </summary>
    /// <param name="logger">Logger for the registry</param>
    public ProviderRegistryImpl(ILogger<ProviderRegistryImpl> logger)
    {
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _logger.LogDebug("ProviderRegistry initialized");
    }

    /// <summary>
    /// Gets all registered factory names
    /// </summary>
    public IReadOnlyCollection<string> RegisteredFactories => _factories.Keys.ToList();

    /// <summary>
    /// Gets all registered provider types
    /// </summary>
    public IReadOnlyCollection<Type> RegisteredProviderTypes => _typeToFactoryMap.Keys.ToList();

    /// <summary>
    /// Gets the total number of registered factories
    /// </summary>
    public int FactoryCount => _factories.Count;

    /// <summary>
    /// Gets the total number of active provider instances
    /// </summary>
    public int ActiveInstanceCount => _providerInstances.Values.Count(e => e.IsActive);

    /// <summary>
    /// Event fired when a new factory is registered
    /// </summary>
    public event EventHandler<FactoryRegistrationEventArgs>? FactoryRegistered;

    /// <summary>
    /// Event fired when a factory is unregistered
    /// </summary>
    public event EventHandler<FactoryRegistrationEventArgs>? FactoryUnregistered;

    /// <summary>
    /// Event fired when a provider instance is created
    /// </summary>
    public event EventHandler<ProviderInstanceEventArgs>? ProviderInstanceCreated;

    /// <summary>
    /// Event fired when a provider instance is disposed
    /// </summary>
    public event EventHandler<ProviderInstanceEventArgs>? ProviderInstanceDisposed;

    /// <summary>
    /// Registers a provider factory with the registry
    /// </summary>
    /// <param name="factory">The factory to register</param>
    /// <returns>A result indicating whether registration was successful</returns>
    public Result<bool> RegisterFactory(IProviderFactory factory)
    {
        if (_disposed)
            return Result<bool>.Failure(new InvalidOperationError("Provider registry has been disposed"));

        if (factory == null)
            return Result<bool>.Failure(new ValidationError("Factory cannot be null"));

        try
        {
            lock (_registrationLock)
            {
                var factoryName = factory.FactoryName;
                var providerType = factory.ProviderType;

                // Check if factory is already registered
                if (_factories.ContainsKey(factoryName))
                {
                    return Result<bool>.Failure(new ValidationError(
                        $"Factory with name '{factoryName}' is already registered"));
                }

                // Check if provider type is already handled by another factory
                if (_typeToFactoryMap.ContainsKey(providerType))
                {
                    var existingFactory = _typeToFactoryMap[providerType];
                    return Result<bool>.Failure(new ValidationError(
                        $"Provider type '{providerType.Name}' is already handled by factory '{existingFactory}'"));
                }

                // Register the factory
                _factories[factoryName] = factory;
                _typeToFactoryMap[providerType] = factoryName;

                _logger.LogInformation("Registered factory '{FactoryName}' for provider type '{ProviderType}'",
                    factoryName, providerType.Name);

                OnFactoryRegistered(factoryName, factory);
                return Result<bool>.Success(true);
            }
        }
        catch (Exception ex)
        {
            var error = ex.ToProviderError($"Failed to register factory '{factory.FactoryName}'");
            _logger.LogError(ex, "Error registering factory '{FactoryName}'", factory.FactoryName);
            return Result<bool>.Failure(error);
        }
    }

    /// <summary>
    /// Unregisters a provider factory from the registry
    /// </summary>
    /// <param name="factoryName">The name of the factory to unregister</param>
    /// <returns>A result indicating whether unregistration was successful</returns>
    public Result<bool> UnregisterFactory(string factoryName)
    {
        if (_disposed)
            return Result<bool>.Failure(new InvalidOperationError("Provider registry has been disposed"));

        if (string.IsNullOrEmpty(factoryName))
            return Result<bool>.Failure(new ValidationError("Factory name cannot be null or empty"));

        try
        {
            lock (_registrationLock)
            {
                if (!_factories.TryGetValue(factoryName, out var factory))
                {
                    return Result<bool>.Failure(new NotFoundError(
                        $"Factory with name '{factoryName}' is not registered"));
                }

                // Remove from both dictionaries
                _factories.TryRemove(factoryName, out _);
                _typeToFactoryMap.TryRemove(factory.ProviderType, out _);

                // Dispose any active instances created by this factory
                var instancesToDispose = _providerInstances.Values
                    .Where(e => e.FactoryName == factoryName && e.IsActive)
                    .ToList();

                foreach (var entry in instancesToDispose)
                {
                    DisposeProviderInstance(entry);
                }

                _logger.LogInformation("Unregistered factory '{FactoryName}' and disposed {InstanceCount} active instances",
                    factoryName, instancesToDispose.Count);

                OnFactoryUnregistered(factoryName, factory);
                return Result<bool>.Success(true);
            }
        }
        catch (Exception ex)
        {
            var error = ex.ToProviderError($"Failed to unregister factory '{factoryName}'");
            _logger.LogError(ex, "Error unregistering factory '{FactoryName}'", factoryName);
            return Result<bool>.Failure(error);
        }
    }

    /// <summary>
    /// Creates a provider instance using the appropriate factory
    /// </summary>
    /// <typeparam name="TProvider">The provider interface type</typeparam>
    /// <param name="config">The configuration for the provider</param>
    /// <param name="logger">Logger for the provider</param>
    /// <param name="instanceName">Optional name for the instance (for tracking)</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>A result containing the created provider</returns>
    public async Task<Result<TProvider>> CreateProviderAsync<TProvider>(
        BaseProviderConfig config,
        ILogger logger,
        string? instanceName = null,
        CancellationToken cancellationToken = default)
        where TProvider : class
    {
        if (_disposed)
            return Result<TProvider>.Failure(new InvalidOperationError("Provider registry has been disposed"));

        var providerType = typeof(TProvider);
        instanceName ??= $"{providerType.Name}_{Guid.NewGuid():N}";

        try
        {
            // Find the appropriate factory
            var factoryResult = GetFactoryForProviderType(providerType);
            if (factoryResult.IsFailure)
                return Result<TProvider>.Failure(factoryResult.Error);

            var factory = factoryResult.Value;

            _logger.LogDebug("Creating provider instance '{InstanceName}' of type '{ProviderType}' using factory '{FactoryName}'",
                instanceName, providerType.Name, factory.FactoryName);

            // Create the provider
            var providerResult = await factory.CreateProviderAsync(config, logger, cancellationToken);
            if (providerResult.IsFailure)
                return Result<TProvider>.Failure(providerResult.Error);

            if (providerResult.Value is not TProvider typedProvider)
            {
                return Result<TProvider>.Failure(new ProcessingError(
                    $"Factory '{factory.FactoryName}' created a provider of type '{providerResult.Value?.GetType().Name ?? "null"}' " +
                    $"but expected '{providerType.Name}'"));
            }

            // Track the instance
            var registryEntry = new ProviderRegistryEntry
            {
                InstanceName = instanceName,
                ProviderType = providerType,
                FactoryName = factory.FactoryName,
                Provider = typedProvider,
                Configuration = config.GetSanitizedCopy(),
                CreatedAt = DateTime.UtcNow,
                IsActive = true
            };

            _providerInstances[instanceName] = registryEntry;

            _logger.LogInformation("Successfully created provider instance '{InstanceName}' of type '{ProviderType}'",
                instanceName, providerType.Name);

            OnProviderInstanceCreated(instanceName, registryEntry);
            return Result<TProvider>.Success(typedProvider);
        }
        catch (Exception ex)
        {
            var error = ex.ToProviderError($"Failed to create provider instance '{instanceName}' of type '{providerType.Name}'");
            _logger.LogError(ex, "Error creating provider instance '{InstanceName}' of type '{ProviderType}'",
                instanceName, providerType.Name);
            return Result<TProvider>.Failure(error);
        }
    }

    /// <summary>
    /// Gets a factory by name
    /// </summary>
    /// <param name="factoryName">The name of the factory</param>
    /// <returns>A result containing the factory</returns>
    public Result<IProviderFactory> GetFactory(string factoryName)
    {
        if (_disposed)
            return Result<IProviderFactory>.Failure(new InvalidOperationError("Provider registry has been disposed"));

        if (string.IsNullOrEmpty(factoryName))
            return Result<IProviderFactory>.Failure(new ValidationError("Factory name cannot be null or empty"));

        if (_factories.TryGetValue(factoryName, out var factory))
        {
            return Result<IProviderFactory>.Success(factory);
        }

        return Result<IProviderFactory>.Failure(new NotFoundError($"Factory '{factoryName}' is not registered"));
    }

    /// <summary>
    /// Gets a factory for the specified provider type
    /// </summary>
    /// <param name="providerType">The provider type</param>
    /// <returns>A result containing the factory</returns>
    public Result<IProviderFactory> GetFactoryForProviderType(Type providerType)
    {
        if (_disposed)
            return Result<IProviderFactory>.Failure(new InvalidOperationError("Provider registry has been disposed"));

        if (providerType == null)
            return Result<IProviderFactory>.Failure(new ValidationError("Provider type cannot be null"));

        if (_typeToFactoryMap.TryGetValue(providerType, out var factoryName) &&
            _factories.TryGetValue(factoryName, out var factory))
        {
            return Result<IProviderFactory>.Success(factory);
        }

        return Result<IProviderFactory>.Failure(new NotFoundError(
            $"No factory registered for provider type '{providerType.Name}'"));
    }

    /// <summary>
    /// Gets information about all registered factories
    /// </summary>
    /// <returns>A list of factory information</returns>
    public IReadOnlyList<FactoryInfo> GetFactoryInfos()
    {
        if (_disposed)
            return new List<FactoryInfo>();

        return _factories.Values.Select(f => new FactoryInfo
        {
            FactoryName = f.FactoryName,
            ProviderType = f.ProviderType,
            ConfigurationType = f.ConfigurationType,
            Capabilities = f.GetProviderCapabilities(),
            Metadata = f.GetFactoryMetadata()
        }).ToList();
    }

    /// <summary>
    /// Gets information about a specific provider instance
    /// </summary>
    /// <param name="instanceName">The name of the instance</param>
    /// <returns>A result containing instance information</returns>
    public Result<ProviderInstanceInfo> GetProviderInstanceInfo(string instanceName)
    {
        if (_disposed)
            return Result<ProviderInstanceInfo>.Failure(new InvalidOperationError("Provider registry has been disposed"));

        if (string.IsNullOrEmpty(instanceName))
            return Result<ProviderInstanceInfo>.Failure(new ValidationError("Instance name cannot be null or empty"));

        if (_providerInstances.TryGetValue(instanceName, out var entry))
        {
            var info = new ProviderInstanceInfo
            {
                InstanceName = entry.InstanceName,
                ProviderType = entry.ProviderType,
                FactoryName = entry.FactoryName,
                Configuration = entry.Configuration,
                CreatedAt = entry.CreatedAt,
                IsActive = entry.IsActive,
                LastAccessedAt = entry.LastAccessedAt
            };

            return Result<ProviderInstanceInfo>.Success(info);
        }

        return Result<ProviderInstanceInfo>.Failure(new NotFoundError(
            $"Provider instance '{instanceName}' not found"));
    }

    /// <summary>
    /// Gets information about all provider instances
    /// </summary>
    /// <param name="activeOnly">Whether to return only active instances</param>
    /// <returns>A list of provider instance information</returns>
    public IReadOnlyList<ProviderInstanceInfo> GetProviderInstanceInfos(bool activeOnly = false)
    {
        if (_disposed)
            return new List<ProviderInstanceInfo>();

        return _providerInstances.Values
            .Where(e => !activeOnly || e.IsActive)
            .Select(e => new ProviderInstanceInfo
            {
                InstanceName = e.InstanceName,
                ProviderType = e.ProviderType,
                FactoryName = e.FactoryName,
                Configuration = e.Configuration,
                CreatedAt = e.CreatedAt,
                IsActive = e.IsActive,
                LastAccessedAt = e.LastAccessedAt
            })
            .ToList();
    }

    /// <summary>
    /// Disposes a provider instance
    /// </summary>
    /// <param name="instanceName">The name of the instance to dispose</param>
    /// <returns>A result indicating success or failure</returns>
    public Result<bool> DisposeProviderInstance(string instanceName)
    {
        if (_disposed)
            return Result<bool>.Failure(new InvalidOperationError("Provider registry has been disposed"));

        if (string.IsNullOrEmpty(instanceName))
            return Result<bool>.Failure(new ValidationError("Instance name cannot be null or empty"));

        if (_providerInstances.TryGetValue(instanceName, out var entry))
        {
            return DisposeProviderInstance(entry);
        }

        return Result<bool>.Failure(new NotFoundError($"Provider instance '{instanceName}' not found"));
    }

    /// <summary>
    /// Validates that a provider can be created with the specified configuration
    /// </summary>
    /// <param name="providerType">The provider type</param>
    /// <param name="config">The configuration</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>A result indicating whether the provider can be created</returns>
    public async Task<Result<bool>> ValidateProviderCreationAsync(Type providerType, object config, CancellationToken cancellationToken = default)
    {
        if (_disposed)
            return Result<bool>.Failure(new InvalidOperationError("Provider registry has been disposed"));

        var factoryResult = GetFactoryForProviderType(providerType);
        if (factoryResult.IsFailure)
            return Result<bool>.Failure(factoryResult.Error);

        return await factoryResult.Value.ValidateProviderCreationAsync(config, cancellationToken);
    }

    /// <summary>
    /// Gets registry statistics
    /// </summary>
    /// <returns>Registry statistics</returns>
    public ProviderRegistryStatistics GetStatistics()
    {
        if (_disposed)
            return new ProviderRegistryStatistics();

        var instances = _providerInstances.Values.ToList();
        var activeInstances = instances.Where(i => i.IsActive).ToList();

        return new ProviderRegistryStatistics
        {
            TotalFactories = _factories.Count,
            TotalProviderTypes = _typeToFactoryMap.Count,
            TotalInstances = instances.Count,
            ActiveInstances = activeInstances.Count,
            InactiveInstances = instances.Count - activeInstances.Count,
            FactoryNames = _factories.Keys.ToList(),
            ProviderTypes = _typeToFactoryMap.Keys.Select(t => t.Name).ToList(),
            CreatedAt = DateTime.UtcNow
        };
    }

    /// <summary>
    /// Disposes a provider instance
    /// </summary>
    private Result<bool> DisposeProviderInstance(ProviderRegistryEntry entry)
    {
        try
        {
            entry.IsActive = false;

            if (entry.Provider is IDisposable disposable)
            {
                disposable.Dispose();
            }

            _logger.LogDebug("Disposed provider instance '{InstanceName}' of type '{ProviderType}'",
                entry.InstanceName, entry.ProviderType.Name);

            OnProviderInstanceDisposed(entry.InstanceName, entry);
            return Result<bool>.Success(true);
        }
        catch (Exception ex)
        {
            var error = ex.ToProviderError($"Failed to dispose provider instance '{entry.InstanceName}'");
            _logger.LogError(ex, "Error disposing provider instance '{InstanceName}'", entry.InstanceName);
            return Result<bool>.Failure(error);
        }
    }

    /// <summary>
    /// Fires the FactoryRegistered event
    /// </summary>
    private void OnFactoryRegistered(string factoryName, IProviderFactory factory)
    {
        try
        {
            FactoryRegistered?.Invoke(this, new FactoryRegistrationEventArgs
            {
                FactoryName = factoryName,
                Factory = factory,
                RegistrationTime = DateTime.UtcNow
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error firing FactoryRegistered event for factory '{FactoryName}'", factoryName);
        }
    }

    /// <summary>
    /// Fires the FactoryUnregistered event
    /// </summary>
    private void OnFactoryUnregistered(string factoryName, IProviderFactory factory)
    {
        try
        {
            FactoryUnregistered?.Invoke(this, new FactoryRegistrationEventArgs
            {
                FactoryName = factoryName,
                Factory = factory,
                RegistrationTime = DateTime.UtcNow
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error firing FactoryUnregistered event for factory '{FactoryName}'", factoryName);
        }
    }

    /// <summary>
    /// Fires the ProviderInstanceCreated event
    /// </summary>
    private void OnProviderInstanceCreated(string instanceName, ProviderRegistryEntry entry)
    {
        try
        {
            ProviderInstanceCreated?.Invoke(this, new ProviderInstanceEventArgs
            {
                InstanceName = instanceName,
                ProviderType = entry.ProviderType,
                FactoryName = entry.FactoryName,
                EventTime = DateTime.UtcNow
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error firing ProviderInstanceCreated event for instance '{InstanceName}'", instanceName);
        }
    }

    /// <summary>
    /// Fires the ProviderInstanceDisposed event
    /// </summary>
    private void OnProviderInstanceDisposed(string instanceName, ProviderRegistryEntry entry)
    {
        try
        {
            ProviderInstanceDisposed?.Invoke(this, new ProviderInstanceEventArgs
            {
                InstanceName = instanceName,
                ProviderType = entry.ProviderType,
                FactoryName = entry.FactoryName,
                EventTime = DateTime.UtcNow
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error firing ProviderInstanceDisposed event for instance '{InstanceName}'", instanceName);
        }
    }

    /// <summary>
    /// Disposes the registry and all tracked provider instances
    /// </summary>
    public void Dispose()
    {
        if (_disposed)
            return;

        _logger.LogInformation("Disposing ProviderRegistry with {FactoryCount} factories and {InstanceCount} instances",
            _factories.Count, _providerInstances.Count);

        // Dispose all active provider instances
        var instancesToDispose = _providerInstances.Values.Where(e => e.IsActive).ToList();
        foreach (var entry in instancesToDispose)
        {
            DisposeProviderInstance(entry);
        }

        _providerInstances.Clear();
        _factories.Clear();
        _typeToFactoryMap.Clear();

        _disposed = true;
        _logger.LogDebug("ProviderRegistry disposed");
    }
}

/// <summary>
/// Internal registry entry for tracking provider instances
/// </summary>
internal sealed class ProviderRegistryEntry
{
    public string InstanceName { get; set; } = string.Empty;
    public Type ProviderType { get; set; } = typeof(object);
    public string FactoryName { get; set; } = string.Empty;
    public object Provider { get; set; } = new object();
    public BaseProviderConfig? Configuration { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? LastAccessedAt { get; set; }
    public bool IsActive { get; set; } = true;
}