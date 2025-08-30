/**
 * Console-Specific Output Formatting for Provider Validation
 *
 * Provides formatted output for console mode with JSON and table views,
 * optimized for both AI agent parsing and human readability.
 *
 * @module ConsoleLogger
 */

import Table from 'cli-table3';
import { StructuredLogger } from '@shared/debugging/StructuredLogger';
import type { ConsoleConfig } from '@shared/cli/CommandParser';
import { ExitCodes, getExitCodeDescription } from './ExitCodes';

/**
 * Provider validation result for console output
 */
export interface ProviderValidationResult {
  providerId: string;
  status: 'connected' | 'disconnected' | 'error' | 'timeout';
  health: 'healthy' | 'degraded' | 'unhealthy';
  details: {
    configurationValid: boolean;
    authenticationValid: boolean;
    connectivityTest: boolean;
    tokenRenewalAttempted?: boolean;
    tokenRenewalSucceeded?: boolean;
    lastError?: string;
    responseTime?: number;
  };
  timing: {
    startTime: string;
    endTime: string;
    durationMs: number;
  };
}

/**
 * Console validation summary
 */
export interface ValidationSummary {
  timestamp: string;
  totalProviders: number;
  connectedProviders: number;
  failedProviders: number;
  totalDurationMs: number;
  exitCode: number;
  results: ProviderValidationResult[];
  systemInfo: {
    nodeVersion: string;
    electronVersion: string;
    platform: string;
    memory: NodeJS.MemoryUsage;
  };
}

/**
 * Progress tracking for console output
 */
interface ProgressState {
  total: number;
  completed: number;
  current?: string;
}

/**
 * Console logger for provider validation with multiple output formats
 */
export class ConsoleLogger {
  private readonly structuredLogger: StructuredLogger;
  private readonly config: ConsoleConfig;
  private readonly progress: ProgressState;

  constructor(config: ConsoleConfig) {
    this.config = config;
    this.progress = { total: 0, completed: 0 };

    // Configure structured logger based on console config
    this.structuredLogger = new StructuredLogger({
      level: config.verbose ? 'debug' : 'info',
      prettyPrint: config.outputFormat === 'table' || config.verbose,
      jsonOutput: config.outputFormat === 'json',
      enableCorrelationIds: config.verbose,
      enablePerformanceTiming: true,
      sanitizeSensitiveData: true,
    });
  }

  /**
   * Log validation start with progress tracking
   */
  logValidationStart(providers: string[]): void {
    this.progress.total = providers.length;
    this.progress.completed = 0;

    const startMessage = {
      type: 'validation_start',
      timestamp: new Date().toISOString(),
      providers,
      totalProviders: providers.length,
      mode: this.config.mode,
      timeout: this.config.timeout,
    };

    if (this.config.outputFormat === 'json') {
      console.log(JSON.stringify(startMessage));
    } else {
      console.log(`🔍 Starting provider validation (${providers.length} providers)`);
      if (this.config.verbose) {
        console.log(`Mode: ${this.config.mode}, Timeout: ${this.config.timeout}s`);
        console.log(`Providers: ${providers.join(', ')}`);
      }
    }
  }

  /**
   * Log individual provider result
   */
  logProviderResult(result: ProviderValidationResult): void {
    this.progress.completed++;

    const logEntry = {
      type: 'provider_result',
      timestamp: new Date().toISOString(),
      provider: result.providerId,
      status: result.status,
      health: result.health,
      durationMs: result.timing.durationMs,
      details: result.details,
      progress: {
        completed: this.progress.completed,
        total: this.progress.total,
        percentage: Math.round((this.progress.completed / this.progress.total) * 100),
      },
    };

    // Always output JSON for AI parsing
    if (this.config.outputFormat === 'json' || this.config.outputFormat === 'compact') {
      console.log(JSON.stringify(logEntry));
    }

    // Optional human-readable output
    if (this.config.outputFormat === 'table' || this.config.verbose) {
      this.printProviderTable(result);
    }

    // Progress indicator for non-JSON modes
    if (this.config.outputFormat !== 'json' && !this.config.verbose) {
      const statusIcon = this.getStatusIcon(result.status);
      const progressText = `[${this.progress.completed}/${this.progress.total}]`;
      console.log(
        `${statusIcon} ${result.providerId} ${progressText} (${result.timing.durationMs}ms)`,
      );
    }
  }

  /**
   * Print provider result as table
   */
  private printProviderTable(result: ProviderValidationResult): void {
    const table = new Table({
      head: ['Property', 'Value'],
      colWidths: [20, 50],
      style: {
        head: ['cyan'],
        border: ['grey'],
      },
    });

    table.push(
      ['Provider', result.providerId],
      ['Status', this.colorizeStatus(result.status)],
      ['Health', this.colorizeHealth(result.health)],
      ['Duration', `${result.timing.durationMs}ms`],
      ['Configuration', result.details.configurationValid ? '✅ Valid' : '❌ Invalid'],
      ['Authentication', result.details.authenticationValid ? '✅ Valid' : '❌ Invalid'],
      ['Connectivity', result.details.connectivityTest ? '✅ Connected' : '❌ Failed'],
    );

    if (result.details.tokenRenewalAttempted) {
      table.push([
        'Token Renewal',
        result.details.tokenRenewalSucceeded ? '✅ Success' : '❌ Failed',
      ]);
    }

    if (result.details.responseTime) {
      table.push(['Response Time', `${result.details.responseTime}ms`]);
    }

    if (result.details.lastError) {
      table.push(['Last Error', result.details.lastError]);
    }

    console.log(table.toString());
    console.log(''); // Empty line for readability
  }

  /**
   * Log validation completion summary
   */
  logValidationSummary(summary: ValidationSummary): void {
    const summaryEntry = {
      type: 'validation_summary',
      ...summary,
    };

    // Always output JSON summary for AI parsing
    console.log(JSON.stringify(summaryEntry));

    // Human-readable summary for table/verbose modes
    if (this.config.outputFormat === 'table' || this.config.verbose) {
      this.printSummaryTable(summary);
    }
  }

  /**
   * Print validation summary as table
   */
  private printSummaryTable(summary: ValidationSummary): void {
    console.log('\n📊 Validation Summary');
    console.log('='.repeat(50));

    const table = new Table({
      head: ['Metric', 'Value'],
      colWidths: [25, 25],
      style: {
        head: ['cyan'],
        border: ['grey'],
      },
    });

    table.push(
      ['Total Providers', summary.totalProviders.toString()],
      [
        'Connected',
        `${summary.connectedProviders} (${Math.round((summary.connectedProviders / summary.totalProviders) * 100)}%)`,
      ],
      [
        'Failed',
        `${summary.failedProviders} (${Math.round((summary.failedProviders / summary.totalProviders) * 100)}%)`,
      ],
      ['Total Duration', `${summary.totalDurationMs}ms`],
      [
        'Exit Code',
        `${summary.exitCode} - ${getExitCodeDescription(summary.exitCode as ExitCodes)}`,
      ],
      ['Node Version', summary.systemInfo.nodeVersion],
      ['Electron Version', summary.systemInfo.electronVersion || 'N/A'],
      ['Platform', summary.systemInfo.platform],
      ['Memory Used', `${Math.round(summary.systemInfo.memory.heapUsed / 1024 / 1024)}MB`],
    );

    console.log(table.toString());

    // Provider breakdown table
    if (summary.results.length > 0) {
      console.log('\n📋 Provider Results');
      console.log('-'.repeat(50));

      const providerTable = new Table({
        head: ['Provider', 'Status', 'Health', 'Duration', 'Auth', 'Config', 'Connection'],
        colWidths: [12, 12, 12, 12, 8, 8, 12],
        style: {
          head: ['cyan'],
          border: ['grey'],
        },
      });

      for (const result of summary.results) {
        providerTable.push([
          result.providerId,
          this.colorizeStatus(result.status),
          this.colorizeHealth(result.health),
          `${result.timing.durationMs}ms`,
          result.details.authenticationValid ? '✅' : '❌',
          result.details.configurationValid ? '✅' : '❌',
          result.details.connectivityTest ? '✅' : '❌',
        ]);
      }

      console.log(providerTable.toString());
    }
  }

  /**
   * Log progress update during validation
   */
  logProgress(message: string, provider?: string): void {
    this.progress.current = provider;

    if (this.config.outputFormat === 'json') {
      const progressEntry = {
        type: 'progress',
        timestamp: new Date().toISOString(),
        message,
        provider,
        progress: {
          completed: this.progress.completed,
          total: this.progress.total,
          percentage: Math.round((this.progress.completed / this.progress.total) * 100),
        },
      };
      console.log(JSON.stringify(progressEntry));
    } else if (this.config.verbose) {
      const progressText =
        this.progress.total > 0 ? ` [${this.progress.completed}/${this.progress.total}]` : '';
      console.log(`⏳ ${message}${progressText}`);
    }
  }

  /**
   * Log error with structured format
   */
  logError(message: string, error?: Error, provider?: string): void {
    const errorEntry = {
      type: 'error',
      timestamp: new Date().toISOString(),
      message,
      provider,
      error: error
        ? {
            message: error.message,
            name: error.name,
            stack: error.stack,
          }
        : undefined,
    };

    console.error(JSON.stringify(errorEntry));

    if (this.config.verbose && this.config.outputFormat !== 'json') {
      console.error(`❌ Error: ${message}`);
      if (error && provider) {
        console.error(`   Provider: ${provider}`);
        console.error(`   Details: ${error.message}`);
      }
    }
  }

  /**
   * Log warning with structured format
   */
  logWarning(message: string, provider?: string): void {
    const warningEntry = {
      type: 'warning',
      timestamp: new Date().toISOString(),
      message,
      provider,
    };

    console.warn(JSON.stringify(warningEntry));

    if (this.config.verbose && this.config.outputFormat !== 'json') {
      console.warn(`⚠️  Warning: ${message}`);
    }
  }

  /**
   * Get status icon for visual feedback
   */
  private getStatusIcon(status: string): string {
    switch (status) {
      case 'connected':
        return '✅';
      case 'disconnected':
        return '🔌';
      case 'error':
        return '❌';
      case 'timeout':
        return '⏰';
      default:
        return '❓';
    }
  }

  /**
   * Colorize status text for terminal output
   */
  private colorizeStatus(status: string): string {
    const colors = {
      connected: '\x1b[32m', // green
      disconnected: '\x1b[33m', // yellow
      error: '\x1b[31m', // red
      timeout: '\x1b[35m', // magenta
    };
    const reset = '\x1b[0m';
    const color = colors[status as keyof typeof colors] || '';
    return `${color}${status}${reset}`;
  }

  /**
   * Colorize health text for terminal output
   */
  private colorizeHealth(health: string): string {
    const colors = {
      healthy: '\x1b[32m', // green
      degraded: '\x1b[33m', // yellow
      unhealthy: '\x1b[31m', // red
    };
    const reset = '\x1b[0m';
    const color = colors[health as keyof typeof colors] || '';
    return `${color}${health}${reset}`;
  }

  /**
   * Flush any pending logs
   */
  async flush(): Promise<void> {
    await this.structuredLogger.flush();
  }

  /**
   * Get console logger statistics
   */
  getStats() {
    return {
      progress: { ...this.progress },
      config: this.config,
      structuredLogger: this.structuredLogger.getStats(),
    };
  }
}
