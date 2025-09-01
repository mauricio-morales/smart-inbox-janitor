using Microsoft.Extensions.Logging;

namespace TrashMailPanda.Shared.Security;

/// <summary>
/// Concrete implementation of security audit logger
/// Type alias for SecurityAuditLoggerImpl to maintain compatibility with existing code
/// </summary>
public class SecurityAuditLogger : SecurityAuditLoggerImpl
{
    /// <summary>
    /// Initializes a new instance of the SecurityAuditLogger class
    /// </summary>
    /// <param name="logger">Logger for the audit logger</param>
    public SecurityAuditLogger(ILogger<SecurityAuditLogger> logger) : base(logger)
    {
    }
}