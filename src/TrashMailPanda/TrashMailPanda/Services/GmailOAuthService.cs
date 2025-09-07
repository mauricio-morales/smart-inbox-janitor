using Google.Apis.Auth.OAuth2;
using Google.Apis.Gmail.v1;
using Google.Apis.Services;
using Google.Apis.Util.Store;
using Microsoft.Extensions.Logging;
using System.Diagnostics;
using System.Threading;
using TrashMailPanda.Models;
using TrashMailPanda.Shared;
using TrashMailPanda.Shared.Base;
using TrashMailPanda.Shared.Security;

namespace TrashMailPanda.Services;

/// <summary>
/// Service for handling Gmail OAuth authentication flows
/// Manages browser-based OAuth sign-in and token storage
/// </summary>
public class GmailOAuthService : IGmailOAuthService
{
    private readonly ISecureStorageManager _secureStorageManager;
    private readonly ILogger<GmailOAuthService> _logger;
    private readonly string[] _scopes = { GmailService.Scope.GmailModify };

    public GmailOAuthService(
        ISecureStorageManager secureStorageManager,
        ILogger<GmailOAuthService> logger)
    {
        _secureStorageManager = secureStorageManager ?? throw new ArgumentNullException(nameof(secureStorageManager));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <summary>
    /// Initiate Gmail OAuth authentication flow in browser
    /// </summary>
    public async Task<Result<bool>> AuthenticateAsync()
    {
        try
        {
            _logger.LogInformation("Starting Gmail OAuth authentication flow");

            // Retrieve OAuth client credentials
            var clientIdResult = await _secureStorageManager.RetrieveCredentialAsync(ProviderCredentialTypes.GmailClientId);
            var clientSecretResult = await _secureStorageManager.RetrieveCredentialAsync(ProviderCredentialTypes.GmailClientSecret);

            if (!clientIdResult.IsSuccess || !clientSecretResult.IsSuccess ||
                string.IsNullOrEmpty(clientIdResult.Value) || string.IsNullOrEmpty(clientSecretResult.Value))
            {
                return Result<bool>.Failure(new ConfigurationError("Gmail OAuth client credentials not configured"));
            }

            var clientSecrets = new ClientSecrets
            {
                ClientId = clientIdResult.Value,
                ClientSecret = clientSecretResult.Value
            };

            // Create custom data store that saves to our secure storage
            var dataStore = new SecureTokenDataStore(_secureStorageManager, _logger);

            // Request OAuth2 authorization - this will open browser
            var credential = await GoogleWebAuthorizationBroker.AuthorizeAsync(
                clientSecrets,
                _scopes,
                "user",
                CancellationToken.None,
                dataStore);

            if (credential != null)
            {
                // Store user email for display purposes
                var gmailService = new GmailService(new BaseClientService.Initializer()
                {
                    HttpClientInitializer = credential,
                    ApplicationName = "TrashMail Panda"
                });

                try
                {
                    var profile = await gmailService.Users.GetProfile("me").ExecuteAsync();
                    if (profile?.EmailAddress != null)
                    {
                        await _secureStorageManager.StoreCredentialAsync(ProviderCredentialTypes.GmailUserEmail, profile.EmailAddress);
                    }
                    else
                    {
                        _logger.LogWarning("Gmail profile or email address was null during OAuth flow");
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Could not retrieve user profile, but authentication succeeded");
                }

                _logger.LogInformation("Gmail OAuth authentication completed successfully");
                return Result<bool>.Success(true);
            }

            return Result<bool>.Failure(new AuthenticationError("OAuth authentication was cancelled or failed"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception during Gmail OAuth authentication");
            return Result<bool>.Failure(new AuthenticationError($"Authentication failed: {ex.Message}"));
        }
    }

    /// <summary>
    /// Check if valid Gmail authentication exists
    /// </summary>
    public async Task<Result<bool>> IsAuthenticatedAsync()
    {
        try
        {
            var refreshTokenResult = await _secureStorageManager.RetrieveCredentialAsync(ProviderCredentialTypes.GmailRefreshToken);
            return Result<bool>.Success(refreshTokenResult.IsSuccess && !string.IsNullOrEmpty(refreshTokenResult.Value));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception checking Gmail authentication status");
            return Result<bool>.Failure(new ProcessingError($"Authentication check failed: {ex.Message}"));
        }
    }

    /// <summary>
    /// Clear stored Gmail authentication tokens
    /// </summary>
    public async Task<Result<bool>> SignOutAsync()
    {
        try
        {
            _logger.LogInformation("Clearing Gmail authentication tokens");

            await _secureStorageManager.RemoveCredentialAsync(ProviderCredentialTypes.GmailAccessToken);
            await _secureStorageManager.RemoveCredentialAsync(ProviderCredentialTypes.GmailRefreshToken);
            await _secureStorageManager.RemoveCredentialAsync(ProviderCredentialTypes.GmailTokenExpiry);
            await _secureStorageManager.RemoveCredentialAsync(ProviderCredentialTypes.GmailUserEmail);

            return Result<bool>.Success(true);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception clearing Gmail authentication tokens");
            return Result<bool>.Failure(new ProcessingError($"Sign out failed: {ex.Message}"));
        }
    }
}

/// <summary>
/// Custom data store that integrates with our secure storage system
/// </summary>
public class SecureTokenDataStore : IDataStore
{
    private readonly ISecureStorageManager _secureStorageManager;
    private readonly ILogger _logger;

    public SecureTokenDataStore(ISecureStorageManager secureStorageManager, ILogger logger)
    {
        _secureStorageManager = secureStorageManager;
        _logger = logger;
    }

    public async Task StoreAsync<T>(string key, T value)
    {
        try
        {
            if (value is Google.Apis.Auth.OAuth2.Responses.TokenResponse token)
            {
                // Store individual token components in secure storage
                if (!string.IsNullOrEmpty(token.AccessToken))
                {
                    await _secureStorageManager.StoreCredentialAsync(ProviderCredentialTypes.GmailAccessToken, token.AccessToken);
                }

                if (!string.IsNullOrEmpty(token.RefreshToken))
                {
                    await _secureStorageManager.StoreCredentialAsync(ProviderCredentialTypes.GmailRefreshToken, token.RefreshToken);
                }

                if (token.ExpiresInSeconds.HasValue)
                {
                    var expiry = DateTime.UtcNow.AddSeconds(token.ExpiresInSeconds.Value);
                    await _secureStorageManager.StoreCredentialAsync(ProviderCredentialTypes.GmailTokenExpiry, expiry.ToString("O"));
                }

                _logger.LogDebug("Stored Gmail OAuth tokens securely");
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to store OAuth token for key {Key}", key);
            throw;
        }
    }

    public async Task<T> GetAsync<T>(string key)
    {
        try
        {
            if (typeof(T) == typeof(Google.Apis.Auth.OAuth2.Responses.TokenResponse))
            {
                var accessTokenResult = await _secureStorageManager.RetrieveCredentialAsync(ProviderCredentialTypes.GmailAccessToken);
                var refreshTokenResult = await _secureStorageManager.RetrieveCredentialAsync(ProviderCredentialTypes.GmailRefreshToken);
                var expiryResult = await _secureStorageManager.RetrieveCredentialAsync(ProviderCredentialTypes.GmailTokenExpiry);

                if (accessTokenResult.IsSuccess || refreshTokenResult.IsSuccess)
                {
                    var token = new Google.Apis.Auth.OAuth2.Responses.TokenResponse
                    {
                        AccessToken = accessTokenResult.Value,
                        RefreshToken = refreshTokenResult.Value
                    };

                    if (expiryResult.IsSuccess && DateTime.TryParse(expiryResult.Value, out var expiry))
                    {
                        var secondsLeft = (expiry - DateTime.UtcNow).TotalSeconds;
                        token.ExpiresInSeconds = secondsLeft > 0 ? (long)secondsLeft : null;
                    }

                    return (T)(object)token;
                }
            }

            return default(T);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to retrieve OAuth token for key {Key}", key);
            return default(T);
        }
    }

    public async Task DeleteAsync<T>(string key)
    {
        try
        {
            await _secureStorageManager.RemoveCredentialAsync(ProviderCredentialTypes.GmailAccessToken);
            await _secureStorageManager.RemoveCredentialAsync(ProviderCredentialTypes.GmailRefreshToken);
            await _secureStorageManager.RemoveCredentialAsync(ProviderCredentialTypes.GmailTokenExpiry);
            _logger.LogDebug("Deleted Gmail OAuth tokens for key {Key}", key);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to delete OAuth token for key {Key}", key);
            throw;
        }
    }

    public Task ClearAsync()
    {
        // Clear all stored tokens
        return DeleteAsync<object>("user");
    }
}

/// <summary>
/// Interface for Gmail OAuth service
/// </summary>
public interface IGmailOAuthService
{
    /// <summary>
    /// Initiate Gmail OAuth authentication flow in browser
    /// </summary>
    Task<Result<bool>> AuthenticateAsync();

    /// <summary>
    /// Check if valid Gmail authentication exists
    /// </summary>
    Task<Result<bool>> IsAuthenticatedAsync();

    /// <summary>
    /// Clear stored Gmail authentication tokens
    /// </summary>
    Task<Result<bool>> SignOutAsync();
}