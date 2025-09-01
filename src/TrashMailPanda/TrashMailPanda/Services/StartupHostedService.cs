using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace TrashMailPanda.Services;

/// <summary>
/// Hosted service that runs the startup orchestration process
/// </summary>
public class StartupHostedService : BackgroundService
{
    private readonly ILogger<StartupHostedService> _logger;
    private readonly IApplicationService _applicationService;

    public StartupHostedService(
        ILogger<StartupHostedService> logger,
        IApplicationService applicationService)
    {
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _applicationService = applicationService ?? throw new ArgumentNullException(nameof(applicationService));
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        try
        {
            _logger.LogInformation("Starting application initialization via hosted service");

            // Initialize the application
            var success = await _applicationService.InitializeAsync();

            if (success)
            {
                _logger.LogInformation("Application initialization completed successfully");
            }
            else
            {
                _logger.LogError("Application initialization failed");
                // Don't throw here as it would crash the host
            }

            // Keep the service running until cancellation is requested
            await Task.Delay(Timeout.Infinite, stoppingToken);
        }
        catch (OperationCanceledException)
        {
            _logger.LogInformation("Startup hosted service was cancelled");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception in startup hosted service");
            throw; // This will crash the host, which is appropriate for startup failures
        }
    }

    public override async Task StopAsync(CancellationToken cancellationToken)
    {
        _logger.LogInformation("Stopping application via hosted service");

        try
        {
            await _applicationService.ShutdownAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception during application shutdown");
            // Continue with base stop to avoid hanging
        }

        await base.StopAsync(cancellationToken);
    }
}