/**
 * Base Provider Class
 *
 * Abstract base class providing common initialization logic, state management,
 * and performance monitoring for all provider implementations.
 *
 * @module BaseProvider
 */

/* global performance */

import type { Result, HealthStatus } from '@shared/types';
import { createSuccessResult, createErrorResult, ConfigurationError } from '@shared/types';
import {
  type InitializationState,
  type InitializationMetrics,
  type StartupValidationConfig,
  getInitializationState,
  setInitializationState,
  clearInitializationState,
  validateConfigurationCached,
  performStartupValidation,
  initializeWithDependencies,
  type InitializationDependency,
  recordInitializationMetrics,
} from '@shared/utils/provider-initialization.utils';

/**
 * Base provider configuration interface
 */
export interface BaseProviderConfig {
  readonly enableValidationCache?: boolean;
  readonly validationTimeout?: number;
  readonly failFast?: boolean;
  readonly enablePerformanceMetrics?: boolean;
}

/**
 * Provider lifecycle hooks
 */
export interface ProviderLifecycleHooks<TConfig> {
  onPreInitialize?(_config: TConfig): Promise<Result<void>>;
  onPostInitialize?(_config: TConfig): Promise<Result<void>>;
  onPreShutdown?(): Promise<Result<void>>;
  onPostShutdown?(): Promise<Result<void>>;
  onConfigurationChanged?(_oldConfig: TConfig, _newConfig: TConfig): Promise<Result<void>>;
}

/**
 * Abstract base provider class with common initialization logic
 */
export abstract class BaseProvider<TConfig extends BaseProviderConfig>
  implements ProviderLifecycleHooks<TConfig>
{
  protected config: TConfig | null = null;
  protected readonly providerId: string;
  protected readonly providerVersion: string;

  constructor(providerId: string, version: string = '1.0.0') {
    this.providerId = providerId;
    this.providerVersion = version;
  }

  /**
   * Get provider identification
   */
  get name(): string {
    return this.providerId;
  }

  get version(): string {
    return this.providerVersion;
  }

  /**
   * Initialize the provider with configuration
   */
  async initialize(config: TConfig): Promise<Result<void>> {
    const startTime = performance.now();

    try {
      // Pre-initialization hook
      if (this.onPreInitialize) {
        const preInitResult = await this.onPreInitialize(config);
        if (!preInitResult.success) {
          return preInitResult;
        }
      }

      // Perform startup validation
      const validationConfig = this.getStartupValidationConfig();
      const validationResult = await performStartupValidation(
        this.providerId,
        config,
        validationConfig,
      );

      if (!validationResult.success) {
        return createErrorResult(validationResult.error);
      }

      if (!validationResult.data.valid) {
        return createErrorResult(
          new ConfigurationError(`Startup validation failed for provider ${this.providerId}`, {
            provider: this.providerId,
            errors: validationResult.data.errors,
          }),
        );
      }

      // Get dependencies and initialize with dependency management
      const dependencies = this.getInitializationDependencies();
      const initResult = await initializeWithDependencies(
        this.providerId,
        config,
        dependencies,
        async (cfg) => {
          this.config = cfg;
          return this.performInitialization(cfg);
        },
      );

      if (!initResult.success) {
        return initResult;
      }

      // Post-initialization hook
      if (this.onPostInitialize) {
        const postInitResult = await this.onPostInitialize(config);
        if (!postInitResult.success) {
          return postInitResult;
        }
      }

      const endTime = performance.now();

      // Record metrics if enabled
      if (config?.enablePerformanceMetrics !== false) {
        recordInitializationMetrics(this.providerId, endTime - startTime, true);
      }

      return createSuccessResult(undefined);
    } catch (error) {
      const endTime = performance.now();

      if (config?.enablePerformanceMetrics !== false) {
        recordInitializationMetrics(this.providerId, endTime - startTime, false);
      }

      const message = error instanceof Error ? error.message : 'Unknown initialization error';
      return createErrorResult(
        new ConfigurationError(`Provider ${this.providerId} initialization failed: ${message}`, {
          provider: this.providerId,
          error: message,
        }),
      );
    }
  }

  /**
   * Shutdown the provider and clean up resources
   */
  async shutdown(): Promise<Result<void>> {
    try {
      // Pre-shutdown hook
      if (this.onPreShutdown) {
        const preShutdownResult = await this.onPreShutdown();
        if (!preShutdownResult.success) {
          return preShutdownResult;
        }
      }

      // Perform provider-specific shutdown
      const shutdownResult = await this.performShutdown();
      if (!shutdownResult.success) {
        return shutdownResult;
      }

      // Clear initialization state
      clearInitializationState(this.providerId);
      this.config = null;

      // Post-shutdown hook
      if (this.onPostShutdown) {
        const postShutdownResult = await this.onPostShutdown();
        if (!postShutdownResult.success) {
          return postShutdownResult;
        }
      }

      return createSuccessResult(undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown shutdown error';
      return createErrorResult(
        new ConfigurationError(`Provider ${this.providerId} shutdown failed: ${message}`, {
          provider: this.providerId,
          error: message,
        }),
      );
    }
  }

  /**
   * Get current provider configuration (readonly copy)
   */
  getConfig(): Readonly<TConfig> {
    if (!this.config) {
      throw new ConfigurationError('Provider not initialized - no configuration available');
    }
    return { ...this.config };
  }

  /**
   * Update provider configuration
   */
  async updateConfig(newConfig: TConfig): Promise<Result<void>> {
    const oldConfig = this.config;

    try {
      // Validate new configuration
      const validationResult = await this.validateConfiguration(newConfig);
      if (!validationResult.success) {
        return validationResult;
      }

      // Configuration change hook
      if (this.onConfigurationChanged && oldConfig) {
        const changeResult = await this.onConfigurationChanged(oldConfig, newConfig);
        if (!changeResult.success) {
          return changeResult;
        }
      }

      this.config = newConfig;

      // Update initialization state
      const state = getInitializationState(this.providerId);
      setInitializationState(this.providerId, {
        ...state,
        configHash: undefined, // Force re-validation on next operation
        lastValidated: undefined,
      });

      return createSuccessResult(undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown configuration update error';
      return createErrorResult(
        new ConfigurationError(
          `Configuration update failed for provider ${this.providerId}: ${message}`,
          {
            provider: this.providerId,
            error: message,
          },
        ),
      );
    }
  }

  /**
   * Check if provider is initialized
   */
  isInitialized(): boolean {
    const state = getInitializationState(this.providerId);
    return state.initialized && this.config !== null;
  }

  /**
   * Get initialization state
   */
  getInitializationState(): InitializationState {
    return getInitializationState(this.providerId);
  }

  /**
   * Get initialization metrics
   */
  getInitializationMetrics(): InitializationMetrics {
    const { getInitializationMetrics } = require('@shared/utils/provider-initialization.utils');
    return getInitializationMetrics(this.providerId);
  }

  /**
   * Validate configuration with caching
   */
  async validateConfiguration(config: TConfig): Promise<Result<boolean>> {
    const enableCache = config.enableValidationCache !== false;

    return validateConfigurationCached(
      this.providerId,
      config,
      async (cfg) => this.performConfigurationValidation(cfg),
      enableCache,
    );
  }

  /**
   * Enhanced health check with initialization state
   */
  async healthCheck(): Promise<Result<HealthStatus>> {
    const state = getInitializationState(this.providerId);
    const metrics = this.getInitializationMetrics();

    if (!state.initialized || !this.config) {
      return createSuccessResult({
        healthy: false,
        status: 'unhealthy',
        message: `Provider ${this.providerId} not initialized`,
        timestamp: new Date(),
        details: {
          initialized: state.initialized,
          configPresent: this.config !== null,
          providerId: this.providerId,
        },
      });
    }

    try {
      // Perform provider-specific health check
      const healthResult = await this.performHealthCheck();

      if (healthResult.success) {
        // Enhance with initialization metrics
        const enhancedHealth = {
          ...healthResult.data,
          details: {
            ...((healthResult.data as any).details || {}),
            initializationMetrics: {
              initializationCount: metrics.initializationCount,
              averageInitializationTime: metrics.averageInitializationTime,
              cacheHitRate:
                metrics.cacheHitCount / (metrics.cacheHitCount + metrics.cacheMissCount) || 0,
              lastInitialization: metrics.lastInitialization,
            },
            initializationState: {
              initializedAt: state.initializedAt,
              initializationTime: state.initializationTime,
              lastValidated: state.lastValidated,
            },
          },
        };

        return createSuccessResult(enhancedHealth);
      }

      return healthResult;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown health check error';
      return createSuccessResult({
        healthy: false,
        status: 'unhealthy',
        message: `Health check failed for provider ${this.providerId}: ${message}`,
        timestamp: new Date(),
        details: { error: message },
      });
    }
  }

  /**
   * Ensure provider is initialized (throws if not)
   */
  protected ensureInitialized(): void {
    const state = getInitializationState(this.providerId);
    if (!state.initialized || !this.config) {
      throw new ConfigurationError(`Provider ${this.providerId} not initialized`, {
        provider: this.providerId,
        initialized: state.initialized,
        configPresent: this.config !== null,
      });
    }
  }

  // Abstract methods to be implemented by concrete providers

  /**
   * Perform provider-specific initialization
   */
  protected abstract performInitialization(_config: TConfig): Promise<Result<void>>;

  /**
   * Perform provider-specific shutdown
   */
  protected abstract performShutdown(): Promise<Result<void>>;

  /**
   * Perform provider-specific configuration validation
   */
  protected abstract performConfigurationValidation(_config: TConfig): Promise<Result<boolean>>;

  /**
   * Perform provider-specific health check
   */
  protected abstract performHealthCheck(): Promise<Result<HealthStatus>>;

  // Optional methods that can be overridden

  /**
   * Get startup validation configuration
   */
  protected getStartupValidationConfig(): StartupValidationConfig {
    return {
      validateOnStartup: true,
      failFast: this.config?.failFast ?? false,
      requiredFields: [],
      customValidators: [],
      cacheValidation: this.config?.enableValidationCache !== false,
      validationTimeout: this.config?.validationTimeout,
    };
  }

  /**
   * Get initialization dependencies
   */
  protected getInitializationDependencies(): InitializationDependency[] {
    return [];
  }

  // Lifecycle hooks (can be overridden)

  async onPreInitialize?(_config: TConfig): Promise<Result<void>>;
  async onPostInitialize?(_config: TConfig): Promise<Result<void>>;
  async onPreShutdown?(): Promise<Result<void>>;
  async onPostShutdown?(): Promise<Result<void>>;
  async onConfigurationChanged?(_oldConfig: TConfig, _newConfig: TConfig): Promise<Result<void>>;
}
