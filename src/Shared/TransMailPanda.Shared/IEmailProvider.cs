using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace TransMailPanda.Shared;

/// <summary>
/// Abstract interface for email providers (Gmail, IMAP, etc.)
/// Provides consistent email operations across different providers
/// </summary>
public interface IEmailProvider
{
    /// <summary>
    /// Connect to the email provider using OAuth or other authentication
    /// </summary>
    Task ConnectAsync();

    /// <summary>
    /// List emails with filtering and pagination options
    /// </summary>
    /// <param name="options">Search and filter options</param>
    /// <returns>List of email summaries</returns>
    Task<IReadOnlyList<EmailSummary>> ListAsync(ListOptions options);

    /// <summary>
    /// Get full email content including headers and body
    /// </summary>
    /// <param name="id">Email ID</param>
    /// <returns>Complete email details</returns>
    Task<EmailFull> GetAsync(string id);

    /// <summary>
    /// Perform batch operations on multiple emails (labels, trash, etc.)
    /// </summary>
    /// <param name="request">Batch modification request</param>
    Task BatchModifyAsync(BatchModifyRequest request);

    /// <summary>
    /// Hard delete email (use sparingly, prefer trash)
    /// </summary>
    /// <param name="id">Email ID</param>
    Task DeleteAsync(string id);

    /// <summary>
    /// Report email as spam (provider-dependent)
    /// </summary>
    /// <param name="id">Email ID</param>
    Task ReportSpamAsync(string id);

    /// <summary>
    /// Report email as phishing (provider-dependent)
    /// </summary>
    /// <param name="id">Email ID</param>
    Task ReportPhishingAsync(string id);
}

public class ListOptions
{
    public string? Query { get; init; }
    public int? MaxResults { get; init; }
    public string? PageToken { get; init; }
    public IReadOnlyList<string>? LabelIds { get; init; }
    public DateTime? After { get; init; }
    public DateTime? Before { get; init; }
}

public class EmailSummary
{
    public string Id { get; init; } = string.Empty;
    public string ThreadId { get; init; } = string.Empty;
    public IReadOnlyList<string> LabelIds { get; init; } = Array.Empty<string>();
    public string Snippet { get; init; } = string.Empty;
    public long HistoryId { get; init; }
    public long InternalDate { get; init; }
    public string Subject { get; init; } = string.Empty;
    public string From { get; init; } = string.Empty;
    public string To { get; init; } = string.Empty;
    public DateTime ReceivedDate { get; init; }
    public bool HasAttachments { get; init; }
    public long SizeEstimate { get; init; }
}

public class EmailFull
{
    public string Id { get; init; } = string.Empty;
    public string ThreadId { get; init; } = string.Empty;
    public IReadOnlyList<string> LabelIds { get; init; } = Array.Empty<string>();
    public string Snippet { get; init; } = string.Empty;
    public long HistoryId { get; init; }
    public long InternalDate { get; init; }
    public IReadOnlyDictionary<string, string> Headers { get; init; } = new Dictionary<string, string>();
    public string? BodyText { get; init; }
    public string? BodyHtml { get; init; }
    public IReadOnlyList<EmailAttachment> Attachments { get; init; } = Array.Empty<EmailAttachment>();
    public long SizeEstimate { get; init; }
}

public class EmailAttachment
{
    public string FileName { get; init; } = string.Empty;
    public string MimeType { get; init; } = string.Empty;
    public long Size { get; init; }
    public string AttachmentId { get; init; } = string.Empty;
}

public class BatchModifyRequest
{
    public IReadOnlyList<string> EmailIds { get; init; } = Array.Empty<string>();
    public IReadOnlyList<string>? AddLabelIds { get; init; }
    public IReadOnlyList<string>? RemoveLabelIds { get; init; }
}