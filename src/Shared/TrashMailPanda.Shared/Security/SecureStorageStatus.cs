using System;
using System.Collections.Generic;

namespace TrashMailPanda.Shared.Security;

/// <summary>
/// Current status of secure storage system
/// </summary>
public class SecureStorageStatus
{
    public bool IsInitialized { get; init; }
    public bool IsKeychainAvailable { get; init; }
    public string Platform { get; init; } = string.Empty;
    public int StoredCredentialCount { get; init; }
    public DateTime? LastHealthCheck { get; init; }
    public List<string> SupportedOperations { get; init; } = new();
}