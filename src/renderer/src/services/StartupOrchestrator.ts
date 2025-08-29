/**
 * StartupOrchestrator service for coordinating provider health checks
 *
 * This service aggregates provider health checks to determine app readiness
 * and provides consistent error handling with timeouts.
 *
 * @module StartupOrchestrator
 */

import type { ProviderStatus } from '../machines/startupMachine';
import {
  createConnectedProviderStatus,
  createErrorProviderStatus,
} from '../machines/startupMachine';

/**
 * ElectronAPI interface subset needed for provider checks
 */
interface ElectronAPISubset {
  oauth: {
    checkGmailConnection: () => Promise<any>;
    checkOpenAIConnection: () => Promise<any>;
  };
  storage: {
    healthCheck: () => Promise<{
      success: boolean;
      data?: { healthy: boolean; status: string; message?: string };
    }>;
  };
}

/**
 * Service for orchestrating provider startup checks
 */
export class StartupOrchestrator {
  private readonly electronAPI: ElectronAPISubset;

  constructor(electronAPI: ElectronAPISubset) {
    this.electronAPI = electronAPI;
  }

  /**
   * Check all providers in parallel with timeout handling
   *
   * @returns Promise resolving to array of provider statuses
   */
  async checkAllProviders(): Promise<ProviderStatus[]> {
    const startTime = Date.now();
    console.log('[StartupOrchestrator] Starting provider health checks...');

    // Run all checks in parallel with individual timeouts
    const checks = [
      this.checkProvider('gmail'),
      this.checkProvider('openai'),
      this.checkProvider('storage'),
    ];

    // Use Promise.allSettled to ensure all checks complete even if some fail
    const results = await Promise.allSettled(
      checks.map((check) => this.withTimeout(check, 5000, 'Provider check timeout')),
    );

    const providers = results.map((result, index) => {
      const providerId = ['gmail', 'openai', 'storage'][index] as ProviderStatus['id'];

      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        console.warn(`[StartupOrchestrator] Provider ${providerId} check failed:`, result.reason);
        return createErrorProviderStatus(
          providerId,
          result.reason?.message || 'Health check failed',
          'full_reconfiguration',
        );
      }
    });

    const duration = Date.now() - startTime;
    console.log(`[StartupOrchestrator] Provider checks completed in ${duration}ms:`, {
      providers: providers.map((p) => ({
        id: p.id,
        status: p.status,
        requiresSetup: p.requiresSetup,
      })),
    });

    return providers;
  }

  /**
   * Check individual provider health
   *
   * @param providerId - The provider to check
   * @returns Promise resolving to provider status
   */
  async checkProvider(providerId: ProviderStatus['id']): Promise<ProviderStatus> {
    console.log(`[StartupOrchestrator] Checking ${providerId} provider...`);

    try {
      switch (providerId) {
        case 'gmail':
          return await this.checkGmailProvider();
        case 'openai':
          return await this.checkOpenAIProvider();
        case 'storage':
          return await this.checkStorageProvider();
        default:
          return createErrorProviderStatus(
            providerId,
            `Unknown provider: ${providerId}`,
            'initial_setup',
          );
      }
    } catch (error) {
      console.error(`[StartupOrchestrator] Error checking ${providerId}:`, error);
      return createErrorProviderStatus(
        providerId,
        error instanceof Error ? error.message : 'Unknown error',
        'full_reconfiguration',
      );
    }
  }

  /**
   * Determine if app is usable with current provider states
   *
   * @param providers - Array of provider statuses
   * @returns True if app is usable, false otherwise
   */
  isAppUsable(providers: ProviderStatus[]): boolean {
    console.log(
      '[StartupOrchestrator] isAppUsable called with providers:',
      providers.map((p) => ({
        id: p.id,
        status: p.status,
        requiresSetup: p.requiresSetup,
        message: p.message,
      })),
    );

    // App requires ALL three providers: Storage + Gmail + OpenAI
    const storage = providers.find((p) => p.id === 'storage');
    const gmail = providers.find((p) => p.id === 'gmail');
    const openai = providers.find((p) => p.id === 'openai');

    console.log('[StartupOrchestrator] Found providers:', {
      storage: storage
        ? { id: storage.id, status: storage.status, requiresSetup: storage.requiresSetup }
        : 'NOT FOUND',
      gmail: gmail
        ? { id: gmail.id, status: gmail.status, requiresSetup: gmail.requiresSetup }
        : 'NOT FOUND',
      openai: openai
        ? { id: openai.id, status: openai.status, requiresSetup: openai.requiresSetup }
        : 'NOT FOUND',
    });

    const hasWorkingStorage = storage?.status === 'connected';
    const hasWorkingGmail = gmail?.status === 'connected';
    const hasWorkingOpenAI = openai?.status === 'connected';

    console.log('[StartupOrchestrator] Status evaluation:', {
      hasWorkingStorage,
      hasWorkingGmail,
      hasWorkingOpenAI,
    });

    if (!hasWorkingStorage) {
      console.log('[StartupOrchestrator] App not usable: storage not connected', {
        storageFound: !!storage,
        storageStatus: storage?.status,
      });
      return false;
    }

    if (!hasWorkingGmail) {
      console.log('[StartupOrchestrator] App not usable: Gmail not connected', {
        gmailFound: !!gmail,
        gmailStatus: gmail?.status,
      });
      return false;
    }

    if (!hasWorkingOpenAI) {
      console.log('[StartupOrchestrator] App not usable: OpenAI not connected', {
        openaiFound: !!openai,
        openaiStatus: openai?.status,
      });
      return false;
    }

    console.log('[StartupOrchestrator] App is usable: all required providers connected');
    return true;
  }

  /**
   * Check Gmail provider health
   */
  private async checkGmailProvider(): Promise<ProviderStatus> {
    try {
      const result = await this.electronAPI.oauth.checkGmailConnection();

      // Check if this is an API not ready error
      if (!result.success && result.error?.code === 'API_NOT_READY') {
        return createErrorProviderStatus(
          'gmail',
          'System initializing - please wait...',
          'initial_setup',
        );
      }

      // Handle different possible result structures
      if (result.success && result.data?.isConnected) {
        return createConnectedProviderStatus(
          'gmail',
          result.data.accountEmail ? `Connected as ${result.data.accountEmail}` : 'Connected',
        );
      } else if (result.success && result.data?.requiresAuth) {
        return createErrorProviderStatus(
          'gmail',
          'Gmail session expired - please sign in again',
          'token_refresh',
        );
      } else {
        return createErrorProviderStatus(
          'gmail',
          result.success
            ? result.data?.error || 'Gmail not configured - please set up Gmail integration'
            : result.error?.message || 'Gmail connection failed',
          result.success ? 'initial_setup' : 'full_reconfiguration',
        );
      }
    } catch (error) {
      console.warn('[StartupOrchestrator] Gmail check failed:', error);
      return createErrorProviderStatus(
        'gmail',
        error instanceof Error ? error.message : 'Gmail connection failed',
        'full_reconfiguration',
      );
    }
  }

  /**
   * Check OpenAI provider health
   */
  private async checkOpenAIProvider(): Promise<ProviderStatus> {
    try {
      const result = await this.electronAPI.oauth.checkOpenAIConnection();

      // Check if this is an API not ready error
      if (!result.success && result.error?.code === 'API_NOT_READY') {
        return createErrorProviderStatus(
          'openai',
          'System initializing - please wait...',
          'initial_setup',
        );
      }

      // Handle different possible result structures
      if (result.success && result.data?.isConnected && result.data?.modelAvailable) {
        return createConnectedProviderStatus('openai', 'OpenAI GPT-4o-mini Configured');
      } else if (result.success && result.data?.error) {
        return createErrorProviderStatus(
          'openai',
          `OpenAI API key error: ${result.data.error}`,
          'full_reconfiguration',
        );
      } else {
        return createErrorProviderStatus(
          'openai',
          result.success
            ? 'OpenAI API key not configured - please set up OpenAI integration'
            : result.error?.message || 'OpenAI connection failed',
          result.success ? 'initial_setup' : 'full_reconfiguration',
        );
      }
    } catch (error) {
      console.warn('[StartupOrchestrator] OpenAI check failed:', error);
      return createErrorProviderStatus(
        'openai',
        error instanceof Error ? error.message : 'OpenAI connection failed',
        'full_reconfiguration',
      );
    }
  }

  /**
   * Check storage provider health
   */
  private async checkStorageProvider(): Promise<ProviderStatus> {
    try {
      const result = await this.electronAPI.storage.healthCheck();

      if (result.success && result.data?.healthy && result.data?.status === 'healthy') {
        return createConnectedProviderStatus('storage', 'Database ready');
      } else {
        return createErrorProviderStatus(
          'storage',
          result.data?.message || 'Storage health check failed',
          'full_reconfiguration',
        );
      }
    } catch (error) {
      console.warn('[StartupOrchestrator] Storage check failed:', error);
      return createErrorProviderStatus(
        'storage',
        error instanceof Error ? error.message : 'Storage connection failed',
        'full_reconfiguration',
      );
    }
  }

  /**
   * Wrap a promise with a timeout
   *
   * @param promise - Promise to wrap
   * @param timeoutMs - Timeout in milliseconds
   * @param timeoutMessage - Message to use if timeout occurs
   * @returns Promise that resolves or rejects with timeout
   */
  private withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    timeoutMessage: string,
  ): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) => setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs)),
    ]);
  }
}

/**
 * Create StartupOrchestrator instance with ElectronAPI
 *
 * @param electronAPI - ElectronAPI instance for provider checks
 * @returns StartupOrchestrator instance
 */
export function createStartupOrchestrator(electronAPI: any): StartupOrchestrator {
  const keys = Object.keys(electronAPI || {});
  console.log('[createStartupOrchestrator] electronAPI keys:', keys);
  console.log('[createStartupOrchestrator] oauth available:', !!electronAPI?.oauth);
  console.log('[createStartupOrchestrator] storage available:', !!electronAPI?.storage);
  console.log('[createStartupOrchestrator] actual keys array:', keys);

  // Check if electronAPI is actually available and has the expected structure
  if (!electronAPI || !electronAPI.oauth || !electronAPI.storage) {
    console.error('[createStartupOrchestrator] electronAPI not properly initialized:', {
      available: !!electronAPI,
      hasOauth: !!electronAPI?.oauth,
      hasStorage: !!electronAPI?.storage,
    });
  }

  // Try multiple ways to access the API methods
  const gmailCheck = electronAPI?.oauth?.checkGmailConnection || electronAPI?.checkGmailConnection;
  const openaiCheck =
    electronAPI?.oauth?.checkOpenAIConnection || electronAPI?.checkOpenAIConnection;
  const storageCheck = electronAPI?.storage?.healthCheck || electronAPI?.healthCheck;

  console.log('[createStartupOrchestrator] Method availability:', {
    gmailCheck: typeof gmailCheck,
    openaiCheck: typeof openaiCheck,
    storageCheck: typeof storageCheck,
  });

  return new StartupOrchestrator({
    oauth: {
      checkGmailConnection:
        gmailCheck ||
        (() => {
          console.warn('[StartupOrchestrator] Gmail check unavailable - API not ready');
          return Promise.resolve({
            success: false,
            error: {
              code: 'API_NOT_READY',
              message: 'Electron API not available - initialization in progress',
              retryable: true,
              timestamp: new Date(),
              details: { provider: 'gmail' },
            },
          });
        }),
      checkOpenAIConnection:
        openaiCheck ||
        (() => {
          console.warn('[StartupOrchestrator] OpenAI check unavailable - API not ready');
          return Promise.resolve({
            success: false,
            error: {
              code: 'API_NOT_READY',
              message: 'Electron API not available - initialization in progress',
              retryable: true,
              timestamp: new Date(),
              details: { provider: 'openai' },
            },
          });
        }),
    },
    storage: {
      healthCheck:
        storageCheck ||
        (() => {
          console.warn('[StartupOrchestrator] Storage check unavailable - API not ready');
          return Promise.resolve({
            success: false,
            data: {
              healthy: false,
              status: 'unhealthy',
              message: 'Electron API not available - initialization in progress',
            },
          });
        }),
    },
  });
}
