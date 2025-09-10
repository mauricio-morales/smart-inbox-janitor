namespace TrashMailPanda.Providers.Email.Models;

/// <summary>
/// Error message templates and constants
/// </summary>
public static class GmailErrorMessages
{
    /// <summary>Service not initialized error message</summary>
    public const string SERVICE_NOT_INITIALIZED = "Gmail service not initialized. Call InitializeAsync first.";

    /// <summary>Authentication required error message</summary>
    public const string AUTHENTICATION_REQUIRED = "Gmail authentication required. Please complete OAuth flow.";

    /// <summary>Rate limit exceeded error message template</summary>
    public const string RATE_LIMIT_EXCEEDED = "Gmail API rate limit exceeded. Retry after {0} seconds.";

    /// <summary>Invalid configuration error message</summary>
    public const string INVALID_CONFIGURATION = "Gmail provider configuration is invalid: {0}";

    /// <summary>Network error message template</summary>
    public const string NETWORK_ERROR = "Gmail API network error: {0}";

    /// <summary>Quota exceeded error message</summary>
    public const string QUOTA_EXCEEDED = "Gmail API quota exceeded. Please try again later.";

    /// <summary>Invalid message ID error message</summary>
    public const string INVALID_MESSAGE_ID = "Invalid Gmail message ID: {0}";

    /// <summary>Batch size exceeded error message</summary>
    public const string BATCH_SIZE_EXCEEDED = "Batch size exceeds Gmail API limit of {0} operations.";

    /// <summary>Token refresh failed error message</summary>
    public const string TOKEN_REFRESH_FAILED = "Failed to refresh Gmail OAuth token: {0}";

    /// <summary>Permission denied error message</summary>
    public const string PERMISSION_DENIED = "Gmail API permission denied. Check OAuth scopes: {0}";
}