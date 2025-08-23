/**
 * Base provider interfaces and fundamental types for Smart Inbox Janitor
 * 
 * This module defines the foundational types that all provider implementations
 * must extend, including the Result pattern for consistent error handling.
 * 
 * @module BaseTypes
 */

/**
 * Result pattern for consistent error handling across all provider operations
 * 
 * All async provider methods must return Result types instead of throwing exceptions
 * to ensure predictable error handling and better type safety.
 * 
 * @template T - The success data type
 * @template E - The error type (defaults to ProviderError)
 * 
 * @example
 * ```typescript
 * async function fetchEmails(): Promise<Result<Email[]>> {
 *   try {
 *     const emails = await api.getEmails();
 *     return { success: true, data: emails };
 *   } catch (error) {
 *     return { success: false, error: mapError(error) };
 *   }
 * }
 * ```
 */
export type Result<T, E = ProviderError> = 
  | { readonly success: true; readonly data: T }
  | { readonly success: false; readonly error: E };

/**
 * Base error interface that all provider errors must implement
 * 
 * Provides consistent error structure across all providers with
 * retry logic indicators and contextual information.
 */
export interface ProviderError {
  /** Error code for programmatic handling */
  readonly code: string;
  
  /** Human-readable error message */
  readonly message: string;
  
  /** Whether this error indicates a transient failure that can be retried */
  readonly retryable: boolean;
  
  /** When this error occurred */
  readonly timestamp: Date;
  
  /** Additional context-specific error details */
  readonly details: Record<string, unknown>;
}

/**
 * Health status information for provider health checks
 */
export interface HealthStatus {
  /** Whether the provider is currently healthy and operational */
  readonly healthy: boolean;
  
  /** Optional message describing the health status */
  readonly message?: string;
  
  /** Last successful operation timestamp */
  readonly lastSuccess?: Date;
  
  /** Additional health metrics */
  readonly metrics?: Record<string, number>;
}

/**
 * Base provider interface that all concrete providers must implement
 * 
 * Establishes common functionality required by all provider types including
 * initialization, health monitoring, and graceful shutdown.
 * 
 * @template TConfig - Provider-specific configuration type
 */
export interface BaseProvider<TConfig = Record<string, unknown>> {
  /** Unique identifier for this provider type */
  readonly name: string;
  
  /** Semantic version of this provider implementation */
  readonly version: string;
  
  /**
   * Initialize the provider with the given configuration
   * 
   * @param config - Provider-specific configuration object
   * @returns Result indicating success or failure of initialization
   */
  initialize(config: TConfig): Promise<Result<void>>;
  
  /**
   * Check the health status of this provider
   * 
   * @returns Result containing health status information
   */
  healthCheck(): Promise<Result<HealthStatus>>;
  
  /**
   * Gracefully shutdown the provider and cleanup resources
   * 
   * @returns Result indicating success or failure of shutdown
   */
  shutdown(): Promise<Result<void>>;
  
  /**
   * Get the current configuration of this provider
   * 
   * @returns Readonly copy of the current configuration
   */
  getConfig(): Readonly<TConfig>;
}

/**
 * Validation result for configuration objects and runtime validation
 */
export interface ValidationResult {
  /** Whether validation passed */
  readonly valid: boolean;
  
  /** Validation error messages if validation failed */
  readonly errors: readonly string[];
  
  /** Validation warnings (non-blocking issues) */
  readonly warnings: readonly string[];
}

/**
 * Connection state information for providers that maintain persistent connections
 */
export interface ConnectionState {
  /** Whether the provider is currently connected */
  readonly connected: boolean;
  
  /** Connection establishment timestamp */
  readonly connectedAt?: Date;
  
  /** Last successful operation timestamp */
  readonly lastActivity?: Date;
  
  /** Connection metadata (e.g., server info, session details) */
  readonly metadata?: Record<string, unknown>;
}

/**
 * Timeout configuration for operations with time limits
 */
export interface TimeoutOptions {
  /** Operation timeout in milliseconds */
  readonly timeoutMs: number;
  
  /** Optional abort signal for cancellation */
  readonly signal?: AbortSignal;
}

/**
 * Retry configuration for operations that support retry logic
 */
export interface RetryOptions {
  /** Maximum number of retry attempts */
  readonly maxRetries: number;
  
  /** Base delay between retries in milliseconds */
  readonly baseDelayMs: number;
  
  /** Maximum delay between retries in milliseconds */
  readonly maxDelayMs: number;
  
  /** Multiplier for exponential backoff */
  readonly backoffMultiplier: number;
  
  /** Whether to add jitter to retry delays */
  readonly jitter: boolean;
}

/**
 * Default retry configuration for provider operations
 */
export const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  jitter: true,
} as const;

/**
 * Default timeout configuration for provider operations
 */
export const DEFAULT_TIMEOUT_OPTIONS: TimeoutOptions = {
  timeoutMs: 30000, // 30 seconds
} as const;

/**
 * Type guard to check if a value is a successful Result
 * 
 * @param result - The Result to check
 * @returns Type predicate indicating if the result is successful
 */
export function isSuccessResult<T, E>(result: Result<T, E>): result is { success: true; data: T } {
  return result.success === true;
}

/**
 * Type guard to check if a value is a failed Result
 * 
 * @param result - The Result to check
 * @returns Type predicate indicating if the result is failed
 */
export function isErrorResult<T, E>(result: Result<T, E>): result is { success: false; error: E } {
  return result.success === false;
}

/**
 * Create a successful Result
 * 
 * @param data - The success data
 * @returns Successful Result containing the data
 */
export function createSuccessResult<T>(data: T): Result<T> {
  return { success: true, data };
}

/**
 * Create a failed Result
 * 
 * @param error - The error information
 * @returns Failed Result containing the error
 */
export function createErrorResult<T>(error: ProviderError): Result<T> {
  return { success: false, error };
}

/**
 * Convert a standard Error object to a ProviderError
 * 
 * @param error - The Error object to convert
 * @param code - Optional error code (defaults to 'UNKNOWN_ERROR')
 * @param retryable - Whether the error is retryable (defaults to false)
 * @returns ProviderError compatible object
 */
export function createProviderError(
  error: Error, 
  code = 'UNKNOWN_ERROR', 
  retryable = false
): ProviderError {
  return {
    code,
    message: error.message,
    retryable,
    timestamp: new Date(),
    details: { originalError: error.name }
  };
}