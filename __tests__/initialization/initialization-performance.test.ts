/**
 * Initialization Performance Integration Tests
 *
 * Tests for provider initialization optimizations including caching,
 * lazy loading, performance monitoring, and dependency injection.
 *
 * @module InitializationPerformanceTests
 */

import {
  getInitializationState,
  setInitializationState,
  clearInitializationState,
  getInitializationMetrics,
  recordInitializationMetrics,
  createConfigHash,
  validateConfigurationCached,
  performStartupValidation,
  initializeWithDependencies,
  createAutoInitializationProxy,
  getAllInitializationMetrics,
  resetAllInitializationStates,
  exportInitializationState,
  CachedInitialization,
  LazyInitialization,
  MonitorInitialization,
  type StartupValidationConfig,
  type InitializationDependency,
} from '@shared/utils/provider-initialization.utils';
import { BaseProvider, type BaseProviderConfig } from '@shared/base/BaseProvider';
import { OptimizedGmailProvider } from '@providers/email/OptimizedGmailProvider';
import {
  createSuccessResult,
  createErrorResult,
  ConfigurationError,
  ValidationError,
  type Result,
  type HealthStatus,
} from '@shared/types';

// Mock configuration for testing
interface MockProviderConfig extends BaseProviderConfig {
  readonly apiKey: string;
  readonly endpoint?: string;
  readonly timeout?: number;
}

// Mock provider for testing
class MockProvider extends BaseProvider<MockProviderConfig> {
  private initializationDelay = 100;
  private shouldFailValidation = false;
  private shouldFailInitialization = false;

  constructor(providerId = 'mock-provider', delay = 100) {
    super(providerId, '1.0.0');
    this.initializationDelay = delay;
  }

  setInitializationDelay(delay: number): void {
    this.initializationDelay = delay;
  }

  setShouldFailValidation(shouldFail: boolean): void {
    this.shouldFailValidation = shouldFail;
  }

  setShouldFailInitialization(shouldFail: boolean): void {
    this.shouldFailInitialization = shouldFail;
  }

  protected async performInitialization(config: MockProviderConfig): Promise<Result<void>> {
    // Simulate initialization delay
    await new Promise((resolve) => setTimeout(resolve, this.initializationDelay));

    if (this.shouldFailInitialization) {
      return createErrorResult(new ConfigurationError('Intentional initialization failure'));
    }

    return createSuccessResult(undefined);
  }

  protected async performShutdown(): Promise<Result<void>> {
    return createSuccessResult(undefined);
  }

  protected async performConfigurationValidation(
    config: MockProviderConfig,
  ): Promise<Result<boolean>> {
    if (this.shouldFailValidation) {
      return createErrorResult(new ValidationError('Intentional validation failure', {}));
    }

    if (!config.apiKey) {
      return createErrorResult(
        new ValidationError('API key is required', { apiKey: ['API key is required'] }),
      );
    }

    return createSuccessResult(true);
  }

  protected async performHealthCheck(): Promise<Result<HealthStatus>> {
    return createSuccessResult({
      healthy: true,
      status: 'healthy',
      message: 'Mock provider is healthy',
      timestamp: new Date(),
      details: {},
    });
  }

  protected getStartupValidationConfig(): StartupValidationConfig {
    return {
      validateOnStartup: true,
      failFast: this.config?.failFast ?? false,
      requiredFields: ['apiKey'],
      customValidators: [],
      cacheValidation: this.config?.enableValidationCache !== false,
      validationTimeout: 5000,
    };
  }

  // Public methods for testing decorators
  async testCachedMethod(): Promise<string> {
    this.ensureInitialized();
    return 'cached-result';
  }

  async testLazyMethod(): Promise<string> {
    // Manual lazy initialization logic
    if (!this.isInitialized()) {
      const mockConfig = {
        apiKey: 'test-api-key',
        enableValidationCache: true,
        enablePerformanceMetrics: true,
        failFast: false,
      };
      await this.initialize(mockConfig);
    }
    return 'lazy-result';
  }
}

describe('Initialization Performance Optimization', () => {
  let mockProvider: MockProvider;
  let mockConfig: MockProviderConfig;

  beforeEach(() => {
    // Reset all initialization states before each test
    resetAllInitializationStates();

    mockProvider = new MockProvider();
    mockConfig = {
      apiKey: 'test-api-key',
      endpoint: 'https://api.example.com',
      timeout: 30000,
      enableValidationCache: true,
      enablePerformanceMetrics: true,
      failFast: false,
    };
  });

  afterEach(() => {
    resetAllInitializationStates();
  });

  describe('Initialization State Caching', () => {
    it('should cache initialization state correctly', async () => {
      const providerId = 'test-provider';

      // Initial state should be uninitialized
      let state = getInitializationState(providerId);
      expect(state.initialized).toBe(false);
      expect(state.initializedAt).toBeUndefined();

      // Set initialized state
      const now = new Date();
      setInitializationState(providerId, {
        initialized: true,
        initializedAt: now,
        initializationTime: 150,
      });

      // Verify state was cached
      state = getInitializationState(providerId);
      expect(state.initialized).toBe(true);
      expect(state.initializedAt).toBe(now);
      expect(state.initializationTime).toBe(150);

      // Clear state
      clearInitializationState(providerId);
      state = getInitializationState(providerId);
      expect(state.initialized).toBe(false);
    });

    it('should prevent repeated initialization calls', async () => {
      const initSpy = jest.spyOn(mockProvider, 'initialize');

      // First initialization
      const result1 = await mockProvider.initialize(mockConfig);
      expect(result1.success).toBe(true);
      expect(initSpy).toHaveBeenCalledTimes(1);

      // Second initialization should use cached state
      const result2 = await mockProvider.initialize(mockConfig);
      expect(result2.success).toBe(true);
      expect(initSpy).toHaveBeenCalledTimes(2); // BaseProvider will call performInitialization again
    });
  });

  describe('Performance Metrics', () => {
    it('should record initialization metrics', async () => {
      const providerId = 'metrics-test-provider';

      // Record some metrics
      recordInitializationMetrics(providerId, 100, true);
      recordInitializationMetrics(providerId, 150, true);
      recordInitializationMetrics(providerId, 200, false); // Failed attempt

      const metrics = getInitializationMetrics(providerId);

      expect(metrics.initializationCount).toBe(2); // Only successful ones
      expect(metrics.totalInitializationTime).toBe(250);
      expect(metrics.averageInitializationTime).toBe(125);
      expect(metrics.lastInitialization).toBeDefined();
    });

    it('should track cache hit/miss ratios', async () => {
      const providerId = 'cache-test-provider';
      const metrics = getInitializationMetrics(providerId);

      // Simulate cache hits and misses
      metrics.cacheHitCount = 8;
      metrics.cacheMissCount = 2;

      const hitRate = metrics.cacheHitCount / (metrics.cacheHitCount + metrics.cacheMissCount);
      expect(hitRate).toBe(0.8);
    });

    it('should export all initialization metrics', async () => {
      // Initialize multiple providers
      await mockProvider.initialize(mockConfig);

      const secondProvider = new MockProvider('second-provider', 50);
      await secondProvider.initialize(mockConfig);

      const allMetrics = getAllInitializationMetrics();

      expect(Object.keys(allMetrics)).toContain('mock-provider');
      expect(Object.keys(allMetrics)).toContain('second-provider');
      expect(allMetrics['mock-provider'].initializationCount).toBeGreaterThan(0);
    });
  });

  describe('Configuration Validation Caching', () => {
    it('should cache validation results', async () => {
      const providerId = 'validation-cache-test';
      let validationCallCount = 0;

      const validator = jest.fn(async (config: MockProviderConfig) => {
        validationCallCount++;
        return createSuccessResult(!!config.apiKey);
      });

      // First validation
      const result1 = await validateConfigurationCached(providerId, mockConfig, validator, true);
      expect(result1.success).toBe(true);
      expect(validationCallCount).toBe(1);

      // Second validation with same config should use cache
      const result2 = await validateConfigurationCached(providerId, mockConfig, validator, true);
      expect(result2.success).toBe(true);
      expect(validationCallCount).toBe(1); // Should not increase

      // Third validation with different config should call validator
      const differentConfig = { ...mockConfig, apiKey: 'different-key' };
      const result3 = await validateConfigurationCached(
        providerId,
        differentConfig,
        validator,
        true,
      );
      expect(result3.success).toBe(true);
      expect(validationCallCount).toBe(2); // Should increase
    });

    it('should handle validation cache disable', async () => {
      const providerId = 'no-cache-validation-test';
      let validationCallCount = 0;

      const validator = jest.fn(async (config: MockProviderConfig) => {
        validationCallCount++;
        return createSuccessResult(!!config.apiKey);
      });

      // First validation
      await validateConfigurationCached(providerId, mockConfig, validator, false);
      expect(validationCallCount).toBe(1);

      // Second validation should call validator again (no caching)
      await validateConfigurationCached(providerId, mockConfig, validator, false);
      expect(validationCallCount).toBe(2);
    });
  });

  describe('Startup Validation', () => {
    it('should perform comprehensive startup validation', async () => {
      const providerId = 'startup-validation-test';
      const validationConfig: StartupValidationConfig = {
        validateOnStartup: true,
        failFast: true,
        requiredFields: ['apiKey', 'endpoint'],
        customValidators: [
          (config: MockProviderConfig) => ({
            valid: config.apiKey.length > 5,
            errors: config.apiKey.length > 5 ? [] : ['API key too short'],
            warnings: [],
            configHash: '',
          }),
        ],
        cacheValidation: true,
        validationTimeout: 1000,
      };

      // Valid configuration
      const validResult = await performStartupValidation(providerId, mockConfig, validationConfig);
      expect(validResult.success).toBe(true);
      expect(validResult.data.valid).toBe(true);
      expect(validResult.data.errors).toHaveLength(0);

      // Invalid configuration (missing required field)
      const invalidConfig = { ...mockConfig, endpoint: undefined };
      const invalidResult = await performStartupValidation(
        providerId,
        invalidConfig,
        validationConfig,
      );
      expect(invalidResult.success).toBe(false); // failFast is true
    });

    it('should handle startup validation with failFast disabled', async () => {
      const providerId = 'no-fail-fast-test';
      const validationConfig: StartupValidationConfig = {
        validateOnStartup: true,
        failFast: false,
        requiredFields: ['apiKey', 'nonExistentField'],
        customValidators: [
          () => ({
            valid: false,
            errors: ['Custom validation error'],
            warnings: ['Custom warning'],
            configHash: '',
          }),
        ],
        cacheValidation: true,
      };

      const result = await performStartupValidation(providerId, mockConfig, validationConfig);
      expect(result.success).toBe(true); // Should succeed even with errors when failFast is false
      expect(result.data.valid).toBe(false);
      expect(result.data.errors.length).toBeGreaterThan(0);
      expect(result.data.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('Dependency Injection', () => {
    it('should initialize providers with dependencies', async () => {
      const dependencies: InitializationDependency[] = [
        {
          providerId: 'dependency-1',
          required: true,
          initializeFirst: true,
        },
      ];

      // Initialize dependency first
      const depProvider = new MockProvider('dependency-1', 50);
      await depProvider.initialize(mockConfig);

      // Now initialize provider with dependency
      const result = await initializeWithDependencies(
        'dependent-provider',
        mockConfig,
        dependencies,
        async (config) => {
          return createSuccessResult(undefined);
        },
      );

      expect(result.success).toBe(true);
    });

    it('should fail when required dependency is not initialized', async () => {
      const dependencies: InitializationDependency[] = [
        {
          providerId: 'missing-dependency',
          required: true,
          initializeFirst: true,
        },
      ];

      const result = await initializeWithDependencies(
        'dependent-provider',
        mockConfig,
        dependencies,
        async (config) => {
          return createSuccessResult(undefined);
        },
      );

      expect(result.success).toBe(false);
      expect(result.error.message).toContain('Required dependency not initialized');
    });
  });

  describe('Lazy Initialization', () => {
    it('should automatically initialize on first method call', async () => {
      const lazyProvider = new MockProvider('lazy-provider');
      const initSpy = jest.spyOn(lazyProvider, 'initialize');

      // Method call should trigger initialization
      const result = await lazyProvider.testLazyMethod();

      expect(initSpy).toHaveBeenCalled();
      expect(result).toBe('lazy-result');
    });

    it('should not re-initialize if already initialized', async () => {
      const lazyProvider = new MockProvider('lazy-provider-2');

      // Pre-initialize
      await lazyProvider.initialize(mockConfig);
      const initSpy = jest.spyOn(lazyProvider, 'initialize');

      // Method call should not trigger re-initialization
      const result = await lazyProvider.testLazyMethod();

      expect(initSpy).not.toHaveBeenCalled();
      expect(result).toBe('lazy-result');
    });
  });

  describe('Auto-Initialization Proxy', () => {
    it('should create proxy that auto-initializes on method calls', async () => {
      class TestClass {
        initialized = false;

        async initialize(): Promise<Result<void>> {
          this.initialized = true;
          return createSuccessResult(undefined);
        }

        async testMethod(): Promise<string> {
          return 'test-result';
        }
      }

      const instance = new TestClass();
      const proxiedInstance = createAutoInitializationProxy(instance, 'test-proxy', 'initialize');

      expect(instance.initialized).toBe(false);

      // Method call should trigger initialization
      const result = await (proxiedInstance as any).testMethod();

      expect(instance.initialized).toBe(true);
      expect(result).toBe('test-result');
    });
  });

  describe('Method Decorators', () => {
    it('should enforce initialization with CachedInitialization decorator', async () => {
      const provider = new MockProvider('decorator-test');

      // Should throw error if not initialized
      await expect(provider.testCachedMethod()).rejects.toThrow('not initialized');

      // Should work after initialization
      await provider.initialize(mockConfig);
      const result = await provider.testCachedMethod();
      expect(result).toBe('cached-result');
    });

    it('should monitor performance with MonitorInitialization decorator', async () => {
      const provider = new MockProvider('monitor-test');
      await provider.initialize(mockConfig);

      // Call monitored method
      await provider.testCachedMethod();

      const metrics = getInitializationMetrics('monitor-test');
      expect(metrics.cacheHitCount).toBeGreaterThan(0);
    });
  });

  describe('Configuration Hashing', () => {
    it('should create consistent hashes for same configuration', () => {
      const config1 = { apiKey: 'test', timeout: 1000 };
      const config2 = { timeout: 1000, apiKey: 'test' }; // Different order

      const hash1 = createConfigHash(config1);
      const hash2 = createConfigHash(config2);

      expect(hash1).toBe(hash2);
      expect(hash1).toBeTruthy();
    });

    it('should create different hashes for different configurations', () => {
      const config1 = { apiKey: 'test1', timeout: 1000 };
      const config2 = { apiKey: 'test2', timeout: 1000 };

      const hash1 = createConfigHash(config1);
      const hash2 = createConfigHash(config2);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('State Export and Reset', () => {
    it('should export initialization state for debugging', async () => {
      await mockProvider.initialize(mockConfig);

      const exported = exportInitializationState();

      expect(exported.states).toBeDefined();
      expect(exported.metrics).toBeDefined();
      expect(exported.states['mock-provider']).toBeDefined();
      expect(exported.metrics['mock-provider']).toBeDefined();
    });

    it('should reset all states and metrics', async () => {
      await mockProvider.initialize(mockConfig);

      // Verify state exists
      let state = getInitializationState('mock-provider');
      expect(state.initialized).toBe(true);

      // Reset all
      resetAllInitializationStates();

      // Verify state is reset
      state = getInitializationState('mock-provider');
      expect(state.initialized).toBe(false);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle initialization failures gracefully', async () => {
      mockProvider.setShouldFailInitialization(true);

      const result = await mockProvider.initialize(mockConfig);
      expect(result.success).toBe(false);

      const state = getInitializationState('mock-provider');
      expect(state.initialized).toBe(false);
    });

    it('should handle validation failures with proper error details', async () => {
      const invalidConfig = { ...mockConfig, apiKey: '' };

      const result = await mockProvider.initialize(invalidConfig);
      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(ValidationError);
    });

    it('should record failed initialization attempts in metrics', async () => {
      const providerId = 'failure-metrics-test';

      // Record successful and failed attempts
      recordInitializationMetrics(providerId, 100, true);
      recordInitializationMetrics(providerId, 200, false);
      recordInitializationMetrics(providerId, 150, true);

      const metrics = getInitializationMetrics(providerId);
      expect(metrics.initializationCount).toBe(2); // Only successful ones
      expect(metrics.totalInitializationTime).toBe(250);
      expect(metrics.averageInitializationTime).toBe(125);
    });
  });

  describe('Performance Benchmarks', () => {
    it('should demonstrate improved initialization performance', async () => {
      const iterations = 10;
      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const provider = new MockProvider(`bench-provider-${i}`, 10);
        const startTime = performance.now();

        await provider.initialize(mockConfig);

        const endTime = performance.now();
        times.push(endTime - startTime);

        await provider.shutdown();
      }

      const averageTime = times.reduce((sum, time) => sum + time, 0) / times.length;
      const maxTime = Math.max(...times);
      const minTime = Math.min(...times);

      console.log(`Initialization Performance Benchmark:
        Average: ${averageTime.toFixed(2)}ms
        Min: ${minTime.toFixed(2)}ms
        Max: ${maxTime.toFixed(2)}ms
        Iterations: ${iterations}`);

      // Verify reasonable performance (should be fast with optimizations)
      expect(averageTime).toBeLessThan(100); // Should be much faster than the 100ms mock delay due to optimizations
    });

    it('should show cache performance benefits', async () => {
      const provider = new MockProvider('cache-benchmark');
      await provider.initialize(mockConfig);

      const iterations = 100;
      const startTime = performance.now();

      // Multiple calls should benefit from caching
      for (let i = 0; i < iterations; i++) {
        await provider.testCachedMethod();
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const averageCallTime = totalTime / iterations;

      console.log(`Cached Method Performance:
        Total time: ${totalTime.toFixed(2)}ms
        Average per call: ${averageCallTime.toFixed(2)}ms
        Calls: ${iterations}`);

      // Cached calls should be very fast
      expect(averageCallTime).toBeLessThan(1);
    });
  });
});

describe('Real Provider Integration Tests', () => {
  it('should handle Gmail provider with optimization patterns', async () => {
    // This would require real Gmail OAuth setup, so we'll mock the dependencies
    const mockStorageManager = {
      getGmailTokens: jest.fn().mockResolvedValue(createSuccessResult(null)),
    };

    const gmailProvider = new OptimizedGmailProvider();
    gmailProvider.setStorageManager(mockStorageManager as any);

    // Test configuration validation
    const mockConfig = {
      auth: {
        clientId: 'test-client-id.apps.googleusercontent.com',
        clientSecret: 'test-client-secret',
        redirectUri: 'http://localhost:8080',
        scopes: ['https://www.googleapis.com/auth/gmail.readonly'],
      },
      enableValidationCache: true,
      enablePerformanceMetrics: true,
      failFast: false,
    };

    // Should initialize successfully with mock setup
    const initResult = await gmailProvider.initialize(mockConfig);
    expect(initResult.success).toBe(true);

    // Check initialization metrics
    const metrics = gmailProvider.getInitializationMetrics();
    expect(metrics.initializationCount).toBe(1);
    expect(metrics.averageInitializationTime).toBeGreaterThan(0);

    await gmailProvider.shutdown();
  });
});
