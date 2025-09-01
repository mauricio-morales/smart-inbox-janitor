using System;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;

namespace TrashMailPanda.Shared.Security;

/// <summary>
/// Platform-specific credential encryption implementation
/// Uses DPAPI on Windows, Keychain on macOS, and libsecret on Linux
/// </summary>
public class CredentialEncryption : ICredentialEncryption
{
    private readonly ILogger<CredentialEncryption> _logger;
    private bool _isInitialized = false;
    private string _platform = string.Empty;

    public CredentialEncryption(ILogger<CredentialEncryption> logger)
    {
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _platform = GetPlatformName();
    }

    public async Task<EncryptionResult> InitializeAsync()
    {
        try
        {
            _logger.LogInformation("Initializing credential encryption for platform: {Platform}", _platform);

            // Perform platform-specific initialization
            var initResult = _platform switch
            {
                "Windows" => await InitializeWindowsAsync(),
                "macOS" => await InitializeMacOSAsync(),
                "Linux" => await InitializeLinuxAsync(),
                _ => EncryptionResult.Failure("Unsupported platform", EncryptionErrorType.PlatformNotSupported)
            };

            if (initResult.IsSuccess)
            {
                _isInitialized = true;
                _logger.LogInformation("Credential encryption initialized successfully");
            }
            else
            {
                _logger.LogError("Failed to initialize credential encryption: {Error}", initResult.ErrorMessage);
            }

            return initResult;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception during credential encryption initialization");
            return EncryptionResult.Failure($"Initialization failed: {ex.Message}", EncryptionErrorType.ConfigurationError);
        }
    }

    public async Task<EncryptionResult<string>> EncryptAsync(string plainText, string? context = null)
    {
        if (!_isInitialized)
        {
            return EncryptionResult<string>.Failure("Encryption not initialized", EncryptionErrorType.ConfigurationError);
        }

        if (string.IsNullOrEmpty(plainText))
        {
            return EncryptionResult<string>.Failure("Plain text cannot be null or empty", EncryptionErrorType.InvalidInput);
        }

        try
        {
            return _platform switch
            {
                "Windows" => await EncryptWindowsAsync(plainText, context),
                "macOS" => await EncryptMacOSAsync(plainText, context),
                "Linux" => await EncryptLinuxAsync(plainText, context),
                _ => EncryptionResult<string>.Failure("Unsupported platform", EncryptionErrorType.PlatformNotSupported)
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception during encryption");
            return EncryptionResult<string>.Failure($"Encryption failed: {ex.Message}", EncryptionErrorType.EncryptionFailed);
        }
    }

    public async Task<EncryptionResult<string>> DecryptAsync(string encryptedText, string? context = null)
    {
        if (!_isInitialized)
        {
            return EncryptionResult<string>.Failure("Encryption not initialized", EncryptionErrorType.ConfigurationError);
        }

        if (string.IsNullOrEmpty(encryptedText))
        {
            return EncryptionResult<string>.Failure("Encrypted text cannot be null or empty", EncryptionErrorType.InvalidInput);
        }

        try
        {
            return _platform switch
            {
                "Windows" => await DecryptWindowsAsync(encryptedText, context),
                "macOS" => await DecryptMacOSAsync(encryptedText, context),
                "Linux" => await DecryptLinuxAsync(encryptedText, context),
                _ => EncryptionResult<string>.Failure("Unsupported platform", EncryptionErrorType.PlatformNotSupported)
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception during decryption");
            return EncryptionResult<string>.Failure($"Decryption failed: {ex.Message}", EncryptionErrorType.DecryptionFailed);
        }
    }

    public async Task<EncryptionResult<byte[]>> GenerateMasterKeyAsync()
    {
        try
        {
            _logger.LogDebug("Generating master key using system entropy");
            
            using var rng = RandomNumberGenerator.Create();
            var key = new byte[32]; // 256-bit key
            rng.GetBytes(key);
            
            return EncryptionResult<byte[]>.Success(key);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to generate master key");
            return EncryptionResult<byte[]>.Failure($"Key generation failed: {ex.Message}", EncryptionErrorType.KeyGenerationFailed);
        }
    }

    public async Task<EncryptionHealthCheckResult> HealthCheckAsync()
    {
        var result = new EncryptionHealthCheckResult
        {
            Platform = _platform,
            CheckTimestamp = DateTime.UtcNow
        };

        var issues = new List<string>();

        try
        {
            // Test encryption/decryption round-trip
            const string testData = "test-credential-12345";
            const string testContext = "health-check";

            var encryptResult = await EncryptAsync(testData, testContext);
            if (!encryptResult.IsSuccess)
            {
                issues.Add($"Encryption test failed: {encryptResult.ErrorMessage}");
                result = result with { CanEncrypt = false };
            }
            else
            {
                result = result with { CanEncrypt = true };

                var decryptResult = await DecryptAsync(encryptResult.Value!, testContext);
                if (!decryptResult.IsSuccess)
                {
                    issues.Add($"Decryption test failed: {decryptResult.ErrorMessage}");
                    result = result with { CanDecrypt = false };
                }
                else if (decryptResult.Value != testData)
                {
                    issues.Add("Decrypted data doesn't match original");
                    result = result with { CanDecrypt = false };
                }
                else
                {
                    result = result with { CanDecrypt = true };
                }
            }

            // Test key generation
            var keyResult = await GenerateMasterKeyAsync();
            result = result with { KeyGenerationWorks = keyResult.IsSuccess };
            if (!keyResult.IsSuccess)
            {
                issues.Add($"Key generation test failed: {keyResult.ErrorMessage}");
            }

            result = result with 
            { 
                Issues = issues,
                IsHealthy = result.CanEncrypt && result.CanDecrypt && result.KeyGenerationWorks,
                Status = issues.Count == 0 ? "Healthy" : $"Issues found: {issues.Count}"
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception during encryption health check");
            result = result with 
            { 
                IsHealthy = false, 
                Status = "Health check failed",
                Issues = new List<string> { $"Health check exception: {ex.Message}" }
            };
        }

        return result;
    }

    public EncryptionStatus GetEncryptionStatus()
    {
        return new EncryptionStatus
        {
            IsInitialized = _isInitialized,
            EncryptionMethod = _platform switch
            {
                "Windows" => "DPAPI",
                "macOS" => "Keychain Services",
                "Linux" => "libsecret",
                _ => "Unknown"
            },
            Platform = _platform,
            HasMasterKey = _isInitialized, // Simplified for now
            SupportedFeatures = GetSupportedFeatures()
        };
    }

    public void SecureClear(Span<char> sensitiveData)
    {
        // Clear sensitive data from memory
        sensitiveData.Clear();
        
        // Additional security: overwrite with random data
        var random = new Random();
        for (int i = 0; i < sensitiveData.Length; i++)
        {
            sensitiveData[i] = (char)random.Next(32, 127);
        }
        sensitiveData.Clear();
    }

    #region Platform-Specific Implementations

    private static string GetPlatformName()
    {
        if (RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
            return "Windows";
        if (RuntimeInformation.IsOSPlatform(OSPlatform.OSX))
            return "macOS";
        if (RuntimeInformation.IsOSPlatform(OSPlatform.Linux))
            return "Linux";
        
        return "Unknown";
    }

    [System.Runtime.Versioning.SupportedOSPlatform("windows")]
    private Task<EncryptionResult> InitializeWindowsAsync()
    {
        try
        {
            // Test DPAPI availability
            var testData = Encoding.UTF8.GetBytes("test");
            var encrypted = ProtectedData.Protect(testData, null, DataProtectionScope.CurrentUser);
            var decrypted = ProtectedData.Unprotect(encrypted, null, DataProtectionScope.CurrentUser);
            
            if (!testData.AsSpan().SequenceEqual(decrypted))
            {
                return Task.FromResult(EncryptionResult.Failure("DPAPI test failed", EncryptionErrorType.ConfigurationError));
            }

            return Task.FromResult(EncryptionResult.Success());
        }
        catch (Exception ex)
        {
            return Task.FromResult(EncryptionResult.Failure($"Windows DPAPI initialization failed: {ex.Message}", EncryptionErrorType.ConfigurationError));
        }
    }

    private Task<EncryptionResult> InitializeMacOSAsync()
    {
        // TODO: Implement macOS Keychain Services initialization
        _logger.LogWarning("macOS Keychain initialization not yet implemented");
        return Task.FromResult(EncryptionResult.Success()); // Placeholder
    }

    private Task<EncryptionResult> InitializeLinuxAsync()
    {
        // TODO: Implement Linux libsecret initialization
        _logger.LogWarning("Linux libsecret initialization not yet implemented");
        return Task.FromResult(EncryptionResult.Success()); // Placeholder
    }

    [System.Runtime.Versioning.SupportedOSPlatform("windows")]
    private Task<EncryptionResult<string>> EncryptWindowsAsync(string plainText, string? context)
    {
        try
        {
            var plainBytes = Encoding.UTF8.GetBytes(plainText);
            var entropy = context != null ? Encoding.UTF8.GetBytes(context) : null;
            
            var encryptedBytes = ProtectedData.Protect(plainBytes, entropy, DataProtectionScope.CurrentUser);
            var encryptedBase64 = Convert.ToBase64String(encryptedBytes);
            
            return Task.FromResult(EncryptionResult<string>.Success(encryptedBase64));
        }
        catch (Exception ex)
        {
            return Task.FromResult(EncryptionResult<string>.Failure($"Windows encryption failed: {ex.Message}", EncryptionErrorType.EncryptionFailed));
        }
    }

    [System.Runtime.Versioning.SupportedOSPlatform("windows")]
    private Task<EncryptionResult<string>> DecryptWindowsAsync(string encryptedText, string? context)
    {
        try
        {
            var encryptedBytes = Convert.FromBase64String(encryptedText);
            var entropy = context != null ? Encoding.UTF8.GetBytes(context) : null;
            
            var decryptedBytes = ProtectedData.Unprotect(encryptedBytes, entropy, DataProtectionScope.CurrentUser);
            var plainText = Encoding.UTF8.GetString(decryptedBytes);
            
            return Task.FromResult(EncryptionResult<string>.Success(plainText));
        }
        catch (Exception ex)
        {
            return Task.FromResult(EncryptionResult<string>.Failure($"Windows decryption failed: {ex.Message}", EncryptionErrorType.DecryptionFailed));
        }
    }

    private Task<EncryptionResult<string>> EncryptMacOSAsync(string plainText, string? context)
    {
        // TODO: Implement macOS Keychain Services encryption
        _logger.LogWarning("macOS encryption not yet implemented");
        return Task.FromResult(EncryptionResult<string>.Failure("macOS encryption not implemented", EncryptionErrorType.PlatformNotSupported));
    }

    private Task<EncryptionResult<string>> DecryptMacOSAsync(string encryptedText, string? context)
    {
        // TODO: Implement macOS Keychain Services decryption
        _logger.LogWarning("macOS decryption not yet implemented");
        return Task.FromResult(EncryptionResult<string>.Failure("macOS decryption not implemented", EncryptionErrorType.PlatformNotSupported));
    }

    private Task<EncryptionResult<string>> EncryptLinuxAsync(string plainText, string? context)
    {
        // TODO: Implement Linux libsecret encryption
        _logger.LogWarning("Linux encryption not yet implemented");
        return Task.FromResult(EncryptionResult<string>.Failure("Linux encryption not implemented", EncryptionErrorType.PlatformNotSupported));
    }

    private Task<EncryptionResult<string>> DecryptLinuxAsync(string encryptedText, string? context)
    {
        // TODO: Implement Linux libsecret decryption
        _logger.LogWarning("Linux decryption not yet implemented");
        return Task.FromResult(EncryptionResult<string>.Failure("Linux decryption not implemented", EncryptionErrorType.PlatformNotSupported));
    }

    private List<string> GetSupportedFeatures()
    {
        var features = new List<string> { "Encryption", "Decryption", "Key Generation", "Secure Clear" };
        
        if (_platform == "Windows")
        {
            features.AddRange(new[] { "DPAPI", "Current User Scope" });
        }
        else if (_platform == "macOS")
        {
            features.Add("Keychain Services");
        }
        else if (_platform == "Linux")
        {
            features.Add("libsecret");
        }

        return features;
    }

    #endregion
}