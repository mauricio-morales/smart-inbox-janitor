using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using TrashMailPanda.Shared.Base;
using TrashMailPanda.Shared.Factories;
using TrashMailPanda.Shared.Models;

namespace TrashMailPanda.Shared.Extensions;

/// <summary>
/// Enhanced dependency injection extensions for provider factory pattern registration
/// Provides fluent configuration API with comprehensive lifecycle management
/// </summary>
public static class ProviderServiceExtensions
{
    /// <summary>
    /// Adds the provider factory system to the service collection
    /// Registers core factory infrastructure with proper dependency ordering
    /// </summary>
    /// <param name="services">The service collection</param>
    /// <param name="configuration">Optional configuration for provider system</param>
    /// <returns>Builder for fluent configuration</returns>
    public static ProviderRegistrationBuilder AddProviderFactorySystem(
        this IServiceCollection services,
        IConfiguration? configuration = null)
    {
        // Register core provider infrastructure
        services.TryAddSingleton<ProviderRegistry>();
        services.TryAddSingleton<IProviderRegistry>(provider => provider.GetRequiredService<ProviderRegistry>());

        // Register configuration validation services
        services.TryAddSingleton<IValidateOptions<ProviderSystemConfiguration>, ProviderSystemConfigurationValidator>();

        // Register hosted service for provider lifecycle management
        services.TryAddSingleton<IHostedService, ProviderSystemHostedService>();

        // Register health checks integration
        services.AddHealthChecks()
            .AddCheck<ProviderRegistryHealthCheck>("provider_registry")
            .AddCheck<ProviderSystemHealthCheck>("provider_system");

        // Configure provider system options if configuration provided
        if (configuration != null)
        {
            services.Configure<ProviderSystemConfiguration>(
                configuration.GetSection("ProviderSystem").Bind);
        }

        return new ProviderRegistrationBuilder(services, configuration);
    }

    /// <summary>
    /// Registers a provider factory with the DI container
    /// Provides type-safe factory registration with validation
    /// </summary>
    /// <typeparam name="TProvider">The provider interface type</typeparam>
    /// <typeparam name="TImplementation">The concrete provider implementation</typeparam>
    /// <typeparam name="TConfig">The configuration type</typeparam>
    /// <typeparam name="TFactory">The factory implementation type</typeparam>
    /// <param name="services">The service collection</param>
    /// <param name="factoryLifetime">Service lifetime for the factory (default: Singleton)</param>
    /// <returns>The service collection for chaining</returns>
    public static IServiceCollection AddProviderFactory<TProvider, TImplementation, TConfig, TFactory>(
        this IServiceCollection services,
        ServiceLifetime factoryLifetime = ServiceLifetime.Singleton)
        where TProvider : class
        where TImplementation : class, TProvider
        where TConfig : BaseProviderConfig
        where TFactory : class, IProviderFactory<TProvider, TConfig>
    {
        // Register the factory with specified lifetime
        services.Add(new ServiceDescriptor(typeof(TFactory), typeof(TFactory), factoryLifetime));
        services.Add(new ServiceDescriptor(typeof(IProviderFactory<TProvider, TConfig>),
            provider => provider.GetRequiredService<TFactory>(), factoryLifetime));
        services.Add(new ServiceDescriptor(typeof(IProviderFactory),
            provider => provider.GetRequiredService<TFactory>(), factoryLifetime));

        // Register factory registration action to be executed during startup
        services.Configure<ProviderFactoryRegistrationOptions>(options =>
        {
            options.FactoryRegistrations.Add(new FactoryRegistration
            {
                FactoryType = typeof(TFactory),
                ProviderType = typeof(TProvider),
                ConfigurationType = typeof(TConfig),
                FactoryLifetime = factoryLifetime
            });
        });

        return services;
    }

    /// <summary>
    /// Registers a provider with its configuration
    /// Provides fluent configuration with validation and health checks
    /// </summary>
    /// <typeparam name="TProvider">The provider interface type</typeparam>
    /// <typeparam name="TConfig">The configuration type</typeparam>
    /// <param name="services">The service collection</param>
    /// <param name="configureOptions">Action to configure provider options</param>
    /// <param name="configurationSection">Configuration section name (optional)</param>
    /// <param name="providerLifetime">Service lifetime for the provider (default: Singleton)</param>
    /// <returns>The service collection for chaining</returns>
    public static IServiceCollection AddProvider<TProvider, TConfig>(
        this IServiceCollection services,
        Action<TConfig>? configureOptions = null,
        string? configurationSection = null,
        ServiceLifetime providerLifetime = ServiceLifetime.Singleton)
        where TProvider : class
        where TConfig : BaseProviderConfig, new()
    {
        // Register configuration with validation
        if (!string.IsNullOrEmpty(configurationSection))
        {
            services.AddOptions<TConfig>()
                .Configure<IConfiguration>((config, configuration) =>
                    configuration.GetSection(configurationSection).Bind(config))
                .ValidateDataAnnotations()
                .ValidateOnStart();
        }
        else
        {
            services.AddOptions<TConfig>();
        }

        // Apply additional configuration if provided
        if (configureOptions != null)
        {
            services.Configure(configureOptions);
        }

        // Register validation for the configuration type
        services.TryAddEnumerable(ServiceDescriptor.Singleton<IValidateOptions<TConfig>, DataAnnotationValidateOptions<TConfig>>());

        // Register the provider with factory-based creation
        services.Add(new ServiceDescriptor(typeof(TProvider), serviceProvider =>
        {
            var registry = serviceProvider.GetRequiredService<IProviderRegistry>();
            var config = serviceProvider.GetRequiredService<IOptions<TConfig>>().Value;
            var logger = serviceProvider.GetRequiredService<ILogger<TProvider>>();

            var result = registry.CreateProviderAsync<TProvider>(config, logger).GetAwaiter().GetResult();
            if (result.IsFailure)
            {
                throw new InvalidOperationException($"Failed to create provider {typeof(TProvider).Name}: {result.Error}");
            }

            return result.Value;
        }, providerLifetime));

        // Register health check for the provider
        services.AddHealthChecks()
            .AddTypeActivatedCheck<ProviderHealthCheck<TProvider>>($"provider_{typeof(TProvider).Name.ToLowerInvariant()}");

        return services;
    }

    /// <summary>
    /// Automatically discovers and registers all provider factories in the specified assemblies
    /// Scans assemblies for IProviderFactory implementations and registers them
    /// </summary>
    /// <param name="services">The service collection</param>
    /// <param name="assemblies">Assemblies to scan (defaults to calling assembly)</param>
    /// <param name="factoryLifetime">Default service lifetime for discovered factories</param>
    /// <returns>The service collection for chaining</returns>
    public static IServiceCollection AddProviderFactoriesFromAssemblies(
        this IServiceCollection services,
        Assembly[]? assemblies = null,
        ServiceLifetime factoryLifetime = ServiceLifetime.Singleton)
    {
        assemblies ??= new[] { Assembly.GetCallingAssembly() };

        foreach (var assembly in assemblies)
        {
            var factoryTypes = assembly.GetTypes()
                .Where(t => t.IsClass && !t.IsAbstract &&
                           t.GetInterfaces().Any(i => i.IsGenericType &&
                                               i.GetGenericTypeDefinition() == typeof(IProviderFactory<,>)))
                .ToList();

            foreach (var factoryType in factoryTypes)
            {
                var factoryInterface = factoryType.GetInterfaces()
                    .First(i => i.IsGenericType && i.GetGenericTypeDefinition() == typeof(IProviderFactory<,>));

                var genericArgs = factoryInterface.GetGenericArguments();
                var providerType = genericArgs[0];
                var configType = genericArgs[1];

                // Register the factory
                services.Add(new ServiceDescriptor(factoryType, factoryType, factoryLifetime));
                services.Add(new ServiceDescriptor(factoryInterface,
                    provider => provider.GetRequiredService(factoryType), factoryLifetime));
                services.Add(new ServiceDescriptor(typeof(IProviderFactory),
                    provider => provider.GetRequiredService(factoryType), factoryLifetime));

                // Register factory for automatic registration
                services.Configure<ProviderFactoryRegistrationOptions>(options =>
                {
                    options.FactoryRegistrations.Add(new FactoryRegistration
                    {
                        FactoryType = factoryType,
                        ProviderType = providerType,
                        ConfigurationType = configType,
                        FactoryLifetime = factoryLifetime
                    });
                });
            }
        }

        return services;
    }

    /// <summary>
    /// Configures provider system logging with structured logging and performance metrics
    /// </summary>
    /// <param name="services">The service collection</param>
    /// <param name="configure">Optional action to configure logging options</param>
    /// <returns>The service collection for chaining</returns>
    public static IServiceCollection AddProviderLogging(
        this IServiceCollection services,
        Action<ProviderLoggingOptions>? configure = null)
    {
        if (configure != null)
        {
            services.Configure(configure);
        }
        else
        {
            services.Configure<ProviderLoggingOptions>(options =>
            {
                // Default values will be set via the record's default values
            });
        }

        // Register logging enrichers
        services.TryAddSingleton<IProviderLogEnricher, DefaultProviderLogEnricher>();

        return services;
    }

    /// <summary>
    /// Adds provider system health checks with comprehensive monitoring
    /// </summary>
    /// <param name="services">The service collection</param>
    /// <param name="configure">Optional action to configure health check options</param>
    /// <returns>The service collection for chaining</returns>
    public static IServiceCollection AddProviderHealthChecks(
        this IServiceCollection services,
        Action<ProviderHealthCheckOptions>? configure = null)
    {
        if (configure != null)
        {
            services.Configure(configure);
        }
        else
        {
            services.Configure<ProviderHealthCheckOptions>(options =>
            {
                // Default values will be set via the record's default values
            });
        }

        // Register health check implementations
        services.TryAddSingleton<ProviderRegistryHealthCheck>();
        services.TryAddSingleton<ProviderSystemHealthCheck>();

        return services;
    }

    /// <summary>
    /// Validates provider system configuration and dependencies
    /// Performs comprehensive validation during service registration
    /// </summary>
    /// <param name="services">The service collection</param>
    /// <returns>Validation results with detailed error information</returns>
    public static ProviderSystemValidationResult ValidateProviderSystem(this IServiceCollection services)
    {
        var result = new ProviderSystemValidationResult();
        var errors = new List<string>();
        var warnings = new List<string>();

        try
        {
            // Validate that ProviderRegistry is registered
            if (!services.Any(s => s.ServiceType == typeof(ProviderRegistry) ||
                                  s.ServiceType == typeof(IProviderRegistry)))
            {
                errors.Add("ProviderRegistry is not registered. Call AddProviderFactorySystem() first.");
            }

            // Validate factory registrations
            var factoryRegistrations = services.Where(s =>
                s.ServiceType.IsGenericType &&
                s.ServiceType.GetGenericTypeDefinition() == typeof(IProviderFactory<,>))
                .ToList();

            if (factoryRegistrations.Count == 0)
            {
                warnings.Add("No provider factories are registered.");
            }

            // Validate configuration registrations
            var configServices = services.Where(s =>
                s.ServiceType.IsGenericType &&
                s.ServiceType.GetGenericTypeDefinition() == typeof(IOptions<>) &&
                s.ServiceType.GenericTypeArguments[0].IsSubclassOf(typeof(BaseProviderConfig)))
                .ToList();

            // Validate health checks
            if (!services.Any(s => s.ServiceType == typeof(ProviderRegistryHealthCheck)))
            {
                warnings.Add("Provider health checks are not registered. Consider calling AddProviderHealthChecks().");
            }

            result = result with
            {
                IsValid = errors.Count == 0,
                Errors = errors,
                Warnings = warnings,
                RegisteredFactories = factoryRegistrations.Count,
                RegisteredConfigurations = configServices.Count
            };
        }
        catch (Exception ex)
        {
            errors.Add($"Validation failed with exception: {ex.Message}");
            result = result with { IsValid = false, Errors = errors };
        }

        return result;
    }
}

/// <summary>
/// Builder for fluent provider registration configuration
/// Provides chainable configuration methods with validation
/// </summary>
public sealed class ProviderRegistrationBuilder
{
    private readonly IServiceCollection _services;
    private readonly IConfiguration? _configuration;

    internal ProviderRegistrationBuilder(IServiceCollection services, IConfiguration? configuration)
    {
        _services = services;
        _configuration = configuration;
    }

    /// <summary>
    /// Adds structured logging for provider operations
    /// </summary>
    /// <param name="configure">Optional action to configure logging</param>
    /// <returns>The builder for chaining</returns>
    public ProviderRegistrationBuilder WithLogging(Action<ProviderLoggingOptions>? configure = null)
    {
        _services.AddProviderLogging(configure);
        return this;
    }

    /// <summary>
    /// Adds comprehensive health checks for provider system
    /// </summary>
    /// <param name="configure">Optional action to configure health checks</param>
    /// <returns>The builder for chaining</returns>
    public ProviderRegistrationBuilder WithHealthChecks(Action<ProviderHealthCheckOptions>? configure = null)
    {
        _services.AddProviderHealthChecks(configure);
        return this;
    }

    /// <summary>
    /// Automatically discovers and registers provider factories from assemblies
    /// </summary>
    /// <param name="assemblies">Assemblies to scan</param>
    /// <param name="factoryLifetime">Default lifetime for factories</param>
    /// <returns>The builder for chaining</returns>
    public ProviderRegistrationBuilder WithAutoDiscovery(
        Assembly[]? assemblies = null,
        ServiceLifetime factoryLifetime = ServiceLifetime.Singleton)
    {
        _services.AddProviderFactoriesFromAssemblies(assemblies, factoryLifetime);
        return this;
    }

    /// <summary>
    /// Configures the provider system with custom options
    /// </summary>
    /// <param name="configure">Action to configure system options</param>
    /// <returns>The builder for chaining</returns>
    public ProviderRegistrationBuilder Configure(Action<ProviderSystemConfiguration> configure)
    {
        _services.Configure(configure);
        return this;
    }

    /// <summary>
    /// Validates the provider system configuration
    /// </summary>
    /// <returns>Validation results</returns>
    public ProviderSystemValidationResult Validate()
    {
        return _services.ValidateProviderSystem();
    }

    /// <summary>
    /// Gets the configured service collection
    /// </summary>
    /// <returns>The service collection</returns>
    public IServiceCollection Services => _services;
}

/// <summary>
/// Configuration options for provider system
/// </summary>
public sealed record ProviderSystemConfiguration
{
    /// <summary>
    /// Gets or sets whether to enable automatic provider discovery
    /// </summary>
    public bool EnableAutoDiscovery { get; init; } = true;

    /// <summary>
    /// Gets or sets whether to enable health checks
    /// </summary>
    public bool EnableHealthChecks { get; init; } = true;

    /// <summary>
    /// Gets or sets whether to enable performance monitoring
    /// </summary>
    public bool EnablePerformanceMonitoring { get; init; } = true;

    /// <summary>
    /// Gets or sets the default provider timeout
    /// </summary>
    public TimeSpan DefaultProviderTimeout { get; init; } = TimeSpan.FromSeconds(30);

    /// <summary>
    /// Gets or sets the maximum number of concurrent provider operations
    /// </summary>
    public int MaxConcurrentOperations { get; init; } = Environment.ProcessorCount * 2;

    /// <summary>
    /// Gets or sets additional system configuration
    /// </summary>
    public Dictionary<string, object> AdditionalConfiguration { get; init; } = new();
}

/// <summary>
/// Options for provider factory registration
/// </summary>
public sealed class ProviderFactoryRegistrationOptions
{
    /// <summary>
    /// Gets the list of factory registrations
    /// </summary>
    public List<FactoryRegistration> FactoryRegistrations { get; } = new();
}

/// <summary>
/// Information about a factory registration
/// </summary>
public sealed record FactoryRegistration
{
    public Type FactoryType { get; init; } = typeof(object);
    public Type ProviderType { get; init; } = typeof(object);
    public Type ConfigurationType { get; init; } = typeof(object);
    public ServiceLifetime FactoryLifetime { get; init; } = ServiceLifetime.Singleton;
}

/// <summary>
/// Logging options for provider system
/// </summary>
public sealed record ProviderLoggingOptions
{
    public bool EnablePerformanceLogging { get; set; } = true;
    public bool EnableStructuredLogging { get; set; } = true;
    public Microsoft.Extensions.Logging.LogLevel LogLevel { get; set; } = Microsoft.Extensions.Logging.LogLevel.Information;
    public Dictionary<string, object> AdditionalProperties { get; set; } = new();
}

/// <summary>
/// Health check options for provider system
/// </summary>
public sealed record ProviderHealthCheckOptions
{
    public bool EnableDetailedHealthChecks { get; set; } = true;
    public TimeSpan HealthCheckInterval { get; set; } = TimeSpan.FromMinutes(5);
    public TimeSpan HealthCheckTimeout { get; set; } = TimeSpan.FromSeconds(30);
    public Dictionary<string, object> AdditionalSettings { get; set; } = new();
}

/// <summary>
/// Validation result for provider system configuration
/// </summary>
public sealed record ProviderSystemValidationResult
{
    public bool IsValid { get; init; } = true;
    public List<string> Errors { get; init; } = new();
    public List<string> Warnings { get; init; } = new();
    public int RegisteredFactories { get; init; } = 0;
    public int RegisteredConfigurations { get; init; } = 0;
    public DateTime ValidatedAt { get; init; } = DateTime.UtcNow;
}