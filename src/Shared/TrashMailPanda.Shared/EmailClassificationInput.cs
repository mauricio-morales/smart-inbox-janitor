using System.Collections.Generic;

namespace TrashMailPanda.Shared;

public class EmailClassificationInput
{
    public string Id { get; init; } = string.Empty;
    public IReadOnlyDictionary<string, string> Headers { get; init; } = new Dictionary<string, string>();
    public string? BodyText { get; init; }
    public string? BodyHtml { get; init; } // sanitized
    public ProviderSignals? ProviderSignals { get; init; }
    public ContactSignal? ContactSignal { get; init; }
}