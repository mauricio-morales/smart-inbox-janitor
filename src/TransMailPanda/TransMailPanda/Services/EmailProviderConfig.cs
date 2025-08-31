namespace TransMailPanda.Services;

/// <summary>
/// Configuration class for Email Provider
/// </summary>
public class EmailProviderConfig
{
    public string ClientId { get; set; } = string.Empty;
    public string ClientSecret { get; set; } = string.Empty;
    public string RedirectUri { get; set; } = "http://localhost:8080/oauth/callback";
    public int TimeoutSeconds { get; set; } = 30;
}