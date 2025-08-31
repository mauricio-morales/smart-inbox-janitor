using System;
using System.Collections.Generic;

namespace TransMailPanda.Shared;

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