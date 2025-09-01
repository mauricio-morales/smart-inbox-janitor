using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using TrashMailPanda.Shared.Base;
using TrashMailPanda.Shared.Factories;
using TrashMailPanda.Shared.Models;

namespace TrashMailPanda.Shared.Extensions;

/// <summary>
/// Health check for the provider registry system
/// Validates registry state and factory registrations
/// </summary>
public sealed class ProviderRegistryHealthCheck : IHealthCheck
{
    private readonly IProviderRegistry _providerRegistry;
    private readonly ILogger<ProviderRegistryHealthCheck> _logger;
    private readonly ProviderHealthCheckOptions _options;

    public ProviderRegistryHealthCheck(
        IProviderRegistry providerRegistry,
        ILogger<ProviderRegistryHealthCheck> logger,
        IOptions<ProviderHealthCheckOptions> options)
    {
        _providerRegistry = providerRegistry;
        _logger = logger;
        _options = options.Value;
    }

    /// <summary>
    /// Performs health check of the provider registry
    /// </summary>
    public async Task<Microsoft.Extensions.Diagnostics.HealthChecks.HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var data = new Dictionary<string, object>();
            var errors = new List<string>();

            // Check if registry is accessible
            try
            {
                var stats = _providerRegistry.GetStatistics();
                
                data.Add("total_factories", stats.TotalFactories);
                data.Add("total_provider_types", stats.TotalProviderTypes);
                data.Add("total_instances", stats.TotalInstances);
                data.Add("active_instances", stats.ActiveInstances);
                data.Add("inactive_instances", stats.InactiveInstances);

                // Validate minimum factory count
                if (stats.TotalFactories == 0)
                {
                    errors.Add("No provider factories are registered");
                }

                // Check for excessive inactive instances
                if (stats.InactiveInstances > stats.ActiveInstances * 2)
                {
                    errors.Add($"High number of inactive instances ({stats.InactiveInstances}) compared to active instances ({stats.ActiveInstances})");
                }

                // Get detailed factory information if enabled
                if (_options.EnableDetailedHealthChecks)
                {
                    var factoryInfos = _providerRegistry.GetFactoryInfos();
                    data.Add("factory_names", factoryInfos.Select(f => f.FactoryName).ToList());
                    data.Add("provider_types", factoryInfos.Select(f => f.ProviderType.Name).ToList());
                }
            }
            catch (Exception ex)
            {
                errors.Add($"Failed to get registry statistics: {ex.Message}");
            }

            // Determine health status
            var status = errors.Count == 0 ? Microsoft.Extensions.Diagnostics.HealthChecks.HealthStatus.Healthy :
                        errors.Count <= 2 ? Microsoft.Extensions.Diagnostics.HealthChecks.HealthStatus.Degraded : Microsoft.Extensions.Diagnostics.HealthChecks.HealthStatus.Unhealthy;

            var description = errors.Count == 0 ? "Provider registry is healthy" :
                            $"Provider registry has {errors.Count} issue(s): {string.Join(", ", errors)}";

            return new Microsoft.Extensions.Diagnostics.HealthChecks.HealthCheckResult(status, description, data: data);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception during provider registry health check");
            return new Microsoft.Extensions.Diagnostics.HealthChecks.HealthCheckResult(
                Microsoft.Extensions.Diagnostics.HealthChecks.HealthStatus.Unhealthy,
                $"Health check failed with exception: {ex.Message}",
                ex);
        }
    }
}

/// <summary>
/// Health check for the overall provider system
/// Validates system configuration and operational status
/// </summary>
public sealed class ProviderSystemHealthCheck : IHealthCheck
{
    private readonly IProviderRegistry _providerRegistry;
    private readonly ILogger<ProviderSystemHealthCheck> _logger;
    private readonly ProviderSystemConfiguration _systemConfiguration;
    private readonly ProviderHealthCheckOptions _options;

    public ProviderSystemHealthCheck(
        IProviderRegistry providerRegistry,
        ILogger<ProviderSystemHealthCheck> logger,
        IOptions<ProviderSystemConfiguration> systemConfiguration,
        IOptions<ProviderHealthCheckOptions> options)
    {
        _providerRegistry = providerRegistry;
        _logger = logger;
        _systemConfiguration = systemConfiguration.Value;
        _options = options.Value;
    }

    /// <summary>
    /// Performs comprehensive health check of the provider system
    /// </summary>
    public async Task<Microsoft.Extensions.Diagnostics.HealthChecks.HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var data = new Dictionary<string, object>();
            var warnings = new List<string>();
            var errors = new List<string>();

            // Add system configuration data
            data.Add("auto_discovery_enabled", _systemConfiguration.EnableAutoDiscovery);
            data.Add("health_checks_enabled", _systemConfiguration.EnableHealthChecks);
            data.Add("performance_monitoring_enabled", _systemConfiguration.EnablePerformanceMonitoring);
            data.Add("default_timeout_seconds", _systemConfiguration.DefaultProviderTimeout.TotalSeconds);
            data.Add("max_concurrent_operations", _systemConfiguration.MaxConcurrentOperations);

            // Check system configuration
            if (_systemConfiguration.MaxConcurrentOperations <= 0)
            {
                errors.Add("Invalid MaxConcurrentOperations configuration");
            }

            if (_systemConfiguration.DefaultProviderTimeout.TotalSeconds <= 0)
            {
                errors.Add("Invalid DefaultProviderTimeout configuration");
            }

            // Test provider creation if detailed checks enabled
            if (_options.EnableDetailedHealthChecks)
            {
                await PerformDetailedSystemChecksAsync(data, warnings, errors, cancellationToken);
            }

            // Determine health status
            var status = errors.Count == 0 ? 
                        (warnings.Count == 0 ? Microsoft.Extensions.Diagnostics.HealthChecks.HealthStatus.Healthy : Microsoft.Extensions.Diagnostics.HealthChecks.HealthStatus.Degraded) : 
                        Microsoft.Extensions.Diagnostics.HealthChecks.HealthStatus.Unhealthy;

            var issues = new List<string>();
            issues.AddRange(errors);
            issues.AddRange(warnings);

            var description = issues.Count == 0 ? "Provider system is healthy" :
                            $"Provider system has {issues.Count} issue(s): {string.Join(", ", issues)}";

            return new Microsoft.Extensions.Diagnostics.HealthChecks.HealthCheckResult(status, description, data: data);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception during provider system health check");
            return new Microsoft.Extensions.Diagnostics.HealthChecks.HealthCheckResult(
                Microsoft.Extensions.Diagnostics.HealthChecks.HealthStatus.Unhealthy,
                $"Provider system health check failed: {ex.Message}",
                ex);
        }
    }

    /// <summary>
    /// Performs detailed system checks including factory validation
    /// </summary>
    private async Task PerformDetailedSystemChecksAsync(
        Dictionary<string, object> data,
        List<string> warnings,
        List<string> errors,
        CancellationToken cancellationToken)
    {
        try
        {
            // Check factory capabilities
            var factoryInfos = _providerRegistry.GetFactoryInfos();
            var capabilityInfo = new Dictionary<string, object>();

            foreach (var factory in factoryInfos)
            {
                try
                {
                    var capabilities = factory.Capabilities;
                    capabilityInfo.Add(factory.FactoryName, new
                    {
                        provider_name = capabilities.ProviderName,
                        version = capabilities.Version,
                        supported_operations = capabilities.SupportedOperations.Count,
                        required_dependencies = capabilities.RequiredDependencies.Count,
                        security_features = capabilities.SecurityFeatures.Count
                    });
                }
                catch (Exception ex)
                {
                    warnings.Add($"Failed to get capabilities for factory {factory.FactoryName}: {ex.Message}");
                }
            }

            data.Add("factory_capabilities", capabilityInfo);

            // Test basic registry operations
            var registryStats = _providerRegistry.GetStatistics();
            if (registryStats.TotalFactories > 0)
            {
                data.Add("registry_operational", true);
            }
            else
            {
                warnings.Add("Provider registry has no registered factories");
            }
        }
        catch (Exception ex)
        {
            errors.Add($"Detailed system check failed: {ex.Message}");
        }

        await Task.CompletedTask;
    }
}

/// <summary>
/// Generic health check for individual provider instances
/// Validates specific provider health and operational status
/// </summary>
/// <typeparam name="TProvider">The provider type</typeparam>
public sealed class ProviderHealthCheck<TProvider> : IHealthCheck where TProvider : class
{
    private readonly TProvider? _provider;
    private readonly ILogger<ProviderHealthCheck<TProvider>> _logger;
    private readonly ProviderHealthCheckOptions _options;

    public ProviderHealthCheck(
        ILogger<ProviderHealthCheck<TProvider>> logger,
        IOptions<ProviderHealthCheckOptions> options,
        TProvider? provider = null)
    {
        _provider = provider;
        _logger = logger;
        _options = options.Value;
    }

    /// <summary>
    /// Performs health check of the specific provider instance
    /// </summary>
    public async Task<Microsoft.Extensions.Diagnostics.HealthChecks.HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        var providerName = typeof(TProvider).Name;

        try
        {
            var data = new Dictionary<string, object>
            {
                { "provider_type", providerName },
                { "check_time", DateTime.UtcNow }
            };

            // Check if provider is available
            if (_provider == null)
            {
                return new Microsoft.Extensions.Diagnostics.HealthChecks.HealthCheckResult(
                    Microsoft.Extensions.Diagnostics.HealthChecks.HealthStatus.Unhealthy,
                    $"Provider {providerName} is not available",
                    data: data);
            }

            data.Add("provider_available", true);

            // Check if provider implements IProvider for health check
            if (_provider is IProvider<BaseProviderConfig> providerWithHealth)
            {
                try
                {
                    using var timeoutCts = new CancellationTokenSource(_options.HealthCheckTimeout);
                    using var combinedCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken, timeoutCts.Token);

                    var healthResultTask = await providerWithHealth.HealthCheckAsync(combinedCts.Token);
                    
                    if (healthResultTask.IsFailure)
                    {
                        data.Add("provider_health_check", true);
                        data.Add("provider_health_error", healthResultTask.Error?.Message ?? "Unknown error");
                        
                        return new Microsoft.Extensions.Diagnostics.HealthChecks.HealthCheckResult(
                            Microsoft.Extensions.Diagnostics.HealthChecks.HealthStatus.Unhealthy,
                            $"Provider {providerName} health check failed: {healthResultTask.Error?.Message}",
                            data: data);
                    }

                    var healthResult = healthResultTask.Value;
                    data.Add("provider_health_check", true);
                    data.Add("provider_status", healthResult.Status.ToString());
                    data.Add("provider_healthy", healthResult.IsHealthy);
                    data.Add("provider_duration_ms", healthResult.Duration.TotalMilliseconds);

                    if (healthResult.IsHealthy)
                    {
                        return new Microsoft.Extensions.Diagnostics.HealthChecks.HealthCheckResult(
                            Microsoft.Extensions.Diagnostics.HealthChecks.HealthStatus.Healthy, 
                            $"Provider {providerName} is healthy", 
                            data: data);
                    }
                    else
                    {
                        var issues = string.Join(", ", healthResult.Issues.Select(i => i.Message));
                        var status = healthResult.Status switch
                        {
                            Models.HealthStatus.Critical => Microsoft.Extensions.Diagnostics.HealthChecks.HealthStatus.Unhealthy,
                            Models.HealthStatus.Unhealthy => Microsoft.Extensions.Diagnostics.HealthChecks.HealthStatus.Unhealthy,
                            Models.HealthStatus.Degraded => Microsoft.Extensions.Diagnostics.HealthChecks.HealthStatus.Degraded,
                            _ => Microsoft.Extensions.Diagnostics.HealthChecks.HealthStatus.Degraded
                        };
                        return new Microsoft.Extensions.Diagnostics.HealthChecks.HealthCheckResult(
                            status, 
                            $"Provider {providerName} has issues: {issues}", 
                            data: data);
                    }
                }
                catch (OperationCanceledException)
                {
                    return new Microsoft.Extensions.Diagnostics.HealthChecks.HealthCheckResult(
                        Microsoft.Extensions.Diagnostics.HealthChecks.HealthStatus.Degraded,
                        $"Provider {providerName} health check timed out",
                        data: data);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error checking health of provider {ProviderName}", providerName);
                    data.Add("health_check_error", ex.Message);
                    return new Microsoft.Extensions.Diagnostics.HealthChecks.HealthCheckResult(
                        Microsoft.Extensions.Diagnostics.HealthChecks.HealthStatus.Degraded,
                        $"Provider {providerName} health check failed: {ex.Message}",
                        data: data);
                }
            }
            else
            {
                // Provider doesn't implement health check, just verify it exists
                data.Add("provider_health_check", false);
                return new Microsoft.Extensions.Diagnostics.HealthChecks.HealthCheckResult(
                    Microsoft.Extensions.Diagnostics.HealthChecks.HealthStatus.Healthy,
                    $"Provider {providerName} is available (no health check implemented)",
                    data: data);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception during health check of provider {ProviderName}", providerName);
            return new Microsoft.Extensions.Diagnostics.HealthChecks.HealthCheckResult(
                Microsoft.Extensions.Diagnostics.HealthChecks.HealthStatus.Unhealthy,
                $"Provider {providerName} health check failed with exception: {ex.Message}",
                ex);
        }
    }
}