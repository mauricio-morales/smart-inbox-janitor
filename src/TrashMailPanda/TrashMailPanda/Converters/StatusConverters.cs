using Avalonia.Data.Converters;
using Avalonia.Media;
using System.Globalization;
using TrashMailPanda.Models;
using TrashMailPanda.Services;
using TrashMailPanda.Shared;
using TrashMailPanda.Theming;

namespace TrashMailPanda.Converters;

/// <summary>
/// Converts boolean health status to user-friendly display text
/// </summary>
public class BoolToHealthConverter : IValueConverter
{
    public object? Convert(object? value, Type targetType, object? parameter, CultureInfo culture)
    {
        if (value is bool isHealthy)
        {
            return isHealthy ? "Healthy" : "Unhealthy";
        }

        return "Unknown";
    }

    public object? ConvertBack(object? value, Type targetType, object? parameter, CultureInfo culture)
    {
        if (value is string status)
        {
            return status.Equals("Healthy", StringComparison.OrdinalIgnoreCase);
        }

        return false;
    }
}

/// <summary>
/// Converts provider status information to appropriate professional colors
/// Uses centralized ProfessionalColors for consistent theming
/// </summary>
public class ProviderStatusToColorConverter : IValueConverter
{
    // Professional color brushes using centralized color definitions
    private static readonly IBrush HealthyBrush = new SolidColorBrush(ProfessionalColors.StatusSuccess);
    private static readonly IBrush UnhealthyBrush = new SolidColorBrush(ProfessionalColors.StatusError);
    private static readonly IBrush SetupRequiredBrush = new SolidColorBrush(ProfessionalColors.StatusWarning);
    private static readonly IBrush DisconnectedBrush = new SolidColorBrush(ProfessionalColors.StatusNeutral);
    private static readonly IBrush LoadingBrush = new SolidColorBrush(ProfessionalColors.StatusInfo);

    public object? Convert(object? value, Type targetType, object? parameter, CultureInfo culture)
    {
        // Handle multiple input scenarios
        return value switch
        {
            bool isHealthy when isHealthy => HealthyBrush,
            bool isHealthy when !isHealthy => UnhealthyBrush,
            string status => GetColorForStatus(status),
            ProviderStatus providerStatus => GetColorForProviderStatus(providerStatus),
            _ => DisconnectedBrush
        };
    }

    public object? ConvertBack(object? value, Type targetType, object? parameter, CultureInfo culture)
    {
        throw new NotSupportedException("ConvertBack not supported for ProviderStatusToColorConverter");
    }

    private static IBrush GetColorForStatus(string status)
    {
        // Use centralized color determination logic
        var color = ProfessionalColors.GetStatusColor(status);
        return new SolidColorBrush(color);
    }

    private static IBrush GetColorForProviderStatus(ProviderStatus status)
    {
        // Use centralized logic for provider status colors
        if (status.IsHealthy)
        {
            return new SolidColorBrush(ProfessionalColors.StatusSuccess);
        }

        if (status.RequiresSetup)
        {
            return new SolidColorBrush(ProfessionalColors.StatusWarning);
        }

        return new SolidColorBrush(ProfessionalColors.StatusError);
    }
}

/// <summary>
/// Converts provider status to appropriate icon
/// </summary>
public class ProviderStatusToIconConverter : IValueConverter
{
    public object? Convert(object? value, Type targetType, object? parameter, CultureInfo culture)
    {
        return value switch
        {
            bool isHealthy when isHealthy => "✅",
            bool isHealthy when !isHealthy => "❌",
            string status => GetIconForStatus(status),
            ProviderStatus providerStatus => GetIconForProviderStatus(providerStatus),
            _ => "❓"
        };
    }

    public object? ConvertBack(object? value, Type targetType, object? parameter, CultureInfo culture)
    {
        throw new NotSupportedException("ConvertBack not supported for ProviderStatusToIconConverter");
    }

    private static string GetIconForStatus(string status)
    {
        return status?.ToLowerInvariant() switch
        {
            "connected" => "✅",
            "healthy" => "✅",
            "ready" => "✅",
            "setup required" => "⚙️",
            "authentication required" => "🔐",
            "oauth setup required" => "🔗",
            "api key required" => "🔑",
            "api key invalid" => "❌",
            "connection failed" => "❌",
            "error" => "❌",
            "database error" => "❌",
            "failed" => "❌",
            "loading" => "⏳",
            "connecting" => "🔄",
            "testing" => "🧪",
            _ => "❓"
        };
    }

    private static string GetIconForProviderStatus(ProviderStatus status)
    {
        if (status.IsHealthy)
        {
            return "✅";
        }

        if (status.RequiresSetup)
        {
            return status.Status?.ToLowerInvariant() switch
            {
                "authentication required" => "🔐",
                "oauth setup required" => "🔗",
                "api key required" => "🔑",
                _ => "⚙️"
            };
        }

        return "❌";
    }
}

/// <summary>
/// Converts provider status to button text
/// </summary>
public class ProviderStatusToButtonTextConverter : IValueConverter
{
    public object? Convert(object? value, Type targetType, object? parameter, CultureInfo culture)
    {
        return value switch
        {
            ProviderStatus status => GetButtonTextForStatus(status),
            string statusText => GetButtonTextForStatusString(statusText),
            _ => "Configure"
        };
    }

    public object? ConvertBack(object? value, Type targetType, object? parameter, CultureInfo culture)
    {
        throw new NotSupportedException("ConvertBack not supported for ProviderStatusToButtonTextConverter");
    }

    private static string GetButtonTextForStatus(ProviderStatus status)
    {
        if (status.IsHealthy)
        {
            return "Reconfigure";
        }

        if (status.RequiresSetup)
        {
            return status.Status?.ToLowerInvariant() switch
            {
                "oauth setup required" => "Setup OAuth",
                "api key required" => "Enter API Key",
                "setup required" => "Setup",
                _ => "Configure"
            };
        }

        if (!status.IsHealthy && status.IsInitialized)
        {
            return status.Status?.ToLowerInvariant() switch
            {
                "authentication required" => "Sign In",
                "api key invalid" => "Fix API Key",
                "connection failed" => "Reconnect",
                _ => "Fix Issue"
            };
        }

        return "Configure";
    }

    private static string GetButtonTextForStatusString(string status)
    {
        return status?.ToLowerInvariant() switch
        {
            "oauth setup required" => "Setup OAuth",
            "api key required" => "Enter API Key",
            "authentication required" => "Sign In",
            "api key invalid" => "Fix API Key",
            "connection failed" => "Reconnect",
            "setup required" => "Setup",
            "connected" => "Reconfigure",
            "healthy" => "Reconfigure",
            "ready" => "Reconfigure",
            _ => "Configure"
        };
    }
}

/// <summary>
/// Converts boolean to visibility (with optional inversion)
/// </summary>
public class BoolToVisibilityConverter : IValueConverter
{
    public object? Convert(object? value, Type targetType, object? parameter, CultureInfo culture)
    {
        var isVisible = false;

        if (value is bool boolValue)
        {
            isVisible = boolValue;
        }

        // Check if we should invert the result
        if (parameter is string param && param.Equals("invert", StringComparison.OrdinalIgnoreCase))
        {
            isVisible = !isVisible;
        }

        return isVisible;
    }

    public object? ConvertBack(object? value, Type targetType, object? parameter, CultureInfo culture)
    {
        if (value is bool isVisible)
        {
            // Check if we should invert the result
            if (parameter is string param && param.Equals("invert", StringComparison.OrdinalIgnoreCase))
            {
                return !isVisible;
            }
            return isVisible;
        }

        return false;
    }
}

/// <summary>
/// Converts provider setup complexity to user-friendly text
/// </summary>
public class SetupComplexityToTextConverter : IValueConverter
{
    public object? Convert(object? value, Type targetType, object? parameter, CultureInfo culture)
    {
        if (value is SetupComplexity complexity)
        {
            return complexity switch
            {
                SetupComplexity.Simple => "Quick setup",
                SetupComplexity.Moderate => "Moderate setup",
                SetupComplexity.Complex => "Advanced setup",
                _ => "Setup required"
            };
        }

        return "Setup required";
    }

    public object? ConvertBack(object? value, Type targetType, object? parameter, CultureInfo culture)
    {
        throw new NotSupportedException("ConvertBack not supported for SetupComplexityToTextConverter");
    }
}

/// <summary>
/// Converts setup time in minutes to user-friendly text
/// </summary>
public class SetupTimeToTextConverter : IValueConverter
{
    public object? Convert(object? value, Type targetType, object? parameter, CultureInfo culture)
    {
        if (value is int minutes)
        {
            return minutes switch
            {
                0 => "Automatic",
                1 => "1 minute",
                <= 5 => $"{minutes} minutes",
                <= 10 => "5-10 minutes",
                _ => "10+ minutes"
            };
        }

        return "Setup time varies";
    }

    public object? ConvertBack(object? value, Type targetType, object? parameter, CultureInfo culture)
    {
        throw new NotSupportedException("ConvertBack not supported for SetupTimeToTextConverter");
    }
}