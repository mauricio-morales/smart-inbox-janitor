using System.Collections.Generic;

namespace TransMailPanda.Shared.Security;

/// <summary>
/// Event data for security events
/// </summary>
public class SecurityEvent
{
    public required SecurityEventType EventType { get; init; }
    public required string Description { get; init; }
    public bool Success { get; init; }
    public SecurityEventSeverity Severity { get; init; } = SecurityEventSeverity.Medium;
    public string? UserContext { get; init; }
    public string? ApplicationVersion { get; init; }
    public string? Platform { get; init; }
    public string? SessionId { get; init; }
    public Dictionary<string, object>? AdditionalData { get; init; }
}