using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace TransMailPanda.Shared.Security;

/// <summary>
/// Security audit logger for credential operations and security events
/// Provides comprehensive logging for compliance and monitoring
/// </summary>
public interface ISecurityAuditLogger
{
    /// <summary>
    /// Log a credential operation (store, retrieve, remove)
    /// </summary>
    Task LogCredentialOperationAsync(CredentialOperationEvent operationEvent);

    /// <summary>
    /// Log a security event (failed authentication, unauthorized access, etc.)
    /// </summary>
    Task LogSecurityEventAsync(SecurityEvent securityEvent);

    /// <summary>
    /// Get audit trail for a specific time period
    /// </summary>
    Task<IReadOnlyList<AuditLogEntry>> GetAuditTrailAsync(DateTime from, DateTime to);

    /// <summary>
    /// Get security events summary for monitoring
    /// </summary>
    Task<SecurityEventsSummary> GetSecuritySummaryAsync(TimeSpan period);
}

