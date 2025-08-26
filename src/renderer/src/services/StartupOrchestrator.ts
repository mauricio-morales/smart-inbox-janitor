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
  checkGmailConnection: () => Promise<any>;
  checkOpenAIConnection: () => Promise<any>;
  healthCheck: () => Promise<{ status: string; timestamp: Date }>;
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
      const result = await this.electronAPI.checkGmailConnection();

      // Handle different possible result structures
      if (result?.isConnected) {
        return createConnectedProviderStatus(
          'gmail',
          result.accountEmail ? `Connected as ${result.accountEmail}` : 'Connected',
        );
      } else if (result?.requiresAuth) {
        return createErrorProviderStatus(
          'gmail',
          'Gmail session expired - please sign in again',
          'token_refresh',
        );
      } else {
        return createErrorProviderStatus(
          'gmail',
          result.error || 'Gmail not configured - please set up Gmail integration',
          'initial_setup',
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
      const result = await this.electronAPI.checkOpenAIConnection();

      // Handle different possible result structures
      if (result?.isConnected && result.modelAvailable) {
        return createConnectedProviderStatus('openai', 'OpenAI GPT-4o-mini Configured');
      } else if (result?.error) {
        return createErrorProviderStatus(
          'openai',
          `OpenAI API key error: ${result.error}`,
          'full_reconfiguration',
        );
      } else {
        return createErrorProviderStatus(
          'openai',
          'OpenAI API key not configured - please set up OpenAI integration',
          'initial_setup',
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
      const result = await this.electronAPI.healthCheck();

      if (result && result.status === 'ok') {
        return createConnectedProviderStatus('storage', 'Database ready');
      } else {
        return createErrorProviderStatus(
          'storage',
          'Storage health check failed',
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
export function createStartupOrchestrator(electronAPI: ElectronAPISubset): StartupOrchestrator {
  return new StartupOrchestrator(electronAPI);
}
