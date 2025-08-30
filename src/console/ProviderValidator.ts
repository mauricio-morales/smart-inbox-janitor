/**
 * Provider Validation Orchestration for Console Mode
 *
 * Uses shared ProviderInitializationService to ensure consistent provider
 * initialization logic between console mode and UI mode.
 *
 * @module ProviderValidator
 */

import type { Result, HealthStatus } from '@shared/types';
import { createErrorResult } from '@shared/types';
import { GmailProvider } from '@providers/email/gmail/GmailProvider';
import { OpenAIProvider } from '@providers/llm/openai/OpenAIProvider';
import { SQLiteProvider } from '@providers/storage/sqlite/SQLiteProvider';
import {
  ProviderInitializationService,
  type ProviderInitResult,
} from '@shared/services/ProviderInitializationService';
import {
  ConsoleLogger,
  type ProviderValidationResult,
  type ValidationSummary,
} from './ConsoleLogger';
import { ExitCodes, getExitCodeForError } from './ExitCodes';
import type { ConsoleConfig } from '@shared/cli/CommandParser';
import { StructuredLogger } from '@shared/debugging/StructuredLogger';

/**
 * Provider validation orchestration for console mode
 */
export class ProviderValidator {
  private readonly logger: ConsoleLogger;
  private readonly structuredLogger: StructuredLogger;
  private readonly config: ConsoleConfig;
  private readonly providerInitService: ProviderInitializationService;
  private isInitialized: boolean = false;

  constructor(config: ConsoleConfig, logger: ConsoleLogger) {
    this.config = config;
    this.logger = logger;
    this.structuredLogger = new StructuredLogger({
      level: config.verbose ? 'debug' : 'info',
      jsonOutput: true,
      enableCorrelationIds: true,
      enablePerformanceTiming: true,
    });

    this.providerInitService = new ProviderInitializationService();
  }

  /**
   * Initialize provider initialization service (idempotent)
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('[ProviderValidator] initialize() called but already initialized, skipping');
      return;
    }

    console.log(
      '[ProviderValidator] initialize() called - initializing shared provider service...',
    );

    // Initialize storage provider first for the shared service
    const storageProvider = new SQLiteProvider();
    const storageInitResult = await storageProvider.initialize({
      databasePath: process.env.DATABASE_PATH || './data/console-validation.db',
    });

    if (!storageInitResult.success) {
      console.error(
        '[ProviderValidator] Failed to initialize storage provider:',
        storageInitResult.error,
      );
      throw new Error(`Storage initialization failed: ${storageInitResult.error.message}`);
    }

    // Initialize shared provider service
    const serviceInitResult = await this.providerInitService.initialize(storageProvider as any);
    if (!serviceInitResult.success) {
      console.error(
        '[ProviderValidator] Failed to initialize provider service:',
        serviceInitResult.error,
      );
      throw new Error(`Provider service initialization failed: ${serviceInitResult.error.message}`);
    }

    this.isInitialized = true;
    console.log('[ProviderValidator] initialize() completed - shared service ready');
  }

  /**
   * Validate all specified providers with timeout and retry handling
   */
  async validateAllProviders(): Promise<ValidationSummary> {
    const startTime = Date.now();
    const results: ProviderValidationResult[] = [];

    // Always ensure provider service is initialized before validation
    console.log(
      '[ProviderValidator] validateAllProviders starting - initializing shared service...',
    );
    await this.initialize();
    console.log('[ProviderValidator] Shared provider service ready for validation');

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

    try {
      console.log(`[ProviderValidator] Validating provider: ${providerId}`);

      const correlationId = this.structuredLogger.logInitializationStart(providerId, {});

      let providerResult: ProviderInitResult;

      // Use shared service to initialize and test provider
      if (providerId === 'gmail') {
        const provider = new GmailProvider();
        const result = await this.providerInitService.initializeGmailProvider(provider);
        if (!result.success) {
          throw new Error(result.error.message);
        }
        providerResult = result.data;
      } else if (providerId === 'openai') {
        const provider = new OpenAIProvider();
        const result = await this.providerInitService.initializeOpenAIProvider(provider);
        if (!result.success) {
          throw new Error(result.error.message);
        }
        providerResult = result.data;
      } else if (providerId === 'storage') {
        const provider = new SQLiteProvider();
        const result = await this.providerInitService.initializeStorageProvider(provider);
        if (!result.success) {
          throw new Error(result.error.message);
        }
        providerResult = result.data;
      } else {
        throw new Error(`Unknown provider: ${providerId}`);
      }

      const duration = Date.now() - startTime;

      // Log success
      this.structuredLogger.logInitializationComplete(correlationId, providerId, duration);

      // Convert ProviderInitResult to ProviderValidationResult
      const validationResult: ProviderValidationResult = {
        providerId,
        status: providerResult.success ? 'connected' : 'error',
        health: providerResult.health.healthy ? 'healthy' : 'unhealthy',
        details: {
          configurationValid: providerResult.initialized,
          authenticationValid: providerResult.connected,
          connectivityTest: providerResult.connected,
          lastError: providerResult.error,
          responseTime: duration,
        },
        timing: {
          startTime: new Date(startTime),
          endTime: new Date(),
          durationMs: duration,
        },
      };

      console.log(`[ProviderValidator] Provider ${providerId} validation completed:`, {
        status: validationResult.status,
        health: validationResult.health,
        connected: providerResult.connected,
        error: providerResult.error,
      });

      return validationResult;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      console.error(`[ProviderValidator] Provider ${providerId} validation failed:`, errorMessage);

      // Log error
      this.structuredLogger.logInitializationFailed('', providerId, duration, errorMessage);

      return {
        providerId,
        status: 'error',
        health: 'unhealthy',
        details: {
          configurationValid: false,
          authenticationValid: false,
          connectivityTest: false,
          lastError: errorMessage,
          responseTime: duration,
        },
        timing: {
          startTime: new Date(startTime),
          endTime: new Date(),
          durationMs: duration,
        },
      };
    }
  }

  /**
   * Shutdown the validator and clean up resources
   */
  async shutdown(): Promise<void> {
    if (this.providerInitService) {
      await this.providerInitService.shutdown();
    }
    this.isInitialized = false;
  }
}
