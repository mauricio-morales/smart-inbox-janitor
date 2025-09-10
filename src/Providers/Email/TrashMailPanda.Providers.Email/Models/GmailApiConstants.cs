namespace TrashMailPanda.Providers.Email.Models;

/// <summary>
/// Gmail API endpoints and configuration
/// </summary>
public static class GmailApiConstants
{
    /// <summary>Gmail API base URL</summary>
    public const string BASE_URL = "https://gmail.googleapis.com/gmail/v1/";

    /// <summary>OAuth2 authorization URL</summary>
    public const string OAUTH_AUTH_URL = "https://accounts.google.com/o/oauth2/auth";

    /// <summary>OAuth2 token exchange URL</summary>
    public const string OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";

    /// <summary>OAuth2 scope for read-only access</summary>
    public const string SCOPE_READONLY = "https://www.googleapis.com/auth/gmail.readonly";

    /// <summary>OAuth2 scope for modify access (read/write/delete)</summary>
    public const string SCOPE_MODIFY = "https://www.googleapis.com/auth/gmail.modify";

    /// <summary>OAuth2 scope for compose access</summary>
    public const string SCOPE_COMPOSE = "https://www.googleapis.com/auth/gmail.compose";

    /// <summary>OAuth2 scope for send access</summary>
    public const string SCOPE_SEND = "https://www.googleapis.com/auth/gmail.send";

    /// <summary>OAuth2 scope for full Gmail access</summary>
    public const string SCOPE_FULL_ACCESS = "https://mail.google.com/";

    /// <summary>User ID placeholder for authenticated user</summary>
    public const string USER_ID_ME = "me";
}