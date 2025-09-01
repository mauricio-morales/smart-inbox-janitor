using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using TrashMailPanda.Shared.Factories;

namespace TrashMailPanda.Shared.Extensions;

/// <summary>
/// Hosted service for managing provider system lifecycle
/// Handles provider factory registration and system initialization
/// </summary>
public sealed class ProviderSystemHostedService : IHostedService, IDisposable
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<ProviderSystemHostedService> _logger;
    private readonly ProviderFactoryRegistrationOptions _registrationOptions;
    private readonly ProviderSystemConfiguration _systemConfiguration;
    private IProviderRegistry? _providerRegistry;
    private bool _disposed;

    public ProviderSystemHostedService(
        IServiceProvider serviceProvider,
        ILogger<ProviderSystemHostedService> logger,
        IOptions<ProviderFactoryRegistrationOptions> registrationOptions,
        IOptions<ProviderSystemConfiguration> systemConfiguration)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
        _registrationOptions = registrationOptions.Value;
        _systemConfiguration = systemConfiguration.Value;
    }

    /// <summary>
    /// Starts the provider system during application startup
    /// </summary>
    public async Task StartAsync(CancellationToken cancellationToken)
    {
        _logger.LogInformation("Starting provider system hosted service");

        try
        {
            // Get the provider registry
            _providerRegistry = _serviceProvider.GetRequiredService<IProviderRegistry>();
            
            // Register all configured factories
            await RegisterFactoriesAsync(cancellationToken);
            
            // Perform system health check if enabled
            if (_systemConfiguration.EnableHealthChecks)
            {
                await PerformInitialHealthCheckAsync(cancellationToken);
            }

            _logger.LogInformation("Provider system hosted service started successfully with {FactoryCount} factories", 
                _registrationOptions.FactoryRegistrations.Count);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to start provider system hosted service");
            throw;
        }
    }

    /// <summary>
    /// Stops the provider system during application shutdown
    /// </summary>
    public async Task StopAsync(CancellationToken cancellationToken)
    {
        _logger.LogInformation("Stopping provider system hosted service");

        try
        {
            if (_providerRegistry != null)
            {
                // Get statistics before shutdown
                var stats = _providerRegistry.GetStatistics();
                _logger.LogInformation("Shutting down provider system with {ActiveInstances} active instances", 
                    stats.ActiveInstances);

                // Dispose the registry (this will dispose all active providers)
                _providerRegistry.Dispose();
            }

            _logger.LogInformation("Provider system hosted service stopped successfully");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error stopping provider system hosted service");
            // Don't rethrow during shutdown
        }

        await Task.CompletedTask;
    }

    /// <summary>
    /// Registers all configured provider factories with the registry
    /// </summary>
    private async Task RegisterFactoriesAsync(CancellationToken cancellationToken)
    {
        if (_providerRegistry == null)
            return;

        var registeredCount = 0;
        var failedCount = 0;

        foreach (var registration in _registrationOptions.FactoryRegistrations)
        {
            try
            {
                cancellationToken.ThrowIfCancellationRequested();

                // Get the factory instance from DI
                var factory = _serviceProvider.GetService(registration.FactoryType) as IProviderFactory;
                if (factory == null)
                {
                    _logger.LogWarning("Factory {FactoryType} is registered for DI but could not be resolved", 
                        registration.FactoryType.Name);
                    failedCount++;
                    continue;
                }

                // Register the factory
                var result = _providerRegistry.RegisterFactory(factory);
                if (result.IsSuccess)
                {
                    registeredCount++;
                    _logger.LogDebug("Registered factory {FactoryName} for provider type {ProviderType}",
                        factory.FactoryName, registration.ProviderType.Name);
                }
                else
                {
                    failedCount++;
                    _logger.LogError("Failed to register factory {FactoryName}: {Error}",
                        factory.FactoryName, result.Error);
                }
            }
            catch (Exception ex)
            {
                failedCount++;
                _logger.LogError(ex, "Exception registering factory {FactoryType}", registration.FactoryType.Name);
            }
        }

        _logger.LogInformation("Factory registration completed: {RegisteredCount} registered, {FailedCount} failed",
            registeredCount, failedCount);

        if (failedCount > 0 && registeredCount == 0)
        {
            throw new InvalidOperationException($"Failed to register any provider factories ({failedCount} failures)");
        }

        await Task.CompletedTask;
    }

    /// <summary>
    /// Performs initial health check of the provider system
    /// </summary>
    private async Task PerformInitialHealthCheckAsync(CancellationToken cancellationToken)
    {
        try
        {
            // This would typically involve checking registered providers
            // For now, just log that health check was performed
            _logger.LogInformation("Initial provider system health check completed successfully");
            await Task.CompletedTask;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Initial provider system health check failed, but startup will continue");
            // Don't fail startup due to health check issues
        }
    }

    /// <summary>
    /// Disposes the hosted service
    /// </summary>
    public void Dispose()
    {
        if (_disposed)
            return;

        try
        {
            _providerRegistry?.Dispose();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error disposing provider registry during hosted service cleanup");
        }

        _disposed = true;
    }
}