using TrashMailPanda.Shared.Base;

namespace TrashMailPanda.Services;

/// <summary>
/// Interface for Gmail OAuth service
/// </summary>
public interface IGmailOAuthService
{
    /// <summary>
    /// Initiate Gmail OAuth authentication flow in browser
    /// </summary>
    Task<Result<bool>> AuthenticateAsync();

    /// <summary>
    /// Check if valid Gmail authentication exists
    /// </summary>
    Task<Result<bool>> IsAuthenticatedAsync();

    /// <summary>
    /// Clear stored Gmail authentication tokens
    /// </summary>
    Task<Result<bool>> SignOutAsync();
}