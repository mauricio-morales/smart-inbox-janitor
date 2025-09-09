namespace TrashMailPanda.Shared.Security;

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
    UnknownError,
    KeychainCorrupted,
    KeychainAccessDenied,
    NetworkError,
    TransientError
}