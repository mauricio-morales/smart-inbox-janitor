namespace TrashMailPanda.Services;

/// <summary>
/// Configuration class for LLM Provider
/// </summary>
public class LLMProviderConfig
{
    public string ApiKey { get; set; } = string.Empty;
    public string Model { get; set; } = "gpt-4o-mini";
    public double Temperature { get; set; } = 0.1;
    public int MaxTokens { get; set; } = 1000;
    public decimal DailyCostLimit { get; set; } = 10.0m;
}