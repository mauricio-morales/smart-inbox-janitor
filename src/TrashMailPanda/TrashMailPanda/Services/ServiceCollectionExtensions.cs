using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using TrashMailPanda.Providers.Email;
using TrashMailPanda.Providers.LLM;
using TrashMailPanda.Providers.Storage;
using TrashMailPanda.Shared;
using TrashMailPanda.Shared.Security;
using TrashMailPanda.ViewModels;

namespace TrashMailPanda.Services;

/// <summary>
/// Extension methods for configuring dependency injection services
/// </summary>
public static class ServiceCollectionExtensions
{
    /// <summary>
    /// Add all TrashMail Panda services to the dependency injection container
    /// </summary>
    public static IServiceCollection AddTrashMailPandaServices(this IServiceCollection services, IConfiguration configuration)
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

        // Add provider bridge service for connecting legacy providers to new architecture
        services.AddSingleton<IProviderBridgeService, ProviderBridgeService>();

        // Add background health monitoring service
        services.AddHostedService<ProviderHealthMonitorService>();

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

        // Add provider status dashboard ViewModels
        services.AddTransient<ProviderStatusDashboardViewModel>();
        // Note: ProviderStatusCardViewModel is created directly by the dashboard ViewModel
        // so it doesn't need DI registration

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

