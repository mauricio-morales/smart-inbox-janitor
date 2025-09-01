using System;
using System.Collections.Generic;

namespace TrashMailPanda.Shared.Security;

/// <summary>
/// Current status of encryption system
/// </summary>
public class EncryptionStatus
{
    public bool IsInitialized { get; init; }
    public string EncryptionMethod { get; init; } = string.Empty;
    public string Platform { get; init; } = string.Empty;
    public bool HasMasterKey { get; init; }
    public DateTime? LastHealthCheck { get; init; }
    public List<string> SupportedFeatures { get; init; } = new();
}