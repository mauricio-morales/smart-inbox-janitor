using System;

namespace TransMailPanda.Shared;

public class OpenAiConnection
{
    public bool HasValidKey { get; set; }
    public string? KeyLastFour { get; set; } // Only show last 4 chars for privacy
    public DateTime? LastValidated { get; set; }
    public decimal? MonthlySpendingUSD { get; set; }
    public decimal? EstimatedDailyRate { get; set; }
}