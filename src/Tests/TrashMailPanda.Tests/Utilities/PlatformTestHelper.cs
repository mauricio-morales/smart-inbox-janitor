using System;
using System.Runtime.InteropServices;
using TrashMailPanda.Shared.Platform;

namespace TrashMailPanda.Tests.Utilities;

/// <summary>
/// Helper utilities for platform-specific testing
/// Uses the centralized platform detection system from TrashMailPanda.Shared.Platform
/// </summary>
public static class PlatformTestHelper
{
    /// <summary>
    /// Gets the current platform as a string
    /// </summary>
    [Obsolete("Use PlatformInfo.CurrentDisplayName instead")]
    public static string GetCurrentPlatform() => PlatformInfo.CurrentDisplayName;

    /// <summary>
    /// Checks if the current platform matches any of the specified platforms
    /// </summary>
    [Obsolete("Use PlatformInfo.IsOneOf instead")]
    public static bool IsCurrentPlatform(params OSPlatform[] platforms)
    {
        var supportedPlatforms = new SupportedPlatform[platforms.Length];
        for (int i = 0; i < platforms.Length; i++)
        {
            supportedPlatforms[i] = PlatformInfo.FromOSPlatform(platforms[i]);
        }
        return PlatformInfo.IsOneOf(supportedPlatforms);
    }

    /// <summary>
    /// Checks if Windows DPAPI is available and functional
    /// </summary>
    public static bool IsWindowsDpapiAvailable() => PlatformInfo.IsWindowsDpapiAvailable;

    /// <summary>
    /// Checks if macOS Keychain Services are available
    /// </summary>
    public static bool IsMacOSKeychainAvailable() => PlatformInfo.IsMacOSKeychainAvailable;

    /// <summary>
    /// Checks if Linux libsecret is available (basic check)
    /// </summary>
    public static bool IsLinuxLibSecretAvailable() => PlatformInfo.IsLinuxLibSecretAvailable;

    /// <summary>
    /// Gets a platform-specific test timeout in milliseconds
    /// Different platforms may have different performance characteristics
    /// </summary>
    public static int GetPlatformSpecificTimeout()
    {
        return PlatformInfo.Current switch
        {
            SupportedPlatform.Windows => 30000,  // 30 seconds - DPAPI is typically fast
            SupportedPlatform.MacOS => 60000,    // 60 seconds - Keychain may require user interaction
            SupportedPlatform.Linux => 45000,    // 45 seconds - libsecret varies by distribution
            _ => 30000                           // Default timeout
        };
    }

    /// <summary>
    /// Gets the expected encryption method name for the current platform
    /// </summary>
    public static string GetExpectedEncryptionMethod()
    {
        return PlatformInfo.Current switch
        {
            SupportedPlatform.Windows => "DPAPI",
            SupportedPlatform.MacOS => "Keychain Services",
            SupportedPlatform.Linux => "libsecret",
            _ => "Unknown"
        };
    }

    /// <summary>
    /// Determines if the platform requires elevated permissions for keychain operations
    /// </summary>
    public static bool RequiresElevatedPermissions()
    {
        return PlatformInfo.Current switch
        {
            SupportedPlatform.MacOS => true,  // May require keychain unlock
            SupportedPlatform.Linux => true,  // May require gnome-keyring unlock
            SupportedPlatform.Windows => false, // DPAPI uses current user context
            _ => false
        };
    }
}