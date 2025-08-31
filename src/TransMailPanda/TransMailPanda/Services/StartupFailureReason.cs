namespace TransMailPanda.Services;

/// <summary>
/// Reasons for startup failure
/// </summary>
public enum StartupFailureReason
{
    StorageInitializationFailed,
    SecurityInitializationFailed,
    EmailProviderFailed,
    LLMProviderFailed,
    HealthCheckFailed,
    Timeout,
    Cancelled,
    UnknownError
}