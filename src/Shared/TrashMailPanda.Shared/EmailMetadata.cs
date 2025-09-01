using System;
using System.Collections.Generic;

namespace TrashMailPanda.Shared;

public class EmailMetadata
{
    public string Id { get; set; } = string.Empty;
    public string? Classification { get; set; }
    public double? Confidence { get; set; }
    public IReadOnlyList<string>? Reasons { get; set; }
    public string? BulkKey { get; set; }
    public DateTime LastClassified { get; set; }
    public UserAction? UserAction { get; set; }
    public DateTime? UserActionTimestamp { get; set; }
}