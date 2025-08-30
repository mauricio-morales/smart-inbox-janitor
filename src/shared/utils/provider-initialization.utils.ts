/**
 * Provider Initialization Utilities
 *
 * Provides optimized initialization patterns including caching, lazy loading,
 * and performance monitoring for provider implementations.
 *
 * @module ProviderInitializationUtils
 */

/* global performance */

import type { Result } from '@shared/types';
import {
  createSuccessResult,
  createErrorResult,
  ConfigurationError,
  ValidationError,
} from '@shared/types';

/**
 * Initialization state cache for providers
 */
export interface InitializationState {
  initialized: boolean;
  initializedAt?: Date;
  initializationTime?: number;
  configHash?: string;
  validationCache?: Map<string, boolean>;
  lastValidated?: Date;
  errors?: Error[];
}

/**
 * Performance metrics for initialization
 */
export interface InitializationMetrics {
  initializationCount: number;
  totalInitializationTime: number;
  averageInitializationTime: number;
  cacheHitCount: number;
  cacheMissCount: number;
  validationCount: number;
  lastInitialization?: Date;
}

/**
 * Configuration validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  configHash: string;
}

/**
 * Startup validation configuration
 */
export interface StartupValidationConfig {
  validateOnStartup: boolean;
  failFast: boolean;
  requiredFields: string[];
  customValidators: Array<(config: any) => ValidationResult>;
  cacheValidation: boolean;
  validationTimeout?: number;
}

/**
 * Global initialization state cache
 */
const initializationStateCache = new Map<string, InitializationState>();
const initializationMetrics = new Map<string, InitializationMetrics>();

/**
 * Cached initialization decorator for methods
 */
export function CachedInitialization(providerId: string) {
  return function (target: any, propertyKey: string, descriptor?: PropertyDescriptor) {
    if (!descriptor) {
      // Handle the case where descriptor might be undefined
      descriptor = Object.getOwnPropertyDescriptor(target, propertyKey) || {
        value: target[propertyKey],
        writable: true,
        enumerable: true,
        configurable: true,
      };
    }

    const originalMethod = descriptor.value;

    if (typeof originalMethod !== 'function') {
      throw new ConfigurationError(`CachedInitialization decorator can only be applied to methods`);
    }

    descriptor.value = async function (...args: any[]) {
      const state = getInitializationState(providerId);

      if (!state.initialized) {
        throw new ConfigurationError(`Provider ${providerId} not initialized`, {
          provider: providerId,
          method: propertyKey,
          initialized: false,
        });
      }

      // Update metrics
      const metrics = getInitializationMetrics(providerId);
      metrics.cacheHitCount++;

      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}

/**
 * Lazy initialization decorator
 */
export function LazyInitialization(providerId: string, initMethod: string) {
  return function (target: any, propertyKey: string, descriptor?: PropertyDescriptor) {
    if (!descriptor) {
      descriptor = Object.getOwnPropertyDescriptor(target, propertyKey) || {
        value: target[propertyKey],
        writable: true,
        enumerable: true,
        configurable: true,
      };
    }

    const originalMethod = descriptor.value;

    if (typeof originalMethod !== 'function') {
      throw new ConfigurationError(`LazyInitialization decorator can only be applied to methods`);
    }

    descriptor.value = async function (...args: any[]) {
      const state = getInitializationState(providerId);

      if (!state.initialized) {
        // Lazy initializing provider for method
        const initResult = await (this as any)[initMethod]();
        if (!initResult.success) {
          throw new ConfigurationError(`Failed to lazy initialize provider ${providerId}`, {
            provider: providerId,
            method: propertyKey,
            error: initResult.error,
          });
        }
      }

      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}

/**
 * Performance monitoring decorator
 */
export function MonitorInitialization(providerId: string) {
  return function (target: any, propertyKey: string, descriptor?: PropertyDescriptor) {
    if (!descriptor) {
      descriptor = Object.getOwnPropertyDescriptor(target, propertyKey) || {
        value: target[propertyKey],
        writable: true,
        enumerable: true,
        configurable: true,
      };
    }

    const originalMethod = descriptor.value;

    if (typeof originalMethod !== 'function') {
      throw new ConfigurationError(
        `MonitorInitialization decorator can only be applied to methods`,
      );
    }

    descriptor.value = async function (...args: any[]) {
      const startTime = performance.now();

      try {
        const result = await originalMethod.apply(this, args);
        const endTime = performance.now();

        recordInitializationMetrics(providerId, endTime - startTime, true);
        return result;
      } catch (error) {
        const endTime = performance.now();
        recordInitializationMetrics(providerId, endTime - startTime, false);
        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Get initialization state for a provider
 */
export function getInitializationState(providerId: string): InitializationState {
  if (!initializationStateCache.has(providerId)) {
    initializationStateCache.set(providerId, {
      initialized: false,
      validationCache: new Map(),
    });
  }
  return initializationStateCache.get(providerId)!;
}

/**
 * Set initialization state for a provider
 */
export function setInitializationState(
  providerId: string,
  state: Partial<InitializationState>,
): void {
  const currentState = getInitializationState(providerId);
  initializationStateCache.set(providerId, { ...currentState, ...state });
}

/**
 * Clear initialization state for a provider
 */
export function clearInitializationState(providerId: string): void {
  initializationStateCache.delete(providerId);
  initializationMetrics.delete(providerId);
}

/**
 * Get initialization metrics for a provider
 */
export function getInitializationMetrics(providerId: string): InitializationMetrics {
  if (!initializationMetrics.has(providerId)) {
    initializationMetrics.set(providerId, {
      initializationCount: 0,
      totalInitializationTime: 0,
      averageInitializationTime: 0,
      cacheHitCount: 0,
      cacheMissCount: 0,
      validationCount: 0,
    });
  }
  return initializationMetrics.get(providerId)!;
}

/**
 * Record initialization metrics
 */
export function recordInitializationMetrics(
  providerId: string,
  initializationTime: number,
  success: boolean,
): void {
  const metrics = getInitializationMetrics(providerId);

  if (success) {
    metrics.initializationCount++;
    metrics.totalInitializationTime += initializationTime;
    metrics.averageInitializationTime =
      metrics.totalInitializationTime / metrics.initializationCount;
    metrics.lastInitialization = new Date();
  }
}

/**
 * Create configuration hash for caching
 */
export function createConfigHash(config: any): string {
  // Simple hash function for configuration objects
  const configString = JSON.stringify(config, Object.keys(config).sort());
  let hash = 0;
  for (let i = 0; i < configString.length; i++) {
    const char = configString.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(36);
}

/**
 * Validate configuration with caching
 */
export async function validateConfigurationCached<T>(
  providerId: string,
  config: T,
  validator: (config: T) => Promise<Result<boolean>>,
  cacheValidation = true,
): Promise<Result<boolean>> {
  const state = getInitializationState(providerId);
  const configHash = createConfigHash(config);

  if (cacheValidation && state.validationCache?.has(configHash)) {
    const metrics = getInitializationMetrics(providerId);
    metrics.cacheHitCount++;
    return createSuccessResult(true);
  }

  const metrics = getInitializationMetrics(providerId);
  metrics.cacheMissCount++;
  metrics.validationCount++;

  const validationResult = await validator(config);

  if (validationResult.success && cacheValidation) {
    state.validationCache?.set(configHash, true);
    state.lastValidated = new Date();
  }

  return validationResult;
}

/**
 * Perform startup validation with fail-fast behavior
 */
export async function performStartupValidation<T>(
  providerId: string,
  config: T,
  validationConfig: StartupValidationConfig,
): Promise<Result<ValidationResult>> {
  if (!validationConfig.validateOnStartup) {
    return createSuccessResult({
      valid: true,
      errors: [],
      warnings: [],
      configHash: createConfigHash(config),
    });
  }

  const startTime = performance.now();
  const configHash = createConfigHash(config);
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check required fields
  for (const field of validationConfig.requiredFields) {
    if (!(config as any)[field]) {
      const error = `Required field missing: ${field}`;
      errors.push(error);

      if (validationConfig.failFast) {
        return createErrorResult(
          new ValidationError(`Startup validation failed: ${error}`, {
            provider: [providerId],
            field: [field],
          }),
        );
      }
    }
  }

  // Run custom validators
  for (const validator of validationConfig.customValidators) {
    try {
      const result = validator(config);
      errors.push(...result.errors);
      warnings.push(...result.warnings);

      if (!result.valid && validationConfig.failFast) {
        return createErrorResult(
          new ValidationError(`Custom validation failed for provider ${providerId}`, {
            provider: [providerId],
            errors: result.errors,
          }),
        );
      }
    } catch (error) {
      const errorMsg = `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`;
      errors.push(errorMsg);

      if (validationConfig.failFast) {
        return createErrorResult(
          new ValidationError(errorMsg, {
            provider: [providerId],
          }),
        );
      }
    }
  }

  const validationTime = performance.now() - startTime;

  // Check timeout
  if (validationConfig.validationTimeout && validationTime > validationConfig.validationTimeout) {
    const timeoutError = `Validation timeout: ${validationTime}ms > ${validationConfig.validationTimeout}ms`;
    errors.push(timeoutError);

    if (validationConfig.failFast) {
      return createErrorResult(
        new ValidationError(timeoutError, {
          provider: [providerId],
          timeout: [validationConfig.validationTimeout.toString()],
        }),
      );
    }
  }

  const result: ValidationResult = {
    valid: errors.length === 0,
    errors,
    warnings,
    configHash,
  };

  // Cache successful validation
  if (result.valid && validationConfig.cacheValidation) {
    const state = getInitializationState(providerId);
    state.configHash = configHash;
    state.lastValidated = new Date();
  }

  return createSuccessResult(result);
}

/**
 * Create a proxy for automatic initialization
 */
export function createAutoInitializationProxy<T extends object>(
  target: T,
  providerId: string,
  initMethod: keyof T,
): T {
  return new Proxy(target, {
    get(obj, prop) {
      const value = (obj as any)[prop];

      if (typeof value === 'function' && prop !== initMethod) {
        return async function (...args: any[]) {
          const state = getInitializationState(providerId);

          if (!state.initialized) {
            // Auto-initializing provider for property
            const initResult = await (obj as any)[initMethod]();
            if (!initResult.success) {
              throw new ConfigurationError(
                `Auto-initialization failed for provider ${providerId}`,
                {
                  provider: providerId,
                  property: String(prop),
                  error: initResult.error,
                },
              );
            }
          }

          return value.apply(obj, args);
        };
      }

      return value;
    },
  });
}

/**
 * Dependency injection for initialization
 */
export interface InitializationDependency {
  providerId: string;
  required: boolean;
  initializeFirst: boolean;
}

/**
 * Initialize providers with dependency management
 */
export async function initializeWithDependencies<T>(
  providerId: string,
  config: T,
  dependencies: InitializationDependency[],
  initFunction: (config: T) => Promise<Result<void>>,
): Promise<Result<void>> {
  // Check if already initialized
  const state = getInitializationState(providerId);
  if (state.initialized) {
    return createSuccessResult(undefined);
  }

  // Initialize required dependencies first
  for (const dep of dependencies.filter((d) => d.required && d.initializeFirst)) {
    const depState = getInitializationState(dep.providerId);
    if (!depState.initialized) {
      return createErrorResult(
        new ConfigurationError(`Required dependency not initialized: ${dep.providerId}`, {
          provider: providerId,
          dependency: dep.providerId,
        }),
      );
    }
  }

  const startTime = performance.now();

  try {
    const result = await initFunction(config);
    const endTime = performance.now();

    if (result.success) {
      setInitializationState(providerId, {
        initialized: true,
        initializedAt: new Date(),
        initializationTime: endTime - startTime,
        configHash: createConfigHash(config),
      });

      recordInitializationMetrics(providerId, endTime - startTime, true);
    } else {
      recordInitializationMetrics(providerId, endTime - startTime, false);
    }

    return result;
  } catch (error) {
    const endTime = performance.now();
    recordInitializationMetrics(providerId, endTime - startTime, false);

    const errorMsg = error instanceof Error ? error.message : 'Unknown initialization error';
    return createErrorResult(
      new ConfigurationError(`Initialization failed for provider ${providerId}: ${errorMsg}`, {
        provider: providerId,
        error: errorMsg,
      }),
    );
  }
}

/**
 * Get all initialization metrics for reporting
 */
export function getAllInitializationMetrics(): Record<string, InitializationMetrics> {
  const allMetrics: Record<string, InitializationMetrics> = {};

  for (const [providerId, metrics] of initializationMetrics.entries()) {
    allMetrics[providerId] = { ...metrics };
  }

  return allMetrics;
}

/**
 * Reset all initialization states and metrics
 */
export function resetAllInitializationStates(): void {
  initializationStateCache.clear();
  initializationMetrics.clear();
}

/**
 * Export cached initialization state for debugging
 */
export function exportInitializationState(): {
  states: Record<string, InitializationState>;
  metrics: Record<string, InitializationMetrics>;
} {
  const states: Record<string, InitializationState> = {};
  const metricsData: Record<string, InitializationMetrics> = {};

  for (const [providerId, state] of initializationStateCache.entries()) {
    states[providerId] = { ...state, validationCache: undefined }; // Don't export cache
  }

  for (const [providerId, metrics] of initializationMetrics.entries()) {
    metricsData[providerId] = { ...metrics };
  }

  return { states, metrics: metricsData };
}
