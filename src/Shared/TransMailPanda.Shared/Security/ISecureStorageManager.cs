using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace TransMailPanda.Shared.Security;

/// <summary>
/// Interface for secure credential storage using OS keychain integration
/// Provides zero-password experience through OS-level security
/// </summary>
public interface ISecureStorageManager
{
    /// <summary>
    /// Initialize the secure storage system
    /// </summary>
    /// <returns>Result indicating success or failure with error details</returns>
    Task<SecureStorageResult> InitializeAsync();

    /// <summary>
    /// Store a credential securely in OS keychain
    /// </summary>
    /// <param name="key">Unique identifier for the credential</param>
    /// <param name="credential">The credential to store securely</param>
    /// <returns>Result indicating success or failure</returns>
    Task<SecureStorageResult> StoreCredentialAsync(string key, string credential);

    /// <summary>
    /// Retrieve a credential from secure storage
    /// </summary>
    /// <param name="key">Unique identifier for the credential</param>
    /// <returns>Result containing the credential or error details</returns>
    Task<SecureStorageResult<string>> RetrieveCredentialAsync(string key);

    /// <summary>
    /// Remove a credential from secure storage
    /// </summary>
    /// <param name="key">Unique identifier for the credential to remove</param>
    /// <returns>Result indicating success or failure</returns>
    Task<SecureStorageResult> RemoveCredentialAsync(string key);

    /// <summary>
    /// Check if a credential exists in secure storage
    /// </summary>
    /// <param name="key">Unique identifier for the credential</param>
    /// <returns>Result indicating if credential exists</returns>
    Task<SecureStorageResult<bool>> CredentialExistsAsync(string key);

    /// <summary>
    /// Get all stored credential keys (for inventory/cleanup)
    /// </summary>
    /// <returns>Result containing list of credential keys</returns>
    Task<SecureStorageResult<IReadOnlyList<string>>> GetStoredCredentialKeysAsync();

    /// <summary>
    /// Perform health check on secure storage system
    /// </summary>
    /// <returns>Health check result with detailed status</returns>
    Task<SecureStorageHealthCheckResult> HealthCheckAsync();

    /// <summary>
    /// Get secure storage status for diagnostics
    /// </summary>
    /// <returns>Current status of secure storage system</returns>
    SecureStorageStatus GetSecureStorageStatus();
}

/// <summary>
/// Result type for secure storage operations
/// </summary>
public class SecureStorageResult
{
    public bool IsSuccess { get; init; }
    public string? ErrorMessage { get; init; }
    public SecureStorageErrorType? ErrorType { get; init; }

    public static SecureStorageResult Success() => new() { IsSuccess = true };
    public static SecureStorageResult Failure(string errorMessage, SecureStorageErrorType errorType) => 
        new() { IsSuccess = false, ErrorMessage = errorMessage, ErrorType = errorType };
}

/// <summary>
/// Generic result type for secure storage operations that return data
/// </summary>
public class SecureStorageResult<T> : SecureStorageResult
{
    public T? Value { get; init; }

    public static SecureStorageResult<T> Success(T value) => new() { IsSuccess = true, Value = value };
    public static new SecureStorageResult<T> Failure(string errorMessage, SecureStorageErrorType errorType) => 
        new() { IsSuccess = false, ErrorMessage = errorMessage, ErrorType = errorType };
}

/// <summary>
/// Types of secure storage errors for categorization
/// </summary>
public enum SecureStorageErrorType
{
    KeychainUnavailable,
    AccessDenied,
    CredentialNotFound,
    EncryptionError,
    PlatformNotSupported,
    ConfigurationError,
    NetworkError,
    UnknownError
}

/// <summary>
/// Health check result for secure storage system
/// </summary>
public record SecureStorageHealthCheckResult
{
    public bool IsHealthy { get; init; }
    public string Status { get; init; } = string.Empty;
    public Dictionary<string, object> Details { get; init; } = new();
    public List<string> Issues { get; init; } = new();
    public DateTime CheckTimestamp { get; init; } = DateTime.UtcNow;
}

/// <summary>
/// Current status of secure storage system
/// </summary>
public class SecureStorageStatus
{
    public bool IsInitialized { get; init; }
    public bool IsKeychainAvailable { get; init; }
    public string Platform { get; init; } = string.Empty;
    public int StoredCredentialCount { get; init; }
    public DateTime? LastHealthCheck { get; init; }
    public List<string> SupportedOperations { get; init; } = new();
}