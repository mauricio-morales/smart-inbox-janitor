namespace TransMailPanda.Shared.Security;

/// <summary>
/// Types of security events
/// </summary>
public enum SecurityEventType
{
    AuthenticationFailure,
    UnauthorizedAccess,
    KeychainAccessDenied,
    EncryptionFailure,
    DecryptionFailure,
    SuspiciousActivity,
    ConfigurationChange,
    SystemHealthCheck,
    TokenRotation,
    DataBreach
}