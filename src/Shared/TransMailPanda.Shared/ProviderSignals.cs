namespace TransMailPanda.Shared;

public class ProviderSignals
{
    public bool? HasListUnsubscribe { get; init; }
    public string? Spf { get; init; }
    public string? Dkim { get; init; }
    public string? Dmarc { get; init; }
}