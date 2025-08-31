using System;
using System.Collections.Generic;

namespace TransMailPanda.Shared;

public class ClassifyItem
{
    public string EmailId { get; init; } = string.Empty;
    public EmailClassification Classification { get; init; }
    public Likelihood Likelihood { get; init; }
    public double Confidence { get; init; }
    public IReadOnlyList<string> Reasons { get; init; } = Array.Empty<string>();
    public string BulkKey { get; init; } = string.Empty;
    public UnsubscribeMethod? UnsubscribeMethod { get; init; }
}