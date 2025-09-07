using System;
using System.Runtime.InteropServices;

namespace TrashMailPanda.Tests.Utilities;

/// <summary>
/// Helper utilities for platform-specific testing
/// </summary>
public static class PlatformTestHelper
{
    /// <summary>
    /// Gets the current platform as a string
    /// </summary>
    public static string GetCurrentPlatform()
    {
        if (RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
            return "Windows";
        if (RuntimeInformation.IsOSPlatform(OSPlatform.OSX))
            return "macOS";
        if (RuntimeInformation.IsOSPlatform(OSPlatform.Linux))
            return "Linux";
        return "Unknown";
    }

    /// <summary>
    /// Checks if the current platform matches any of the specified platforms
    /// </summary>
    public static bool IsCurrentPlatform(params OSPlatform[] platforms)
    {
        foreach (var platform in platforms)
        {
            if (RuntimeInformation.IsOSPlatform(platform))
                return true;
        }
        return false;
    }

    /// <summary>
    /// Checks if Windows DPAPI is available and functional
    /// </summary>
    public static bool IsWindowsDpapiAvailable()
    {
        return RuntimeInformation.IsOSPlatform(OSPlatform.Windows) && OperatingSystem.IsWindows();
    }

    /// <summary>
    /// Checks if macOS Keychain Services are available
    /// </summary>
    public static bool IsMacOSKeychainAvailable()
    {
        return RuntimeInformation.IsOSPlatform(OSPlatform.OSX) && OperatingSystem.IsMacOS();
    }

    /// <summary>
    /// Checks if Linux libsecret is available (basic check)
    /// </summary>
    public static bool IsLinuxLibSecretAvailable()
    {
        return RuntimeInformation.IsOSPlatform(OSPlatform.Linux) && OperatingSystem.IsLinux();
    }

    /// <summary>
    /// Gets a platform-specific test timeout in milliseconds
    /// Different platforms may have different performance characteristics
    /// </summary>
    public static int GetPlatformSpecificTimeout()
    {
        return GetCurrentPlatform() switch
        {
            "Windows" => 30000,  // 30 seconds - DPAPI is typically fast
            "macOS" => 60000,    // 60 seconds - Keychain may require user interaction
            "Linux" => 45000,    // 45 seconds - libsecret varies by distribution
            _ => 30000           // Default timeout
        };
    }

    /// <summary>
    /// Gets the expected encryption method name for the current platform
    /// </summary>
    public static string GetExpectedEncryptionMethod()
    {
        return GetCurrentPlatform() switch
        {
            "Windows" => "DPAPI",
            "macOS" => "Keychain Services", 
            "Linux" => "libsecret",
            _ => "Unknown"
        };
    }

    /// <summary>
    /// Determines if the platform requires elevated permissions for keychain operations
    /// </summary>
    public static bool RequiresElevatedPermissions()
    {
        return GetCurrentPlatform() switch
        {
            "macOS" => true,  // May require keychain unlock
            "Linux" => true,  // May require gnome-keyring unlock
            "Windows" => false, // DPAPI uses current user context
            _ => false
        };
    }
}