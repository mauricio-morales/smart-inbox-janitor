namespace TrashMailPanda.Shared.Security;

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