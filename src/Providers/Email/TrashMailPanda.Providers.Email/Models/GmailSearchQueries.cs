namespace TrashMailPanda.Providers.Email.Models;

/// <summary>
/// Search query helpers for Gmail operations
/// </summary>
public static class GmailSearchQueries
{
    /// <summary>Query for unread messages</summary>
    public const string UNREAD = "is:unread";

    /// <summary>Query for read messages</summary>
    public const string READ = "is:read";

    /// <summary>Query for starred messages</summary>
    public const string STARRED = "is:starred";

    /// <summary>Query for important messages</summary>
    public const string IMPORTANT = "is:important";

    /// <summary>Query for messages with attachments</summary>
    public const string HAS_ATTACHMENTS = "has:attachment";

    /// <summary>Query for messages in inbox</summary>
    public const string IN_INBOX = "in:inbox";

    /// <summary>Query for messages in trash</summary>
    public const string IN_TRASH = "in:trash";

    /// <summary>Query for messages in spam</summary>
    public const string IN_SPAM = "in:spam";

    /// <summary>Query for messages from specific sender template</summary>
    public const string FROM_SENDER = "from:{0}";

    /// <summary>Query for messages to specific recipient template</summary>
    public const string TO_RECIPIENT = "to:{0}";

    /// <summary>Query for messages with specific subject template</summary>
    public const string SUBJECT_CONTAINS = "subject:{0}";

    /// <summary>Query for messages after specific date template (YYYY/MM/DD)</summary>
    public const string AFTER_DATE = "after:{0}";

    /// <summary>Query for messages before specific date template (YYYY/MM/DD)</summary>
    public const string BEFORE_DATE = "before:{0}";

    /// <summary>Query for messages larger than specific size template</summary>
    public const string LARGER_THAN = "larger:{0}";

    /// <summary>Query for messages smaller than specific size template</summary>
    public const string SMALLER_THAN = "smaller:{0}";
}