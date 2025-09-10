namespace TrashMailPanda.Shared.Models;

/// <summary>
/// Provider credential types for zero-configuration secure storage
/// Separates OAuth client configuration from session tokens
/// </summary>
public static class ProviderCredentialTypes
{
    // Gmail Provider Credentials
    public const string GmailClientId = "gmail_client_id";
    public const string GmailClientSecret = "gmail_client_secret";
    public const string GmailAccessToken = "gmail_access_token";
    public const string GmailRefreshToken = "gmail_refresh_token";
    public const string GmailTokenExpiry = "gmail_token_expiry";
    public const string GmailUserEmail = "gmail_user_email";

    // OpenAI Provider Credentials
    public const string OpenAIApiKey = "openai_api_key";
    public const string OpenAIOrganization = "openai_organization";

    // Storage Provider Credentials (if needed for cloud storage)
    public const string StorageConnectionString = "storage_connection_string";
    public const string StorageEncryptionKey = "storage_encryption_key";

    /// <summary>
    /// Get all credential types for a specific provider
    /// </summary>
    public static IReadOnlyList<string> GetCredentialTypesForProvider(ProviderType providerType)
    {
        return providerType switch
        {
            ProviderType.Email => new[]
            {
                GmailClientId,
                GmailClientSecret,
                GmailAccessToken,
                GmailRefreshToken,
                GmailTokenExpiry,
                GmailUserEmail
            },
            ProviderType.LLM => new[]
            {
                OpenAIApiKey,
                OpenAIOrganization
            },
            ProviderType.Storage => new[]
            {
                StorageConnectionString,
                StorageEncryptionKey
            },
            _ => Array.Empty<string>()
        };
    }

    /// <summary>
    /// Determine if a credential type represents OAuth client configuration
    /// (should persist across sessions) vs session tokens (can expire)
    /// </summary>
    public static bool IsClientCredential(string credentialType)
    {
        return credentialType switch
        {
            GmailClientId => true,
            GmailClientSecret => true,
            OpenAIApiKey => true,
            OpenAIOrganization => true,
            StorageConnectionString => true,
            StorageEncryptionKey => true,
            _ => false
        };
    }

    /// <summary>
    /// Determine if a credential type represents session/temporary tokens
    /// that can expire and need renewal
    /// </summary>
    public static bool IsSessionCredential(string credentialType)
    {
        return credentialType switch
        {
            GmailAccessToken => true,
            GmailRefreshToken => true,
            GmailTokenExpiry => true,
            GmailUserEmail => true,
            _ => false
        };
    }
}