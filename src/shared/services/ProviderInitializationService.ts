/**
 * Shared Provider Initialization Service
 *
 * Single source of truth for provider initialization logic shared between
 * console mode and UI mode to ensure consistent behavior.
 *
 * @module ProviderInitializationService
 */

import type {
  Result,
  GmailTokens,
  OpenAIConfig,
  HealthStatus,
  StorageProvider,
  EmailProvider,
  LLMProvider,
} from '@shared/types';
import {
  createSuccessResult,
  createErrorResult,
  ConfigurationError,
  AuthenticationError,
} from '@shared/types';
import { SecureStorageManager } from '../../main/security/SecureStorageManager';
import { GmailOAuthManager } from '../../main/oauth/GmailOAuthManager';

/**
 * Provider configuration result
 */
export interface ProviderConfig {
  readonly type: 'gmail' | 'openai' | 'storage';
  readonly config: any;
  readonly credentialsAvailable: boolean;
  readonly requiresSetup: boolean;
}

/**
 * Provider initialization result
 */
export interface ProviderInitResult {
  readonly providerId: string;
  readonly success: boolean;
  readonly initialized: boolean;
  readonly connected: boolean;
  readonly health: HealthStatus;
  readonly error?: string;
  readonly requiresAuth?: boolean;
  readonly accountInfo?: {
    email?: string;
    connectedAt?: Date;
  };
}

/**
 * Shared provider initialization service
 */
export class ProviderInitializationService {
  private secureStorageManager?: SecureStorageManager;
  private initialized = false;

  /**
   * Initialize the service with storage manager
   */
  async initialize(storageProvider: any): Promise<Result<void>> {
    try {
      // Initialize secure storage manager
      this.secureStorageManager = new SecureStorageManager();
      const initResult = await this.secureStorageManager.initialize({
        storageProvider,
        enableTokenRotation: false, // Disable auto-rotation during checks
        sessionId: `validation-${Date.now()}`,
        userId: 'default-user',
      });

      if (!initResult.success) {
        return initResult;
      }

      this.initialized = true;
      return createSuccessResult(undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return createErrorResult(
        new ConfigurationError(`Provider initialization service failed: ${message}`),
      );
    }
  }

  /**
   * Get Gmail provider configuration from stored credentials
   */
  async getGmailConfig(): Promise<Result<ProviderConfig>> {
    try {
      this.ensureInitialized();

      // Get stored Gmail OAuth credentials
      const credentialsResult = await this.secureStorageManager!.getGmailCredentials();

      if (!credentialsResult.success || !credentialsResult.data) {
        return createSuccessResult({
          type: 'gmail' as const,
          config: null,
          credentialsAvailable: false,
          requiresSetup: true,
        });
      }

      const credentials = credentialsResult.data;
      const gmailConfig = {
        auth: {
          clientId: credentials.clientId,
          clientSecret: credentials.clientSecret,
          redirectUri: 'http://localhost:8080',
          scopes: [
            'https://www.googleapis.com/auth/gmail.readonly',
            'https://www.googleapis.com/auth/gmail.modify',
          ],
        },
        maxResults: 100,
        pageSize: 50,
      };

      return createSuccessResult({
        type: 'gmail' as const,
        config: gmailConfig,
        credentialsAvailable: true,
        requiresSetup: false,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return createErrorResult(new ConfigurationError(`Failed to get Gmail config: ${message}`));
    }
  }

  /**
   * Get OpenAI provider configuration from stored credentials
   */
  async getOpenAIConfig(): Promise<Result<ProviderConfig>> {
    try {
      this.ensureInitialized();

      const configResult = await this.secureStorageManager!.getOpenAIConfig();

      if (!configResult.success || !configResult.data) {
        return createSuccessResult({
          type: 'openai' as const,
          config: null,
          credentialsAvailable: false,
          requiresSetup: true,
        });
      }

      return createSuccessResult({
        type: 'openai' as const,
        config: configResult.data,
        credentialsAvailable: true,
        requiresSetup: false,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return createErrorResult(new ConfigurationError(`Failed to get OpenAI config: ${message}`));
    }
  }

  /**
   * Get storage provider configuration (always available)
   */
  getStorageConfig(): Result<ProviderConfig> {
    return createSuccessResult({
      type: 'storage' as const,
      config: { databasePath: './data/app.db' },
      credentialsAvailable: true,
      requiresSetup: false,
    });
  }

  /**
   * Initialize and test Gmail provider
   */
  async initializeGmailProvider(provider: EmailProvider): Promise<Result<ProviderInitResult>> {
    try {
      this.ensureInitialized();

      const configResult = await this.getGmailConfig();
      if (!configResult.success) {
        return createErrorResult(configResult.error);
      }

      const providerConfig = configResult.data;

      if (!providerConfig.credentialsAvailable || !providerConfig.config) {
        return createSuccessResult({
          providerId: 'gmail',
          success: false,
          initialized: false,
          connected: false,
          health: {
            healthy: false,
            status: 'unhealthy',
            message: 'Gmail OAuth credentials not configured',
            timestamp: new Date(),
          },
          requiresAuth: true,
        });
      }

      // Set storage manager on provider (cast to any to avoid type issues)
      (provider as any).setStorageManager(this.secureStorageManager!);

      // Initialize provider
      const initResult = await provider.initialize(providerConfig.config);
      if (!initResult.success) {
        return createSuccessResult({
          providerId: 'gmail',
          success: false,
          initialized: false,
          connected: false,
          health: {
            healthy: false,
            status: 'unhealthy',
            message: initResult.error.message,
            timestamp: new Date(),
          },
          error: initResult.error.message,
        });
      }

      // Test connection
      const connectResult = await provider.connect();
      const healthResult = await provider.healthCheck();

      let accountInfo: { email?: string; connectedAt?: Date } | undefined;
      if (connectResult.success && connectResult.data?.accountInfo?.email) {
        accountInfo = {
          email: connectResult.data.accountInfo.email,
          connectedAt: connectResult.data.connectedAt,
        };
      }

      return createSuccessResult({
        providerId: 'gmail',
        success: connectResult.success && healthResult.success,
        initialized: true,
        connected: connectResult.success,
        health: healthResult.success
          ? healthResult.data
          : {
              healthy: false,
              status: 'unhealthy',
              message: healthResult.error.message,
              timestamp: new Date(),
            },
        requiresAuth: !connectResult.success,
        accountInfo,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return createSuccessResult({
        providerId: 'gmail',
        success: false,
        initialized: false,
        connected: false,
        health: {
          healthy: false,
          status: 'unhealthy',
          message: `Gmail provider initialization failed: ${message}`,
          timestamp: new Date(),
        },
        error: message,
      });
    }
  }

  /**
   * Initialize and test OpenAI provider
   */
  async initializeOpenAIProvider(provider: LLMProvider): Promise<Result<ProviderInitResult>> {
    try {
      this.ensureInitialized();

      const configResult = await this.getOpenAIConfig();
      if (!configResult.success) {
        return createErrorResult(configResult.error);
      }

      const providerConfig = configResult.data;

      if (!providerConfig.credentialsAvailable || !providerConfig.config) {
        return createSuccessResult({
          providerId: 'openai',
          success: false,
          initialized: false,
          connected: false,
          health: {
            healthy: false,
            status: 'unhealthy',
            message: 'OpenAI API key not configured',
            timestamp: new Date(),
          },
          requiresAuth: true,
        });
      }

      // Set storage manager on provider (cast to any to avoid type issues)
      (provider as any).setStorageManager(this.secureStorageManager!);

      // Initialize provider
      const initResult = await provider.initialize(providerConfig.config);
      if (!initResult.success) {
        return createSuccessResult({
          providerId: 'openai',
          success: false,
          initialized: false,
          connected: false,
          health: {
            healthy: false,
            status: 'unhealthy',
            message: initResult.error.message,
            timestamp: new Date(),
          },
          error: initResult.error.message,
        });
      }

      // Test connection
      const testResult = await provider.testConnection();
      const healthResult = await provider.healthCheck();

      return createSuccessResult({
        providerId: 'openai',
        success: testResult.success && healthResult.success,
        initialized: true,
        connected: testResult.success,
        health: healthResult.success
          ? healthResult.data
          : {
              healthy: false,
              status: 'unhealthy',
              message: healthResult.error.message,
              timestamp: new Date(),
            },
        requiresAuth: !testResult.success,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return createSuccessResult({
        providerId: 'openai',
        success: false,
        initialized: false,
        connected: false,
        health: {
          healthy: false,
          status: 'unhealthy',
          message: `OpenAI provider initialization failed: ${message}`,
          timestamp: new Date(),
        },
        error: message,
      });
    }
  }

  /**
   * Initialize and test storage provider
   */
  async initializeStorageProvider(provider: StorageProvider): Promise<Result<ProviderInitResult>> {
    try {
      const configResult = this.getStorageConfig();
      if (!configResult.success) {
        return createErrorResult(configResult.error);
      }

      const providerConfig = configResult.data;

      // Initialize provider
      const initResult = await provider.initialize(providerConfig.config);
      if (!initResult.success) {
        return createSuccessResult({
          providerId: 'storage',
          success: false,
          initialized: false,
          connected: false,
          health: {
            healthy: false,
            status: 'unhealthy',
            message: initResult.error.message,
            timestamp: new Date(),
          },
          error: initResult.error.message,
        });
      }

      // Test health
      const healthResult = await provider.healthCheck();

      return createSuccessResult({
        providerId: 'storage',
        success: healthResult.success && healthResult.data.healthy,
        initialized: true,
        connected: healthResult.success && healthResult.data.healthy,
        health: healthResult.success
          ? healthResult.data
          : {
              healthy: false,
              status: 'unhealthy',
              message: healthResult.error.message,
              timestamp: new Date(),
            },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return createSuccessResult({
        providerId: 'storage',
        success: false,
        initialized: false,
        connected: false,
        health: {
          healthy: false,
          status: 'unhealthy',
          message: `Storage provider initialization failed: ${message}`,
          timestamp: new Date(),
        },
        error: message,
      });
    }
  }

  /**
   * Check if Gmail tokens need refresh and attempt refresh if needed
   */
  async checkAndRefreshGmailTokens(): Promise<Result<boolean>> {
    try {
      this.ensureInitialized();

      const tokensResult = await this.secureStorageManager!.getGmailTokens();
      if (!tokensResult.success || !tokensResult.data) {
        return createSuccessResult(false); // No tokens to refresh
      }

      const tokens = tokensResult.data;
      const currentTime = Date.now();
      const bufferTime = 5 * 60 * 1000; // 5 minutes buffer

      // Check if tokens are expired or close to expiry
      if (tokens.expiryDate <= currentTime + bufferTime) {
        console.log('[ProviderInitializationService] Gmail tokens need refresh');

        if (!tokens.refreshToken) {
          return createErrorResult(
            new AuthenticationError('Gmail tokens expired and no refresh token available', true),
          );
        }

        // Get Gmail credentials for OAuth manager
        const credentialsResult = await this.secureStorageManager!.getGmailCredentials();
        if (!credentialsResult.success || !credentialsResult.data) {
          return createErrorResult(
            new AuthenticationError('Gmail credentials not available for token refresh', true),
          );
        }

        // Initialize OAuth manager for token refresh
        const gmailOAuthManager = new GmailOAuthManager({
          clientId: credentialsResult.data.clientId,
          clientSecret: credentialsResult.data.clientSecret,
          redirectUri: 'http://localhost:8080',
        });

        const oauthInitResult = gmailOAuthManager.initialize();
        if (!oauthInitResult.success) {
          return createErrorResult(oauthInitResult.error);
        }

        // Perform token refresh
        const refreshResult = await gmailOAuthManager.refreshTokens(tokens.refreshToken);
        if (!refreshResult.success) {
          return createErrorResult(refreshResult.error);
        }

        const newTokens: GmailTokens = {
          accessToken: refreshResult.data.accessToken,
          refreshToken: refreshResult.data.refreshToken || tokens.refreshToken,
          expiryDate: refreshResult.data.expiryDate,
          scope: refreshResult.data.scope,
          tokenType: refreshResult.data.tokenType,
        };

        // Store refreshed tokens
        const storeResult = await this.secureStorageManager!.storeGmailTokens(newTokens);
        if (!storeResult.success) {
          return createErrorResult(storeResult.error);
        }

        console.log('[ProviderInitializationService] Gmail tokens refreshed successfully');
        return createSuccessResult(true);
      }

      return createSuccessResult(false); // Tokens are still valid
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return createErrorResult(
        new AuthenticationError(`Failed to refresh Gmail tokens: ${message}`, true),
      );
    }
  }

  /**
   * Ensure service is initialized
   */
  private ensureInitialized(): void {
    if (!this.initialized || !this.secureStorageManager) {
      throw new ConfigurationError('ProviderInitializationService not initialized');
    }
  }

  /**
   * Shutdown the service
   */
  async shutdown(): Promise<void> {
    this.initialized = false;
    this.secureStorageManager = undefined;
  }
}
