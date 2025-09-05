namespace TrashMailPanda.Shared.Models;

/// <summary>
/// Information about the authenticated user from an email provider
/// </summary>
public record AuthenticatedUserInfo
{
    /// <summary>
    /// The authenticated user's email address
    /// </summary>
    public string Email { get; init; } = string.Empty;

    /// <summary>
    /// Total number of messages in the user's mailbox
    /// </summary>
    public int MessagesTotal { get; init; }

    /// <summary>
    /// Total number of threads in the user's mailbox
    /// </summary>
    public int ThreadsTotal { get; init; }

    /// <summary>
    /// History ID for synchronization purposes
    /// </summary>
    public string HistoryId { get; init; } = string.Empty;

    /// <summary>
    /// Display name derived from the email address
    /// </summary>
    public string DisplayName => Email.Split('@').FirstOrDefault() ?? Email;
}