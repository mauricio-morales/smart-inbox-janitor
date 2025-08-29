/**
 * Provider Validation Orchestration for Console Mode
 *
 * Adapts the StartupOrchestrator pattern for console mode provider validation.
 * Provides direct provider instantiation and health checking without dependency on
 * renderer process or IPC communication.
 *
 * @module ProviderValidator
 */

import type { BaseProvider } from '@shared/base/BaseProvider';
import type { Result, HealthStatus } from '@shared/types';
import { GmailProvider } from '@providers/email/gmail/GmailProvider';
import { OpenAIProvider } from '@providers/llm/openai/OpenAIProvider';
import { SQLiteProvider } from '@providers/storage/sqlite/SQLiteProvider';
import {
  ConsoleLogger,
  type ProviderValidationResult,
  type ValidationSummary,
} from './ConsoleLogger';
import { ExitCodes, getExitCodeForError } from './ExitCodes';
import type { ConsoleConfig } from '@shared/cli/CommandParser';
import { StructuredLogger } from '@shared/debugging/StructuredLogger';

/**
 * Provider configuration options for console mode
 */
interface ProviderConfigs {
  gmail?: {
    auth: {
      clientId: string;
      clientSecret: string;
      redirectUri: string;
    };
  };
  openai?: {
    apiKey: string;
  };
  storage?: {
    databasePath: string;
    encryptionKey?: string;
  };
}

/**
 * Provider-specific validation checks
 */
interface ProviderSpecificChecks {
  authValid: boolean;
  tokenRenewalAttempted: boolean;
  tokenRenewalSucceeded: boolean;
  responseTime: number;
}

/**
 * Provider validation orchestration for console mode
 */
export class ProviderValidator {
  private readonly logger: ConsoleLogger;
  private readonly structuredLogger: StructuredLogger;
  private readonly config: ConsoleConfig;
  private readonly providerConfigs: ProviderConfigs;

  constructor(config: ConsoleConfig, logger: ConsoleLogger) {
    this.config = config;
    this.logger = logger;
    this.structuredLogger = new StructuredLogger({
      level: config.verbose ? 'debug' : 'info',
      jsonOutput: true,
      enableCorrelationIds: true,
      enablePerformanceTiming: true,
    });

    // Load provider configurations from environment
    this.providerConfigs = this.loadProviderConfigs();
  }

  /**
   * Validate all specified providers with timeout and retry handling
   */
  async validateAllProviders(): Promise<ValidationSummary> {
    const startTime = Date.now();
    const results: ProviderValidationResult[] = [];

    this.logger.logValidationStart(this.config.providers);

    // Filter providers based on configuration
    const providersToValidate = this.config.providers.includes('all')
      ? ['gmail', 'openai', 'storage']
      : this.config.providers;

    // Run all provider validations in parallel with individual timeouts
    const validationPromises = providersToValidate.map(async (providerId) => {
      let result: ProviderValidationResult;
      let attempts = 0;
      const maxAttempts = this.config.retry ? this.config.retryAttempts : 1;

      do {
        attempts++;
        this.logger.logProgress(
          `Validating ${providerId} provider (attempt ${attempts}/${maxAttempts})`,
          providerId,
        );

        try {
          result = await Promise.race([
            this.validateProvider(providerId),
            this.createTimeoutPromise(this.config.timeout * 1000, providerId),
          ]);

          // If successful or not retryable, break the retry loop
          if (result.status === 'connected' || !this.config.retry) {
            break;
          }

          // If retryable error and we have attempts left, wait and retry
          if (attempts < maxAttempts && this.isRetryableError(result)) {
            this.logger.logProgress(
              `Retrying ${providerId} after failure: ${result.details.lastError}`,
              providerId,
            );
            await this.delay(1000 * attempts); // Exponential backoff
          }
        } catch (error) {
          result = this.createErrorResult(providerId, Date.now(), error as Error);
          if (!this.config.retry || attempts >= maxAttempts) {
            break;
          }
        }
      } while (attempts < maxAttempts && this.config.retry);

      results.push(result);
      this.logger.logProviderResult(result);

      // Exit on failure if configured to do so
      if (this.config.exitOnFailure && result.status !== 'connected') {
        this.logger.logError(
          'Exiting due to provider failure (exit-on-failure enabled)',
          undefined,
          providerId,
        );
        process.exit(getExitCodeForError(result.details.lastError || 'UNKNOWN_ERROR'));
      }

      return result;
    });

    // Wait for all validations to complete
    await Promise.allSettled(validationPromises);

    // Create validation summary
    const summary = this.createValidationSummary(results, startTime);
    this.logger.logValidationSummary(summary);

    return summary;
  }

  /**
   * Validate individual provider
   */
  private async validateProvider(providerId: string): Promise<ProviderValidationResult> {
    const startTime = Date.now();
    let provider: BaseProvider<any>;

    try {
      // Create provider instance based on type
      provider = await this.createProviderInstance(providerId);

      if (!provider) {
        throw new Error(`Unable to create provider instance for ${providerId}`);
      }

      const correlationId = this.structuredLogger.logInitializationStart(
        providerId,
        this.getProviderConfig(providerId),
      );

      // Initialize provider if not already initialized
      if (!provider.isInitialized()) {
        const initResult = await provider.initialize(this.getProviderConfig(providerId));
        this.structuredLogger.logInitializationComplete(providerId, correlationId, initResult);

        if (!initResult.success) {
          return this.createErrorResult(providerId, startTime, initResult.error);
        }
      }

      // Perform health check
      const healthResult = await provider.healthCheck();
      this.structuredLogger.logHealthCheck(providerId, healthResult);

      // Validate configuration
      const configResult = await provider.validateConfiguration(provider.getConfig());
      this.structuredLogger.logConfigurationValidation(
        providerId,
        configResult.success && configResult.data,
        configResult.success ? [] : [configResult.error?.message || 'Configuration invalid'],
      );

      // Perform provider-specific checks
      const additionalChecks = await this.performProviderSpecificChecks(providerId, provider);

      // Calculate overall health
      const health = this.calculateHealth(healthResult, configResult);
      const status = healthResult.success ? 'connected' : 'error';

      return {
        providerId,
        status,
        health,
        details: {
          configurationValid: configResult.success && (configResult.data || false),
          authenticationValid: additionalChecks.authValid,
          connectivityTest: healthResult.success,
          tokenRenewalAttempted: additionalChecks.tokenRenewalAttempted,
          tokenRenewalSucceeded: additionalChecks.tokenRenewalSucceeded,
          lastError: healthResult.success ? undefined : healthResult.error?.message,
          responseTime: additionalChecks.responseTime,
        },
        timing: {
          startTime: new Date(startTime).toISOString(),
          endTime: new Date().toISOString(),
          durationMs: Date.now() - startTime,
        },
      };
    } catch (error) {
      return this.createErrorResult(providerId, startTime, error as Error);
    }
  }

  /**
   * Create provider instance with appropriate configuration
   */
  private async createProviderInstance(providerId: string): Promise<BaseProvider<any> | null> {
    switch (providerId) {
      case 'gmail':
        if (!this.providerConfigs.gmail) {
          throw new Error('Gmail configuration not available - check environment variables');
        }
        return new GmailProvider();

      case 'openai':
        if (!this.providerConfigs.openai) {
          throw new Error('OpenAI configuration not available - check environment variables');
        }
        return new OpenAIProvider();

      case 'storage':
        if (!this.providerConfigs.storage) {
          throw new Error('Storage configuration not available - check database path');
        }
        return new SQLiteProvider();

      default:
        throw new Error(`Unknown provider: ${providerId}`);
    }
  }

  /**
   * Get provider-specific configuration
   */
  private getProviderConfig(providerId: string): any {
    switch (providerId) {
      case 'gmail':
        return this.providerConfigs.gmail;
      case 'openai':
        return this.providerConfigs.openai;
      case 'storage':
        return {
          databasePath: this.providerConfigs.storage?.databasePath || './data/console-test.db',
          encryptionKey: this.providerConfigs.storage?.encryptionKey,
          walMode: true,
          enableValidationCache: false, // Disable caching for fresh validation
        };
      default:
        return {};
    }
  }

  /**
   * Load provider configurations from environment and defaults
   */
  private loadProviderConfigs(): ProviderConfigs {
    return {
      gmail: {
        auth: {
          clientId: process.env.GMAIL_CLIENT_ID || '',
          clientSecret: process.env.GMAIL_CLIENT_SECRET || '',
          redirectUri: process.env.GMAIL_REDIRECT_URI || 'http://localhost:8080/oauth/callback',
        },
      },
      openai: {
        apiKey: process.env.OPENAI_API_KEY || '',
      },
      storage: {
        databasePath: process.env.DATABASE_PATH || './data/console-validation.db',
        encryptionKey: process.env.DATABASE_ENCRYPTION_KEY,
      },
    };
  }

  /**
   * Perform provider-specific validation checks
   */
  private async performProviderSpecificChecks(
    providerId: string,
    provider: BaseProvider<any>,
  ): Promise<ProviderSpecificChecks> {
    const checks: ProviderSpecificChecks = {
      authValid: false,
      tokenRenewalAttempted: false,
      tokenRenewalSucceeded: false,
      responseTime: 0,
    };

    const checkStartTime = Date.now();

    try {
      switch (providerId) {
        case 'gmail':
          // Check if Gmail provider has valid authentication
          checks.authValid = await this.checkGmailAuth(provider as any);
          break;

        case 'openai':
          // Check if OpenAI provider has valid API key
          checks.authValid = await this.checkOpenAIAuth(provider as any);
          break;

        case 'storage':
          // Check if storage provider is accessible
          checks.authValid = await this.checkStorageAuth(provider as any);
          break;

        default:
          checks.authValid = true; // Unknown provider, assume valid
          break;
      }
    } catch (error) {
      checks.authValid = false;
    }

    checks.responseTime = Date.now() - checkStartTime;
    return checks;
  }

  /**
   * Check Gmail authentication status
   */
  private async checkGmailAuth(provider: GmailProvider): Promise<boolean> {
    try {
      // Try to get account information - this requires valid authentication
      const accountResult = await provider.getAccountInfo();
      return accountResult.success;
    } catch (error) {
      this.logger.logProgress('Gmail authentication check failed', 'gmail');
      return false;
    }
  }

  /**
   * Check OpenAI authentication status
   */
  private async checkOpenAIAuth(provider: OpenAIProvider): Promise<boolean> {
    try {
      // Try to get usage statistics - this requires valid API key
      const statsResult = await provider.getUsageStatistics();
      return statsResult.success;
    } catch (error) {
      this.logger.logProgress('OpenAI authentication check failed', 'openai');
      return false;
    }
  }

  /**
   * Check storage provider accessibility
   */
  private async checkStorageAuth(provider: SQLiteProvider): Promise<boolean> {
    try {
      // Try to get database statistics - this requires accessible database
      const statsResult = await provider.getDatabaseStatistics();
      return statsResult.success;
    } catch (error) {
      this.logger.logProgress('Storage accessibility check failed', 'storage');
      return false;
    }
  }

  /**
   * Calculate overall provider health based on multiple checks
   */
  private calculateHealth(
    healthResult: Result<HealthStatus>,
    configResult: Result<boolean>,
  ): 'healthy' | 'degraded' | 'unhealthy' {
    if (!healthResult.success) {
      return 'unhealthy';
    }

    if (!configResult.success || !configResult.data) {
      return 'degraded';
    }

    return healthResult.data?.healthy ? 'healthy' : 'degraded';
  }

  /**
   * Create timeout promise that rejects after specified time
   */
  private createTimeoutPromise(
    timeoutMs: number,
    providerId: string,
  ): Promise<ProviderValidationResult> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Provider ${providerId} validation timeout after ${timeoutMs}ms`));
      }, timeoutMs);
    });
  }

  /**
   * Create error result for failed provider validation
   */
  private createErrorResult(
    providerId: string,
    startTime: number,
    error: Error,
  ): ProviderValidationResult {
    return {
      providerId,
      status: error.message.includes('timeout') ? 'timeout' : 'error',
      health: 'unhealthy',
      details: {
        configurationValid: false,
        authenticationValid: false,
        connectivityTest: false,
        lastError: error.message,
        responseTime: Date.now() - startTime,
      },
      timing: {
        startTime: new Date(startTime).toISOString(),
        endTime: new Date().toISOString(),
        durationMs: Date.now() - startTime,
      },
    };
  }

  /**
   * Create validation summary from individual results
   */
  private createValidationSummary(
    results: ProviderValidationResult[],
    startTime: number,
  ): ValidationSummary {
    const connectedProviders = results.filter((r) => r.status === 'connected').length;
    const failedProviders = results.filter(
      (r) => r.status === 'error' || r.status === 'timeout',
    ).length;

    return {
      timestamp: new Date().toISOString(),
      totalProviders: results.length,
      connectedProviders,
      failedProviders,
      totalDurationMs: Date.now() - startTime,
      exitCode: this.calculateExitCode(results),
      results,
      systemInfo: {
        nodeVersion: process.version,
        electronVersion: process.versions.electron || 'N/A',
        platform: process.platform,
        memory: process.memoryUsage(),
      },
    };
  }

  /**
   * Calculate appropriate exit code based on validation results
   */
  private calculateExitCode(results: ProviderValidationResult[]): number {
    // If all providers connected successfully, return success
    if (results.every((r) => r.status === 'connected')) {
      return ExitCodes.SUCCESS;
    }

    // Analyze failure types to determine most appropriate exit code
    const hasAuthFailures = results.some((r) => !r.details.authenticationValid);
    const hasNetworkFailures = results.some(
      (r) => !r.details.connectivityTest && r.status !== 'timeout',
    );
    const hasConfigErrors = results.some((r) => !r.details.configurationValid);
    const hasTimeouts = results.some((r) => r.status === 'timeout');

    // Return most specific error code
    if (hasConfigErrors) return ExitCodes.CONFIGURATION_ERROR;
    if (hasAuthFailures) return ExitCodes.AUTHENTICATION_FAILURE;
    if (hasTimeouts) return ExitCodes.TIMEOUT_ERROR;
    if (hasNetworkFailures) return ExitCodes.NETWORK_FAILURE;

    return ExitCodes.UNKNOWN_ERROR;
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(result: ProviderValidationResult): boolean {
    if (result.status === 'connected') return false;

    // Timeout and network errors are typically retryable
    if (result.status === 'timeout') return true;
    if (!result.details.connectivityTest) return true;

    // Authentication errors may be retryable (token refresh)
    if (!result.details.authenticationValid) return true;

    // Configuration errors are typically not retryable
    if (!result.details.configurationValid) return false;

    return false;
  }

  /**
   * Add delay for retry backoff
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
