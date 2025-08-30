/**
 * useProviderStatus hook
 *
 * React hook for real-time provider status monitoring and management.
 * Provides access to provider statuses and methods for refreshing individual
 * or all providers.
 *
 * @module useProviderStatus
 */

import React, { useState, useCallback, useRef, useMemo } from 'react';
import type { ProviderStatus } from '../machines/startupMachine';
import { createStartupOrchestrator } from '../services/StartupOrchestrator';
import type { ElectronAPI } from '../../../preload';

/**
 * Configuration for provider status caching and refresh behavior
 */
interface UseProviderStatusConfig {
  /** Minimum time between automatic refreshes (in milliseconds) */
  minRefreshInterval?: number;
  /** Whether to automatically refresh on window focus */
  refreshOnFocus?: boolean;
  /** Initial refresh on hook mount */
  initialRefresh?: boolean;
}

/**
 * Return type for useProviderStatus hook
 */
interface UseProviderStatusReturn {
  /** Current provider statuses */
  providers: ProviderStatus[];
  /** Whether any provider operations are currently loading */
  loading: boolean;
  /** Last error that occurred during provider operations */
  error: string | null;
  /** Last time providers were refreshed */
  lastRefresh: Date | null;
  /** Refresh all providers */
  refreshAllProviders: () => Promise<void>;
  /** Refresh a specific provider */

  refreshProvider: (providerId: string) => Promise<void>;
  /** Clear any existing error */
  clearError: () => void;
  /** Force refresh ignoring cache timers */
  forceRefresh: () => Promise<void>;
}

/**
 * Default configuration for useProviderStatus
 */
const DEFAULT_CONFIG: Required<UseProviderStatusConfig> = {
  minRefreshInterval: 30000, // 30 seconds
  refreshOnFocus: true,
  initialRefresh: true,
};

/**
 * React hook for provider status management
 *
 * @param config - Configuration options for the hook
 * @returns Provider status data and management functions
 */
export function useProviderStatus(config: UseProviderStatusConfig = {}): UseProviderStatusReturn {
  const resolvedConfig = { ...DEFAULT_CONFIG, ...config };

  // State for tracking API availability
  const [electronAPIReady, setElectronAPIReady] = useState(false);
  const [rawElectronAPI, setRawElectronAPI] = useState<ElectronAPI | null>(null);

  // Check for electronAPI availability and wait for it to be ready
  React.useEffect(() => {
    const checkAPI = () => {
      const api = (globalThis as typeof globalThis & { electronAPI: ElectronAPI }).electronAPI;
      console.log('[useProviderStatus] Checking electronAPI availability:', {
        available: !!api,
        hasOauth: !!api?.oauth,
        hasStorage: !!api?.storage,
        keys: Object.keys(api || {}),
        keysArray: Object.keys(api || {}),
        oauthType: typeof api?.oauth,
        storageType: typeof api?.storage,
      });

      if (api && api.oauth && api.storage) {
        setRawElectronAPI(api);
        setElectronAPIReady(true);
        return true;
      }
      return false;
    };

    // Check immediately
    if (!checkAPI()) {
      // If not ready, poll every 100ms until it is
      const interval = setInterval(() => {
        if (checkAPI()) {
          clearInterval(interval);
        }
      }, 100);

      // Cleanup interval after 5 seconds max
      const timeout = setTimeout(() => clearInterval(interval), 5000);

      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    }

    // Return empty cleanup function for immediate success case
    return () => {};
  }, []);

  // State
  const [providers, setProviders] = useState<ProviderStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  // Refs for managing refresh timers and preventing concurrent refreshes
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastRefreshTimeRef = useRef<number>(0);
  const refreshPromiseRef = useRef<Promise<void> | null>(null);

  // Create orchestrator instance (memoized) - only when API is ready
  const orchestrator = useMemo(() => {
    if (!electronAPIReady || !rawElectronAPI) {
      console.log('[useProviderStatus] API not ready, using null orchestrator');
      return null;
    }
    console.log('[useProviderStatus] Creating orchestrator with ready API');
    return createStartupOrchestrator(rawElectronAPI);
  }, [electronAPIReady, rawElectronAPI]);

  /**
   * Internal refresh function that handles all provider updates
   */
  const performRefresh = useCallback(
    async (force = false): Promise<void> => {
      const now = Date.now();

      // Check if we should skip due to rate limiting (unless forced)
      if (!force && now - lastRefreshTimeRef.current < resolvedConfig.minRefreshInterval) {
        console.log('[useProviderStatus] Skipping refresh due to rate limiting');
        return;
      }

      // If there's already a refresh in progress, wait for it
      if (refreshPromiseRef.current && !force) {
        console.log('[useProviderStatus] Refresh already in progress, waiting...');
        return refreshPromiseRef.current;
      }

      // Start new refresh
      const refreshPromise = (async () => {
        try {
          setLoading(true);
          setError(null);
          lastRefreshTimeRef.current = now;

          console.log('[useProviderStatus] Refreshing all providers...');

          if (!orchestrator) {
            console.warn('[useProviderStatus] Orchestrator not ready, cannot refresh providers');
            setError('System not ready - please wait...');
            return;
          }

          const updatedProviders = await orchestrator.checkAllProviders();

          setProviders(updatedProviders);
          setLastRefresh(new Date());

          console.log('[useProviderStatus] Providers refreshed successfully:', {
            count: updatedProviders.length,
            connected: updatedProviders.filter((p) => p.status === 'connected').length,
            needsSetup: updatedProviders.filter((p) => p.requiresSetup).length,
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Unknown error';
          console.error('[useProviderStatus] Provider refresh failed:', err);
          setError(`Failed to refresh providers: ${message}`);
        } finally {
          setLoading(false);
          refreshPromiseRef.current = null;
        }
      })();

      refreshPromiseRef.current = refreshPromise;
      return refreshPromise;
    },
    [orchestrator, resolvedConfig.minRefreshInterval],
  );

  /**
   * Refresh all providers
   */
  const refreshAllProviders = useCallback(async (): Promise<void> => {
    await performRefresh(false);
  }, [performRefresh]);

  /**
   * Refresh a specific provider
   */
  const refreshProvider = useCallback(
    async (providerId: string): Promise<void> => {
      try {
        setLoading(true);
        setError(null);

        console.log(`[useProviderStatus] Refreshing provider: ${providerId}`);

        if (!orchestrator) {
          console.warn(
            `[useProviderStatus] Orchestrator not ready, cannot refresh provider ${providerId}`,
          );
          setError('System not ready - please wait...');
          return;
        }

        const updatedProvider = await orchestrator.checkProvider(
          providerId as ProviderStatus['id'],
        );

        // Update the specific provider in the array
        setProviders((prevProviders) =>
          prevProviders.map((p) => (p.id === providerId ? updatedProvider : p)),
        );

        console.log(`[useProviderStatus] Provider ${providerId} refreshed:`, {
          status: updatedProvider.status,
          requiresSetup: updatedProvider.requiresSetup,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        console.error(`[useProviderStatus] Provider ${providerId} refresh failed:`, err);
        setError(`Failed to refresh ${providerId}: ${message}`);
      } finally {
        setLoading(false);
      }
    },
    [orchestrator],
  );

  /**
   * Force refresh ignoring rate limiting
   */
  const forceRefresh = useCallback(async (): Promise<void> => {
    console.log('[useProviderStatus] Force refresh requested');
    await performRefresh(true);
  }, [performRefresh]);

  /**
   * Clear any existing error
   */
  const clearError = useCallback((): void => {
    setError(null);
  }, []);

  // Initial refresh on mount (wait for API to be ready)
  React.useEffect(() => {
    if (resolvedConfig.initialRefresh && orchestrator) {
      console.log('[useProviderStatus] Performing initial refresh...');
      performRefresh(true).catch((err) => {
        console.error('[useProviderStatus] Initial refresh failed:', err);
      });
    }
  }, [orchestrator]); // Wait for orchestrator to be ready

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, []);

  // Window focus refresh (if enabled)
  React.useEffect(() => {
    if (!resolvedConfig.refreshOnFocus) {
      return;
    }

    const handleFocus = () => {
      console.log('[useProviderStatus] Window focused, refreshing providers...');
      performRefresh(false).catch((err) => {
        console.error('[useProviderStatus] Focus refresh failed:', err);
      });
    };

    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [resolvedConfig.refreshOnFocus, performRefresh]);

  return {
    providers,
    loading,
    error,
    lastRefresh,
    refreshAllProviders,
    refreshProvider,
    clearError,
    forceRefresh,
  };
}

/**
 * Default export for convenience
 */
export default useProviderStatus;
