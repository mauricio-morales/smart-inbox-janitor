using System;
using System.Runtime.InteropServices;
using Xunit;

namespace TrashMailPanda.Tests.Attributes;

/// <summary>
/// Custom xUnit fact attribute that only runs tests on specific platforms
/// </summary>
public class PlatformSpecificFactAttribute : FactAttribute
{
    public PlatformSpecificFactAttribute(params OSPlatform[] platforms)
    {
        var currentPlatform = GetCurrentPlatform();
        var isSupported = false;

        foreach (var platform in platforms)
        {
            if (RuntimeInformation.IsOSPlatform(platform))
            {
                isSupported = true;
                break;
            }
        }

        if (!isSupported)
        {
            Skip = $"Test only runs on: {string.Join(", ", platforms)}. Current platform: {currentPlatform}";
        }
    }

    private static string GetCurrentPlatform()
    {
        if (RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
            return "Windows";
        if (RuntimeInformation.IsOSPlatform(OSPlatform.OSX))
            return "macOS";
        if (RuntimeInformation.IsOSPlatform(OSPlatform.Linux))
            return "Linux";
        return "Unknown";
    }
}