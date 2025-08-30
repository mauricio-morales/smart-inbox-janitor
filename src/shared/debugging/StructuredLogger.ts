/**
 * Structured JSON Logging for Console Mode and AI Agent Parsing
 *
 * Provides high-performance, structured logging using Pino with correlation IDs,
 * performance metrics, and AI-agent friendly JSON output format.
 *
 * @module StructuredLogger
 */

import pino from 'pino';
import type { BaseProviderConfig } from '@shared/base/BaseProvider';
import type { Result, HealthStatus } from '@shared/types';

/**
 * Correlation ID generator for request tracing
 */
let correlationCounter = 0;
export function generateCorrelationId(): string {
  return `${Date.now()}-${process.pid}-${++correlationCounter}`;
}

/**
 * Provider event types for structured logging
 */
export type ProviderEventType =
  | 'initialization_start'
  | 'initialization_complete'
  | 'initialization_failed'
  | 'health_check_start'
  | 'health_check_complete'
  | 'health_check_failed'
  | 'configuration_validation'
  | 'token_refresh_attempt'
  | 'token_refresh_success'
  | 'token_refresh_failed'
  | 'provider_timeout'
  | 'provider_error';

/**
 * Structured log entry for provider events
 */
export interface ProviderLogEntry {
  /** Log timestamp in ISO format */
  timestamp: string;

  /** Log level (debug, info, warn, error) */
  level: string;

  /** Correlation ID for request tracing */
  correlationId: string;

  /** Provider identifier */
  providerId: string;

  /** Event type */
  eventType: ProviderEventType;

  /** Event message */
  message: string;

  /** Duration in milliseconds (for timed operations) */
  durationMs?: number;

  /** Additional structured data */
  data?: Record<string, any>;

  /** Error information (if applicable) */
  error?: {
    message: string;
    code?: string;
    type?: string;
    stack?: string;
  };
}

/**
 * Performance timing information
 */
export interface PerformanceTiming {
  startTime: number;
  endTime?: number;
  durationMs?: number;
}

/**
 * Logger configuration options
 */
export interface StructuredLoggerConfig {
  /** Log level (debug, info, warn, error) */
  level: 'debug' | 'info' | 'warn' | 'error';

  /** Enable pretty printing (for development) */
  prettyPrint: boolean;

  /** Enable JSON output (for AI parsing) */
  jsonOutput: boolean;

  /** Log destination (stdout, file path, or custom) */
  destination?: string;

  /** Include correlation IDs in all logs */
  enableCorrelationIds: boolean;

  /** Enable performance timing */
  enablePerformanceTiming: boolean;

  /** Sanitize sensitive data */
  sanitizeSensitiveData: boolean;
}

/**
 * Default logger configuration
 */
export const DEFAULT_LOGGER_CONFIG: StructuredLoggerConfig = {
  level: 'info',
  prettyPrint: false,
  jsonOutput: true,
  enableCorrelationIds: true,
  enablePerformanceTiming: true,
  sanitizeSensitiveData: true,
};

/**
 * Structured logger for provider operations and console mode
 */
export class StructuredLogger {
  private readonly logger: pino.Logger;
  private readonly config: StructuredLoggerConfig;
  private readonly activeTimings: Map<string, PerformanceTiming> = new Map();

  constructor(config: Partial<StructuredLoggerConfig> = {}) {
    this.config = { ...DEFAULT_LOGGER_CONFIG, ...config };

    // Configure Pino logger
    const pinoConfig: pino.LoggerOptions = {
      name: 'smart-inbox-janitor-console',
      level: this.config.level,
      timestamp: pino.stdTimeFunctions.isoTime,
      formatters: {
        level: (label) => ({ level: label }),
      },
    };

    // Configure transport for pretty printing or JSON output
    let transport: pino.TransportSingleOptions | undefined;

    if (this.config.prettyPrint && !this.config.jsonOutput) {
      transport = {
        target: 'pino-pretty',
        options: {
          colorize: true,
          singleLine: false,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
          messageFormat: '{correlationId} [{providerId}] {msg}',
        },
      };
    } else if (this.config.jsonOutput) {
      // JSON output for AI agents - no pretty printing
      pinoConfig.base = { pid: process.pid };
    }

    this.logger = pino(pinoConfig, transport ? pino.transport(transport) : undefined);
  }

  /**
   * Log provider event with structured data
   */
  logProviderEvent(
    providerId: string,
    eventType: ProviderEventType,
    message: string,
    options: {
      correlationId?: string;
      durationMs?: number;
      data?: Record<string, any>;
      error?: Error | { message: string; code?: string; type?: string };
      level?: 'debug' | 'info' | 'warn' | 'error';
    } = {},
  ): void {
    const {
      correlationId = generateCorrelationId(),
      durationMs,
      data,
      error,
      level = 'info',
    } = options;

    const logEntry: ProviderLogEntry = {
      timestamp: new Date().toISOString(),
      level,
      correlationId,
      providerId,
      eventType,
      message,
      durationMs,
      data: this.sanitizeData(data),
    };

    // Add error information if provided
    if (error) {
      logEntry.error = {
        message: error.message,
        code: (error as any).code,
        type: (error as any).type || (error as any).name,
        stack: (error as any).stack,
      };
    }

    // Log with appropriate level
    this.logger[level](logEntry);
  }

  /**
   * Start timing a provider operation
   */
  startTiming(operationId: string): string {
    const correlationId = generateCorrelationId();
    const timingKey = `${operationId}-${correlationId}`;

    if (this.config.enablePerformanceTiming) {
      this.activeTimings.set(timingKey, {
        startTime: performance.now(),
      });
    }

    return correlationId;
  }

  /**
   * End timing and log duration
   */
  endTiming(
    operationId: string,
    correlationId: string,
    providerId: string,
    eventType: ProviderEventType,
    message: string,
    success: boolean = true,
    additionalData?: Record<string, any>,
  ): number | undefined {
    const timingKey = `${operationId}-${correlationId}`;
    const timing = this.activeTimings.get(timingKey);

    if (!timing) {
      this.logProviderEvent(providerId, 'provider_error', 'Timing not found for operation', {
        correlationId,
        data: { operationId },
        level: 'warn',
      });
      return undefined;
    }

    timing.endTime = performance.now();
    timing.durationMs = timing.endTime - timing.startTime;

    this.activeTimings.delete(timingKey);

    // Log completion with timing
    this.logProviderEvent(providerId, eventType, message, {
      correlationId,
      durationMs: timing.durationMs,
      data: additionalData,
      level: success ? 'info' : 'error',
    });

    return timing.durationMs;
  }

  /**
   * Log provider initialization start
   */
  logInitializationStart(providerId: string, config: BaseProviderConfig): string {
    const correlationId = this.startTiming('initialization');

    this.logProviderEvent(
      providerId,
      'initialization_start',
      `Starting ${providerId} provider initialization`,
      {
        correlationId,
        data: {
          enableValidationCache: config.enableValidationCache,
          validationTimeout: config.validationTimeout,
          failFast: config.failFast,
          enablePerformanceMetrics: config.enablePerformanceMetrics,
        },
      },
    );

    return correlationId;
  }

  /**
   * Log provider initialization completion
   */
  logInitializationComplete(providerId: string, correlationId: string, result: Result<void>): void {
    const message = result.success
      ? `${providerId} provider initialization completed successfully`
      : `${providerId} provider initialization failed`;

    this.endTiming(
      'initialization',
      correlationId,
      providerId,
      result.success ? 'initialization_complete' : 'initialization_failed',
      message,
      result.success,
      result.success ? undefined : { error: result.error?.message },
    );
  }

  /**
   * Log provider health check
   */
  logHealthCheck(providerId: string, result: Result<HealthStatus>): void {
    const correlationId = generateCorrelationId();

    if (result.success) {
      this.logProviderEvent(
        providerId,
        'health_check_complete',
        `${providerId} health check passed`,
        {
          correlationId,
          data: {
            healthy: result.data.healthy,
            status: result.data.status,
            message: result.data.message,
          },
          level: result.data.healthy ? 'info' : 'warn',
        },
      );
    } else {
      this.logProviderEvent(
        providerId,
        'health_check_failed',
        `${providerId} health check failed`,
        {
          correlationId,
          error: result.error,
          level: 'error',
        },
      );
    }
  }

  /**
   * Log configuration validation
   */
  logConfigurationValidation(providerId: string, isValid: boolean, errors?: string[]): void {
    const correlationId = generateCorrelationId();

    this.logProviderEvent(
      providerId,
      'configuration_validation',
      `${providerId} configuration validation ${isValid ? 'passed' : 'failed'}`,
      {
        correlationId,
        data: {
          valid: isValid,
          errors: errors || [],
        },
        level: isValid ? 'info' : 'error',
      },
    );
  }

  /**
   * Log token refresh operations
   */
  logTokenRefresh(providerId: string, success: boolean, error?: Error): void {
    const correlationId = generateCorrelationId();

    if (success) {
      this.logProviderEvent(
        providerId,
        'token_refresh_success',
        `${providerId} token refresh successful`,
        {
          correlationId,
        },
      );
    } else {
      this.logProviderEvent(
        providerId,
        'token_refresh_failed',
        `${providerId} token refresh failed`,
        {
          correlationId,
          error,
          level: 'error',
        },
      );
    }
  }

  /**
   * Create child logger with provider context
   */
  createProviderLogger(providerId: string): StructuredLogger {
    const childConfig = {
      ...this.config,
    };

    const childLogger = new StructuredLogger(childConfig);

    // Bind provider ID to child logger methods
    const originalLogProviderEvent = childLogger.logProviderEvent.bind(childLogger);
    childLogger.logProviderEvent = (
      _providerId: string,
      eventType: ProviderEventType,
      message: string,
      options = {},
    ) => {
      return originalLogProviderEvent(providerId, eventType, message, options);
    };

    return childLogger;
  }

  /**
   * Export structured logs for offline analysis
   */
  exportLogs(): ProviderLogEntry[] {
    // This would be implemented to export logs from memory or file storage
    // For now, return empty array as logs are streamed to output
    return [];
  }

  /**
   * Sanitize sensitive data from log entries
   */
  private sanitizeData(data?: Record<string, any>): Record<string, any> | undefined {
    if (!data || !this.config.sanitizeSensitiveData) {
      return data;
    }

    const sensitiveFields = [
      'token',
      'accessToken',
      'refreshToken',
      'apiKey',
      'secret',
      'password',
      'clientSecret',
      'authToken',
      'bearer',
      'credential',
      'key',
    ];

    const sanitized = { ...data };

    for (const [key, value] of Object.entries(sanitized)) {
      const lowerKey = key.toLowerCase();

      if (sensitiveFields.some((field) => lowerKey.includes(field))) {
        if (typeof value === 'string' && value.length > 8) {
          sanitized[key] =
            `${value.substring(0, 4)}...[REDACTED]...${value.substring(value.length - 4)}`;
        } else {
          sanitized[key] = '[REDACTED]';
        }
      }
    }

    return sanitized;
  }

  /**
   * Flush any pending logs (useful for shutdown)
   */
  async flush(): Promise<void> {
    return new Promise((resolve) => {
      this.logger.flush(() => resolve());
    });
  }

  /**
   * Get logger statistics
   */
  getStats(): {
    activeTimings: number;
    totalCorrelationIds: number;
    logLevel: string;
  } {
    return {
      activeTimings: this.activeTimings.size,
      totalCorrelationIds: correlationCounter,
      logLevel: this.config.level,
    };
  }
}
