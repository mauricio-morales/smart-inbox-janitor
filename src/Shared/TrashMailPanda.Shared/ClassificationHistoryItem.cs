using System;
using System.Collections.Generic;

namespace TrashMailPanda.Shared;

public class ClassificationHistoryItem
{
    public DateTime Timestamp { get; set; }
    public string EmailId { get; set; } = string.Empty;
    public string Classification { get; set; } = string.Empty;
    public double Confidence { get; set; }
    public IReadOnlyList<string> Reasons { get; set; } = Array.Empty<string>();
    public string? UserAction { get; set; }
    public UserFeedback? UserFeedback { get; set; }
}