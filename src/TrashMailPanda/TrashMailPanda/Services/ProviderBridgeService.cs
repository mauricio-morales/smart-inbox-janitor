using Microsoft.Extensions.Logging;
using TrashMailPanda.Models;
using TrashMailPanda.Shared;
using TrashMailPanda.Shared.Base;
using TrashMailPanda.Shared.Models;
using TrashMailPanda.Shared.Security;

namespace TrashMailPanda.Services;

/// <summary>
/// Bridge service that connects legacy providers to the new IProvider interface
/// Handles zero-configuration setup and separates OAuth client credentials from session tokens
/// </summary>
public class ProviderBridgeService : IProviderBridgeService
{
    private readonly IEmailProvider _emailProvider;
    private readonly ILLMProvider _llmProvider;
    private readonly IStorageProvider _storageProvider;
    private readonly ISecureStorageManager _secureStorageManager;
    private readonly ILogger<ProviderBridgeService> _logger;

    // Provider display information for UI
    private static readonly Dictionary<string, ProviderDisplayInfo> _providerDisplayInfo = new()
    {
        ["Gmail"] = new()
        {
            Name = "Gmail",
            DisplayName = "Gmail",
            Description = "Connect to your Gmail account for email processing and cleanup",
            Type = ProviderType.Email,
            IsRequired = true,
            AllowsMultiple = false,
            Icon = "📧",
            Complexity = SetupComplexity.Moderate,
            EstimatedSetupTimeMinutes = 3,
            Prerequisites = "Gmail account and web browser access"
        },
        ["OpenAI"] = new()
        {
            Name = "OpenAI",
            DisplayName = "OpenAI GPT",
            Description = "AI-powered email classification and smart processing",
            Type = ProviderType.LLM,
            IsRequired = true,
            AllowsMultiple = false,
            Icon = "🤖",
            Complexity = SetupComplexity.Simple,
            EstimatedSetupTimeMinutes = 2,
            Prerequisites = "OpenAI API account and API key"
        },
        ["SQLite"] = new()
        {
            Name = "SQLite",
            DisplayName = "Local Storage",
            Description = "Secure local database for storing email data and settings",
            Type = ProviderType.Storage,
            IsRequired = true,
            AllowsMultiple = false,
            Icon = "💾",
            Complexity = SetupComplexity.Simple,
            EstimatedSetupTimeMinutes = 0,
            Prerequisites = "None - automatically configured"
        }
    };

    public ProviderBridgeService(
        IEmailProvider emailProvider,
        ILLMProvider llmProvider,
        IStorageProvider storageProvider,
        ISecureStorageManager secureStorageManager,
        ILogger<ProviderBridgeService> logger)
    {
        _emailProvider = emailProvider ?? throw new ArgumentNullException(nameof(emailProvider));
        _llmProvider = llmProvider ?? throw new ArgumentNullException(nameof(llmProvider));
        _storageProvider = storageProvider ?? throw new ArgumentNullException(nameof(storageProvider));
        _secureStorageManager = secureStorageManager ?? throw new ArgumentNullException(nameof(secureStorageManager));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <summary>
    /// Get provider display information for UI
    /// </summary>
    public IReadOnlyDictionary<string, ProviderDisplayInfo> GetProviderDisplayInfo()
    {
        return _providerDisplayInfo;
    }

    /// <summary>
    /// Get Gmail provider status with separated credential handling
    /// </summary>
    public async Task<Result<ProviderStatus>> GetEmailProviderStatusAsync()
    {
        try
        {
            _logger.LogDebug("Checking Gmail provider status");

            var status = new ProviderStatus
            {
                Name = "Gmail",
                LastCheck = DateTime.UtcNow,
                Details = new Dictionary<string, object>
                {
                    { "type", "Gmail" },
                    { "provider_version", "1.0.0" }
                }
            };

            // Check if OAuth client credentials are configured
            var hasClientCredentials = await HasGmailClientCredentialsAsync();

            // Check if session tokens exist and are valid
            var hasValidSession = await HasValidGmailSessionAsync();

            // Determine provider state based on credential availability
            if (!hasClientCredentials)
            {
                // No OAuth client configured - needs initial setup
                status = status with
                {
                    IsHealthy = false,
                    IsInitialized = false,
                    RequiresSetup = true,
                    Status = "OAuth Setup Required",
                    ErrorMessage = "Gmail OAuth client credentials not configured"
                };
            }
            else if (!hasValidSession)
            {
                // Client configured but no valid session - needs user authentication
                status = status with
                {
                    IsHealthy = false,
                    IsInitialized = true, // Client is configured
                    RequiresSetup = false, // Don't need client setup
                    Status = "Authentication Required",
                    ErrorMessage = "Gmail session expired - please sign in again"
                };
            }
            else
            {
                // Both client and session are available - test actual connectivity
                var connectivityResult = await TestGmailConnectivityAsync();

                status = status with
                {
                    IsHealthy = connectivityResult.IsSuccess,
                    IsInitialized = true,
                    RequiresSetup = false,
                    Status = connectivityResult.IsSuccess ? "Connected" : "Connection Failed",
                    ErrorMessage = connectivityResult.IsSuccess ? null : connectivityResult.Error?.Message
                };

                if (connectivityResult.IsSuccess && connectivityResult.Value != null)
                {
                    status.Details["user_email"] = connectivityResult.Value;
                }
            }

            _logger.LogDebug("Gmail provider status: {Status} (Healthy: {IsHealthy})", status.Status, status.IsHealthy);
            return Result<ProviderStatus>.Success(status);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception checking Gmail provider status");
            return Result<ProviderStatus>.Failure(new ProcessingError($"Status check failed: {ex.Message}"));
        }
    }

    /// <summary>
    /// Get OpenAI provider status
    /// </summary>
    public async Task<Result<ProviderStatus>> GetLLMProviderStatusAsync()
    {
        try
        {
            _logger.LogDebug("Checking OpenAI provider status");

            var status = new ProviderStatus
            {
                Name = "OpenAI",
                LastCheck = DateTime.UtcNow,
                Details = new Dictionary<string, object>
                {
                    { "type", "OpenAI" },
                    { "model", "gpt-4o-mini" }
                }
            };

            // Check if API key is configured
            var apiKeyResult = await _secureStorageManager.RetrieveCredentialAsync(ProviderCredentialTypes.OpenAIApiKey);

            if (!apiKeyResult.IsSuccess || string.IsNullOrEmpty(apiKeyResult.Value))
            {
                status = status with
                {
                    IsHealthy = false,
                    IsInitialized = false,
                    RequiresSetup = true,
                    Status = "API Key Required",
                    ErrorMessage = "OpenAI API key not configured"
                };
            }
            else
            {
                // Test API key validity
                var connectivityResult = await TestOpenAIConnectivityAsync(apiKeyResult.Value);

                status = status with
                {
                    IsHealthy = connectivityResult.IsSuccess,
                    IsInitialized = true,
                    RequiresSetup = !connectivityResult.IsSuccess, // If test fails, may need reconfiguration
                    Status = connectivityResult.IsSuccess ? "Connected" : "API Key Invalid",
                    ErrorMessage = connectivityResult.IsSuccess ? null : connectivityResult.Error?.Message
                };

                if (connectivityResult.IsSuccess)
                {
                    // Mask API key for display
                    var maskedKey = MaskApiKey(apiKeyResult.Value);
                    status.Details["api_key"] = maskedKey;
                    status.Details["last_test"] = DateTime.UtcNow;
                }
            }

            _logger.LogDebug("OpenAI provider status: {Status} (Healthy: {IsHealthy})", status.Status, status.IsHealthy);
            return Result<ProviderStatus>.Success(status);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception checking OpenAI provider status");
            return Result<ProviderStatus>.Failure(new ProcessingError($"Status check failed: {ex.Message}"));
        }
    }

    /// <summary>
    /// Get SQLite storage provider status
    /// </summary>
    public async Task<Result<ProviderStatus>> GetStorageProviderStatusAsync()
    {
        try
        {
            _logger.LogDebug("Checking SQLite provider status");

            // Storage provider should always be available - test database connectivity
            var connectivityResult = await TestStorageConnectivityAsync();

            var status = new ProviderStatus
            {
                Name = "SQLite",
                LastCheck = DateTime.UtcNow,
                IsHealthy = connectivityResult.IsSuccess,
                IsInitialized = true, // Storage is always initialized
                RequiresSetup = false, // Storage never requires user setup
                Status = connectivityResult.IsSuccess ? "Connected" : "Database Error",
                ErrorMessage = connectivityResult.IsSuccess ? null : connectivityResult.Error?.Message,
                Details = new Dictionary<string, object>
                {
                    { "type", "SQLite" },
                    { "encrypted", true }
                }
            };

            if (connectivityResult.IsSuccess && connectivityResult.Value != null)
            {
                status.Details["database_info"] = connectivityResult.Value;
            }

            _logger.LogDebug("SQLite provider status: {Status} (Healthy: {IsHealthy})", status.Status, status.IsHealthy);
            return Result<ProviderStatus>.Success(status);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception checking SQLite provider status");
            return Result<ProviderStatus>.Failure(new ProcessingError($"Status check failed: {ex.Message}"));
        }
    }

    /// <summary>
    /// Get status for all providers
    /// </summary>
    public async Task<Dictionary<string, ProviderStatus>> GetAllProviderStatusAsync()
    {
        var results = new Dictionary<string, ProviderStatus>();

        // Execute provider status checks in parallel
        var tasks = new[]
        {
            GetEmailProviderStatusAsync(),
            GetLLMProviderStatusAsync(),
            GetStorageProviderStatusAsync()
        };

        var statuses = await Task.WhenAll(tasks);

        // Collect results
        for (int i = 0; i < statuses.Length; i++)
        {
            if (statuses[i].IsSuccess)
            {
                var providerStatus = statuses[i].Value!;
                results[providerStatus.Name] = providerStatus;
            }
            else
            {
                // Create error status for failed provider
                var providerName = i switch
                {
                    0 => "Gmail",
                    1 => "OpenAI",
                    2 => "SQLite",
                    _ => "Unknown"
                };

                results[providerName] = new ProviderStatus
                {
                    Name = providerName,
                    IsHealthy = false,
                    IsInitialized = false,
                    RequiresSetup = true,
                    Status = "Error",
                    ErrorMessage = statuses[i].Error?.Message ?? "Unknown error",
                    LastCheck = DateTime.UtcNow
                };
            }
        }

        return results;
    }

    /// <summary>
    /// Check if Gmail OAuth client credentials are configured
    /// </summary>
    private async Task<bool> HasGmailClientCredentialsAsync()
    {
        try
        {
            var clientIdResult = await _secureStorageManager.RetrieveCredentialAsync(ProviderCredentialTypes.GmailClientId);
            var clientSecretResult = await _secureStorageManager.RetrieveCredentialAsync(ProviderCredentialTypes.GmailClientSecret);

            return clientIdResult.IsSuccess && !string.IsNullOrEmpty(clientIdResult.Value) &&
                   clientSecretResult.IsSuccess && !string.IsNullOrEmpty(clientSecretResult.Value);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception checking Gmail client credentials");
            return false;
        }
    }

    /// <summary>
    /// Check if Gmail session tokens exist and are valid
    /// </summary>
    private async Task<bool> HasValidGmailSessionAsync()
    {
        try
        {
            var accessTokenResult = await _secureStorageManager.RetrieveCredentialAsync(ProviderCredentialTypes.GmailAccessToken);
            var refreshTokenResult = await _secureStorageManager.RetrieveCredentialAsync(ProviderCredentialTypes.GmailRefreshToken);

            // Need at least a refresh token to maintain session
            if (!refreshTokenResult.IsSuccess || string.IsNullOrEmpty(refreshTokenResult.Value))
            {
                return false;
            }

            // Check token expiry if available
            var expiryResult = await _secureStorageManager.RetrieveCredentialAsync(ProviderCredentialTypes.GmailTokenExpiry);
            if (expiryResult.IsSuccess && DateTime.TryParse(expiryResult.Value, out var expiry))
            {
                // If access token expired but we have refresh token, that's still valid
                // The provider should handle token refresh automatically
                return true;
            }

            // Access token exists and we have refresh capability
            return accessTokenResult.IsSuccess && !string.IsNullOrEmpty(accessTokenResult.Value);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception checking Gmail session validity");
            return false;
        }
    }

    /// <summary>
    /// Test Gmail connectivity
    /// </summary>
    private async Task<Result<string>> TestGmailConnectivityAsync()
    {
        try
        {
            // TODO: Call actual Gmail provider health check method
            // For now, simulate connectivity test
            await Task.Delay(100); // Simulate API call

            // Return user email if available
            var emailResult = await _secureStorageManager.RetrieveCredentialAsync(ProviderCredentialTypes.GmailUserEmail);
            var userEmail = emailResult.IsSuccess ? emailResult.Value : "user@gmail.com";

            return Result<string>.Success(userEmail ?? "Connected");
        }
        catch (Exception ex)
        {
            return Result<string>.Failure(new NetworkError($"Gmail connectivity test failed: {ex.Message}"));
        }
    }

    /// <summary>
    /// Test OpenAI API connectivity
    /// </summary>
    private async Task<Result<bool>> TestOpenAIConnectivityAsync(string apiKey)
    {
        try
        {
            // TODO: Call actual OpenAI provider health check method
            // For now, validate API key format and simulate API test
            if (!apiKey.StartsWith("sk-", StringComparison.Ordinal) || apiKey.Length < 20)
            {
                return Result<bool>.Failure(new ValidationError("Invalid API key format"));
            }

            await Task.Delay(100); // Simulate API call
            return Result<bool>.Success(true);
        }
        catch (Exception ex)
        {
            return Result<bool>.Failure(new NetworkError($"OpenAI connectivity test failed: {ex.Message}"));
        }
    }

    /// <summary>
    /// Test SQLite storage connectivity
    /// </summary>
    private async Task<Result<Dictionary<string, object>>> TestStorageConnectivityAsync()
    {
        try
        {
            // TODO: Call actual storage provider health check method
            await Task.Delay(50); // Simulate database query

            var dbInfo = new Dictionary<string, object>
            {
                { "connection_status", "Connected" },
                { "encryption", "SQLCipher" },
                { "version", "1.0.0" }
            };

            return Result<Dictionary<string, object>>.Success(dbInfo);
        }
        catch (Exception ex)
        {
            return Result<Dictionary<string, object>>.Failure(new StorageError($"Storage connectivity test failed: {ex.Message}"));
        }
    }

    /// <summary>
    /// Mask API key for secure display
    /// </summary>
    private static string MaskApiKey(string apiKey)
    {
        if (string.IsNullOrEmpty(apiKey) || apiKey.Length <= 8)
        {
            return "sk-****";
        }

        return $"sk-****{apiKey[^4..]}";
    }
}

/// <summary>
/// Interface for provider bridge service
/// </summary>
public interface IProviderBridgeService
{
    /// <summary>
    /// Get provider display information for UI
    /// </summary>
    IReadOnlyDictionary<string, ProviderDisplayInfo> GetProviderDisplayInfo();

    /// <summary>
    /// Get email provider status
    /// </summary>
    Task<Result<ProviderStatus>> GetEmailProviderStatusAsync();

    /// <summary>
    /// Get LLM provider status
    /// </summary>
    Task<Result<ProviderStatus>> GetLLMProviderStatusAsync();

    /// <summary>
    /// Get storage provider status
    /// </summary>
    Task<Result<ProviderStatus>> GetStorageProviderStatusAsync();

    /// <summary>
    /// Get status for all providers
    /// </summary>
    Task<Dictionary<string, ProviderStatus>> GetAllProviderStatusAsync();
}