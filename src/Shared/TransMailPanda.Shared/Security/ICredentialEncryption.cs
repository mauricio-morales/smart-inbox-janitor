using System;
using System.Threading.Tasks;

namespace TransMailPanda.Shared.Security;

/// <summary>
/// Interface for credential encryption and decryption operations
/// Provides platform-specific secure encryption using OS-level security
/// </summary>
public interface ICredentialEncryption
{
    /// <summary>
    /// Initialize the encryption system with platform-specific setup
    /// </summary>
    /// <returns>Result indicating success or failure</returns>
    Task<EncryptionResult> InitializeAsync();

    /// <summary>
    /// Encrypt a credential using OS-level security
    /// </summary>
    /// <param name="plainText">The plain text credential to encrypt</param>
    /// <param name="context">Optional context for encryption (e.g., provider name)</param>
    /// <returns>Result containing encrypted credential or error details</returns>
    Task<EncryptionResult<string>> EncryptAsync(string plainText, string? context = null);

    /// <summary>
    /// Decrypt a credential using OS-level security
    /// </summary>
    /// <param name="encryptedText">The encrypted credential to decrypt</param>
    /// <param name="context">Optional context for decryption (e.g., provider name)</param>
    /// <returns>Result containing decrypted credential or error details</returns>
    Task<EncryptionResult<string>> DecryptAsync(string encryptedText, string? context = null);

    /// <summary>
    /// Generate a master key using system entropy
    /// </summary>
    /// <returns>Result containing generated master key or error details</returns>
    Task<EncryptionResult<byte[]>> GenerateMasterKeyAsync();

    /// <summary>
    /// Validate that encryption/decryption is working correctly
    /// </summary>
    /// <returns>Health check result for encryption system</returns>
    Task<EncryptionHealthCheckResult> HealthCheckAsync();

    /// <summary>
    /// Get information about the current encryption configuration
    /// </summary>
    /// <returns>Encryption status and configuration details</returns>
    EncryptionStatus GetEncryptionStatus();

    /// <summary>
    /// Securely dispose of sensitive data from memory
    /// </summary>
    /// <param name="sensitiveData">Data to securely clear</param>
    void SecureClear(Span<char> sensitiveData);
}

/// <summary>
/// Result type for encryption operations
/// </summary>
public class EncryptionResult
{
    public bool IsSuccess { get; init; }
    public string? ErrorMessage { get; init; }
    public EncryptionErrorType? ErrorType { get; init; }

    public static EncryptionResult Success() => new() { IsSuccess = true };
    public static EncryptionResult Failure(string errorMessage, EncryptionErrorType errorType) => 
        new() { IsSuccess = false, ErrorMessage = errorMessage, ErrorType = errorType };
}

/// <summary>
/// Generic result type for encryption operations that return data
/// </summary>
public class EncryptionResult<T> : EncryptionResult
{
    public T? Value { get; init; }

    public static EncryptionResult<T> Success(T value) => new() { IsSuccess = true, Value = value };
    public static new EncryptionResult<T> Failure(string errorMessage, EncryptionErrorType errorType) => 
        new() { IsSuccess = false, ErrorMessage = errorMessage, ErrorType = errorType };
}

/// <summary>
/// Types of encryption errors for categorization
/// </summary>
public enum EncryptionErrorType
{
    KeyGenerationFailed,
    EncryptionFailed,
    DecryptionFailed,
    InvalidInput,
    PlatformNotSupported,
    KeychainError,
    ConfigurationError,
    UnknownError
}

/// <summary>
/// Health check result for encryption system
/// </summary>
public record EncryptionHealthCheckResult
{
    public bool IsHealthy { get; init; }
    public string Status { get; init; } = string.Empty;
    public bool CanEncrypt { get; init; }
    public bool CanDecrypt { get; init; }
    public bool KeyGenerationWorks { get; init; }
    public string Platform { get; init; } = string.Empty;
    public DateTime CheckTimestamp { get; init; } = DateTime.UtcNow;
    public List<string> Issues { get; init; } = new();
}

/// <summary>
/// Current status of encryption system
/// </summary>
public class EncryptionStatus
{
    public bool IsInitialized { get; init; }
    public string EncryptionMethod { get; init; } = string.Empty;
    public string Platform { get; init; } = string.Empty;
    public bool HasMasterKey { get; init; }
    public DateTime? LastHealthCheck { get; init; }
    public List<string> SupportedFeatures { get; init; } = new();
}