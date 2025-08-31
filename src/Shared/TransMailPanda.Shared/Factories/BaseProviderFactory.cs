using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using TransMailPanda.Shared.Base;
using TransMailPanda.Shared.Models;

namespace TransMailPanda.Shared.Factories;

/// <summary>
/// Abstract base implementation of the provider factory pattern
/// Provides common functionality for creating providers with proper error handling and validation
/// </summary>
/// <typeparam name="TProvider">The provider interface type</typeparam>
/// <typeparam name="TImplementation">The concrete provider implementation type</typeparam>
/// <typeparam name="TConfig">The configuration type for the provider</typeparam>
public abstract class BaseProviderFactory<TProvider, TImplementation, TConfig> : IProviderFactory<TProvider, TConfig>, IProviderFactory
    where TProvider : class
    where TImplementation : class, TProvider
    where TConfig : BaseProviderConfig
{
    private readonly ILogger<BaseProviderFactory<TProvider, TImplementation, TConfig>> _logger;

    /// <summary>
    /// Initializes a new instance of the BaseProviderFactory class
    /// </summary>
    /// <param name="logger">Logger for the factory</param>
    protected BaseProviderFactory(ILogger<BaseProviderFactory<TProvider, TImplementation, TConfig>> logger)
    {
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <summary>
    /// Gets the provider type that this factory creates
    /// </summary>
    public Type ProviderType => typeof(TProvider);

    /// <summary>
    /// Gets the configuration type for the provider
    /// </summary>
    public Type ConfigurationType => typeof(TConfig);

    /// <summary>
    /// Gets the factory name identifier
    /// </summary>
    public abstract string FactoryName { get; }

    /// <summary>
    /// Gets a value indicating whether this factory supports the specified provider type
    /// </summary>
    /// <param name="providerType">The provider type to check</param>
    /// <returns>True if the factory supports the provider type</returns>
    public virtual bool SupportsProviderType(Type providerType)
    {
        return typeof(TProvider).IsAssignableFrom(providerType);
    }

    /// <summary>
    /// Gets a value indicating whether this factory supports the specified provider and configuration types
    /// </summary>
    /// <param name="providerType">The provider type to check</param>
    /// <param name="configurationType">The configuration type to check</param>
    /// <returns>True if the factory supports both types</returns>
    public virtual bool SupportsTypes(Type providerType, Type configurationType)
    {
        return SupportsProviderType(providerType) && configurationType == typeof(TConfig);
    }

    /// <summary>
    /// Creates a new provider instance with the specified configuration
    /// </summary>
    /// <param name="config">The configuration for the provider</param>
    /// <param name="logger">Logger for the provider</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>A result containing the created provider or an error</returns>
    public async Task<Result<TProvider>> CreateProviderAsync(TConfig config, ILogger logger, CancellationToken cancellationToken = default)
    {
        try
        {
            _logger.LogDebug("Creating provider of type {ProviderType} using factory {FactoryName}", typeof(TImplementation).Name, FactoryName);

            // Validate configuration
            var validationResult = await ValidateProviderCreationAsync(config, cancellationToken);
            if (validationResult.IsFailure)
                return Result<TProvider>.Failure(validationResult.Error);

            // Create the provider instance
            var providerResult = await CreateProviderInstanceAsync(config, logger, cancellationToken);
            if (providerResult.IsFailure)
                return providerResult;

            // Perform post-creation validation
            var postValidationResult = await ValidateCreatedProviderAsync(providerResult.Value, config, cancellationToken);
            if (postValidationResult.IsFailure)
            {
                // Cleanup the created provider if validation fails
                if (providerResult.Value is IDisposable disposable)
                    disposable.Dispose();
                
                return Result<TProvider>.Failure(postValidationResult.Error);
            }

            _logger.LogInformation("Successfully created provider of type {ProviderType} using factory {FactoryName}", 
                typeof(TImplementation).Name, FactoryName);

            return providerResult;
        }
        catch (Exception ex)
        {
            var error = ex.ToProviderError($"Failed to create provider using factory {FactoryName}");
            _logger.LogError(ex, "Error creating provider of type {ProviderType} using factory {FactoryName}", 
                typeof(TImplementation).Name, FactoryName);
            return Result<TProvider>.Failure(error);
        }
    }

    /// <summary>
    /// Non-generic version of CreateProviderAsync
    /// </summary>
    public async Task<Result<object>> CreateProviderAsync(object config, ILogger logger, CancellationToken cancellationToken = default)
    {
        if (config is not TConfig typedConfig)
        {
            return Result<object>.Failure(new ValidationError(
                $"Configuration must be of type {typeof(TConfig).Name}, but received {config?.GetType().Name ?? "null"}"));
        }

        var result = await CreateProviderAsync(typedConfig, logger, cancellationToken);
        return result.IsSuccess 
            ? Result<object>.Success(result.Value) 
            : Result<object>.Failure(result.Error);
    }

    /// <summary>
    /// Validates that the factory can create a provider with the specified configuration
    /// </summary>
    /// <param name="config">The configuration to validate</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>A result indicating whether the provider can be created</returns>
    public virtual async Task<Result<bool>> ValidateProviderCreationAsync(TConfig config, CancellationToken cancellationToken = default)
    {
        try
        {
            // Basic configuration validation
            var basicValidation = config.ValidateConfiguration();
            if (basicValidation.IsFailure)
                return Result<bool>.Failure(basicValidation.Error);

            // Factory-specific validation
            var customValidation = await ValidateCustomCreationLogicAsync(config, cancellationToken);
            if (customValidation.IsFailure)
                return customValidation;

            return Result<bool>.Success(true);
        }
        catch (Exception ex)
        {
            return Result<bool>.Failure(ex.ToProviderError("Provider creation validation failed"));
        }
    }

    /// <summary>
    /// Non-generic version of ValidateProviderCreationAsync
    /// </summary>
    public async Task<Result<bool>> ValidateProviderCreationAsync(object config, CancellationToken cancellationToken = default)
    {
        if (config is not TConfig typedConfig)
        {
            return Result<bool>.Failure(new ValidationError(
                $"Configuration must be of type {typeof(TConfig).Name}, but received {config?.GetType().Name ?? "null"}"));
        }

        return await ValidateProviderCreationAsync(typedConfig, cancellationToken);
    }

    /// <summary>
    /// Gets the capabilities and features supported by providers created by this factory
    /// </summary>
    /// <returns>A description of provider capabilities</returns>
    public abstract ProviderCapabilities GetProviderCapabilities();

    /// <summary>
    /// Gets metadata about this factory
    /// </summary>
    /// <returns>Factory metadata</returns>
    public virtual IReadOnlyDictionary<string, object> GetFactoryMetadata()
    {
        return new Dictionary<string, object>
        {
            { "FactoryName", FactoryName },
            { "ProviderType", ProviderType.FullName ?? ProviderType.Name },
            { "ImplementationType", typeof(TImplementation).FullName ?? typeof(TImplementation).Name },
            { "ConfigurationType", ConfigurationType.FullName ?? ConfigurationType.Name },
            { "CreatedAt", DateTime.UtcNow },
            { "FactoryVersion", GetType().Assembly.GetName().Version?.ToString() ?? "Unknown" }
        };
    }

    /// <summary>
    /// Creates the actual provider instance
    /// Override this method to provide custom creation logic
    /// </summary>
    /// <param name="config">The configuration for the provider</param>
    /// <param name="logger">Logger for the provider</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>A result containing the created provider</returns>
    protected abstract Task<Result<TProvider>> CreateProviderInstanceAsync(TConfig config, ILogger logger, CancellationToken cancellationToken);

    /// <summary>
    /// Performs factory-specific validation logic
    /// Override this method to provide custom validation
    /// </summary>
    /// <param name="config">The configuration to validate</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>A result indicating whether validation passed</returns>
    protected virtual async Task<Result<bool>> ValidateCustomCreationLogicAsync(TConfig config, CancellationToken cancellationToken)
    {
        await Task.CompletedTask; // Default implementation
        return Result<bool>.Success(true);
    }

    /// <summary>
    /// Validates the created provider instance
    /// Override this method to provide custom post-creation validation
    /// </summary>
    /// <param name="provider">The created provider</param>
    /// <param name="config">The configuration used to create the provider</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>A result indicating whether the provider is valid</returns>
    protected virtual async Task<Result<bool>> ValidateCreatedProviderAsync(TProvider provider, TConfig config, CancellationToken cancellationToken)
    {
        await Task.CompletedTask; // Default implementation
        return Result<bool>.Success(true);
    }
}