using Avalonia.Media;

namespace TrashMailPanda.Theming;

/// <summary>
/// Centralized professional color definitions for consistent theming
/// These colors match the professional blue-gray design system
/// </summary>
public static class ProfessionalColors
{
    // Primary Colors
    public static readonly Color AccentBlue = Color.Parse("#3A7BD5");
    public static readonly Color AccentBlueDark = Color.Parse("#2A5BA8");
    public static readonly Color AccentBlueLight = Color.Parse("#60A5FA");
    
    // Background Colors
    public static readonly Color BackgroundPrimary = Color.Parse("#F7F8FA");
    public static readonly Color CardBackground = Color.Parse("#FFFFFF");
    public static readonly Color HoverBackground = Color.Parse("#F1F5F9");
    
    // Text Colors
    public static readonly Color TextPrimary = Color.Parse("#2D3748");
    public static readonly Color TextSecondary = Color.Parse("#4A5568");
    public static readonly Color TextTertiary = Color.Parse("#718096");
    public static readonly Color TextOnAccent = Color.Parse("#FFFFFF");
    
    // Border Colors
    public static readonly Color BorderLight = Color.Parse("#E2E8F0");
    public static readonly Color BorderMedium = Color.Parse("#CBD5E1");
    public static readonly Color BorderStrong = Color.Parse("#94A3B8");
    
    // Status Colors - Semantic naming for provider states
    public static readonly Color StatusSuccess = Color.Parse("#4CAF50");    // Healthy/Connected
    public static readonly Color StatusWarning = Color.Parse("#FFB300");    // Setup Required
    public static readonly Color StatusError = Color.Parse("#E57373");      // Error/Failed
    public static readonly Color StatusInfo = Color.Parse("#3A7BD5");       // Loading/Processing
    public static readonly Color StatusNeutral = Color.Parse("#CBD5E1");    // Disconnected/Unknown
    
    /// <summary>
    /// Gets the appropriate status color for a provider state
    /// </summary>
    public static Color GetStatusColor(string status) => status?.ToLowerInvariant() switch
    {
        "connected" or "healthy" or "ready" => StatusSuccess,
        "setup required" or "authentication required" or "oauth setup required" or "api key required" => StatusWarning,
        "api key invalid" or "connection failed" or "error" or "database error" or "failed" => StatusError,
        "loading" or "connecting" or "testing" => StatusInfo,
        _ => StatusNeutral
    };
    
    /// <summary>
    /// Gets the appropriate status color for a boolean health state
    /// </summary>
    public static Color GetHealthStatusColor(bool isHealthy) => isHealthy ? StatusSuccess : StatusError;
}