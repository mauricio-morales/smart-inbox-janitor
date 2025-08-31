using System;
using System.Collections.Generic;

namespace TransMailPanda.Shared.Security;

/// <summary>
/// Audit log entry structure
/// </summary>
public class AuditLogEntry
{
    public Guid Id { get; init; }
    public DateTime Timestamp { get; init; }
    public string EventType { get; init; } = string.Empty;
    public string Operation { get; init; } = string.Empty;
    public string? CredentialKey { get; init; }
    public bool Success { get; init; }
    public string? ErrorMessage { get; init; }
    public string? UserContext { get; init; }
    public string? ApplicationVersion { get; init; }
    public string? Platform { get; init; }
    public string? SessionId { get; init; }
    public Dictionary<string, object>? AdditionalData { get; init; }
}