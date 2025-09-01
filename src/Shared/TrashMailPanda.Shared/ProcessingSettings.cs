using System.Collections.Generic;

namespace TrashMailPanda.Shared;

public class ProcessingSettings
{
    public int BatchSize { get; set; } = 1000;
    public decimal? DailyCostLimit { get; set; }
    public bool AutoProcessNewEmails { get; set; } = false;
    public IReadOnlyList<string>? FoldersToProcess { get; set; }
}