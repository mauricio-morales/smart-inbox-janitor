using System;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using TrashMailPanda.Shared.Utils;

namespace TrashMailPanda.Shared.Security;

/// <summary>
/// Platform-specific credential encryption implementation
/// Uses DPAPI on Windows, Keychain on macOS, and libsecret on Linux
/// </summary>
public class CredentialEncryption : ICredentialEncryption, IDisposable
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
                "Windows" when OperatingSystem.IsWindows() => await InitializeWindowsAsync(),
                "macOS" when OperatingSystem.IsMacOS() => await InitializeMacOSAsync(),
                "Linux" when OperatingSystem.IsLinux() => await InitializeLinuxAsync(),
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
                "Windows" when OperatingSystem.IsWindows() => await EncryptWindowsAsync(plainText, context),
                "macOS" when OperatingSystem.IsMacOS() => await EncryptMacOSAsync(plainText, context),
                "Linux" when OperatingSystem.IsLinux() => await EncryptLinuxAsync(plainText, context),
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
                "Windows" when OperatingSystem.IsWindows() => await DecryptWindowsAsync(encryptedText, context),
                "macOS" when OperatingSystem.IsMacOS() => await DecryptMacOSAsync(encryptedText, context),
                "Linux" when OperatingSystem.IsLinux() => await DecryptLinuxAsync(encryptedText, context),
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

    [System.Runtime.Versioning.SupportedOSPlatform("osx")]
    private Task<EncryptionResult> InitializeMacOSAsync()
    {
        try
        {
            // Test Keychain Services availability by attempting to access keychain
            var testStatus = MacOSKeychain.SecKeychainCopyDefault(out var defaultKeychain);
            if (testStatus != MacOSKeychain.OSStatus.NoErr)
            {
                return Task.FromResult(EncryptionResult.Failure($"Failed to access default keychain: {testStatus}", EncryptionErrorType.ConfigurationError));
            }

            try
            {
                // Test basic keychain operations
                const string testService = "TrashMail Panda";
                const string testAccount = "initialization-test";
                const string testPassword = "test-credential-data";

                // Try to store a test credential
                var storeStatus = MacOSKeychain.SecKeychainAddGenericPassword(
                    defaultKeychain,
                    (uint)testService.Length, testService,
                    (uint)testAccount.Length, testAccount,
                    (uint)testPassword.Length, testPassword,
                    IntPtr.Zero);

                if (storeStatus != MacOSKeychain.OSStatus.NoErr && storeStatus != MacOSKeychain.OSStatus.DuplicateItem)
                {
                    return Task.FromResult(EncryptionResult.Failure($"Failed to test keychain write: {storeStatus}", EncryptionErrorType.ConfigurationError));
                }

                // Clean up test credential
                MacOSKeychain.SecKeychainFindGenericPassword(
                    defaultKeychain,
                    (uint)testService.Length, testService,
                    (uint)testAccount.Length, testAccount,
                    out _, out var passwordData,
                    out var itemRef);

                if (itemRef != IntPtr.Zero)
                {
                    MacOSKeychain.SecKeychainItemDelete(itemRef);
                    MacOSKeychain.CFRelease(itemRef);
                }
                if (passwordData != IntPtr.Zero)
                {
                    MacOSKeychain.SecKeychainItemFreeContent(IntPtr.Zero, passwordData);
                }

                return Task.FromResult(EncryptionResult.Success());
            }
            finally
            {
                // Release the keychain reference obtained from SecKeychainCopyDefault
                if (defaultKeychain != IntPtr.Zero)
                {
                    MacOSKeychain.CFRelease(defaultKeychain);
                }
            }
        }
        catch (Exception ex)
        {
            return Task.FromResult(EncryptionResult.Failure($"macOS Keychain initialization failed: {ex.Message}", EncryptionErrorType.ConfigurationError));
        }
    }

    [System.Runtime.Versioning.SupportedOSPlatform("linux")]
    private Task<EncryptionResult> InitializeLinuxAsync()
    {
        try
        {
            // Check if libsecret is available
            if (!LinuxSecretHelper.IsLibSecretAvailable())
            {
                _logger.LogWarning("libsecret is not available on this Linux system");
                return Task.FromResult(EncryptionResult.Failure("libsecret not available", EncryptionErrorType.PlatformNotSupported));
            }

            // Test libsecret operations with a test credential
            const string testService = "TrashMail Panda";
            const string testAccount = "initialization-test";
            const string testSecret = "test-credential-data";

            // Try to store a test credential
            var stored = LinuxSecretHelper.StoreSecret(testService, testAccount, testSecret);
            if (!stored)
            {
                return Task.FromResult(EncryptionResult.Failure("Failed to test libsecret storage", EncryptionErrorType.ConfigurationError));
            }

            // Try to retrieve the test credential
            var retrieved = LinuxSecretHelper.RetrieveSecret(testService, testAccount);
            if (retrieved != testSecret)
            {
                LinuxSecretHelper.RemoveSecret(testService, testAccount); // Cleanup
                return Task.FromResult(EncryptionResult.Failure("libsecret test failed - stored and retrieved data don't match", EncryptionErrorType.ConfigurationError));
            }

            // Clean up test credential
            LinuxSecretHelper.RemoveSecret(testService, testAccount);

            _logger.LogInformation("Linux libsecret initialization successful");
            return Task.FromResult(EncryptionResult.Success());
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Linux libsecret initialization failed");
            return Task.FromResult(EncryptionResult.Failure($"libsecret initialization failed: {ex.Message}", EncryptionErrorType.ConfigurationError));
        }
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

    [System.Runtime.Versioning.SupportedOSPlatform("osx")]
    private Task<EncryptionResult<string>> EncryptMacOSAsync(string plainText, string? context)
    {
        try
        {
            var service = context ?? "TrashMail Panda";
            var account = $"credential-{Guid.NewGuid()}";

            var status = MacOSKeychain.SecKeychainCopyDefault(out var defaultKeychain);
            if (status != MacOSKeychain.OSStatus.NoErr)
            {
                return Task.FromResult(EncryptionResult<string>.Failure($"Failed to get default keychain: {status}", EncryptionErrorType.EncryptionFailed));
            }

            try
            {
                // Store the credential in keychain
                status = MacOSKeychain.SecKeychainAddGenericPassword(
                    defaultKeychain,
                    (uint)service.Length, service,
                    (uint)account.Length, account,
                    (uint)plainText.Length, plainText,
                    IntPtr.Zero);

                if (status != MacOSKeychain.OSStatus.NoErr)
                {
                    return Task.FromResult(EncryptionResult<string>.Failure($"Failed to store credential in keychain: {status}", EncryptionErrorType.EncryptionFailed));
                }

                // Return the account identifier as the "encrypted" data
                var encryptedData = $"{service}:{account}";
                var encryptedBase64 = Convert.ToBase64String(Encoding.UTF8.GetBytes(encryptedData));

                return Task.FromResult(EncryptionResult<string>.Success(encryptedBase64));
            }
            finally
            {
                // Release the keychain reference obtained from SecKeychainCopyDefault
                if (defaultKeychain != IntPtr.Zero)
                {
                    MacOSKeychain.CFRelease(defaultKeychain);
                }
            }
        }
        catch (Exception ex)
        {
            return Task.FromResult(EncryptionResult<string>.Failure($"macOS encryption failed: {ex.Message}", EncryptionErrorType.EncryptionFailed));
        }
    }

    [System.Runtime.Versioning.SupportedOSPlatform("osx")]
    private Task<EncryptionResult<string>> DecryptMacOSAsync(string encryptedText, string? context)
    {
        try
        {
            // Decode the service:account identifier
            var encryptedData = Encoding.UTF8.GetString(Convert.FromBase64String(encryptedText));
            var parts = encryptedData.Split(':', 2);
            if (parts.Length != 2)
            {
                return Task.FromResult(EncryptionResult<string>.Failure("Invalid encrypted data format", EncryptionErrorType.DecryptionFailed));
            }

            var service = parts[0];
            var account = parts[1];

            var status = MacOSKeychain.SecKeychainCopyDefault(out var defaultKeychain);
            if (status != MacOSKeychain.OSStatus.NoErr)
            {
                return Task.FromResult(EncryptionResult<string>.Failure($"Failed to get default keychain: {status}", EncryptionErrorType.DecryptionFailed));
            }

            try
            {
                // Retrieve the credential from keychain
                status = MacOSKeychain.SecKeychainFindGenericPassword(
                    defaultKeychain,
                    (uint)service.Length, service,
                    (uint)account.Length, account,
                    out var passwordLength,
                    out var passwordData,
                    out var itemRef);

                if (status != MacOSKeychain.OSStatus.NoErr)
                {
                    return Task.FromResult(EncryptionResult<string>.Failure($"Failed to retrieve credential from keychain: {status}", EncryptionErrorType.DecryptionFailed));
                }

                try
                {
                    // Copy the password data to a managed string
                    var passwordBytes = new byte[passwordLength];
                    Marshal.Copy(passwordData, passwordBytes, 0, (int)passwordLength);
                    var plainText = Encoding.UTF8.GetString(passwordBytes);

                    // Clear the byte array
                    Array.Clear(passwordBytes, 0, passwordBytes.Length);

                    return Task.FromResult(EncryptionResult<string>.Success(plainText));
                }
                finally
                {
                    // Clean up resources
                    if (passwordData != IntPtr.Zero)
                    {
                        MacOSKeychain.SecKeychainItemFreeContent(IntPtr.Zero, passwordData);
                    }
                    if (itemRef != IntPtr.Zero)
                    {
                        MacOSKeychain.CFRelease(itemRef);
                    }
                }
            }
            finally
            {
                // Release the keychain reference obtained from SecKeychainCopyDefault
                if (defaultKeychain != IntPtr.Zero)
                {
                    MacOSKeychain.CFRelease(defaultKeychain);
                }
            }
        }
        catch (Exception ex)
        {
            return Task.FromResult(EncryptionResult<string>.Failure($"macOS decryption failed: {ex.Message}", EncryptionErrorType.DecryptionFailed));
        }
    }

    [System.Runtime.Versioning.SupportedOSPlatform("linux")]
    private Task<EncryptionResult<string>> EncryptLinuxAsync(string plainText, string? context)
    {
        try
        {
            // Check if libsecret is available
            if (!LinuxSecretHelper.IsLibSecretAvailable())
            {
                return Task.FromResult(EncryptionResult<string>.Failure("libsecret not available", EncryptionErrorType.PlatformNotSupported));
            }

            var service = context ?? "TrashMail Panda";
            var account = $"credential-{Guid.NewGuid()}";

            // Store the credential in GNOME keyring
            var stored = LinuxSecretHelper.StoreSecret(service, account, plainText);
            if (!stored)
            {
                return Task.FromResult(EncryptionResult<string>.Failure("Failed to store credential in keyring", EncryptionErrorType.EncryptionFailed));
            }

            // Return the service:account identifier as the "encrypted" data
            var encryptedData = $"{service}:{account}";
            var encryptedBase64 = Convert.ToBase64String(Encoding.UTF8.GetBytes(encryptedData));

            return Task.FromResult(EncryptionResult<string>.Success(encryptedBase64));
        }
        catch (Exception ex)
        {
            return Task.FromResult(EncryptionResult<string>.Failure($"Linux encryption failed: {ex.Message}", EncryptionErrorType.EncryptionFailed));
        }
    }

    [System.Runtime.Versioning.SupportedOSPlatform("linux")]
    private Task<EncryptionResult<string>> DecryptLinuxAsync(string encryptedText, string? context)
    {
        try
        {
            // Check if libsecret is available
            if (!LinuxSecretHelper.IsLibSecretAvailable())
            {
                return Task.FromResult(EncryptionResult<string>.Failure("libsecret not available", EncryptionErrorType.PlatformNotSupported));
            }

            // Decode the service:account identifier
            var encryptedData = Encoding.UTF8.GetString(Convert.FromBase64String(encryptedText));
            var parts = encryptedData.Split(':', 2);
            if (parts.Length != 2)
            {
                return Task.FromResult(EncryptionResult<string>.Failure("Invalid encrypted data format", EncryptionErrorType.DecryptionFailed));
            }

            var service = parts[0];
            var account = parts[1];

            // Retrieve the credential from GNOME keyring
            var plainText = LinuxSecretHelper.RetrieveSecret(service, account);
            if (plainText == null)
            {
                return Task.FromResult(EncryptionResult<string>.Failure("Failed to retrieve credential from keyring", EncryptionErrorType.DecryptionFailed));
            }

            return Task.FromResult(EncryptionResult<string>.Success(plainText));
        }
        catch (Exception ex)
        {
            return Task.FromResult(EncryptionResult<string>.Failure($"Linux decryption failed: {ex.Message}", EncryptionErrorType.DecryptionFailed));
        }
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

    #region macOS Keychain Services P/Invoke

    [System.Runtime.Versioning.SupportedOSPlatform("osx")]
    private static class MacOSKeychain
    {
        public enum OSStatus : int
        {
            NoErr = 0,
            DuplicateItem = -25299,
            ItemNotFound = -25300,
            UserCanceled = -128,
            AuthFailed = -25293
        }

        [DllImport("/System/Library/Frameworks/Security.framework/Security", CallingConvention = CallingConvention.Cdecl)]
        public static extern OSStatus SecKeychainCopyDefault(out IntPtr keychain);

        [DllImport("/System/Library/Frameworks/Security.framework/Security", CallingConvention = CallingConvention.Cdecl)]
        public static extern OSStatus SecKeychainAddGenericPassword(
            IntPtr keychain,
            uint serviceNameLength,
            [MarshalAs(UnmanagedType.LPStr)] string serviceName,
            uint accountNameLength,
            [MarshalAs(UnmanagedType.LPStr)] string accountName,
            uint passwordLength,
            [MarshalAs(UnmanagedType.LPStr)] string passwordData,
            IntPtr itemRef);

        [DllImport("/System/Library/Frameworks/Security.framework/Security", CallingConvention = CallingConvention.Cdecl)]
        public static extern OSStatus SecKeychainFindGenericPassword(
            IntPtr keychain,
            uint serviceNameLength,
            [MarshalAs(UnmanagedType.LPStr)] string serviceName,
            uint accountNameLength,
            [MarshalAs(UnmanagedType.LPStr)] string accountName,
            out uint passwordLength,
            out IntPtr passwordData,
            out IntPtr itemRef);

        [DllImport("/System/Library/Frameworks/Security.framework/Security", CallingConvention = CallingConvention.Cdecl)]
        public static extern OSStatus SecKeychainItemDelete(IntPtr itemRef);

        [DllImport("/System/Library/Frameworks/Security.framework/Security", CallingConvention = CallingConvention.Cdecl)]
        public static extern OSStatus SecKeychainItemFreeContent(
            IntPtr attrList,
            IntPtr data);

        [DllImport("/System/Library/Frameworks/CoreFoundation.framework/CoreFoundation", CallingConvention = CallingConvention.Cdecl)]
        public static extern void CFRelease(IntPtr cf);
    }

    #endregion

    #region IDisposable Implementation

    private bool _disposed = false;

    public void Dispose()
    {
        Dispose(true);
        GC.SuppressFinalize(this);
    }

    protected virtual void Dispose(bool disposing)
    {
        if (!_disposed)
        {
            if (disposing)
            {
                // Dispose managed resources
                _logger?.LogDebug("Disposing credential encryption resources");
            }

            // Clear any sensitive data
            _isInitialized = false;
            _platform = string.Empty;

            _disposed = true;
        }
    }

    #endregion
}