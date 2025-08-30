using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;

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

/// <summary>
/// Default implementation of security audit logger
/// </summary>
public class SecurityAuditLogger : ISecurityAuditLogger
{
    private readonly ILogger<SecurityAuditLogger> _logger;
    private readonly List<AuditLogEntry> _auditLog; // In-memory storage for now
    private readonly object _logLock = new();

    public SecurityAuditLogger(ILogger<SecurityAuditLogger> logger)
    {
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _auditLog = new List<AuditLogEntry>();
    }

    public Task LogCredentialOperationAsync(CredentialOperationEvent operationEvent)
    {
        var entry = new AuditLogEntry
        {
            Id = Guid.NewGuid(),
            Timestamp = DateTime.UtcNow,
            EventType = "CredentialOperation",
            Operation = operationEvent.Operation,
            CredentialKey = MaskCredentialKey(operationEvent.CredentialKey),
            Success = operationEvent.Success,
            ErrorMessage = operationEvent.ErrorMessage,
            UserContext = operationEvent.UserContext,
            ApplicationVersion = operationEvent.ApplicationVersion,
            Platform = operationEvent.Platform,
            SessionId = operationEvent.SessionId
        };

        lock (_logLock)
        {
            _auditLog.Add(entry);
        }

        // Log to application logger based on severity
        if (operationEvent.Success)
        {
            _logger.LogInformation("Credential operation: {Operation} for key {Key} succeeded", 
                operationEvent.Operation, entry.CredentialKey);
        }
        else
        {
            _logger.LogWarning("Credential operation: {Operation} for key {Key} failed: {Error}", 
                operationEvent.Operation, entry.CredentialKey, operationEvent.ErrorMessage);
        }

        return Task.CompletedTask;
    }

    public Task LogSecurityEventAsync(SecurityEvent securityEvent)
    {
        var entry = new AuditLogEntry
        {
            Id = Guid.NewGuid(),
            Timestamp = DateTime.UtcNow,
            EventType = "SecurityEvent",
            Operation = securityEvent.EventType.ToString(),
            Success = securityEvent.Success,
            ErrorMessage = securityEvent.Description,
            UserContext = securityEvent.UserContext,
            ApplicationVersion = securityEvent.ApplicationVersion,
            Platform = securityEvent.Platform,
            SessionId = securityEvent.SessionId,
            AdditionalData = securityEvent.AdditionalData
        };

        lock (_logLock)
        {
            _auditLog.Add(entry);
        }

        // Log to application logger with appropriate severity
        var logLevel = securityEvent.Severity switch
        {
            SecurityEventSeverity.Critical => LogLevel.Critical,
            SecurityEventSeverity.High => LogLevel.Error,
            SecurityEventSeverity.Medium => LogLevel.Warning,
            SecurityEventSeverity.Low => LogLevel.Information,
            _ => LogLevel.Information
        };

        _logger.Log(logLevel, "Security event: {EventType} - {Description}", 
            securityEvent.EventType, securityEvent.Description);

        return Task.CompletedTask;
    }

    public Task<IReadOnlyList<AuditLogEntry>> GetAuditTrailAsync(DateTime from, DateTime to)
    {
        lock (_logLock)
        {
            var result = _auditLog
                .Where(entry => entry.Timestamp >= from && entry.Timestamp <= to)
                .OrderByDescending(entry => entry.Timestamp)
                .ToList()
                .AsReadOnly();
            
            return Task.FromResult<IReadOnlyList<AuditLogEntry>>(result);
        }
    }

    public Task<SecurityEventsSummary> GetSecuritySummaryAsync(TimeSpan period)
    {
        var from = DateTime.UtcNow - period;
        var to = DateTime.UtcNow;

        lock (_logLock)
        {
            var events = _auditLog.Where(entry => entry.Timestamp >= from && entry.Timestamp <= to).ToList();

            var summary = new SecurityEventsSummary
            {
                Period = period,
                TotalEvents = events.Count,
                SuccessfulOperations = events.Count(e => e.Success),
                FailedOperations = events.Count(e => !e.Success),
                CredentialOperations = events.Count(e => e.EventType == "CredentialOperation"),
                SecurityEvents = events.Count(e => e.EventType == "SecurityEvent"),
                MostCommonOperations = events
                    .GroupBy(e => e.Operation)
                    .OrderByDescending(g => g.Count())
                    .Take(5)
                    .ToDictionary(g => g.Key, g => g.Count()),
                RecentFailures = events
                    .Where(e => !e.Success)
                    .OrderByDescending(e => e.Timestamp)
                    .Take(10)
                    .ToList()
                    .AsReadOnly()
            };

            return Task.FromResult(summary);
        }
    }

    private static string MaskCredentialKey(string key)
    {
        if (string.IsNullOrEmpty(key) || key.Length <= 6)
        {
            return "***";
        }
        
        return key.Length <= 10 
            ? $"{key[..3]}***{key[^2..]}" 
            : $"{key[..4]}***{key[^3..]}";
    }
}

/// <summary>
/// Event data for credential operations
/// </summary>
public class CredentialOperationEvent
{
    public required string Operation { get; init; } // Store, Retrieve, Remove, etc.
    public required string CredentialKey { get; init; }
    public bool Success { get; init; }
    public string? ErrorMessage { get; init; }
    public string? UserContext { get; init; }
    public string? ApplicationVersion { get; init; }
    public string? Platform { get; init; }
    public string? SessionId { get; init; }
}

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

/// <summary>
/// Types of security events
/// </summary>
public enum SecurityEventType
{
    AuthenticationFailure,
    UnauthorizedAccess,
    KeychainAccessDenied,
    EncryptionFailure,
    DecryptionFailure,
    SuspiciousActivity,
    ConfigurationChange,
    SystemHealthCheck,
    TokenRotation,
    DataBreach
}

/// <summary>
/// Severity levels for security events
/// </summary>
public enum SecurityEventSeverity
{
    Low,
    Medium,
    High,
    Critical
}

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