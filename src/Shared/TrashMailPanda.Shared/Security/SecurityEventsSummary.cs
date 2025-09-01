using System;
using System.Collections.Generic;

namespace TrashMailPanda.Shared.Security;

/// <summary>
/// Summary of security events over a time period
/// </summary>
public class SecurityEventsSummary
{
    public TimeSpan Period { get; init; }
    public int TotalEvents { get; init; }
    public int SuccessfulOperations { get; init; }
    public int FailedOperations { get; init; }
    public int CredentialOperations { get; init; }
    public int SecurityEvents { get; init; }
    public Dictionary<string, int> MostCommonOperations { get; init; } = new();
    public IReadOnlyList<AuditLogEntry> RecentFailures { get; init; } = new List<AuditLogEntry>();
}