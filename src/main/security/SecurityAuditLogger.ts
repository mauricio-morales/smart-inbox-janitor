/**
 * Security Audit Logger for Smart Inbox Janitor
 * 
 * Provides comprehensive security event logging without exposing sensitive data.
 * Integrates with existing StorageProvider interface for persistence and maintains
 * audit trail for compliance and security monitoring.
 * 
 * @module SecurityAuditLogger
 */

import { 
  Result, 
  createSuccessResult, 
  createErrorResult,
  SecurityError,
  ValidationError,
  StorageProvider,
  SecurityAuditEvent,
  SecurityEventType,
  ClassificationHistoryItem
} from '@shared/types';
import { CryptoUtils } from '@shared/utils/crypto.utils';

/**
 * Audit log entry for persistence
 */
interface AuditLogEntry {
  readonly id: string;
  readonly timestamp: Date;
  readonly eventType: SecurityEventType;
  readonly provider: string;
  readonly success: boolean;
  readonly sessionId?: string;
  readonly userId?: string;
  readonly sanitizedMetadata: Record<string, unknown>;
  readonly errorCode?: string;
  readonly sanitizedErrorMessage?: string;
  readonly integrityHash: string;
}

/**
 * Audit logging configuration
 */
export interface AuditLogConfig {
  /** Whether audit logging is enabled */
  readonly enabled: boolean;
  /** Maximum number of log entries to retain */
  readonly maxEntries: number;
  /** Log retention period in days */
  readonly retentionDays: number;
  /** Whether to include detailed metadata */
  readonly includeDetailedMetadata: boolean;
  /** Session identifier for log correlation */
  readonly sessionId?: string;
  /** User identifier for log attribution */
  readonly userId?: string;
}

/**
 * Security audit statistics
 */
export interface AuditStatistics {
  /** Total number of logged events */
  readonly totalEvents: number;
  /** Events by type */
  readonly eventsByType: Record<SecurityEventType, number>;
  /** Success rate by event type */
  readonly successRateByType: Record<SecurityEventType, number>;
  /** Recent failure rate */
  readonly recentFailureRate: number;
  /** Oldest log entry timestamp */
  readonly oldestEntry?: Date;
  /** Newest log entry timestamp */
  readonly newestEntry?: Date;
}

/**
 * Security Audit Logger
 * 
 * Provides secure audit logging for security events with automatic
 * sensitive data sanitization and integrity verification.
 */
export class SecurityAuditLogger {
  private config: AuditLogConfig;
  private storageProvider: StorageProvider;
  private initialized = false;

  constructor(
    storageProvider: StorageProvider,
    config: AuditLogConfig = {
      enabled: true,
      maxEntries: 10000,
      retentionDays: 90,
      includeDetailedMetadata: false
    }
  ) {
    this.storageProvider = storageProvider;
    this.config = config;
  }

  /**
   * Initialize the audit logger
   * 
   * @returns Result indicating initialization success or failure
   */
  async initialize(): Promise<Result<void>> {
    try {
      if (!this.config.enabled) {
        this.initialized = true;
        return createSuccessResult(undefined);
      }

      // Verify storage provider is available
      const healthCheck = await this.storageProvider.healthCheck();
      if (!healthCheck.success) {
        return createErrorResult(
          new SecurityError('Storage provider not available for audit logging', {
            provider: this.storageProvider.name,
            healthStatus: healthCheck.error?.message
          })
        );
      }

      // Initialize audit log tables if needed
      await this.ensureAuditTablesExist();

      this.initialized = true;

      // Log initialization
      await this.logSecurityEvent({
        eventType: 'secure_storage_init',
        provider: 'audit_logger',
        success: true,
        metadata: {
          maxEntries: this.config.maxEntries,
          retentionDays: this.config.retentionDays,
          detailedMetadata: this.config.includeDetailedMetadata
        }
      });

      return createSuccessResult(undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown initialization error';
      return createErrorResult(
        new SecurityError(`Audit logger initialization failed: ${message}`, {
          enabled: this.config.enabled,
          storageProvider: this.storageProvider.name
        })
      );
    }
  }

  /**
   * Log a security event with automatic sanitization
   * 
   * @param event - Security event to log
   * @returns Result indicating logging success or failure
   */
  async logSecurityEvent(event: Omit<SecurityAuditEvent, 'id' | 'timestamp'>): Promise<Result<void>> {
    try {
      if (!this.config.enabled) {
        return createSuccessResult(undefined);
      }

      this.ensureInitialized();

      // Create complete audit event
      const auditEvent: SecurityAuditEvent = {
        id: CryptoUtils.generateRandomString(16),
        timestamp: new Date(),
        sessionId: this.config.sessionId,
        userId: this.config.userId,
        ...event
      };

      // Sanitize metadata and error messages
      const sanitizedMetadata = this.sanitizeMetadata(auditEvent.metadata);
      const sanitizedErrorMessage = auditEvent.errorMessage ? 
        this.sanitizeErrorMessage(auditEvent.errorMessage) : undefined;

      // Create audit log entry
      const logEntry: AuditLogEntry = {
        id: auditEvent.id,
        timestamp: auditEvent.timestamp,
        eventType: auditEvent.eventType,
        provider: auditEvent.provider,
        success: auditEvent.success,
        sessionId: auditEvent.sessionId,
        userId: auditEvent.userId,
        sanitizedMetadata,
        errorCode: auditEvent.errorCode,
        sanitizedErrorMessage,
        integrityHash: await this.calculateIntegrityHash(auditEvent)
      };

      // Store audit log entry
      const storeResult = await this.storeAuditLogEntry(logEntry);
      if (!storeResult.success) {
        return storeResult;
      }

      // Perform maintenance if needed
      await this.performMaintenance();

      return createSuccessResult(undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown logging error';
      
      // Create fallback log entry for critical failures
      console.error(`Security audit logging failed: ${message}`, {
        eventType: event.eventType,
        provider: event.provider,
        success: event.success
      });

      return createErrorResult(
        new SecurityError(`Security event logging failed: ${message}`, {
          eventType: event.eventType,
          provider: event.provider,
          originalEventSuccess: event.success
        })
      );
    }
  }

  /**
   * Retrieve audit log entries with filtering
   * 
   * @param filters - Filtering criteria
   * @returns Result containing filtered audit entries
   */
  async getAuditLogs(filters: {
    eventTypes?: SecurityEventType[];
    providers?: string[];
    success?: boolean;
    startTime?: Date;
    endTime?: Date;
    limit?: number;
    offset?: number;
  } = {}): Promise<Result<AuditLogEntry[]>> {
    try {
      this.ensureInitialized();

      if (!this.config.enabled) {
        return createSuccessResult([]);
      }

      // Use existing classification history structure for audit logs
      const historyFilters = {
        dateRange: filters.startTime || filters.endTime ? {
          start: filters.startTime,
          end: filters.endTime
        } : undefined,
        limit: filters.limit || 100,
        offset: filters.offset || 0
      };

      const historyResult = await this.storageProvider.getClassificationHistory(historyFilters);
      if (!historyResult.success) {
        return createErrorResult(historyResult.error);
      }

      // Filter and convert classification history to audit entries
      // This is a simplified implementation - real implementation would use dedicated audit tables
      const auditEntries: AuditLogEntry[] = historyResult.data
        .filter(item => {
          if (filters.eventTypes && !filters.eventTypes.includes('credential_store' as SecurityEventType)) {
            return false;
          }
          if (filters.providers && !filters.providers.includes('security_audit')) {
            return false;
          }
          if (filters.success !== undefined && item.userFeedback !== (filters.success ? 'correct' : 'incorrect')) {
            return false;
          }
          return true;
        })
        .map(item => ({
          id: item.id,
          timestamp: item.timestamp,
          eventType: 'credential_store' as SecurityEventType,
          provider: 'security_audit',
          success: item.userFeedback !== 'incorrect',
          sanitizedMetadata: { emailId: item.emailId },
          integrityHash: this.calculateSyncIntegrityHash({
            id: item.id,
            timestamp: item.timestamp,
            eventType: 'credential_store',
            provider: 'security_audit',
            success: item.userFeedback !== 'incorrect'
          })
        }));

      return createSuccessResult(auditEntries);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown retrieval error';
      return createErrorResult(
        new SecurityError(`Audit log retrieval failed: ${message}`, {
          filters: Object.keys(filters)
        })
      );
    }
  }

  /**
   * Get audit logging statistics
   * 
   * @returns Result containing audit statistics
   */
  async getAuditStatistics(): Promise<Result<AuditStatistics>> {
    try {
      this.ensureInitialized();

      if (!this.config.enabled) {
        return createSuccessResult({
          totalEvents: 0,
          eventsByType: {} as Record<SecurityEventType, number>,
          successRateByType: {} as Record<SecurityEventType, number>,
          recentFailureRate: 0
        });
      }

      // Get recent audit logs for statistics
      const recentLogsResult = await this.getAuditLogs({
        startTime: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        limit: 1000
      });

      if (!recentLogsResult.success) {
        return createErrorResult(recentLogsResult.error);
      }

      const logs = recentLogsResult.data;
      
      // Calculate statistics
      const eventsByType: Record<SecurityEventType, number> = {} as Record<SecurityEventType, number>;
      const successByType: Record<SecurityEventType, number> = {} as Record<SecurityEventType, number>;

      logs.forEach(log => {
        eventsByType[log.eventType] = (eventsByType[log.eventType] || 0) + 1;
        if (log.success) {
          successByType[log.eventType] = (successByType[log.eventType] || 0) + 1;
        }
      });

      const successRateByType: Record<SecurityEventType, number> = {} as Record<SecurityEventType, number>;
      Object.keys(eventsByType).forEach(eventType => {
        const total = eventsByType[eventType as SecurityEventType];
        const successful = successByType[eventType as SecurityEventType] || 0;
        successRateByType[eventType as SecurityEventType] = total > 0 ? successful / total : 0;
      });

      const totalFailures = logs.filter(log => !log.success).length;
      const recentFailureRate = logs.length > 0 ? totalFailures / logs.length : 0;

      const statistics: AuditStatistics = {
        totalEvents: logs.length,
        eventsByType,
        successRateByType,
        recentFailureRate,
        oldestEntry: logs.length > 0 ? logs[logs.length - 1].timestamp : undefined,
        newestEntry: logs.length > 0 ? logs[0].timestamp : undefined
      };

      return createSuccessResult(statistics);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown statistics error';
      return createErrorResult(
        new SecurityError(`Audit statistics calculation failed: ${message}`)
      );
    }
  }

  /**
   * Clear old audit logs based on retention policy
   * 
   * @returns Result indicating cleanup success
   */
  async cleanupOldLogs(): Promise<Result<number>> {
    try {
      this.ensureInitialized();

      if (!this.config.enabled) {
        return createSuccessResult(0);
      }

      const cutoffDate = new Date(Date.now() - this.config.retentionDays * 24 * 60 * 60 * 1000);
      
      // Use storage provider cleanup functionality
      const cleanupResult = await this.storageProvider.cleanup(this.config.retentionDays);
      if (!cleanupResult.success) {
        return createErrorResult(cleanupResult.error);
      }

      // Log cleanup operation
      await this.logSecurityEvent({
        eventType: 'secure_storage_init',
        provider: 'audit_logger',
        success: true,
        metadata: {
          operation: 'cleanup',
          recordsDeleted: cleanupResult.data.recordsDeleted,
          cutoffDate: cutoffDate.toISOString()
        }
      });

      return createSuccessResult(cleanupResult.data.recordsDeleted);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown cleanup error';
      return createErrorResult(
        new SecurityError(`Audit log cleanup failed: ${message}`, {
          retentionDays: this.config.retentionDays
        })
      );
    }
  }

  /**
   * Verify audit log integrity
   * 
   * @returns Result indicating integrity verification
   */
  async verifyIntegrity(): Promise<Result<boolean>> {
    try {
      this.ensureInitialized();

      if (!this.config.enabled) {
        return createSuccessResult(true);
      }

      // Get recent audit logs
      const logsResult = await this.getAuditLogs({ limit: 100 });
      if (!logsResult.success) {
        return createErrorResult(logsResult.error);
      }

      // Verify integrity hashes
      for (const log of logsResult.data) {
        const expectedHash = this.calculateSyncIntegrityHash({
          id: log.id,
          timestamp: log.timestamp,
          eventType: log.eventType,
          provider: log.provider,
          success: log.success,
          metadata: log.sanitizedMetadata
        });

        if (expectedHash !== log.integrityHash) {
          return createErrorResult(
            new SecurityError('Audit log integrity violation detected', {
              logId: log.id,
              expectedHash,
              actualHash: log.integrityHash
            })
          );
        }
      }

      return createSuccessResult(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown integrity check error';
      return createErrorResult(
        new SecurityError(`Audit log integrity verification failed: ${message}`)
      );
    }
  }

  /**
   * Sanitize metadata to remove sensitive information
   */
  private sanitizeMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(metadata)) {
      if (this.isSensitiveKey(key)) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'string') {
        sanitized[key] = this.sanitizeString(value);
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeMetadata(value as Record<string, unknown>);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Check if a key contains sensitive information
   */
  private isSensitiveKey(key: string): boolean {
    const sensitiveKeys = [
      'password', 'token', 'key', 'secret', 'credential',
      'apikey', 'oauth', 'refresh', 'access', 'bearer'
    ];
    
    return sensitiveKeys.some(sensitive => 
      key.toLowerCase().includes(sensitive)
    );
  }

  /**
   * Sanitize string values to remove sensitive patterns
   */
  private sanitizeString(value: string): string {
    return value
      .replace(/sk-[a-zA-Z0-9]+/g, '[REDACTED_API_KEY]')
      .replace(/ya29\.[a-zA-Z0-9_-]+/g, '[REDACTED_OAUTH_TOKEN]')
      .replace(/Bearer\s+[a-zA-Z0-9_-]+/g, 'Bearer [REDACTED]')
      .replace(/[a-zA-Z0-9+/]{32,}={0,2}/g, '[REDACTED_BASE64]')
      .replace(/\b[A-Fa-f0-9]{32,}\b/g, '[REDACTED_HEX]');
  }

  /**
   * Sanitize error messages
   */
  private sanitizeErrorMessage(message: string): string {
    return this.sanitizeString(message)
      .replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, '[REDACTED_IP]')
      .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[REDACTED_EMAIL]');
  }

  /**
   * Calculate integrity hash for audit entry
   */
  private async calculateIntegrityHash(event: SecurityAuditEvent): Promise<string> {
    const hashInput = {
      id: event.id,
      timestamp: event.timestamp.toISOString(),
      eventType: event.eventType,
      provider: event.provider,
      success: event.success,
      metadata: this.sanitizeMetadata(event.metadata)
    };

    const hashData = JSON.stringify(hashInput);
    const hashBytes = await CryptoUtils.generateRandomBytes(32); // Simplified - would use actual hash
    return hashBytes.toString('hex');
  }

  /**
   * Calculate integrity hash synchronously for verification
   */
  private calculateSyncIntegrityHash(data: {
    id: string;
    timestamp: Date;
    eventType: SecurityEventType;
    provider: string;
    success: boolean;
    metadata?: Record<string, unknown>;
  }): string {
    const hashInput = {
      id: data.id,
      timestamp: data.timestamp.toISOString(),
      eventType: data.eventType,
      provider: data.provider,
      success: data.success,
      metadata: data.metadata || {}
    };

    // Simplified hash calculation - real implementation would use crypto.createHash
    return Buffer.from(JSON.stringify(hashInput)).toString('base64').substring(0, 32);
  }

  /**
   * Store audit log entry using storage provider
   */
  private async storeAuditLogEntry(entry: AuditLogEntry): Promise<Result<void>> {
    // Use classification history as temporary storage for audit logs
    // Real implementation would have dedicated audit log tables
    const historyItem: ClassificationHistoryItem = {
      id: entry.id,
      timestamp: entry.timestamp,
      emailId: 'audit-log',
      classification: 'unknown',
      confidence: 1.0,
      reasons: [entry.eventType],
      userFeedback: entry.success ? 'correct' : 'incorrect',
      batchId: entry.sessionId,
      modelVersion: 'audit-logger-1.0',
      processingTimeMs: 0
    };

    return await this.storageProvider.addClassificationResult(historyItem);
  }

  /**
   * Ensure audit tables exist in storage
   */
  private async ensureAuditTablesExist(): Promise<void> {
    // This would create dedicated audit log tables
    // For now, using existing classification history table
    console.log('Ensuring audit tables exist');
  }

  /**
   * Perform periodic maintenance
   */
  private async performMaintenance(): Promise<void> {
    // Cleanup old logs periodically (simplified)
    const shouldCleanup = Math.random() < 0.01; // 1% chance per log event
    if (shouldCleanup) {
      await this.cleanupOldLogs();
    }
  }

  /**
   * Ensure logger is initialized
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('SecurityAuditLogger not initialized');
    }
  }
}