using System;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;
using TrashMailPanda.Shared.Platform;

namespace TrashMailPanda.Shared.Utils;

/// <summary>
/// Linux libsecret P/Invoke wrapper for secure credential storage
/// Provides access to GNOME Keyring through libsecret
/// </summary>
[System.Runtime.Versioning.SupportedOSPlatform("linux")]
public static class LinuxSecretHelper
{
    private const string LibSecretLibrary = "libsecret-1.so.0";
    private const string TrashMailPandaSchemaName = "com.trashmailpanda.credentials";

    /// <summary>
    /// Check if libsecret is available on the system
    /// </summary>
    public static bool IsLibSecretAvailable()
    {
        if (!PlatformInfo.Is(SupportedPlatform.Linux))
            return false;

        try
        {
            // Try to load libsecret library
            var handle = dlopen(LibSecretLibrary, RTLD_LAZY);
            if (handle != IntPtr.Zero)
            {
                dlclose(handle);
                return true;
            }

            // Also check common installation paths
            var commonPaths = new[]
            {
                "/usr/lib/x86_64-linux-gnu/libsecret-1.so.0",
                "/usr/lib64/libsecret-1.so.0",
                "/usr/lib/libsecret-1.so.0",
                "/lib/x86_64-linux-gnu/libsecret-1.so.0"
            };

            foreach (var path in commonPaths)
            {
                if (File.Exists(path))
                    return true;
            }

            return false;
        }
        catch
        {
            return false;
        }
    }

    /// <summary>
    /// Store a secret in the GNOME keyring
    /// </summary>
    public static bool StoreSecret(string service, string account, string secret)
    {
        if (string.IsNullOrEmpty(service) || string.IsNullOrEmpty(account) || string.IsNullOrEmpty(secret))
            return false;

        try
        {
            if (!IsLibSecretAvailable())
                return false;

            IntPtr schema = GetTrashMailPandaSchema();
            IntPtr error = IntPtr.Zero;
            bool result = secret_password_store_sync(
                schema,
                SECRET_COLLECTION_DEFAULT,
                $"TrashMail Panda - {service}:{account}",
                secret,
                IntPtr.Zero,
                ref error,
                "service", service,
                "account", account,
                IntPtr.Zero
            );

            if (error != IntPtr.Zero)
            {
                g_error_free(error);
                return false;
            }

            return result;
        }
        catch
        {
            return false;
        }
    }

    /// <summary>
    /// Retrieve a secret from the GNOME keyring
    /// </summary>
    public static string? RetrieveSecret(string service, string account)
    {
        if (string.IsNullOrEmpty(service) || string.IsNullOrEmpty(account))
            return null;

        try
        {
            if (!IsLibSecretAvailable())
                return null;

            IntPtr schema = GetTrashMailPandaSchema();
            IntPtr error = IntPtr.Zero;
            IntPtr secretPtr = secret_password_lookup_sync(
                schema,
                IntPtr.Zero,
                ref error,
                "service", service,
                "account", account,
                IntPtr.Zero
            );

            if (error != IntPtr.Zero)
            {
                g_error_free(error);
                return null;
            }

            if (secretPtr == IntPtr.Zero)
                return null;

            string result = Marshal.PtrToStringUTF8(secretPtr) ?? string.Empty;
            secret_password_free(secretPtr);

            return result;
        }
        catch
        {
            return null;
        }
    }

    /// <summary>
    /// Remove a secret from the GNOME keyring
    /// </summary>
    public static bool RemoveSecret(string service, string account)
    {
        if (string.IsNullOrEmpty(service) || string.IsNullOrEmpty(account))
            return false;

        try
        {
            if (!IsLibSecretAvailable())
                return false;

            IntPtr schema = GetTrashMailPandaSchema();
            IntPtr error = IntPtr.Zero;
            bool result = secret_password_clear_sync(
                schema,
                IntPtr.Zero,
                ref error,
                "service", service,
                "account", account,
                IntPtr.Zero
            );

            if (error != IntPtr.Zero)
            {
                g_error_free(error);
                return false;
            }

            return result;
        }
        catch
        {
            return false;
        }
    }

    /// <summary>
    /// Get the TrashMail Panda schema for credential storage
    /// </summary>
    private static IntPtr GetTrashMailPandaSchema()
    {
        // Use NULL schema which allows libsecret to use simple attribute-based storage
        // This is the most compatible approach across different libsecret versions
        return IntPtr.Zero;
    }

    #region P/Invoke Declarations

    // Constants
    private const int RTLD_LAZY = 1;
    private static readonly string SECRET_COLLECTION_DEFAULT = "default"; // Default collection

    // Dynamic library loading
    [DllImport("libdl.so.2", CallingConvention = CallingConvention.Cdecl)]
    private static extern IntPtr dlopen(string filename, int flags);

    [DllImport("libdl.so.2", CallingConvention = CallingConvention.Cdecl)]
    private static extern int dlclose(IntPtr handle);

    // libsecret password storage functions
    [DllImport(LibSecretLibrary, CallingConvention = CallingConvention.Cdecl)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool secret_password_store_sync(
        IntPtr schema,
        string collection,
        string label,
        string password,
        IntPtr cancellable,
        ref IntPtr error,
        string attribute1_name, string attribute1_value,
        string attribute2_name, string attribute2_value,
        IntPtr null_terminator);

    [DllImport(LibSecretLibrary, CallingConvention = CallingConvention.Cdecl)]
    private static extern IntPtr secret_password_lookup_sync(
        IntPtr schema,
        IntPtr cancellable,
        ref IntPtr error,
        string attribute1_name, string attribute1_value,
        string attribute2_name, string attribute2_value,
        IntPtr null_terminator);

    [DllImport(LibSecretLibrary, CallingConvention = CallingConvention.Cdecl)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool secret_password_clear_sync(
        IntPtr schema,
        IntPtr cancellable,
        ref IntPtr error,
        string attribute1_name, string attribute1_value,
        string attribute2_name, string attribute2_value,
        IntPtr null_terminator);

    // GLib error handling and memory management
    [DllImport("libglib-2.0.so.0", CallingConvention = CallingConvention.Cdecl)]
    private static extern void g_error_free(IntPtr error);

    [DllImport(LibSecretLibrary, CallingConvention = CallingConvention.Cdecl)]
    private static extern void secret_password_free(IntPtr password);


    #endregion
}