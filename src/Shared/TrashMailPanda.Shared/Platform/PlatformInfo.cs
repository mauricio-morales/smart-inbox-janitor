using System;
using System.Runtime.InteropServices;

namespace TrashMailPanda.Shared.Platform;

/// <summary>
/// Centralized platform detection and information utility
/// Replaces scattered platform detection logic throughout the codebase
/// </summary>
public static class PlatformInfo
{
    private static SupportedPlatform? _currentPlatform;

    /// <summary>
    /// Gets the current platform the application is running on
    /// </summary>
    public static SupportedPlatform Current
    {
        get
        {
            _currentPlatform ??= DetectCurrentPlatform();
            return _currentPlatform.Value;
        }
    }

    /// <summary>
    /// Gets the current platform as a user-friendly display name
    /// </summary>
    public static string CurrentDisplayName => Current switch
    {
        SupportedPlatform.Windows => "Windows",
        SupportedPlatform.MacOS => "macOS",
        SupportedPlatform.Linux => "Linux",
        SupportedPlatform.Unknown => "Unknown",
        _ => "Unknown"
    };

    /// <summary>
    /// Checks if the current platform matches the specified platform
    /// </summary>
    /// <param name="platform">The platform to check against</param>
    /// <returns>True if the current platform matches, false otherwise</returns>
    public static bool Is(SupportedPlatform platform) => Current == platform;

    /// <summary>
    /// Checks if the current platform is one of the specified platforms
    /// </summary>
    /// <param name="platforms">The platforms to check against</param>
    /// <returns>True if the current platform matches any of the specified platforms, false otherwise</returns>
    public static bool IsOneOf(params SupportedPlatform[] platforms)
    {
        var current = Current;
        foreach (var platform in platforms)
        {
            if (current == platform)
                return true;
        }
        return false;
    }

    /// <summary>
    /// Checks if Windows DPAPI is available on the current platform
    /// </summary>
    public static bool IsWindowsDpapiAvailable => 
        Is(SupportedPlatform.Windows) && OperatingSystem.IsWindows();

    /// <summary>
    /// Checks if macOS Keychain Services are available on the current platform
    /// </summary>
    public static bool IsMacOSKeychainAvailable => 
        Is(SupportedPlatform.MacOS) && OperatingSystem.IsMacOS();

    /// <summary>
    /// Checks if Linux libsecret is available on the current platform
    /// </summary>
    public static bool IsLinuxLibSecretAvailable => 
        Is(SupportedPlatform.Linux) && OperatingSystem.IsLinux();

    /// <summary>
    /// Converts an OSPlatform to our SupportedPlatform enum
    /// </summary>
    /// <param name="osPlatform">The OSPlatform to convert</param>
    /// <returns>The corresponding SupportedPlatform value</returns>
    public static SupportedPlatform FromOSPlatform(OSPlatform osPlatform)
    {
        if (osPlatform == OSPlatform.Windows)
            return SupportedPlatform.Windows;
        if (osPlatform == OSPlatform.OSX)
            return SupportedPlatform.MacOS;
        if (osPlatform == OSPlatform.Linux)
            return SupportedPlatform.Linux;
        
        return SupportedPlatform.Unknown;
    }

    /// <summary>
    /// Converts a SupportedPlatform to the corresponding OSPlatform
    /// </summary>
    /// <param name="supportedPlatform">The SupportedPlatform to convert</param>
    /// <returns>The corresponding OSPlatform, or null for Unknown platforms</returns>
    public static OSPlatform? ToOSPlatform(SupportedPlatform supportedPlatform) => supportedPlatform switch
    {
        SupportedPlatform.Windows => OSPlatform.Windows,
        SupportedPlatform.MacOS => OSPlatform.OSX,
        SupportedPlatform.Linux => OSPlatform.Linux,
        _ => null
    };

    /// <summary>
    /// Checks if the current platform matches the specified OSPlatform
    /// </summary>
    /// <param name="osPlatform">The OSPlatform to check against</param>
    /// <returns>True if the platforms match, false otherwise</returns>
    public static bool Matches(OSPlatform osPlatform) => Current == FromOSPlatform(osPlatform);

    /// <summary>
    /// Gets platform-specific credential storage information
    /// </summary>
    /// <returns>A description of the credential storage mechanism for the current platform</returns>
    public static string GetCredentialStorageDescription() => Current switch
    {
        SupportedPlatform.Windows => "Windows DPAPI (Data Protection API)",
        SupportedPlatform.MacOS => "macOS Keychain Services",
        SupportedPlatform.Linux => "Linux libsecret",
        _ => "Unknown credential storage"
    };

    /// <summary>
    /// Gets platform-specific secure storage capabilities
    /// </summary>
    /// <returns>True if the platform supports secure credential storage, false otherwise</returns>
    public static bool HasSecureCredentialStorage() => Current switch
    {
        SupportedPlatform.Windows => OperatingSystem.IsWindows(),
        SupportedPlatform.MacOS => OperatingSystem.IsMacOS(),
        SupportedPlatform.Linux => OperatingSystem.IsLinux(),
        _ => false
    };

    /// <summary>
    /// Detects the current platform using RuntimeInformation
    /// </summary>
    /// <returns>The detected platform</returns>
    private static SupportedPlatform DetectCurrentPlatform()
    {
        if (RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
            return SupportedPlatform.Windows;
        if (RuntimeInformation.IsOSPlatform(OSPlatform.OSX))
            return SupportedPlatform.MacOS;
        if (RuntimeInformation.IsOSPlatform(OSPlatform.Linux))
            return SupportedPlatform.Linux;
        
        return SupportedPlatform.Unknown;
    }

    /// <summary>
    /// Resets the cached current platform (useful for testing)
    /// </summary>
    internal static void ResetCache()
    {
        _currentPlatform = null;
    }
}