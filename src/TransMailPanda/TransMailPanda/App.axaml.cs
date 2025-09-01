using System;
using System.IO;
using System.Linq;
using Avalonia;
using Avalonia.Controls.ApplicationLifetimes;
using Avalonia.Data.Core;
using Avalonia.Data.Core.Plugins;
using Avalonia.Markup.Xaml;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using TransMailPanda.ViewModels;
using TransMailPanda.Views;
using TransMailPanda.Services;

namespace TransMailPanda;

public partial class App : Application
{
    private IHost? _host;
    private IServiceProvider? _serviceProvider;

    public override void Initialize()
    {
        AvaloniaXamlLoader.Load(this);
    }

    public override async void OnFrameworkInitializationCompleted()
    {
        // Build configuration
        var configuration = BuildConfiguration();

        // Build and start the host with dependency injection
        _host = CreateHostBuilder(configuration).Build();
        _serviceProvider = _host.Services;

        // Start the host services
        await _host.StartAsync();

        if (ApplicationLifetime is IClassicDesktopStyleApplicationLifetime desktop)
        {
            // Avoid duplicate validations from both Avalonia and the CommunityToolkit. 
            // More info: https://docs.avaloniaui.net/docs/guides/development-guides/data-validation#manage-validationplugins
            DisableAvaloniaDataAnnotationValidation();

            // Create main window with dependency injection
            var mainWindowViewModel = _serviceProvider.GetRequiredService<MainWindowViewModel>();
            desktop.MainWindow = new MainWindow
            {
                DataContext = mainWindowViewModel,
            };

            // Handle application shutdown
            desktop.Exit += OnApplicationExit;
        }

        base.OnFrameworkInitializationCompleted();
    }

    private static IConfiguration BuildConfiguration()
    {
        return new ConfigurationBuilder()
            .SetBasePath(Directory.GetCurrentDirectory())
            .AddJsonFile("appsettings.json", optional: true, reloadOnChange: true)
            .AddJsonFile($"appsettings.{Environment.GetEnvironmentVariable("DOTNET_ENVIRONMENT") ?? "Production"}.json", optional: true)
            .AddUserSecrets<App>(optional: true)
            .AddEnvironmentVariables()
            .Build();
    }

    private static IHostBuilder CreateHostBuilder(IConfiguration configuration)
    {
        return Host.CreateDefaultBuilder()
            .ConfigureServices((context, services) =>
            {
                // Add configuration
                services.AddSingleton(configuration);

                // Add TransMail Panda services
                services.AddTransMailPandaServices(configuration);

                // Add startup orchestration
                services.AddStartupOrchestration();
            })
            .ConfigureLogging(logging =>
            {
                logging.ClearProviders();
                logging.AddConfiguration(configuration.GetSection("Logging"));
                logging.AddConsole();
                logging.AddDebug();

                // Set default log level
                logging.SetMinimumLevel(LogLevel.Information);
            });
    }

    private async void OnApplicationExit(object? sender, ControlledApplicationLifetimeExitEventArgs e)
    {
        if (_host != null)
        {
            await _host.StopAsync(TimeSpan.FromSeconds(5));
            _host.Dispose();
        }
    }

    private void DisableAvaloniaDataAnnotationValidation()
    {
        // Get an array of plugins to remove
        var dataValidationPluginsToRemove =
            BindingPlugins.DataValidators.OfType<DataAnnotationsValidationPlugin>().ToArray();

        // remove each entry found
        foreach (var plugin in dataValidationPluginsToRemove)
        {
            BindingPlugins.DataValidators.Remove(plugin);
        }
    }

    /// <summary>
    /// Get a service from the dependency injection container
    /// Used by views to get their view models with proper DI
    /// </summary>
    public static T? GetService<T>() where T : class
    {
        if (Current is App app && app._serviceProvider != null)
        {
            return app._serviceProvider.GetService<T>();
        }
        return null;
    }

    /// <summary>
    /// Get a required service from the dependency injection container
    /// Throws if the service is not registered
    /// </summary>
    public static T GetRequiredService<T>() where T : class
    {
        if (Current is App app && app._serviceProvider != null)
        {
            return app._serviceProvider.GetRequiredService<T>();
        }
        throw new InvalidOperationException("Service provider not available");
    }
}