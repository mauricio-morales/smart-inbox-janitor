using System;
using System.Collections.Generic;

namespace TrashMailPanda.Shared.Security;

/// <summary>
/// Health check result for secure storage system
/// </summary>
public record SecureStorageHealthCheckResult
{
    public bool IsHealthy { get; init; }
    public string Status { get; init; } = string.Empty;
    public Dictionary<string, object> Details { get; init; } = new();
    public List<string> Issues { get; init; } = new();
    public DateTime CheckTimestamp { get; init; } = DateTime.UtcNow;
}