namespace TrashMailPanda.Providers.Email.Models;

/// <summary>
/// Secure storage key names for OAuth tokens and configuration
/// </summary>
public static class GmailStorageKeys
{
    /// <summary>Key prefix for all Gmail-related storage entries</summary>
    public const string KEY_PREFIX = "gmail_";

    /// <summary>OAuth2 access token storage key</summary>
    public const string ACCESS_TOKEN = "gmail_access_token";

    /// <summary>OAuth2 refresh token storage key</summary>
    public const string REFRESH_TOKEN = "gmail_refresh_token";

    /// <summary>OAuth2 client ID storage key</summary>
    public const string CLIENT_ID = "gmail_client_id";

    /// <summary>OAuth2 client secret storage key</summary>
    public const string CLIENT_SECRET = "gmail_client_secret";

    /// <summary>Token expiration timestamp storage key</summary>
    public const string TOKEN_EXPIRY = "gmail_token_expiry";

    /// <summary>OAuth2 token type storage key</summary>
    public const string TOKEN_TYPE = "gmail_token_type";

    /// <summary>User email address storage key</summary>
    public const string USER_EMAIL = "gmail_user_email";

    /// <summary>Last successful authentication timestamp storage key</summary>
    public const string LAST_AUTH_SUCCESS = "gmail_last_auth_success";

    /// <summary>Provider configuration version storage key</summary>
    public const string CONFIG_VERSION = "gmail_config_version";
}