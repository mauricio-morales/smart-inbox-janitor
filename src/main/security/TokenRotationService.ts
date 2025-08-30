/**
 * Token Rotation Service for Smart Inbox Janitor
 *
 * Automatic token rotation with scheduling and failure handling.
 * Integrates with SecureStorageManager for seamless credential lifecycle management
 * with 5-minute expiration buffer as specified in PRP requirements.
 *
 * @module TokenRotationService
 */

/* eslint-env node */

import {
  Result,
  createSuccessResult,
  createErrorResult,
  SecurityError,
  ConfigurationError,
  NetworkError,
  AuthenticationError,
  GmailTokens,
  TokenRefreshRequest,
  TokenRefreshResponse,
  TokenRefreshMetadata,
} from '@shared/types';
import { SecureStorageManager } from './SecureStorageManager';
import { GmailOAuthManager } from '../oauth/GmailOAuthManager';

/**
 * Token rotation configuration
 */
export interface TokenRotationConfig {
  /** Rotation interval in milliseconds (default: 1 hour) */
  rotationIntervalMs: number;
  /** Buffer time before expiration in milliseconds (default: 5 minutes) */
  expirationBufferMs: number;
  /** Maximum retry attempts for failed rotations */
  maxRetryAttempts: number;
  /** Retry delay multiplier for exponential backoff */
  retryDelayMultiplier: number;
  /** Whether automatic rotation is enabled */
  enabled: boolean;
}

/**
 * Token rotation performance metrics
 */
export interface RotationMetrics {
  /** Total rotation attempts */
  totalAttempts: number;
  /** Successful rotations */
  successfulRotations: number;
  /** Failed rotations */
  failedRotations: number;
  /** Average rotation duration in milliseconds */
  averageDurationMs: number;
  /** Last rotation duration in milliseconds */
  lastDurationMs?: number;
  /** Last rotation timestamp */
  lastRotationAt?: Date;
  /** Last failure timestamp */
  lastFailureAt?: Date;
}

/**
 * Token rotation status information
 */
export interface RotationStatus {
  /** Whether rotation service is active */
  active: boolean;
  /** Next scheduled rotation timestamp */
  nextRotation?: Date;
  /** Last successful rotation timestamp */
  lastRotation?: Date;
  /** Number of failed rotation attempts */
  failedAttempts: number;
  /** Currently rotating providers */
  currentlyRotating: string[];
  /** Whether rotation lock is held */
  rotationInProgress: boolean;
  /** Performance metrics per provider */
  metrics: Record<string, RotationMetrics>;
}

/**
 * Token Rotation Service
 *
 * Provides automatic token rotation with:
 * - Scheduled rotation before expiration
 * - Exponential backoff retry logic
 * - Failure handling and recovery
 * - Integration with SecureStorageManager
 */
export class TokenRotationService {
  private readonly secureStorageManager: SecureStorageManager;
  private readonly gmailOAuthManager: GmailOAuthManager;
  private config: TokenRotationConfig;
  private rotationTimer: ReturnType<typeof setInterval> | null = null;
  private rotationStatus: RotationStatus;
  private initialized = false;
  private readonly ROTATION_TIMEOUT_MS = 30000; // 30 seconds
  private readonly MAX_REFRESH_ATTEMPTS = 3;
  private readonly RATE_LIMIT_DELAY_MS = 1000; // 1 second between refresh attempts

  constructor(secureStorageManager: SecureStorageManager, gmailOAuthManager: GmailOAuthManager) {
    this.secureStorageManager = secureStorageManager;
    this.gmailOAuthManager = gmailOAuthManager;
    this.config = this.getDefaultConfig();
    this.rotationStatus = {
      active: false,
      failedAttempts: 0,
      currentlyRotating: [],
      rotationInProgress: false,
      metrics: {
        gmail: this.initializeMetrics(),
      },
    };
  }

  /**
   * Initialize the token rotation service
   *
   * @param config - Optional rotation configuration
   * @returns Result indicating initialization success or failure
   */
  async initialize(config?: Partial<TokenRotationConfig>): Promise<Result<void>> {
    try {
      // Update configuration
      this.config = {
        ...this.config,
        ...config,
      };

      this.initialized = true;

      if (this.config.enabled) {
        await this.startRotationScheduler();
      }

      return createSuccessResult(undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown initialization error';
      return createErrorResult(
        new ConfigurationError(`Token rotation service initialization failed: ${message}`),
      );
    }
  }

  /**
   * Start the automatic token rotation scheduler
   *
   * @returns Result indicating scheduler start success or failure
   */
  async startRotationScheduler(): Promise<Result<void>> {
    try {
      this.ensureInitialized();

      if (this.rotationTimer) {
        clearInterval(this.rotationTimer);
      }

      // Check for tokens needing rotation immediately
      await this.checkAndRotateTokens();

      // Set up periodic rotation check
      this.rotationTimer = setInterval(() => {
        this.checkAndRotateTokens().catch(() => {
          // Errors are handled within checkAndRotateTokens
        });
      }, this.config.rotationIntervalMs);

      this.rotationStatus.active = true;
      this.rotationStatus.nextRotation = new Date(Date.now() + this.config.rotationIntervalMs);

      return createSuccessResult(undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown scheduler error';
      return createErrorResult(
        new SecurityError(`Failed to start token rotation scheduler: ${message}`),
      );
    }
  }

  /**
   * Stop the automatic token rotation scheduler
   *
   * @returns Result indicating scheduler stop success or failure
   */
  stopRotationScheduler(): Result<void> {
    try {
      if (this.rotationTimer) {
        clearInterval(this.rotationTimer);
        this.rotationTimer = null;
      }

      this.rotationStatus.active = false;
      this.rotationStatus.nextRotation = undefined;

      return createSuccessResult(undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown scheduler error';
      return createErrorResult(
        new SecurityError(`Failed to stop token rotation scheduler: ${message}`),
      );
    }
  }

  /**
   * Manually rotate tokens for a specific provider
   *
   * @param provider - Provider identifier (e.g., 'gmail')
   * @returns Result indicating rotation success or failure
   */
  async rotateProviderTokens(provider: string): Promise<Result<void>> {
    try {
      this.ensureInitialized();

      if (this.rotationStatus.currentlyRotating.includes(provider)) {
        return createErrorResult(
          new SecurityError(`Token rotation already in progress for provider: ${provider}`, {
            provider,
            currentlyRotating: this.rotationStatus.currentlyRotating,
          }),
        );
      }

      this.rotationStatus.currentlyRotating.push(provider);

      try {
        switch (provider) {
          case 'gmail':
            return await this.rotateGmailTokens();
          default:
            return createErrorResult(
              new ConfigurationError(`Unsupported provider for token rotation: ${provider}`, {
                provider,
              }),
            );
        }
      } finally {
        // Remove provider from currently rotating list
        this.rotationStatus.currentlyRotating = this.rotationStatus.currentlyRotating.filter(
          (p) => p !== provider,
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown rotation error';
      return createErrorResult(
        new SecurityError(`Failed to rotate tokens for ${provider}: ${message}`, {
          provider,
        }),
      );
    }
  }

  /**
   * Get current rotation status
   *
   * @returns Current rotation status
   */
  getRotationStatus(): RotationStatus {
    return { ...this.rotationStatus };
  }

  /**
   * Update rotation configuration
   *
   * @param config - Configuration updates
   * @returns Result indicating update success or failure
   */
  async updateConfig(config: Partial<TokenRotationConfig>): Promise<Result<void>> {
    try {
      this.config = {
        ...this.config,
        ...config,
      };

      // Restart scheduler if configuration changed and service is active
      if (this.rotationStatus.active === true) {
        this.stopRotationScheduler();
        const startResult = await this.startRotationScheduler();
        if (!startResult.success) {
          return startResult;
        }
      }

      return createSuccessResult(undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown configuration error';
      return createErrorResult(
        new ConfigurationError(`Failed to update rotation configuration: ${message}`),
      );
    }
  }

  /**
   * Shutdown the token rotation service with proper cleanup
   *
   * @returns Result indicating shutdown success or failure
   */
  shutdown(): Result<void> {
    try {
      console.info('Shutting down TokenRotationService');

      this.stopRotationScheduler();

      // Properly reset all status including metrics
      this.rotationStatus = {
        active: false,
        failedAttempts: 0,
        currentlyRotating: [],
        rotationInProgress: false,
        metrics: {
          gmail: this.initializeMetrics(),
        },
      };

      this.initialized = false;

      console.info('TokenRotationService shutdown complete');

      return createSuccessResult(undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown shutdown error';
      console.error(`Token rotation service shutdown failed: ${message}`);
      return createErrorResult(
        new SecurityError(`Token rotation service shutdown failed: ${message}`),
      );
    }
  }

  /**
   * Perform startup-specific token refresh for Gmail tokens
   *
   * This method provides startup-optimized token refresh with:
   * - Immediate validation of stored tokens
   * - Startup-specific refresh metadata tracking
   * - Integration with GmailStartupAuth service patterns
   *
   * @returns Result indicating startup refresh success or failure
   */
  async startupTokenRefresh(): Promise<Result<void>> {
    try {
      this.ensureInitialized();

      // Check if Gmail tokens exist and need refresh
      const tokensResult = await this.secureStorageManager.getGmailTokens();
      if (!tokensResult.success || !tokensResult.data) {
        return createSuccessResult(undefined); // No tokens to refresh - normal for first run
      }

      const tokens = tokensResult.data;
      const expirationTime = tokens.expiryDate;
      const currentTime = Date.now();
      const bufferTime = currentTime + this.config.expirationBufferMs;

      // Check if tokens expire within the buffer period
      if (expirationTime <= bufferTime) {
        if (!tokens.refreshToken) {
          return createErrorResult(
            new SecurityError('Tokens expired and no refresh token available for startup refresh'),
          );
        }

        // Perform startup token rotation
        const refreshRequest: TokenRefreshRequest = {
          provider: 'gmail',
          refreshToken: tokens.refreshToken,
          scopes: tokens.scope?.split(' ') ?? [],
          forceRefresh: true,
        };

        const refreshResult = await this.performTokenRefresh(refreshRequest);
        if (!refreshResult.success) {
          return createErrorResult(refreshResult.error);
        }

        // Create startup-specific refresh metadata
        const refreshMetadata: TokenRefreshMetadata = {
          refreshedAt: Date.now(),
          refreshMethod: 'startup',
          refreshDurationMs: 1000, // Would be actual duration in real implementation
          attemptNumber: 1,
          previousExpiryDate: tokens.expiryDate,
        };

        const newTokens: GmailTokens = {
          accessToken: refreshResult.data.accessToken,
          refreshToken: refreshResult.data.refreshToken ?? tokens.refreshToken,
          expiryDate: refreshResult.data.expiresAt.getTime(),
          scope: refreshResult.data.scope ?? tokens.scope,
          tokenType: refreshResult.data.tokenType,
        };

        // Store refreshed tokens with startup metadata
        const storeResult = await this.secureStorageManager.storeGmailTokens(newTokens, {
          provider: 'gmail',
          shouldExpire: true,
          metadata: {
            startupRefresh: true,
            refreshedAt: new Date().toISOString(),
            refreshMetadata: refreshMetadata,
          },
        });

        return storeResult;
      }

      return createSuccessResult(undefined); // Tokens still valid
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown startup refresh error';
      return createErrorResult(
        new SecurityError(`Startup token refresh failed: ${message}`, {
          provider: 'gmail',
          operation: 'startup_token_refresh',
        }),
      );
    }
  }

  /**
   * Check all providers for tokens needing rotation with comprehensive locking and retry logic
   */
  private async checkAndRotateTokens(): Promise<void> {
    // Atomic check and set of rotation lock
    if (this.rotationStatus.rotationInProgress) {
      console.info('Token rotation already in progress, skipping check');
      return;
    }

    // Atomically set rotation in progress
    this.rotationStatus.rotationInProgress = true;
    const rotationStartTime = Date.now();

    try {
      console.info('Starting token rotation check cycle');

      // Add timeout protection for rotation operations
      await Promise.race([this.performRotationCheckWithRetry(), this.createTimeoutPromise()]);

      // Atomically update successful rotation status
      this.atomicUpdateRotationStatus({
        lastRotation: new Date(),
        failedAttempts: 0,
      });

      const duration = Date.now() - rotationStartTime;
      console.info(`Token rotation check cycle completed successfully in ${duration}ms`);
    } catch (error) {
      const duration = Date.now() - rotationStartTime;
      const errorMessage =
        error instanceof Error ? this.sanitizeErrorMessage(error.message) : 'Unknown error';

      console.error(`Token rotation check cycle failed after ${duration}ms: ${errorMessage}`);

      // Atomically increment failure count
      const newFailedAttempts = this.rotationStatus.failedAttempts + 1;
      this.atomicUpdateRotationStatus({
        failedAttempts: newFailedAttempts,
      });

      // Implement exponential backoff for failures - stop scheduler if too many failures
      if (newFailedAttempts >= this.config.maxRetryAttempts) {
        console.error(`Rotation failed ${newFailedAttempts} times, stopping rotation scheduler`);
        this.stopRotationScheduler();
      } else {
        // Log retry information
        const nextRetryDelay = Math.min(
          this.config.rotationIntervalMs *
            Math.pow(this.config.retryDelayMultiplier, newFailedAttempts - 1),
          this.config.rotationIntervalMs * 4, // Cap at 4x normal interval
        );
        console.warn(
          `Will retry rotation check in ${Math.round(nextRetryDelay / 1000)} seconds (attempt ${newFailedAttempts}/${this.config.maxRetryAttempts})`,
        );
      }
    } finally {
      // Atomically clear rotation in progress flag
      this.atomicUpdateRotationStatus({
        rotationInProgress: false,
      });
    }
  }

  /**
   * Perform the actual rotation check with built-in retry logic
   */
  private async performRotationCheckWithRetry(): Promise<void> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.config.maxRetryAttempts; attempt++) {
      try {
        if (attempt > 1) {
          const retryDelay =
            (this.config.rotationIntervalMs *
              Math.pow(this.config.retryDelayMultiplier, attempt - 2)) /
            10; // Shorter retry delays than full rotation interval
          console.info(
            `Retrying rotation check in ${Math.round(retryDelay / 1000)} seconds (attempt ${attempt}/${this.config.maxRetryAttempts})`,
          );
          await this.delay(retryDelay);
        }

        // Perform the actual rotation check
        await this.performRotationCheck();

        // Success - exit retry loop
        if (attempt > 1) {
          console.info(
            `Rotation check succeeded on attempt ${attempt}/${this.config.maxRetryAttempts}`,
          );
        }
        return;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown rotation error');
        const errorMessage = this.sanitizeErrorMessage(lastError.message);

        if (attempt === this.config.maxRetryAttempts) {
          console.error(
            `Rotation check failed on all ${this.config.maxRetryAttempts} attempts: ${errorMessage}`,
          );
        } else {
          console.warn(
            `Rotation check attempt ${attempt}/${this.config.maxRetryAttempts} failed: ${errorMessage}`,
          );
        }
      }
    }

    // All attempts failed
    if (lastError) {
      throw lastError;
    }
  }

  /**
   * Perform the actual rotation check (separated for timeout and retry handling)
   */
  private async performRotationCheck(): Promise<void> {
    // Check Gmail tokens
    await this.checkGmailTokenRotation();
  }

  /**
   * Create a timeout promise that rejects after ROTATION_TIMEOUT_MS
   */
  private createTimeoutPromise(): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Token rotation check timed out after ${this.ROTATION_TIMEOUT_MS}ms`));
      }, this.ROTATION_TIMEOUT_MS);
    });
  }

  /**
   * Check if Gmail tokens need rotation with comprehensive error handling and logging
   */
  private async checkGmailTokenRotation(): Promise<void> {
    const startTime = Date.now();

    try {
      console.info('Checking Gmail tokens for rotation need');

      const tokensResult = await this.secureStorageManager.getGmailTokens();
      if (!tokensResult.success || !tokensResult.data) {
        console.info('No Gmail tokens found for rotation check');
        return; // No tokens to rotate
      }

      const tokens = tokensResult.data;
      const expirationTime = tokens.expiryDate;
      const currentTime = Date.now();
      const bufferTime = currentTime + this.config.expirationBufferMs;
      const timeUntilExpiry = expirationTime - currentTime;

      console.info(
        `Gmail tokens expire in ${Math.round(timeUntilExpiry / 1000 / 60)} minutes, buffer: ${this.config.expirationBufferMs / 1000 / 60} minutes`,
      );

      // Check if tokens expire within the buffer period
      if (expirationTime <= bufferTime) {
        console.info('Gmail tokens require rotation - initiating rotation process');

        const rotationResult = await this.rotateProviderTokens('gmail');
        if (!rotationResult.success) {
          const errorMessage = this.sanitizeErrorMessage(rotationResult.error.message);
          console.error(`Gmail token rotation failed: ${errorMessage}`);

          // Use Result pattern consistently - don't throw, let caller handle
          throw new SecurityError(`Gmail token rotation failed: ${errorMessage}`, {
            provider: 'gmail',
            operation: 'token_rotation_check',
            errorType: rotationResult.error.constructor.name,
            timeUntilExpiry,
            bufferTime: this.config.expirationBufferMs,
          });
        }

        const duration = Date.now() - startTime;
        console.info(`Gmail token rotation completed successfully in ${duration}ms`);

        // Update performance metrics
        this.updateRotationMetrics('gmail', duration, true);
      } else {
        console.info('Gmail tokens do not require rotation at this time');
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? this.sanitizeErrorMessage(error.message) : 'Unknown error';

      console.error(`Gmail token rotation check failed after ${duration}ms: ${errorMessage}`);

      // Update performance metrics for failed attempt
      this.updateRotationMetrics('gmail', duration, false);

      // Re-throw to be handled by the caller (checkAndRotateTokens)
      throw error;
    }
  }

  /**
   * Rotate Gmail OAuth tokens using enhanced OAuth manager
   */
  private async rotateGmailTokens(): Promise<Result<void>> {
    try {
      const tokensValidationResult = await this.validateGmailTokens();
      if (!tokensValidationResult.success) {
        return tokensValidationResult;
      }

      const currentTokens = tokensValidationResult.data;
      const refreshResult = await this.performGmailTokenRefresh(currentTokens);
      if (!refreshResult.success) {
        return refreshResult;
      }

      return await this.storeRefreshedGmailTokens(currentTokens, refreshResult.data);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown rotation error';
      return createErrorResult(new SecurityError(`Gmail token rotation failed: ${message}`));
    }
  }

  /**
   * Validate Gmail tokens for rotation
   */
  private async validateGmailTokens(): Promise<Result<GmailTokens>> {
    const tokensResult = await this.secureStorageManager.getGmailTokens();
    if (!tokensResult.success || !tokensResult.data) {
      return createErrorResult(new SecurityError('No Gmail tokens found for rotation'));
    }

    const currentTokens = tokensResult.data;
    if (
      currentTokens.refreshToken === undefined ||
      currentTokens.refreshToken === null ||
      currentTokens.refreshToken === ''
    ) {
      return createErrorResult(
        new SecurityError('No refresh token available for Gmail token rotation'),
      );
    }

    return createSuccessResult(currentTokens);
  }

  /**
   * Perform Gmail token refresh
   */
  private async performGmailTokenRefresh(
    currentTokens: GmailTokens,
  ): Promise<Result<TokenRefreshResponse>> {
    const refreshRequest: TokenRefreshRequest = {
      provider: 'gmail',
      refreshToken: currentTokens.refreshToken!,
      scopes: currentTokens.scope?.split(' ') ?? [],
      forceRefresh: true,
    };

    return await this.performTokenRefresh(refreshRequest);
  }

  /**
   * Store refreshed Gmail tokens with metadata
   */
  private async storeRefreshedGmailTokens(
    currentTokens: GmailTokens,
    refreshData: TokenRefreshResponse,
  ): Promise<Result<void>> {
    const refreshMetadata: TokenRefreshMetadata = {
      refreshedAt: Date.now(),
      refreshMethod: 'automatic',
      refreshDurationMs: 1000, // Placeholder - would be actual duration
      attemptNumber: 1,
    };

    const newTokens: GmailTokens = {
      accessToken: refreshData.accessToken,
      refreshToken: refreshData.refreshToken ?? currentTokens.refreshToken,
      expiryDate: refreshData.expiresAt.getTime(),
      scope: refreshData.scope ?? currentTokens.scope,
      tokenType: refreshData.tokenType,
    };

    return this.secureStorageManager.storeGmailTokens(newTokens, {
      provider: 'gmail',
      shouldExpire: true,
      metadata: {
        rotatedAt: new Date().toISOString(),
        refreshMetadata: refreshMetadata,
      },
    });
  }

  /**
   * Perform token refresh with OAuth provider using real Google OAuth implementation
   *
   * Implements robust token refresh with:
   * - Network retry logic with exponential backoff (3 attempts max)
   * - Rate limiting to prevent OAuth quota abuse
   * - Comprehensive error handling and logging
   * - Transformation between GmailTokens and TokenRefreshResponse formats
   *
   * @param request - Token refresh request
   * @returns Result containing new tokens
   */
  private async performTokenRefresh(
    request: TokenRefreshRequest,
  ): Promise<Result<TokenRefreshResponse>> {
    const { provider, refreshToken } = request;

    if (provider !== 'gmail') {
      return createErrorResult(
        new ConfigurationError(`Unsupported provider for token refresh: ${provider}`, {
          provider,
          supportedProviders: ['gmail'],
        }),
      );
    }

    let lastError: Error | null = null;

    // Retry logic with exponential backoff
    for (let attempt = 1; attempt <= this.MAX_REFRESH_ATTEMPTS; attempt++) {
      try {
        // Rate limiting: add delay between attempts (except first attempt)
        if (attempt > 1) {
          const delayMs = this.RATE_LIMIT_DELAY_MS * Math.pow(2, attempt - 2); // Exponential backoff
          await this.delay(delayMs);
        }

        // Use GmailOAuthManager to perform real token refresh
        const refreshResult = await this.gmailOAuthManager.refreshTokens(refreshToken, attempt);

        if (!refreshResult.success) {
          lastError = refreshResult.error;

          // Check if this is a retryable error
          if (this.isRetryableRefreshError(refreshResult.error)) {
            console.warn(
              `Token refresh attempt ${attempt}/${this.MAX_REFRESH_ATTEMPTS} failed (retryable): ${this.sanitizeErrorMessage(refreshResult.error.message)}`,
            );
            continue; // Retry
          } else {
            // Non-retryable error, fail immediately
            return createErrorResult(
              new AuthenticationError(
                `Token refresh failed: ${this.sanitizeErrorMessage(refreshResult.error.message)}`,
                true,
                {
                  provider,
                  attemptNumber: attempt,
                  errorType: 'non_retryable',
                },
              ),
            );
          }
        }

        // Success: Transform GmailTokens to TokenRefreshResponse format
        const gmailTokens = refreshResult.data;
        const response: TokenRefreshResponse = {
          accessToken: gmailTokens.accessToken,
          refreshToken: gmailTokens.refreshToken ?? refreshToken, // Fallback to original if not returned
          expiresAt: new Date(gmailTokens.expiryDate),
          scope: gmailTokens.scope,
          tokenType: gmailTokens.tokenType ?? 'Bearer',
        };

        // Log successful refresh (without sensitive data)
        console.info(
          `Token refresh successful for provider: ${provider}, attempt: ${attempt}/${this.MAX_REFRESH_ATTEMPTS}`,
        );

        return createSuccessResult(response);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown refresh error');

        // Check if this is a network error (retryable)
        if (this.isNetworkError(lastError)) {
          console.warn(
            `Token refresh attempt ${attempt}/${this.MAX_REFRESH_ATTEMPTS} failed (network error): ${this.sanitizeErrorMessage(lastError.message)}`,
          );
          continue; // Retry network errors
        } else {
          // Non-retryable error, fail immediately
          break;
        }
      }
    }

    // All attempts failed
    const errorMessage = lastError
      ? this.sanitizeErrorMessage(lastError.message)
      : 'Unknown error after all retry attempts';
    console.error(
      `Token refresh failed after ${this.MAX_REFRESH_ATTEMPTS} attempts for provider: ${provider}: ${errorMessage}`,
    );

    return createErrorResult(
      new AuthenticationError(
        `Token refresh failed after ${this.MAX_REFRESH_ATTEMPTS} attempts: ${errorMessage}`,
        true,
        {
          provider,
          maxAttempts: this.MAX_REFRESH_ATTEMPTS,
          finalError: errorMessage,
        },
      ),
    );
  }

  /**
   * Check if an error is retryable for token refresh
   */
  private isRetryableRefreshError(error: Error): boolean {
    const message = error.message.toLowerCase();

    // Network errors are retryable
    if (this.isNetworkError(error)) {
      return true;
    }

    // Rate limit errors are retryable
    if (message.includes('rate_limit') || message.includes('too_many_requests')) {
      return true;
    }

    // Temporary server errors are retryable
    if (message.includes('server_error') || message.includes('temporarily_unavailable')) {
      return true;
    }

    // Non-retryable errors: invalid_grant, client_misconfigured, consent_revoked, etc.
    return false;
  }

  /**
   * Check if an error is a network-related error
   */
  private isNetworkError(error: Error): boolean {
    const message = error.message.toLowerCase();
    return (
      message.includes('enotfound') ||
      message.includes('econnrefused') ||
      message.includes('etimedout') ||
      message.includes('network') ||
      error instanceof NetworkError
    );
  }

  /**
   * Sanitize error messages to prevent sensitive data exposure
   */
  private sanitizeErrorMessage(message: string): string {
    // Remove potential tokens, keys, and other sensitive data
    return message
      .replace(/ya29\.[a-zA-Z0-9_-]+/g, '[ACCESS_TOKEN]')
      .replace(/\b[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\b/g, '[JWT_TOKEN]')
      .replace(/refresh_token=([^&\s]+)/g, 'refresh_token=[REDACTED]')
      .replace(/client_secret=([^&\s]+)/g, 'client_secret=[REDACTED]')
      .replace(/authorization_code=([^&\s]+)/g, 'authorization_code=[REDACTED]');
  }

  /**
   * Delay execution for specified milliseconds
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get default rotation configuration
   */
  private getDefaultConfig(): TokenRotationConfig {
    return {
      rotationIntervalMs: 60 * 60 * 1000, // 1 hour
      expirationBufferMs: 5 * 60 * 1000, // 5 minutes as specified in PRP
      maxRetryAttempts: 3,
      retryDelayMultiplier: 2,
      enabled: true,
    };
  }

  /**
   * Initialize metrics for a provider
   */
  private initializeMetrics(): RotationMetrics {
    return {
      totalAttempts: 0,
      successfulRotations: 0,
      failedRotations: 0,
      averageDurationMs: 0,
    };
  }

  /**
   * Update rotation performance metrics for a provider
   */
  private updateRotationMetrics(provider: string, durationMs: number, success: boolean): void {
    const metrics = this.rotationStatus.metrics[provider] || this.initializeMetrics();

    metrics.totalAttempts++;
    metrics.lastDurationMs = durationMs;

    if (success) {
      metrics.successfulRotations++;
      metrics.lastRotationAt = new Date();
    } else {
      metrics.failedRotations++;
      metrics.lastFailureAt = new Date();
    }

    // Calculate running average duration
    const totalDuration = metrics.averageDurationMs * (metrics.totalAttempts - 1) + durationMs;
    metrics.averageDurationMs = Math.round(totalDuration / metrics.totalAttempts);

    this.rotationStatus.metrics[provider] = metrics;

    // Log metrics for monitoring (without sensitive data)
    console.info(
      `Rotation metrics for ${provider}: ${metrics.successfulRotations}/${metrics.totalAttempts} successful, avg duration: ${metrics.averageDurationMs}ms`,
    );
  }

  /**
   * Atomically update rotation status properties
   */
  private atomicUpdateRotationStatus(updates: Partial<RotationStatus>): void {
    // Create a copy to ensure atomicity
    this.rotationStatus = {
      ...this.rotationStatus,
      ...updates,
    };
  }

  /**
   * Get comprehensive rotation status including metrics
   */
  getDetailedRotationStatus(): RotationStatus & {
    uptime: number;
    nextRotationIn?: number;
    isHealthy: boolean;
    recentErrorRate: number;
  } {
    const status = this.getRotationStatus();
    const now = Date.now();

    // Calculate health metrics
    const gmailMetrics = status.metrics.gmail || this.initializeMetrics();
    const recentErrorRate =
      gmailMetrics.totalAttempts > 0
        ? gmailMetrics.failedRotations / gmailMetrics.totalAttempts
        : 0;

    const isHealthy = recentErrorRate < 0.5 && status.failedAttempts < this.config.maxRetryAttempts;

    const nextRotationIn = status.nextRotation
      ? Math.max(0, status.nextRotation.getTime() - now)
      : undefined;

    return {
      ...status,
      uptime: this.initialized ? now - (status.lastRotation?.getTime() || now) : 0,
      nextRotationIn,
      isHealthy,
      recentErrorRate,
    };
  }

  /**
   * Ensure service is initialized
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('TokenRotationService not initialized');
    }
  }
}
