using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using TrashMailPanda.Shared;
using TrashMailPanda.Shared.Security;

namespace TrashMailPanda.Services;

/// <summary>
/// Main application service that coordinates all application-level operations
/// </summary>
public class ApplicationService : IApplicationService
{
    private readonly ILogger<ApplicationService> _logger;
    private readonly IEmailProvider? _emailProvider;
    private readonly ILLMProvider? _llmProvider;
    private readonly IStorageProvider _storageProvider;
    private readonly ISecureStorageManager _secureStorageManager;
    private readonly IStartupOrchestrator _startupOrchestrator;

    private bool _isInitialized = false;
    private bool _isReady = false;
    private DateTime _lastStatusUpdate = DateTime.UtcNow;

    public ApplicationService(
        ILogger<ApplicationService> logger,
        IStorageProvider storageProvider,
        ISecureStorageManager secureStorageManager,
        IStartupOrchestrator startupOrchestrator,
        IEmailProvider? emailProvider = null,
        ILLMProvider? llmProvider = null)
    {
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _emailProvider = emailProvider; // Can be null - will be set after secrets are available
        _llmProvider = llmProvider; // Can be null - will be set after secrets are available
        _storageProvider = storageProvider ?? throw new ArgumentNullException(nameof(storageProvider));
        _secureStorageManager = secureStorageManager ?? throw new ArgumentNullException(nameof(secureStorageManager));
        _startupOrchestrator = startupOrchestrator ?? throw new ArgumentNullException(nameof(startupOrchestrator));
    }

    public bool IsReady => _isReady;

    public async Task<bool> InitializeAsync()
    {
        if (_isInitialized)
        {
            _logger.LogInformation("Application already initialized");
            return _isReady;
        }

        _logger.LogInformation("Starting application initialization");
        _lastStatusUpdate = DateTime.UtcNow;

        try
        {
            // Execute startup orchestration
            var startupResult = await _startupOrchestrator.ExecuteStartupAsync();

            if (startupResult.IsSuccess)
            {
                _isInitialized = true;
                _isReady = true;
                _lastStatusUpdate = DateTime.UtcNow;

                _logger.LogInformation("Application initialization completed successfully in {Duration}",
                    startupResult.Duration);
                return true;
            }
            else
            {
                _isInitialized = true;
                _isReady = false;
                _lastStatusUpdate = DateTime.UtcNow;

                _logger.LogError("Application initialization failed: {Status} - {Error}",
                    startupResult.Status, startupResult.ErrorMessage);
                return false;
            }
        }
        catch (Exception ex)
        {
            _isInitialized = true;
            _isReady = false;
            _lastStatusUpdate = DateTime.UtcNow;

            _logger.LogError(ex, "Exception during application initialization");
            return false;
        }
    }

    public async Task ShutdownAsync()
    {
        _logger.LogInformation("Starting application shutdown");

        try
        {
            // Shutdown providers in reverse order
            // TODO: Implement shutdown methods in provider interfaces
            // var shutdownTasks = new[]
            // {
            //     ShutdownProviderAsync("LLM", async () => await _llmProvider.ShutdownAsync()),
            //     ShutdownProviderAsync("Email", async () => await _emailProvider.ShutdownAsync()),
            //     ShutdownProviderAsync("Storage", async () => await _storageProvider.ShutdownAsync())
            // };
            // 
            // await Task.WhenAll(shutdownTasks);

            _isReady = false;
            _lastStatusUpdate = DateTime.UtcNow;

            _logger.LogInformation("Application shutdown completed");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception during application shutdown");
            throw;
        }
    }

    public ApplicationStatus GetStatus()
    {
        return new ApplicationStatus
        {
            IsInitialized = _isInitialized,
            IsReady = _isReady,
            Status = GetStatusString(),
            LastUpdate = _lastStatusUpdate,
            Details = GetStatusDetails()
        };
    }

    private async Task ShutdownProviderAsync(string providerName, Func<Task> shutdownAction)
    {
        try
        {
            _logger.LogDebug("Shutting down {Provider} provider", providerName);
            await shutdownAction();
            _logger.LogDebug("{Provider} provider shutdown completed", providerName);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Exception shutting down {Provider} provider", providerName);
            // Continue with other shutdowns even if one fails
        }
    }

    private string GetStatusString()
    {
        if (!_isInitialized)
        {
            return "Not Initialized";
        }

        if (_isReady)
        {
            return "Ready";
        }

        return "Initialized but Not Ready";
    }

    private Dictionary<string, object> GetStatusDetails()
    {
        var details = new Dictionary<string, object>
        {
            { "initialized", _isInitialized },
            { "ready", _isReady },
            { "last_update", _lastStatusUpdate },
            { "uptime", DateTime.UtcNow - _lastStatusUpdate }
        };

        // Add provider status if available
        try
        {
            details.Add("startup_progress", _startupOrchestrator.GetProgress());
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "Could not get startup progress for status details");
        }

        return details;
    }
}