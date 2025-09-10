namespace TrashMailPanda.Providers.Email.Models;

/// <summary>
/// Gmail API quota limits and operational constraints
/// </summary>
public static class GmailQuotas
{
    /// <summary>Maximum number of operations in a single batch request</summary>
    public const int MAX_BATCH_SIZE = 100;

    /// <summary>Recommended batch size to avoid rate limiting</summary>
    public const int RECOMMENDED_BATCH_SIZE = 50;

    /// <summary>Maximum number of messages returned in a single list request</summary>
    public const int MAX_LIST_RESULTS = 500;

    /// <summary>Default number of messages returned in list requests</summary>
    public const int DEFAULT_LIST_RESULTS = 100;

    /// <summary>Maximum number of messages that can be modified in batchModify</summary>
    public const int MAX_BATCH_MODIFY_MESSAGES = 1000;

    /// <summary>Per-project quota units per minute</summary>
    public const int QUOTA_UNITS_PER_PROJECT_MINUTE = 1_200_000;

    /// <summary>Per-user quota units per minute</summary>
    public const int QUOTA_UNITS_PER_USER_MINUTE = 15_000;

    /// <summary>Quota units consumed by messages.get operation</summary>
    public const int QUOTA_UNITS_MESSAGE_GET = 5;

    /// <summary>Quota units consumed by messages.list operation</summary>
    public const int QUOTA_UNITS_MESSAGE_LIST = 5;

    /// <summary>Quota units consumed by messages.batchModify operation</summary>
    public const int QUOTA_UNITS_BATCH_MODIFY = 50;

    /// <summary>Quota units consumed by messages.send operation</summary>
    public const int QUOTA_UNITS_MESSAGE_SEND = 100;

    /// <summary>Quota units consumed by messages.delete operation</summary>
    public const int QUOTA_UNITS_MESSAGE_DELETE = 10;
}