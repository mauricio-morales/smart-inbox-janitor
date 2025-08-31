using System;
using System.Collections.Generic;

namespace TransMailPanda.Shared.Security;

/// <summary>
/// Health check result for encryption system
/// </summary>
public record EncryptionHealthCheckResult
{
    public bool IsHealthy { get; init; }
    public string Status { get; init; } = string.Empty;
    public bool CanEncrypt { get; init; }
    public bool CanDecrypt { get; init; }
    public bool KeyGenerationWorks { get; init; }
    public string Platform { get; init; } = string.Empty;
    public DateTime CheckTimestamp { get; init; } = DateTime.UtcNow;
    public List<string> Issues { get; init; } = new();
}