namespace TrashMailPanda.Providers.Contacts.Models;

/// <summary>
/// Secure storage key names for Contacts provider OAuth tokens and configuration
/// Follows the same pattern as GmailStorageKeys but with contacts-specific prefixes
/// </summary>
public static class ContactsStorageKeys
{
    /// <summary>Key prefix for all Contacts-related storage entries</summary>
    public const string KEY_PREFIX = "contacts_";

    /// <summary>OAuth2 access token storage key</summary>
    public const string ACCESS_TOKEN = "contacts_access_token";

    /// <summary>OAuth2 refresh token storage key</summary>
    public const string REFRESH_TOKEN = "contacts_refresh_token";

    /// <summary>OAuth2 client ID storage key</summary>
    public const string CLIENT_ID = "contacts_client_id";

    /// <summary>OAuth2 client secret storage key</summary>
    public const string CLIENT_SECRET = "contacts_client_secret";

    /// <summary>Token expiration timestamp storage key</summary>
    public const string TOKEN_EXPIRY = "contacts_token_expiry";

    /// <summary>Token issued UTC timestamp storage key</summary>
    public const string TOKEN_ISSUED_UTC = "contacts_token_issued_utc";

    /// <summary>OAuth2 token type storage key</summary>
    public const string TOKEN_TYPE = "contacts_token_type";

    /// <summary>OAuth2 scopes storage key</summary>
    public const string SCOPES = "contacts_scopes";

    /// <summary>User email address storage key</summary>
    public const string USER_EMAIL = "contacts_user_email";

    /// <summary>Last successful authentication timestamp storage key</summary>
    public const string LAST_AUTH_SUCCESS = "contacts_last_auth_success";

    /// <summary>Provider configuration version storage key</summary>
    public const string CONFIG_VERSION = "contacts_config_version";

    /// <summary>Google People API sync token storage key</summary>
    public const string SYNC_TOKEN = "contacts_sync_token";

    /// <summary>Last successful contacts sync timestamp storage key</summary>
    public const string LAST_SYNC_SUCCESS = "contacts_last_sync_success";

    /// <summary>Contact cache last updated timestamp storage key</summary>
    public const string CACHE_LAST_UPDATED = "contacts_cache_last_updated";
}