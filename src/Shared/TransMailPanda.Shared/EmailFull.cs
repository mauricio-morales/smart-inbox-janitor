using System;
using System.Collections.Generic;

namespace TransMailPanda.Shared;

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