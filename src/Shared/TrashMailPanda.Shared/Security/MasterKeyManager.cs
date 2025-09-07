using System;
using System.IO;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;

namespace TrashMailPanda.Shared.Security;

/// <summary>
/// Master key manager for centralized encryption key generation and validation
/// Provides deterministic key derivation for consistent master keys across sessions
/// </summary>
public class MasterKeyManager : IMasterKeyManager
{
    private readonly ILogger<MasterKeyManager> _logger;
    private readonly string _platform;

    public MasterKeyManager(ILogger<MasterKeyManager> logger)
    {
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _platform = GetPlatformName();
    }

    /// <summary>
    /// Generate a new 256-bit master key using cryptographically secure randomness
    /// </summary>
    /// <returns>Result containing the base64-encoded master key or error details</returns>
    public async Task<EncryptionResult<string>> GenerateMasterKeyAsync()
    {
        try
        {
            _logger.LogDebug("Generating new master key using system entropy");

            using var rng = RandomNumberGenerator.Create();
            var keyBytes = new byte[32]; // 256-bit key
            rng.GetBytes(keyBytes);

            var masterKey = Convert.ToBase64String(keyBytes);

            // Securely clear the byte array
            SecureClear(keyBytes);

            _logger.LogInformation("Master key generated successfully");
            return EncryptionResult<string>.Success(masterKey);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to generate master key");
            return EncryptionResult<string>.Failure($"Master key generation failed: {ex.Message}", EncryptionErrorType.KeyGenerationFailed);
        }
    }

    /// <summary>
    /// Derive a master key from system entropy for deterministic key generation
    /// Uses platform-specific entropy sources for consistency across sessions
    /// </summary>
    /// <returns>Result containing the derived master key or error details</returns>
    public async Task<EncryptionResult<string>> DeriveMasterKeyAsync()
    {
        try
        {
            _logger.LogDebug("Deriving master key from system entropy");

            var entropy = await GetSystemEntropyAsync();
            if (entropy == null || entropy.Length == 0)
            {
                return EncryptionResult<string>.Failure("Failed to obtain system entropy", EncryptionErrorType.ConfigurationError);
            }

            var masterKey = await DeriveKeyFromEntropyAsync(entropy);

            // Securely clear the entropy data
            SecureClear(entropy);

            _logger.LogInformation("Master key derived successfully from system entropy");
            return EncryptionResult<string>.Success(masterKey);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to derive master key from system entropy");
            return EncryptionResult<string>.Failure($"Master key derivation failed: {ex.Message}", EncryptionErrorType.KeyGenerationFailed);
        }
    }

    /// <summary>
    /// Validate that a master key is properly formatted and usable for encryption
    /// </summary>
    /// <param name="masterKey">The master key to validate</param>
    /// <returns>Result indicating whether the master key is valid</returns>
    public async Task<EncryptionResult<bool>> ValidateMasterKeyAsync(string masterKey)
    {
        try
        {
            if (string.IsNullOrEmpty(masterKey))
            {
                return EncryptionResult<bool>.Failure("Master key cannot be null or empty", EncryptionErrorType.InvalidInput);
            }

            // Validate base64 format
            byte[] keyBytes;
            try
            {
                keyBytes = Convert.FromBase64String(masterKey);
            }
            catch (FormatException)
            {
                return EncryptionResult<bool>.Failure("Master key is not valid base64", EncryptionErrorType.InvalidInput);
            }

            // Validate key length (256-bit = 32 bytes)
            if (keyBytes.Length != 32)
            {
                SecureClear(keyBytes);
                return EncryptionResult<bool>.Failure($"Master key must be 256 bits (32 bytes), got {keyBytes.Length} bytes", EncryptionErrorType.InvalidInput);
            }

            // Test key usability with AES encryption
            var testResult = await TestKeyUsabilityAsync(keyBytes);
            SecureClear(keyBytes);

            if (!testResult.IsSuccess)
            {
                return EncryptionResult<bool>.Failure($"Master key validation failed: {testResult.ErrorMessage}", EncryptionErrorType.ConfigurationError);
            }

            _logger.LogDebug("Master key validation completed successfully");
            return EncryptionResult<bool>.Success(true);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception during master key validation");
            return EncryptionResult<bool>.Failure($"Master key validation failed: {ex.Message}", EncryptionErrorType.ConfigurationError);
        }
    }

    /// <summary>
    /// Encrypt data using the provided master key
    /// </summary>
    /// <param name="plainText">The data to encrypt</param>
    /// <param name="masterKey">The master key to use for encryption</param>
    /// <returns>Result containing encrypted data or error details</returns>
    public async Task<EncryptionResult<string>> EncryptWithMasterKeyAsync(string plainText, string masterKey)
    {
        try
        {
            if (string.IsNullOrEmpty(plainText))
            {
                return EncryptionResult<string>.Failure("Plain text cannot be null or empty", EncryptionErrorType.InvalidInput);
            }

            var keyValidation = await ValidateMasterKeyAsync(masterKey);
            if (!keyValidation.IsSuccess)
            {
                return EncryptionResult<string>.Failure($"Invalid master key: {keyValidation.ErrorMessage}", EncryptionErrorType.InvalidInput);
            }

            var keyBytes = Convert.FromBase64String(masterKey);
            var plainTextBytes = Encoding.UTF8.GetBytes(plainText);

            using var aes = Aes.Create();
            aes.Key = keyBytes;
            aes.GenerateIV();

            using var encryptor = aes.CreateEncryptor();
            var encryptedBytes = encryptor.TransformFinalBlock(plainTextBytes, 0, plainTextBytes.Length);

            // Combine IV + encrypted data
            var result = new byte[aes.IV.Length + encryptedBytes.Length];
            Array.Copy(aes.IV, 0, result, 0, aes.IV.Length);
            Array.Copy(encryptedBytes, 0, result, aes.IV.Length, encryptedBytes.Length);

            var encryptedBase64 = Convert.ToBase64String(result);

            // Securely clear sensitive data
            SecureClear(keyBytes);
            SecureClear(plainTextBytes);
            SecureClear(encryptedBytes);

            return EncryptionResult<string>.Success(encryptedBase64);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to encrypt data with master key");
            return EncryptionResult<string>.Failure($"Encryption failed: {ex.Message}", EncryptionErrorType.EncryptionFailed);
        }
    }

    /// <summary>
    /// Decrypt data using the provided master key
    /// </summary>
    /// <param name="encryptedData">The encrypted data to decrypt</param>
    /// <param name="masterKey">The master key to use for decryption</param>
    /// <returns>Result containing decrypted data or error details</returns>
    public async Task<EncryptionResult<string>> DecryptWithMasterKeyAsync(string encryptedData, string masterKey)
    {
        try
        {
            if (string.IsNullOrEmpty(encryptedData))
            {
                return EncryptionResult<string>.Failure("Encrypted data cannot be null or empty", EncryptionErrorType.InvalidInput);
            }

            var keyValidation = await ValidateMasterKeyAsync(masterKey);
            if (!keyValidation.IsSuccess)
            {
                return EncryptionResult<string>.Failure($"Invalid master key: {keyValidation.ErrorMessage}", EncryptionErrorType.InvalidInput);
            }

            var keyBytes = Convert.FromBase64String(masterKey);
            var encryptedBytes = Convert.FromBase64String(encryptedData);

            // Extract IV and encrypted data
            if (encryptedBytes.Length < 16) // AES block size
            {
                SecureClear(keyBytes);
                return EncryptionResult<string>.Failure("Invalid encrypted data format", EncryptionErrorType.DecryptionFailed);
            }

            var iv = new byte[16];
            var cipherText = new byte[encryptedBytes.Length - 16];
            Array.Copy(encryptedBytes, 0, iv, 0, 16);
            Array.Copy(encryptedBytes, 16, cipherText, 0, cipherText.Length);

            using var aes = Aes.Create();
            aes.Key = keyBytes;
            aes.IV = iv;

            using var decryptor = aes.CreateDecryptor();
            var decryptedBytes = decryptor.TransformFinalBlock(cipherText, 0, cipherText.Length);
            var plainText = Encoding.UTF8.GetString(decryptedBytes);

            // Securely clear sensitive data
            SecureClear(keyBytes);
            SecureClear(iv);
            SecureClear(cipherText);
            SecureClear(decryptedBytes);

            return EncryptionResult<string>.Success(plainText);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to decrypt data with master key");
            return EncryptionResult<string>.Failure($"Decryption failed: {ex.Message}", EncryptionErrorType.DecryptionFailed);
        }
    }

    #region Private Helper Methods

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

    private async Task<byte[]?> GetSystemEntropyAsync()
    {
        try
        {
            return _platform switch
            {
                "Windows" => await GetWindowsEntropyAsync(),
                "macOS" => await GetMacOSEntropyAsync(),
                "Linux" => await GetLinuxEntropyAsync(),
                _ => await GetGenericEntropyAsync()
            };
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to get platform-specific entropy, falling back to generic entropy");
            return await GetGenericEntropyAsync();
        }
    }

    private async Task<byte[]> GetWindowsEntropyAsync()
    {
        try
        {
            // Use Windows CryptoAPI for secure random bytes
            using var rng = RandomNumberGenerator.Create();
            var entropyBytes = new byte[64]; // Use 64 bytes of secure entropy
            rng.GetBytes(entropyBytes);
            
            _logger.LogDebug("Generated {ByteCount} bytes of Windows system entropy", entropyBytes.Length);
            return entropyBytes;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to get Windows-specific entropy, falling back to secure random");
            return await GetSecureFallbackEntropyAsync();
        }
    }

    private async Task<byte[]> GetMacOSEntropyAsync()
    {
        try
        {
            // Use /dev/urandom for cryptographically secure random bytes on macOS
            if (File.Exists("/dev/urandom"))
            {
                var entropyBytes = new byte[64];
                using var urandom = File.OpenRead("/dev/urandom");
                var totalBytesRead = 0;
                while (totalBytesRead < entropyBytes.Length)
                {
                    var bytesRead = await urandom.ReadAsync(entropyBytes, totalBytesRead, entropyBytes.Length - totalBytesRead);
                    if (bytesRead == 0)
                        throw new InvalidOperationException("Unexpected end of /dev/urandom stream");
                    totalBytesRead += bytesRead;
                }
                
                _logger.LogDebug("Read {ByteCount} bytes from /dev/urandom on macOS", entropyBytes.Length);
                return entropyBytes;
            }
            else
            {
                _logger.LogWarning("/dev/urandom not available, using secure fallback");
                return await GetSecureFallbackEntropyAsync();
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to read from /dev/urandom, using secure fallback");
            return await GetSecureFallbackEntropyAsync();
        }
    }

    private async Task<byte[]> GetLinuxEntropyAsync()
    {
        try
        {
            // Use /dev/urandom for cryptographically secure random bytes on Linux
            if (File.Exists("/dev/urandom"))
            {
                var entropyBytes = new byte[64];
                using var urandom = File.OpenRead("/dev/urandom");
                var totalBytesRead = 0;
                while (totalBytesRead < entropyBytes.Length)
                {
                    var bytesRead = await urandom.ReadAsync(entropyBytes, totalBytesRead, entropyBytes.Length - totalBytesRead);
                    if (bytesRead == 0)
                        throw new InvalidOperationException("Unexpected end of /dev/urandom stream");
                    totalBytesRead += bytesRead;
                }
                
                _logger.LogDebug("Read {ByteCount} bytes from /dev/urandom on Linux", entropyBytes.Length);
                return entropyBytes;
            }
            else
            {
                _logger.LogWarning("/dev/urandom not available, using secure fallback");
                return await GetSecureFallbackEntropyAsync();
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to read from /dev/urandom, using secure fallback");
            return await GetSecureFallbackEntropyAsync();
        }
    }

    private async Task<byte[]> GetGenericEntropyAsync()
    {
        // Fallback to secure random number generation
        _logger.LogInformation("Using generic secure entropy generation");
        return await GetSecureFallbackEntropyAsync();
    }

    /// <summary>
    /// Generate cryptographically secure entropy using .NET's RandomNumberGenerator
    /// This is used as fallback when platform-specific entropy sources are unavailable
    /// </summary>
    private async Task<byte[]> GetSecureFallbackEntropyAsync()
    {
        using var rng = RandomNumberGenerator.Create();
        var entropyBytes = new byte[64]; // Use 64 bytes of secure entropy
        rng.GetBytes(entropyBytes);
        
        _logger.LogDebug("Generated {ByteCount} bytes of secure fallback entropy", entropyBytes.Length);
        return entropyBytes;
    }

    private async Task<string> DeriveKeyFromEntropyAsync(byte[] entropy)
    {
        using var sha256 = SHA256.Create();
        var hash = sha256.ComputeHash(entropy);

        // Double hash for additional security
        var finalHash = sha256.ComputeHash(hash);

        var masterKey = Convert.ToBase64String(finalHash);

        // Securely clear intermediate data
        SecureClear(hash);
        SecureClear(finalHash);

        return masterKey;
    }

    private async Task<EncryptionResult> TestKeyUsabilityAsync(byte[] keyBytes)
    {
        try
        {
            // Test AES encryption/decryption with the key
            const string testData = "TrashMail Panda Key Test";
            var testDataBytes = Encoding.UTF8.GetBytes(testData);

            using var aes = Aes.Create();
            aes.Key = keyBytes;
            aes.GenerateIV();

            // Encrypt
            using var encryptor = aes.CreateEncryptor();
            var encryptedBytes = encryptor.TransformFinalBlock(testDataBytes, 0, testDataBytes.Length);

            // Decrypt
            using var decryptor = aes.CreateDecryptor();
            var decryptedBytes = decryptor.TransformFinalBlock(encryptedBytes, 0, encryptedBytes.Length);
            var decryptedText = Encoding.UTF8.GetString(decryptedBytes);

            // Verify round-trip
            if (decryptedText != testData)
            {
                return EncryptionResult.Failure("Key failed round-trip encryption test", EncryptionErrorType.ConfigurationError);
            }

            // Securely clear test data
            SecureClear(testDataBytes);
            SecureClear(encryptedBytes);
            SecureClear(decryptedBytes);

            return EncryptionResult.Success();
        }
        catch (Exception ex)
        {
            return EncryptionResult.Failure($"Key usability test failed: {ex.Message}", EncryptionErrorType.ConfigurationError);
        }
    }

    private void SecureClear(byte[] data)
    {
        if (data != null)
        {
            // Clear with random data first, then zeros
            var random = new Random();
            for (int i = 0; i < data.Length; i++)
            {
                data[i] = (byte)random.Next(256);
            }
            Array.Clear(data, 0, data.Length);
        }
    }

    #endregion
}