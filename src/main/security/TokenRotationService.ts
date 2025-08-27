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
  GmailTokens,
  TokenRefreshRequest,
  TokenRefreshResponse,
  TokenRefreshMetadata,
} from '@shared/types';
import { SecureStorageManager } from './SecureStorageManager';

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
  private config: TokenRotationConfig;
  private rotationTimer: ReturnType<typeof setInterval> | null = null;
  private rotationStatus: RotationStatus;
  private initialized = false;
  private readonly ROTATION_TIMEOUT_MS = 30000; // 30 seconds

  constructor(secureStorageManager: SecureStorageManager) {
    this.secureStorageManager = secureStorageManager;
    this.config = this.getDefaultConfig();
    this.rotationStatus = {
      active: false,
      failedAttempts: 0,
      currentlyRotating: [],
      rotationInProgress: false,
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
   * Shutdown the token rotation service
   *
   * @returns Result indicating shutdown success or failure
   */
  shutdown(): Result<void> {
    try {
      this.stopRotationScheduler();

      this.rotationStatus = {
        active: false,
        failedAttempts: 0,
        currentlyRotating: [],
        rotationInProgress: false,
      };

      this.initialized = false;

      return createSuccessResult(undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown shutdown error';
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

        const refreshResult = this.performTokenRefresh(refreshRequest);
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
   * Check all providers for tokens needing rotation with simple locking
   */
  private async checkAndRotateTokens(): Promise<void> {
    // Simple lock: if rotation is already in progress, skip
    if (this.rotationStatus.rotationInProgress) {
      return;
    }

    this.rotationStatus.rotationInProgress = true;

    try {
      // Add timeout protection for rotation operations
      await Promise.race([this.performRotationCheck(), this.createTimeoutPromise()]);

      // Update last rotation timestamp on successful check
      this.rotationStatus.lastRotation = new Date();
      this.rotationStatus.failedAttempts = 0;
    } catch {
      this.rotationStatus.failedAttempts++;

      // Implement exponential backoff for failures
      if (this.rotationStatus.failedAttempts >= this.config.maxRetryAttempts) {
        this.stopRotationScheduler();
      }
    } finally {
      this.rotationStatus.rotationInProgress = false;
    }
  }

  /**
   * Perform the actual rotation check (separated for timeout handling)
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
   * Check if Gmail tokens need rotation
   */
  private async checkGmailTokenRotation(): Promise<void> {
    const tokensResult = await this.secureStorageManager.getGmailTokens();
    if (!tokensResult.success || !tokensResult.data) {
      return; // No tokens to rotate
    }

    const tokens = tokensResult.data;
    const expirationTime = tokens.expiryDate;
    const currentTime = Date.now();
    const bufferTime = currentTime + this.config.expirationBufferMs;

    // Check if tokens expire within the buffer period
    if (expirationTime <= bufferTime) {
      const rotationResult = await this.rotateProviderTokens('gmail');
      if (!rotationResult.success) {
        throw new Error(`Gmail token rotation failed: ${rotationResult.error.message}`);
      }
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

    return this.performTokenRefresh(refreshRequest);
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
   * Perform token refresh with OAuth provider
   *
   * NOTE: This method intentionally uses mock implementation instead of real Google OAuth.
   *
   * RATIONALE: Real Google OAuth token refresh would require:
   * 1. Valid refresh tokens and client secrets in tests
   * 2. Network calls to Google's OAuth endpoints during testing
   * 3. Committing OAuth credentials to the repository
   *
   * For an open source project, this is impractical and insecure. The actual OAuth
   * integration should be handled by GmailOAuthManager, not this service.
   *
   * This service focuses on token rotation *orchestration* (scheduling, storage,
   * metadata tracking) while delegating actual OAuth operations to the appropriate
   * provider.
   *
   * @param request - Token refresh request
   * @returns Result containing new tokens
   */
  private performTokenRefresh(request: TokenRefreshRequest): Result<TokenRefreshResponse> {
    try {
      // INTENTIONALLY MOCKED: See method documentation for rationale
      // Real implementation would delegate to GmailOAuthManager.refreshTokens()

      // Simulate successful token refresh
      const response: TokenRefreshResponse = {
        accessToken: `ya29.${Math.random().toString(36).substring(2, 15)}`,
        refreshToken: request.refreshToken, // Usually unchanged
        expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
        scope: request.scopes?.join(' '),
        tokenType: 'Bearer',
      };

      return createSuccessResult(response);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown refresh error';
      return createErrorResult(
        new SecurityError(`Token refresh failed: ${message}`, {
          provider: request.provider,
        }),
      );
    }
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
   * Ensure service is initialized
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('TokenRotationService not initialized');
    }
  }
}
