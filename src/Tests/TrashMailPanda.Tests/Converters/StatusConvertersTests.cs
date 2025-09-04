using Avalonia.Media;
using System.Globalization;
using TrashMailPanda.Converters;
using TrashMailPanda.Models;
using TrashMailPanda.Services;
using TrashMailPanda.Shared;
using TrashMailPanda.Theming;
using Xunit;

namespace TrashMailPanda.Tests.Converters;

public class BoolToHealthConverterTests
{
    private readonly BoolToHealthConverter _converter = new();
    private readonly CultureInfo _culture = CultureInfo.InvariantCulture;

    [Theory]
    [InlineData(true, "Healthy")]
    [InlineData(false, "Unhealthy")]
    public void Convert_WithBoolValue_ShouldReturnCorrectText(bool input, string expected)
    {
        // Act
        var result = _converter.Convert(input, typeof(string), null, _culture);

        // Assert
        Assert.Equal(expected, result);
    }

    [Fact]
    public void Convert_WithNonBoolValue_ShouldReturnUnknown()
    {
        // Act
        var result = _converter.Convert("not a bool", typeof(string), null, _culture);

        // Assert
        Assert.Equal("Unknown", result);
    }

    [Theory]
    [InlineData("Healthy", true)]
    [InlineData("healthy", true)]
    [InlineData("HEALTHY", true)]
    [InlineData("Unhealthy", false)]
    [InlineData("Other", false)]
    public void ConvertBack_WithStringValue_ShouldReturnCorrectBool(string input, bool expected)
    {
        // Act
        var result = _converter.ConvertBack(input, typeof(bool), null, _culture);

        // Assert
        Assert.Equal(expected, result);
    }

    [Fact]
    public void ConvertBack_WithNonStringValue_ShouldReturnFalse()
    {
        // Act
        var result = _converter.ConvertBack(123, typeof(bool), null, _culture);

        // Assert
        Assert.Equal(false, result);
    }
}

public class ProviderStatusToColorConverterTests
{
    private readonly ProviderStatusToColorConverter _converter = new();
    private readonly CultureInfo _culture = CultureInfo.InvariantCulture;

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public void Convert_WithBoolValue_ShouldReturnBrush(bool isHealthy)
    {
        // Act
        var result = _converter.Convert(isHealthy, typeof(IBrush), null, _culture);

        // Assert
        Assert.IsType<SolidColorBrush>(result);
        var brush = (SolidColorBrush)result!;

        if (isHealthy)
            Assert.Equal(ProfessionalColors.StatusSuccess, brush.Color);
        else
            Assert.Equal(ProfessionalColors.StatusError, brush.Color);
    }

    [Theory]
    [InlineData("connected")]
    [InlineData("healthy")]
    [InlineData("ready")]
    public void Convert_WithHealthyStatus_ShouldReturnGreenBrush(string status)
    {
        // Act
        var result = _converter.Convert(status, typeof(IBrush), null, _culture);

        // Assert
        Assert.IsType<SolidColorBrush>(result);
        var brush = (SolidColorBrush)result!;
        Assert.Equal(ProfessionalColors.StatusSuccess, brush.Color);
    }

    [Theory]
    [InlineData("setup required")]
    [InlineData("authentication required")]
    [InlineData("oauth setup required")]
    [InlineData("api key required")]
    public void Convert_WithSetupRequiredStatus_ShouldReturnOrangeBrush(string status)
    {
        // Act
        var result = _converter.Convert(status, typeof(IBrush), null, _culture);

        // Assert
        Assert.IsType<SolidColorBrush>(result);
        var brush = (SolidColorBrush)result!;
        Assert.Equal(ProfessionalColors.StatusWarning, brush.Color);
    }

    [Theory]
    [InlineData("error")]
    [InlineData("failed")]
    [InlineData("api key invalid")]
    [InlineData("connection failed")]
    [InlineData("database error")]
    public void Convert_WithErrorStatus_ShouldReturnRedBrush(string status)
    {
        // Act
        var result = _converter.Convert(status, typeof(IBrush), null, _culture);

        // Assert
        Assert.IsType<SolidColorBrush>(result);
        var brush = (SolidColorBrush)result!;
        Assert.Equal(ProfessionalColors.StatusError, brush.Color);
    }

    [Theory]
    [InlineData("loading")]
    [InlineData("connecting")]
    [InlineData("testing")]
    public void Convert_WithLoadingStatus_ShouldReturnBlueBrush(string status)
    {
        // Act
        var result = _converter.Convert(status, typeof(IBrush), null, _culture);

        // Assert
        Assert.IsType<SolidColorBrush>(result);
        var brush = (SolidColorBrush)result!;
        Assert.Equal(ProfessionalColors.StatusInfo, brush.Color);
    }

    [Fact]
    public void Convert_WithProviderStatus_ShouldReturnCorrectBrush()
    {
        // Arrange
        var healthyStatus = new ProviderStatus
        {
            Name = "Test",
            IsHealthy = true,
            Status = "Connected",
            RequiresSetup = false,
            IsInitialized = true
        };
        var setupRequiredStatus = new ProviderStatus
        {
            Name = "Test",
            IsHealthy = false,
            Status = "Setup Required",
            RequiresSetup = true,
            IsInitialized = false
        };
        var errorStatus = new ProviderStatus
        {
            Name = "Test",
            IsHealthy = false,
            Status = "Error",
            RequiresSetup = false,
            IsInitialized = true
        };

        // Act
        var healthyResult = _converter.Convert(healthyStatus, typeof(IBrush), null, _culture);
        var setupResult = _converter.Convert(setupRequiredStatus, typeof(IBrush), null, _culture);
        var errorResult = _converter.Convert(errorStatus, typeof(IBrush), null, _culture);

        // Assert
        Assert.Equal(ProfessionalColors.StatusSuccess, ((SolidColorBrush)healthyResult!).Color);
        Assert.Equal(ProfessionalColors.StatusWarning, ((SolidColorBrush)setupResult!).Color);
        Assert.Equal(ProfessionalColors.StatusError, ((SolidColorBrush)errorResult!).Color);
    }

    [Fact]
    public void ConvertBack_ShouldThrowNotSupportedException()
    {
        // Act & Assert
        Assert.Throws<NotSupportedException>(() =>
            _converter.ConvertBack(new SolidColorBrush(Colors.Green), typeof(bool), null, _culture));
    }
}

public class ProviderStatusToIconConverterTests
{
    private readonly ProviderStatusToIconConverter _converter = new();
    private readonly CultureInfo _culture = CultureInfo.InvariantCulture;

    [Theory]
    [InlineData(true, "✅")]
    [InlineData(false, "❌")]
    public void Convert_WithBoolValue_ShouldReturnCorrectIcon(bool isHealthy, string expected)
    {
        // Act
        var result = _converter.Convert(isHealthy, typeof(string), null, _culture);

        // Assert
        Assert.Equal(expected, result);
    }

    [Theory]
    [InlineData("connected", "✅")]
    [InlineData("healthy", "✅")]
    [InlineData("ready", "✅")]
    [InlineData("setup required", "⚙️")]
    [InlineData("authentication required", "🔐")]
    [InlineData("oauth setup required", "🔗")]
    [InlineData("api key required", "🔑")]
    [InlineData("api key invalid", "❌")]
    [InlineData("connection failed", "❌")]
    [InlineData("error", "❌")]
    [InlineData("loading", "⏳")]
    [InlineData("connecting", "🔄")]
    [InlineData("testing", "🧪")]
    [InlineData("unknown", "❓")]
    public void Convert_WithStringStatus_ShouldReturnCorrectIcon(string status, string expected)
    {
        // Act
        var result = _converter.Convert(status, typeof(string), null, _culture);

        // Assert
        Assert.Equal(expected, result);
    }

    [Fact]
    public void Convert_WithProviderStatus_ShouldReturnCorrectIcon()
    {
        // Arrange
        var healthyStatus = new ProviderStatus
        {
            Name = "Test",
            IsHealthy = true,
            Status = "Connected",
            RequiresSetup = false,
            IsInitialized = true
        };
        var setupRequiredStatus = new ProviderStatus
        {
            Name = "Test",
            IsHealthy = false,
            RequiresSetup = true,
            IsInitialized = false,
            Status = "OAuth Setup Required"
        };
        var errorStatus = new ProviderStatus
        {
            Name = "Test",
            IsHealthy = false,
            Status = "Error",
            RequiresSetup = false,
            IsInitialized = true
        };

        // Act
        var healthyResult = _converter.Convert(healthyStatus, typeof(string), null, _culture);
        var setupResult = _converter.Convert(setupRequiredStatus, typeof(string), null, _culture);
        var errorResult = _converter.Convert(errorStatus, typeof(string), null, _culture);

        // Assert
        Assert.Equal("✅", healthyResult);
        Assert.Equal("🔗", setupResult);
        Assert.Equal("❌", errorResult);
    }

    [Fact]
    public void ConvertBack_ShouldThrowNotSupportedException()
    {
        // Act & Assert
        Assert.Throws<NotSupportedException>(() =>
            _converter.ConvertBack("✅", typeof(bool), null, _culture));
    }
}

public class ProviderStatusToButtonTextConverterTests
{
    private readonly ProviderStatusToButtonTextConverter _converter = new();
    private readonly CultureInfo _culture = CultureInfo.InvariantCulture;

    [Theory]
    [InlineData("oauth setup required", "Setup OAuth")]
    [InlineData("api key required", "Enter API Key")]
    [InlineData("authentication required", "Sign In")]
    [InlineData("api key invalid", "Fix API Key")]
    [InlineData("connection failed", "Reconnect")]
    [InlineData("setup required", "Setup")]
    [InlineData("connected", "Reconfigure")]
    [InlineData("healthy", "Reconfigure")]
    [InlineData("ready", "Reconfigure")]
    [InlineData("unknown", "Configure")]
    public void Convert_WithStringStatus_ShouldReturnCorrectButtonText(string status, string expected)
    {
        // Act
        var result = _converter.Convert(status, typeof(string), null, _culture);

        // Assert
        Assert.Equal(expected, result);
    }

    [Fact]
    public void Convert_WithProviderStatus_ShouldReturnCorrectButtonText()
    {
        // Arrange
        var healthyStatus = new ProviderStatus
        {
            Name = "Test",
            IsHealthy = true,
            IsInitialized = true,
            RequiresSetup = false,
            Status = "Connected"
        };

        var setupRequiredStatus = new ProviderStatus
        {
            Name = "Test",
            IsHealthy = false,
            RequiresSetup = true,
            IsInitialized = false,
            Status = "OAuth Setup Required"
        };

        var errorStatus = new ProviderStatus
        {
            Name = "Test",
            IsHealthy = false,
            IsInitialized = true,
            RequiresSetup = false,
            Status = "Connection Failed"
        };

        // Act
        var healthyResult = _converter.Convert(healthyStatus, typeof(string), null, _culture);
        var setupResult = _converter.Convert(setupRequiredStatus, typeof(string), null, _culture);
        var errorResult = _converter.Convert(errorStatus, typeof(string), null, _culture);

        // Assert
        Assert.Equal("Reconfigure", healthyResult);
        Assert.Equal("Setup OAuth", setupResult);
        Assert.Equal("Reconnect", errorResult);
    }

    [Fact]
    public void ConvertBack_ShouldThrowNotSupportedException()
    {
        // Act & Assert
        Assert.Throws<NotSupportedException>(() =>
            _converter.ConvertBack("Setup OAuth", typeof(ProviderStatus), null, _culture));
    }
}

public class BoolToVisibilityConverterTests
{
    private readonly BoolToVisibilityConverter _converter = new();
    private readonly CultureInfo _culture = CultureInfo.InvariantCulture;

    [Theory]
    [InlineData(true, true)]
    [InlineData(false, false)]
    public void Convert_WithBoolValue_ShouldReturnSameValue(bool input, bool expected)
    {
        // Act
        var result = _converter.Convert(input, typeof(bool), null, _culture);

        // Assert
        Assert.Equal(expected, result);
    }

    [Theory]
    [InlineData(true, false)]
    [InlineData(false, true)]
    public void Convert_WithInvertParameter_ShouldReturnInvertedValue(bool input, bool expected)
    {
        // Act
        var result = _converter.Convert(input, typeof(bool), "invert", _culture);

        // Assert
        Assert.Equal(expected, result);
    }

    [Fact]
    public void Convert_WithNonBoolValue_ShouldReturnFalse()
    {
        // Act
        var result = _converter.Convert("not a bool", typeof(bool), null, _culture);

        // Assert
        Assert.Equal(false, result);
    }

    [Theory]
    [InlineData(true, true)]
    [InlineData(false, false)]
    public void ConvertBack_WithBoolValue_ShouldReturnSameValue(bool input, bool expected)
    {
        // Act
        var result = _converter.ConvertBack(input, typeof(bool), null, _culture);

        // Assert
        Assert.Equal(expected, result);
    }

    [Theory]
    [InlineData(true, false)]
    [InlineData(false, true)]
    public void ConvertBack_WithInvertParameter_ShouldReturnInvertedValue(bool input, bool expected)
    {
        // Act
        var result = _converter.ConvertBack(input, typeof(bool), "invert", _culture);

        // Assert
        Assert.Equal(expected, result);
    }
}

public class SetupComplexityToTextConverterTests
{
    private readonly SetupComplexityToTextConverter _converter = new();
    private readonly CultureInfo _culture = CultureInfo.InvariantCulture;

    [Theory]
    [InlineData(SetupComplexity.Simple, "Quick setup")]
    [InlineData(SetupComplexity.Moderate, "Moderate setup")]
    [InlineData(SetupComplexity.Complex, "Advanced setup")]
    public void Convert_WithSetupComplexity_ShouldReturnCorrectText(SetupComplexity complexity, string expected)
    {
        // Act
        var result = _converter.Convert(complexity, typeof(string), null, _culture);

        // Assert
        Assert.Equal(expected, result);
    }

    [Fact]
    public void Convert_WithNonSetupComplexityValue_ShouldReturnDefault()
    {
        // Act
        var result = _converter.Convert("not a complexity", typeof(string), null, _culture);

        // Assert
        Assert.Equal("Setup required", result);
    }

    [Fact]
    public void ConvertBack_ShouldThrowNotSupportedException()
    {
        // Act & Assert
        Assert.Throws<NotSupportedException>(() =>
            _converter.ConvertBack("Quick setup", typeof(SetupComplexity), null, _culture));
    }
}

public class SetupTimeToTextConverterTests
{
    private readonly SetupTimeToTextConverter _converter = new();
    private readonly CultureInfo _culture = CultureInfo.InvariantCulture;

    [Theory]
    [InlineData(0, "Automatic")]
    [InlineData(1, "1 minute")]
    [InlineData(3, "3 minutes")]
    [InlineData(5, "5 minutes")]
    [InlineData(8, "5-10 minutes")]
    [InlineData(10, "5-10 minutes")]
    [InlineData(15, "10+ minutes")]
    [InlineData(30, "10+ minutes")]
    public void Convert_WithIntMinutes_ShouldReturnCorrectText(int minutes, string expected)
    {
        // Act
        var result = _converter.Convert(minutes, typeof(string), null, _culture);

        // Assert
        Assert.Equal(expected, result);
    }

    [Fact]
    public void Convert_WithNonIntValue_ShouldReturnDefault()
    {
        // Act
        var result = _converter.Convert("not an int", typeof(string), null, _culture);

        // Assert
        Assert.Equal("Setup time varies", result);
    }

    [Fact]
    public void ConvertBack_ShouldThrowNotSupportedException()
    {
        // Act & Assert
        Assert.Throws<NotSupportedException>(() =>
            _converter.ConvertBack("5 minutes", typeof(int), null, _culture));
    }
}