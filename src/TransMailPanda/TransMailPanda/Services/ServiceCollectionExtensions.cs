using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using TransMailPanda.Providers.Email;
using TransMailPanda.Providers.LLM;
using TransMailPanda.Providers.Storage;
using TransMailPanda.Shared;
using TransMailPanda.Shared.Security;
using TransMailPanda.ViewModels;

namespace TransMailPanda.Services;

/// <summary>
/// Extension methods for configuring dependency injection services
/// </summary>
public static class ServiceCollectionExtensions
{
    /// <summary>
    /// Add all TransMail Panda services to the dependency injection container
    /// </summary>
    public static IServiceCollection AddTransMailPandaServices(this IServiceCollection services, IConfiguration configuration)
    {
        // Add logging
        services.AddLogging(builder =>
        {
            builder.AddConfiguration(configuration.GetSection("Logging"));
            builder.AddConsole();
            builder.AddDebug();
        });

        // Add configuration options
        services.AddOptions();
        services.Configure<EmailProviderConfig>(configuration.GetSection("EmailProvider"));
        services.Configure<LLMProviderConfig>(configuration.GetSection("LLMProvider"));
        services.Configure<StorageProviderConfig>(configuration.GetSection("StorageProvider"));

        // Add security services
        services.AddSecurityServices();

        // Add providers
        services.AddProviders();

        // Add application services
        services.AddApplicationServices();

        // Add view models
        services.AddViewModels();

        return services;
    }

    /// <summary>
    /// Add security-related services
    /// </summary>
    private static IServiceCollection AddSecurityServices(this IServiceCollection services)
    {
        services.AddSingleton<ICredentialEncryption, CredentialEncryption>();
        services.AddSingleton<ISecureStorageManager, SecureStorageManager>();
        services.AddSingleton<ISecurityAuditLogger, SecurityAuditLogger>();

        return services;
    }

    /// <summary>
    /// Add provider services
    /// </summary>
    private static IServiceCollection AddProviders(this IServiceCollection services)
    {
        // Register providers as singletons for the application lifetime
        services.AddSingleton<IEmailProvider, GmailEmailProvider>();
        services.AddSingleton<ILLMProvider, OpenAIProvider>();
        services.AddSingleton<IStorageProvider, SqliteStorageProvider>();

        return services;
    }

    /// <summary>
    /// Add application services
    /// </summary>
    private static IServiceCollection AddApplicationServices(this IServiceCollection services)
    {
        services.AddSingleton<IStartupOrchestrator, StartupOrchestrator>();
        services.AddSingleton<IProviderStatusService, ProviderStatusService>();
        services.AddSingleton<IApplicationService, ApplicationService>();

        return services;
    }

    /// <summary>
    /// Add view models
    /// </summary>
    private static IServiceCollection AddViewModels(this IServiceCollection services)
    {
        // Register view models as transients (new instance per request)
        services.AddTransient<MainWindowViewModel>();
        services.AddTransient<WelcomeWizardViewModel>();
        // TODO: Add StartupViewModel when it's created

        return services;
    }

    /// <summary>
    /// Add the hosted service that will run the startup orchestration
    /// </summary>
    public static IServiceCollection AddStartupOrchestration(this IServiceCollection services)
    {
        services.AddHostedService<StartupHostedService>();
        return services;
    }
}

/// <summary>
/// Configuration class for Email Provider
/// </summary>
public class EmailProviderConfig
{
    public string ClientId { get; set; } = string.Empty;
    public string ClientSecret { get; set; } = string.Empty;
    public string RedirectUri { get; set; } = "http://localhost:8080/oauth/callback";
    public int TimeoutSeconds { get; set; } = 30;
}

/// <summary>
/// Configuration class for LLM Provider
/// </summary>
public class LLMProviderConfig
{
    public string ApiKey { get; set; } = string.Empty;
    public string Model { get; set; } = "gpt-4o-mini";
    public double Temperature { get; set; } = 0.1;
    public int MaxTokens { get; set; } = 1000;
    public decimal DailyCostLimit { get; set; } = 10.0m;
}

/// <summary>
/// Configuration class for Storage Provider
/// </summary>
public class StorageProviderConfig
{
    public string DatabasePath { get; set; } = "./data/transmail.db";
    public string EncryptionKey { get; set; } = string.Empty;
    public bool EnableWAL { get; set; } = true;
    public int CommandTimeoutSeconds { get; set; } = 30;
}