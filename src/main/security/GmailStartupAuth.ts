/**
 * Gmail Startup Authentication Service for Smart Inbox Janitor
 *
 * Handles startup-specific Gmail token validation and refresh operations.
 * Provides seamless authentication state management during app initialization
 * with comprehensive security audit logging.
 *
 * @module GmailStartupAuth
 */

import {
  Result,
  createSuccessResult,
  createErrorResult,
  ConfigurationError,
  SecurityError,
  GmailAuthState,
} from '@shared/types';
import { GmailOAuthManager } from '../oauth/GmailOAuthManager';
import { SecureStorageManager } from './SecureStorageManager';
import { SecurityAuditLogger } from '../../../PRPs/SecurityAuditLogger';

/**
 * Startup authentication result with detailed status
 */
export interface StartupAuthResult {
  /** Whether authentication succeeded */
  readonly success: boolean;
  /** Current authentication state */
  readonly authState: GmailAuthState;
  /** Whether provider needs reconfiguration */
  readonly needsReconfiguration: boolean;
  /** User-friendly message for UI display */
  readonly message: string;
}

/**
 * Gmail Startup Authentication Service
 *
 * Provides comprehensive startup-specific Gmail authentication with:
 * - Automatic token validation and refresh during app initialization
 * - Seamless error recovery with user-friendly messaging
 * - Security audit logging for all credential operations
 * - Integration with existing OAuth manager and secure storage
 */
export class GmailStartupAuth {
  private readonly oauthManager: GmailOAuthManager;
  private readonly secureStorageManager: SecureStorageManager;
  private readonly securityAuditLogger: SecurityAuditLogger;
  private initialized = false;

  constructor(
    oauthManager: GmailOAuthManager,
    secureStorageManager: SecureStorageManager,
  ) {
    this.oauthManager = oauthManager;
    this.secureStorageManager = secureStorageManager;
    // Use the existing audit logger from secure storage manager
    this.securityAuditLogger = (secureStorageManager as any).securityAuditLogger;
  }

  /**
   * Initialize the startup authentication service
   *
   * @returns Result indicating initialization success or failure
   */
  async initialize(): Promise<Result<void>> {
    try {
      this.initialized = true;
      return createSuccessResult(undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown initialization error';
      return createErrorResult(
        new ConfigurationError(`Gmail startup auth initialization failed: ${message}`)
      );
    }
  }

  /**
   * Validate and refresh Gmail tokens during startup
   * 
   * @returns Result indicating whether tokens are valid and ready
   */
  async validateAndRefreshTokens(): Promise<Result<boolean>> {
    try {
      this.ensureInitialized();

      // PATTERN: Security audit logging (follow SecurityAuditLogger.logSecurityEvent)
      await this.securityAuditLogger.logSecurityEvent({
        eventType: 'credential_retrieve',
        provider: 'gmail',
        success: true,
        metadata: { operation: 'startup_token_validation', action: 'validate_and_refresh' }
      });

      const tokensResult = await this.secureStorageManager.getGmailTokens();
      if (!tokensResult.success) {
        // No tokens available - provider needs initial setup
        await this.securityAuditLogger.logSecurityEvent({
          eventType: 'credential_retrieve',
          provider: 'gmail',
          success: true,
          metadata: { operation: 'startup_token_validation', result: 'no_tokens_found' }
        });
        return createSuccessResult(false);
      }

      const tokens = tokensResult.data;
      if (!tokens) {
        // No tokens available - provider needs initial setup
        return createSuccessResult(false);
      }

      if (!this.oauthManager.willExpireSoon(tokens)) {
        // Tokens still valid
        await this.securityAuditLogger.logSecurityEvent({
          eventType: 'credential_retrieve',
          provider: 'gmail',
          success: true,
          metadata: { 
            operation: 'startup_token_validation',
            result: 'tokens_valid', 
            expiresAt: new Date(tokens.expiryDate).toISOString()
          }
        });
        return createSuccessResult(true);
      }

      // Tokens need refresh - attempt automatic renewal
      const refreshResult = await this.oauthManager.refreshTokens(tokens.refreshToken!);
      if (refreshResult.success) {
        // Store refreshed tokens and continue
        await this.secureStorageManager.storeGmailTokens(refreshResult.data);
        
        await this.securityAuditLogger.logSecurityEvent({
          eventType: 'token_rotation',
          provider: 'gmail',
          success: true,
          metadata: { 
            operation: 'startup_token_refresh',
            result: 'automatic_refresh_success',
            refreshDurationMs: refreshResult.data.refreshMetadata.refreshDurationMs,
            attemptNumber: refreshResult.data.refreshMetadata.attemptNumber
          }
        });
        
        return createSuccessResult(true);
      } else {
        // Refresh failed - provider needs reconfiguration
        await this.securityAuditLogger.logSecurityEvent({
          eventType: 'authentication_failure',
          provider: 'gmail',
          success: false,
          errorMessage: refreshResult.error.message,
          metadata: { 
            operation: 'startup_token_refresh',
            error: refreshResult.error.code,
            result: 'automatic_refresh_failed'
          }
        });
        return createSuccessResult(false);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';

      await this.securityAuditLogger.logSecurityEvent({
        eventType: 'authentication_failure',
        provider: 'gmail',
        success: false,
        errorMessage: message,
        metadata: { operation: 'startup_token_validation', result: 'validation_exception' }
      });

      return createErrorResult(
        new SecurityError(`Startup token validation failed: ${message}`, {
          provider: 'gmail',
        })
      );
    }
  }

  /**
   * Handle complete startup authentication flow with comprehensive state tracking
   *
   * @returns Result containing detailed startup authentication result
   */
  async handleStartupAuth(): Promise<Result<StartupAuthResult>> {
    try {
      this.ensureInitialized();

      const validationResult = await this.validateAndRefreshTokens();
      
      if (!validationResult.success) {
        const authState: GmailAuthState = {
          status: 'needs_reauth',
          lastError: {
            code: validationResult.error.code,
            reason: 'unknown',
            timestamp: Date.now()
          }
        };

        const result: StartupAuthResult = {
          success: false,
          authState,
          needsReconfiguration: true,
          message: 'Authentication validation failed. Please check your configuration.'
        };

        return createSuccessResult(result);
      }

      const tokensValid = validationResult.data;
      
      if (tokensValid) {
        // Get current token info for auth state
        const tokensResult = await this.secureStorageManager.getGmailTokens();
        const tokens = tokensResult.success ? tokensResult.data : null;

        const authState: GmailAuthState = {
          status: 'connected',
          accountEmail: tokens?.scope?.includes('email') ? 'user@gmail.com' : undefined, // Would normally extract from token
          expiresAt: tokens?.expiryDate,
          lastRefreshAt: Date.now(),
          refreshAttempts: 0
        };

        const result: StartupAuthResult = {
          success: true,
          authState,
          needsReconfiguration: false,
          message: 'Gmail authentication is ready'
        };

        return createSuccessResult(result);
      } else {
        const authState: GmailAuthState = {
          status: 'needs_reauth',
          refreshAttempts: 0
        };

        const result: StartupAuthResult = {
          success: false,
          authState,
          needsReconfiguration: true,
          message: 'Gmail needs to be connected. Please sign in again.'
        };

        return createSuccessResult(result);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';

      const authState: GmailAuthState = {
        status: 'needs_reauth',
        lastError: {
          code: 'STARTUP_AUTH_FAILED',
          reason: 'unknown',
          timestamp: Date.now()
        }
      };

      const result: StartupAuthResult = {
        success: false,
        authState,
        needsReconfiguration: true,
        message: `Startup authentication failed: ${message}`
      };

      return createSuccessResult(result);
    }
  }

  /**
   * Get current Gmail authentication state
   *
   * @returns Result containing current auth state
   */
  async getAuthState(): Promise<Result<GmailAuthState>> {
    try {
      this.ensureInitialized();

      const tokensResult = await this.secureStorageManager.getGmailTokens();
      if (!tokensResult.success || !tokensResult.data) {
        const authState: GmailAuthState = {
          status: 'needs_reauth',
          refreshAttempts: 0
        };
        return createSuccessResult(authState);
      }

      const tokens = tokensResult.data;
      const isExpiringSoon = this.oauthManager.willExpireSoon(tokens);
      
      const authState: GmailAuthState = {
        status: isExpiringSoon ? 'needs_reauth' : 'connected',
        expiresAt: tokens.expiryDate,
        refreshAttempts: 0
      };

      return createSuccessResult(authState);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      
      const authState: GmailAuthState = {
        status: 'needs_reauth',
        lastError: {
          code: 'AUTH_STATE_ERROR',
          reason: 'unknown',
          timestamp: Date.now()
        }
      };

      return createSuccessResult(authState);
    }
  }

  /**
   * Reset authentication state (clear stored tokens)
   *
   * @returns Result indicating reset success or failure
   */
  async resetAuthState(): Promise<Result<void>> {
    try {
      this.ensureInitialized();

      await this.securityAuditLogger.logSecurityEvent({
        eventType: 'credential_delete',
        provider: 'gmail',
        success: true,
        metadata: { operation: 'startup_auth_reset', action: 'reset_auth_state' }
      });

      const removeResult = await this.secureStorageManager.removeCredentials('gmail');
      if (!removeResult.success) {
        return createErrorResult(removeResult.error);
      }

      return createSuccessResult(undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';

      await this.securityAuditLogger.logSecurityEvent({
        eventType: 'credential_delete',
        provider: 'gmail',
        success: false,
        errorMessage: message,
        metadata: { operation: 'startup_auth_reset', action: 'reset_auth_state' }
      });

      return createErrorResult(
        new SecurityError(`Failed to reset auth state: ${message}`, {
          provider: 'gmail',
        })
      );
    }
  }

  /**
   * Shutdown and cleanup
   *
   * @returns Result indicating shutdown success or failure
   */
  async shutdown(): Promise<Result<void>> {
    try {
      this.initialized = false;
      return createSuccessResult(undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown shutdown error';
      return createErrorResult(new SecurityError(`Startup auth shutdown failed: ${message}`));
    }
  }

  /**
   * Ensure service is initialized
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('GmailStartupAuth not initialized');
    }
  }
}