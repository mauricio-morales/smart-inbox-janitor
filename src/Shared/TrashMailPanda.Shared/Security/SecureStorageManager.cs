using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;

namespace TrashMailPanda.Shared.Security;

/// <summary>
/// Secure storage manager implementation that provides zero-password experience
/// through OS-level security (keychain) integration
/// </summary>
public class SecureStorageManager : ISecureStorageManager
{
    private readonly ICredentialEncryption _credentialEncryption;
    private readonly ILogger<SecureStorageManager> _logger;
    private readonly ConcurrentDictionary<string, string> _credentialCache;
    private readonly object _initializationLock = new();

    private bool _isInitialized = false;
    private DateTime? _lastHealthCheck;

    // Credential key prefixes for different providers
    private const string GmailTokenPrefix = "gmail_";
    private const string OpenAITokenPrefix = "openai_";
    private const string StorageTokenPrefix = "storage_";
    private const string MasterKeyName = "transmail_master_key";

    public SecureStorageManager(ICredentialEncryption credentialEncryption, ILogger<SecureStorageManager> logger)
    {
        _credentialEncryption = credentialEncryption ?? throw new ArgumentNullException(nameof(credentialEncryption));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _credentialCache = new ConcurrentDictionary<string, string>();
    }

    public async Task<SecureStorageResult> InitializeAsync()
    {
        lock (_initializationLock)
        {
            if (_isInitialized)
            {
                return SecureStorageResult.Success();
            }
        }

        try
        {
            _logger.LogInformation("Initializing secure storage manager");

            // Initialize credential encryption
            var encryptionResult = await _credentialEncryption.InitializeAsync();
            if (!encryptionResult.IsSuccess)
            {
                _logger.LogError("Failed to initialize credential encryption: {Error}", encryptionResult.ErrorMessage);
                return SecureStorageResult.Failure($"Encryption initialization failed: {encryptionResult.ErrorMessage}",
                    SecureStorageErrorType.ConfigurationError);
            }

            // Verify encryption is working with a test
            var healthCheck = await _credentialEncryption.HealthCheckAsync();
            if (!healthCheck.IsHealthy)
            {
                _logger.LogError("Credential encryption health check failed: {Issues}", string.Join(", ", healthCheck.Issues));
                return SecureStorageResult.Failure("Encryption system is not healthy", SecureStorageErrorType.ConfigurationError);
            }

            lock (_initializationLock)
            {
                _isInitialized = true;
                _lastHealthCheck = DateTime.UtcNow;
            }

            _logger.LogInformation("Secure storage manager initialized successfully");
            return SecureStorageResult.Success();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception during secure storage initialization");
            return SecureStorageResult.Failure($"Initialization failed: {ex.Message}", SecureStorageErrorType.UnknownError);
        }
    }

    public async Task<SecureStorageResult> StoreCredentialAsync(string key, string credential)
    {
        if (!_isInitialized)
        {
            return SecureStorageResult.Failure("Secure storage not initialized", SecureStorageErrorType.ConfigurationError);
        }

        if (string.IsNullOrWhiteSpace(key))
        {
            return SecureStorageResult.Failure("Credential key cannot be null or empty", SecureStorageErrorType.ConfigurationError);
        }

        if (string.IsNullOrEmpty(credential))
        {
            return SecureStorageResult.Failure("Credential cannot be null or empty", SecureStorageErrorType.ConfigurationError);
        }

        try
        {
            _logger.LogDebug("Storing credential for key: {Key}", MaskKey(key));

            // Encrypt the credential with context (key name for additional security)
            var encryptionResult = await _credentialEncryption.EncryptAsync(credential, key);
            if (!encryptionResult.IsSuccess)
            {
                _logger.LogError("Failed to encrypt credential for key {Key}: {Error}", MaskKey(key), encryptionResult.ErrorMessage);
                return SecureStorageResult.Failure($"Encryption failed: {encryptionResult.ErrorMessage}",
                    SecureStorageErrorType.EncryptionError);
            }

            // Store in cache for quick access during session
            _credentialCache.AddOrUpdate(key, encryptionResult.Value!, (k, v) => encryptionResult.Value!);

            _logger.LogInformation("Successfully stored credential for key: {Key}", MaskKey(key));
            return SecureStorageResult.Success();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception storing credential for key: {Key}", MaskKey(key));
            return SecureStorageResult.Failure($"Storage failed: {ex.Message}", SecureStorageErrorType.UnknownError);
        }
    }

    public async Task<SecureStorageResult<string>> RetrieveCredentialAsync(string key)
    {
        if (!_isInitialized)
        {
            return SecureStorageResult<string>.Failure("Secure storage not initialized", SecureStorageErrorType.ConfigurationError);
        }

        if (string.IsNullOrWhiteSpace(key))
        {
            return SecureStorageResult<string>.Failure("Credential key cannot be null or empty", SecureStorageErrorType.ConfigurationError);
        }

        try
        {
            _logger.LogDebug("Retrieving credential for key: {Key}", MaskKey(key));

            // Check cache first
            if (_credentialCache.TryGetValue(key, out var cachedEncryptedCredential))
            {
                var decryptionResult = await _credentialEncryption.DecryptAsync(cachedEncryptedCredential, key);
                if (decryptionResult.IsSuccess)
                {
                    _logger.LogDebug("Retrieved credential from cache for key: {Key}", MaskKey(key));
                    return SecureStorageResult<string>.Success(decryptionResult.Value!);
                }
                else
                {
                    // Remove corrupted cache entry
                    _credentialCache.TryRemove(key, out _);
                    _logger.LogWarning("Cached credential for key {Key} is corrupted, removed from cache", MaskKey(key));
                }
            }

            // If not in cache or cache is corrupted, credential doesn't exist
            _logger.LogDebug("Credential not found for key: {Key}", MaskKey(key));
            return SecureStorageResult<string>.Failure("Credential not found", SecureStorageErrorType.CredentialNotFound);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception retrieving credential for key: {Key}", MaskKey(key));
            return SecureStorageResult<string>.Failure($"Retrieval failed: {ex.Message}", SecureStorageErrorType.UnknownError);
        }
    }

    public async Task<SecureStorageResult> RemoveCredentialAsync(string key)
    {
        if (!_isInitialized)
        {
            return SecureStorageResult.Failure("Secure storage not initialized", SecureStorageErrorType.ConfigurationError);
        }

        if (string.IsNullOrWhiteSpace(key))
        {
            return SecureStorageResult.Failure("Credential key cannot be null or empty", SecureStorageErrorType.ConfigurationError);
        }

        try
        {
            _logger.LogDebug("Removing credential for key: {Key}", MaskKey(key));

            // Remove from cache
            var removed = _credentialCache.TryRemove(key, out _);

            _logger.LogInformation("Credential removal for key {Key}: {Status}", MaskKey(key), removed ? "Success" : "Not found");
            return SecureStorageResult.Success();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception removing credential for key: {Key}", MaskKey(key));
            return SecureStorageResult.Failure($"Removal failed: {ex.Message}", SecureStorageErrorType.UnknownError);
        }
    }

    public Task<SecureStorageResult<bool>> CredentialExistsAsync(string key)
    {
        if (!_isInitialized)
        {
            return Task.FromResult(SecureStorageResult<bool>.Failure("Secure storage not initialized", SecureStorageErrorType.ConfigurationError));
        }

        if (string.IsNullOrWhiteSpace(key))
        {
            return Task.FromResult(SecureStorageResult<bool>.Failure("Credential key cannot be null or empty", SecureStorageErrorType.ConfigurationError));
        }

        try
        {
            var exists = _credentialCache.ContainsKey(key);
            return Task.FromResult(SecureStorageResult<bool>.Success(exists));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception checking credential existence for key: {Key}", MaskKey(key));
            return Task.FromResult(SecureStorageResult<bool>.Failure($"Existence check failed: {ex.Message}", SecureStorageErrorType.UnknownError));
        }
    }

    public Task<SecureStorageResult<IReadOnlyList<string>>> GetStoredCredentialKeysAsync()
    {
        if (!_isInitialized)
        {
            return Task.FromResult(SecureStorageResult<IReadOnlyList<string>>.Failure("Secure storage not initialized", SecureStorageErrorType.ConfigurationError));
        }

        try
        {
            var keys = _credentialCache.Keys.ToList().AsReadOnly();
            _logger.LogDebug("Retrieved {Count} credential keys", keys.Count);
            return Task.FromResult(SecureStorageResult<IReadOnlyList<string>>.Success(keys));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception getting credential keys");
            return Task.FromResult(SecureStorageResult<IReadOnlyList<string>>.Failure($"Key enumeration failed: {ex.Message}", SecureStorageErrorType.UnknownError));
        }
    }

    public async Task<SecureStorageHealthCheckResult> HealthCheckAsync()
    {
        var result = new SecureStorageHealthCheckResult
        {
            CheckTimestamp = DateTime.UtcNow
        };

        var issues = new List<string>();
        var details = new Dictionary<string, object>();

        try
        {
            // Check initialization status
            if (!_isInitialized)
            {
                issues.Add("Secure storage not initialized");
                result = result with { IsHealthy = false, Status = "Not initialized", Issues = issues };
                return result;
            }

            // Check encryption system health
            var encryptionHealth = await _credentialEncryption.HealthCheckAsync();
            details.Add("encryption_health", encryptionHealth);

            if (!encryptionHealth.IsHealthy)
            {
                issues.AddRange(encryptionHealth.Issues.Select(issue => $"Encryption: {issue}"));
            }

            // Test credential storage/retrieval
            const string testKey = "health_check_test_credential";
            const string testValue = "test-credential-value-12345";

            var storeResult = await StoreCredentialAsync(testKey, testValue);
            if (!storeResult.IsSuccess)
            {
                issues.Add($"Store test failed: {storeResult.ErrorMessage}");
            }
            else
            {
                var retrieveResult = await RetrieveCredentialAsync(testKey);
                if (!retrieveResult.IsSuccess)
                {
                    issues.Add($"Retrieve test failed: {retrieveResult.ErrorMessage}");
                }
                else if (retrieveResult.Value != testValue)
                {
                    issues.Add("Retrieved credential doesn't match stored value");
                }

                // Clean up test credential
                await RemoveCredentialAsync(testKey);
            }

            // Add system information to details
            details.Add("credential_count", _credentialCache.Count);
            details.Add("last_health_check", _lastHealthCheck);
            details.Add("platform", _credentialEncryption.GetEncryptionStatus().Platform);

            result = result with
            {
                IsHealthy = issues.Count == 0,
                Status = issues.Count == 0 ? "Healthy" : $"Issues found: {issues.Count}",
                Issues = issues,
                Details = details
            };

            _lastHealthCheck = result.CheckTimestamp;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception during secure storage health check");
            result = result with
            {
                IsHealthy = false,
                Status = "Health check failed",
                Issues = new List<string> { $"Health check exception: {ex.Message}" }
            };
        }

        return result;
    }

    public SecureStorageStatus GetSecureStorageStatus()
    {
        return new SecureStorageStatus
        {
            IsInitialized = _isInitialized,
            IsKeychainAvailable = _isInitialized && _credentialEncryption.GetEncryptionStatus().IsInitialized,
            Platform = _credentialEncryption.GetEncryptionStatus().Platform,
            StoredCredentialCount = _credentialCache.Count,
            LastHealthCheck = _lastHealthCheck,
            SupportedOperations = new List<string>
            {
                "Store", "Retrieve", "Remove", "Exists", "List", "HealthCheck"
            }
        };
    }

    /// <summary>
    /// Helper method to store Gmail OAuth tokens
    /// </summary>
    public async Task<SecureStorageResult> StoreGmailTokenAsync(string tokenType, string token)
    {
        var key = $"{GmailTokenPrefix}{tokenType}";
        return await StoreCredentialAsync(key, token);
    }

    /// <summary>
    /// Helper method to retrieve Gmail OAuth tokens
    /// </summary>
    public async Task<SecureStorageResult<string>> RetrieveGmailTokenAsync(string tokenType)
    {
        var key = $"{GmailTokenPrefix}{tokenType}";
        return await RetrieveCredentialAsync(key);
    }

    /// <summary>
    /// Helper method to store OpenAI API key
    /// </summary>
    public async Task<SecureStorageResult> StoreOpenAIKeyAsync(string apiKey)
    {
        var key = $"{OpenAITokenPrefix}api_key";
        return await StoreCredentialAsync(key, apiKey);
    }

    /// <summary>
    /// Helper method to retrieve OpenAI API key
    /// </summary>
    public async Task<SecureStorageResult<string>> RetrieveOpenAIKeyAsync()
    {
        var key = $"{OpenAITokenPrefix}api_key";
        return await RetrieveCredentialAsync(key);
    }

    private static string MaskKey(string key)
    {
        if (string.IsNullOrEmpty(key) || key.Length <= 6)
        {
            return "***";
        }

        return key.Length <= 10
            ? $"{key[..3]}***{key[^2..]}"
            : $"{key[..4]}***{key[^3..]}";
    }
}