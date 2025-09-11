using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using TrashMailPanda.Shared;
using TrashMailPanda.Shared.Models;
using TrashMailPanda.Providers.Email;

namespace TrashMailPanda.Services;

/// <summary>
/// Service for monitoring provider status and health
/// </summary>
public class ProviderStatusService : IProviderStatusService
{
    private readonly ILogger<ProviderStatusService> _logger;
    private readonly IEmailProvider? _emailProvider;
    private readonly ILLMProvider? _llmProvider;
    private readonly IStorageProvider _storageProvider;

    private readonly Dictionary<string, ProviderStatus> _providerStatus = new();
    private readonly object _statusLock = new();

    public event EventHandler<ProviderStatusChangedEventArgs>? ProviderStatusChanged;

    public ProviderStatusService(
        ILogger<ProviderStatusService> logger,
        IStorageProvider storageProvider,
        IEmailProvider? emailProvider = null,
        ILLMProvider? llmProvider = null)
    {
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _emailProvider = emailProvider; // Can be null - will be set after secrets are available
        _llmProvider = llmProvider; // Can be null - will be set after secrets are available
        _storageProvider = storageProvider ?? throw new ArgumentNullException(nameof(storageProvider));
    }

    public async Task<Dictionary<string, ProviderStatus>> GetAllProviderStatusAsync()
    {
        await RefreshProviderStatusAsync();

        lock (_statusLock)
        {
            return new Dictionary<string, ProviderStatus>(_providerStatus);
        }
    }

    public async Task<ProviderStatus?> GetProviderStatusAsync(string providerName)
    {
        if (string.IsNullOrWhiteSpace(providerName))
        {
            return null;
        }

        await RefreshProviderStatusAsync();

        lock (_statusLock)
        {
            return _providerStatus.TryGetValue(providerName, out var status) ? status : null;
        }
    }

    public async Task<bool> AreAllProvidersHealthyAsync()
    {
        var allStatus = await GetAllProviderStatusAsync();
        return allStatus.Values.All(status => status.IsHealthy);
    }

    public async Task RefreshProviderStatusAsync()
    {
        _logger.LogDebug("Refreshing provider status for all providers");

        var refreshTasks = new List<Task>();

        if (_emailProvider != null)
            refreshTasks.Add(RefreshProviderStatusAsync("Email", _emailProvider));
        if (_llmProvider != null)
            refreshTasks.Add(RefreshProviderStatusAsync("LLM", _llmProvider));

        refreshTasks.Add(RefreshProviderStatusAsync("Storage", _storageProvider));

        await Task.WhenAll(refreshTasks);

        _logger.LogDebug("Provider status refresh completed");
    }

    private async Task RefreshProviderStatusAsync(string providerName, object provider)
    {
        try
        {
            var status = await GetProviderStatusInternalAsync(providerName, provider);
            var previousStatus = GetCurrentStatus(providerName);

            lock (_statusLock)
            {
                _providerStatus[providerName] = status;
            }

            // Fire event if status changed
            if (previousStatus == null || !StatusesEqual(previousStatus, status))
            {
                OnProviderStatusChanged(providerName, status, previousStatus);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception refreshing status for {Provider} provider", providerName);

            var errorStatus = new ProviderStatus
            {
                Name = providerName,
                IsHealthy = false,
                IsInitialized = false,
                RequiresSetup = true,
                Status = "Error",
                ErrorMessage = ex.Message,
                LastCheck = DateTime.UtcNow
            };

            lock (_statusLock)
            {
                _providerStatus[providerName] = errorStatus;
            }

            OnProviderStatusChanged(providerName, errorStatus, GetCurrentStatus(providerName));
        }
    }

    private async Task<ProviderStatus> GetProviderStatusInternalAsync(string providerName, object provider)
    {
        // Since we don't have a common health check interface yet, we'll simulate this
        // In a real implementation, this would call provider-specific health check methods

        var status = new ProviderStatus
        {
            Name = providerName,
            LastCheck = DateTime.UtcNow
        };

        // TODO: Replace with actual provider health check calls when interfaces are updated
        switch (provider)
        {
            case IEmailProvider emailProvider:
                // Get authenticated user info if it's a Gmail provider
                AuthenticatedUserInfo? authenticatedUser = null;
                if (emailProvider is GmailEmailProvider gmailProvider)
                {
                    try
                    {
                        var userResult = await gmailProvider.GetAuthenticatedUserAsync();
                        authenticatedUser = userResult.IsSuccess ? userResult.Value : null;
                        _logger.LogDebug("Retrieved authenticated user info for Gmail: {Email}",
                            authenticatedUser?.Email ?? "None");
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "Failed to get authenticated user info from Gmail provider");
                    }
                }

                status = status with
                {
                    IsHealthy = true,
                    IsInitialized = true,
                    RequiresSetup = false,
                    Status = "Connected",
                    AuthenticatedUser = authenticatedUser,
                    Details = new Dictionary<string, object>
                    {
                        { "type", "Gmail" },
                        { "last_check", DateTime.UtcNow },
                        { "authenticated_user", authenticatedUser?.Email ?? "Not available" }
                    }
                };
                break;

            case ILLMProvider llmProvider:
                status = status with
                {
                    IsHealthy = true,
                    IsInitialized = true,
                    RequiresSetup = false,
                    Status = "Ready",
                    Details = new Dictionary<string, object>
                    {
                        { "type", "OpenAI" },
                        { "model", "gpt-4o-mini" },
                        { "last_check", DateTime.UtcNow }
                    }
                };
                break;

            case IStorageProvider storageProvider:
                status = status with
                {
                    IsHealthy = true,
                    IsInitialized = true,
                    RequiresSetup = false,
                    Status = "Connected",
                    Details = new Dictionary<string, object>
                    {
                        { "type", "SQLite" },
                        { "encrypted", true },
                        { "last_check", DateTime.UtcNow }
                    }
                };
                break;

            default:
                status = status with
                {
                    IsHealthy = false,
                    IsInitialized = false,
                    RequiresSetup = true,
                    Status = "Unknown",
                    ErrorMessage = "Unknown provider type"
                };
                break;
        }

        return status;
    }

    private ProviderStatus? GetCurrentStatus(string providerName)
    {
        lock (_statusLock)
        {
            return _providerStatus.TryGetValue(providerName, out var status) ? status : null;
        }
    }

    private static bool StatusesEqual(ProviderStatus status1, ProviderStatus status2)
    {
        return status1.IsHealthy == status2.IsHealthy &&
               status1.IsInitialized == status2.IsInitialized &&
               status1.RequiresSetup == status2.RequiresSetup &&
               status1.Status == status2.Status &&
               status1.ErrorMessage == status2.ErrorMessage &&
               AuthenticatedUserEqual(status1.AuthenticatedUser, status2.AuthenticatedUser);
    }

    private static bool AuthenticatedUserEqual(AuthenticatedUserInfo? user1, AuthenticatedUserInfo? user2)
    {
        if (user1 == null && user2 == null) return true;
        if (user1 == null || user2 == null) return false;
        return user1.Email == user2.Email;
    }

    private void OnProviderStatusChanged(string providerName, ProviderStatus newStatus, ProviderStatus? previousStatus)
    {
        try
        {
            var args = new ProviderStatusChangedEventArgs
            {
                ProviderName = providerName,
                Status = newStatus,
                PreviousStatus = previousStatus
            };

            ProviderStatusChanged?.Invoke(this, args);

            _logger.LogInformation("Provider {Provider} status changed: {Status} (Healthy: {IsHealthy})",
                providerName, newStatus.Status, newStatus.IsHealthy);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception firing provider status changed event for {Provider}", providerName);
        }
    }
}