/**
 * Comprehensive error hierarchy for Smart Inbox Janitor provider system
 * 
 * This module defines a hierarchical error system that provides consistent
 * error handling across all provider types with proper inheritance chains
 * and retry logic indicators.
 * 
 * @module ErrorTypes
 */

import { ProviderError } from './base.types.js';

/**
 * Base class for all provider errors with common functionality
 */
export abstract class BaseProviderError implements ProviderError {
  public readonly timestamp: Date;
  
  constructor(
    public readonly code: string,
    public readonly message: string,
    public readonly retryable: boolean,
    public readonly details: Record<string, unknown> = {}
  ) {
    this.timestamp = new Date();
  }
  
  /**
   * Convert error to a plain object for serialization
   */
  toJSON(): Record<string, unknown> {
    return {
      code: this.code,
      message: this.message,
      retryable: this.retryable,
      timestamp: this.timestamp.toISOString(),
      details: this.details,
    };
  }
}

/**
 * Configuration-related errors
 */
export class ConfigurationError extends BaseProviderError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('CONFIGURATION_ERROR', message, false, details);
  }
}

/**
 * Authentication and authorization errors
 */
export class AuthenticationError extends BaseProviderError {
  constructor(message: string, retryable = false, details?: Record<string, unknown>) {
    super('AUTHENTICATION_ERROR', message, retryable, details);
  }
}

/**
 * Network connectivity errors
 */
export class NetworkError extends BaseProviderError {
  constructor(message: string, retryable = true, details?: Record<string, unknown>) {
    super('NETWORK_ERROR', message, retryable, details);
  }
}

/**
 * Rate limiting errors
 */
export class RateLimitError extends BaseProviderError {
  public readonly retryAfter?: number; // Milliseconds
  
  constructor(
    message: string, 
    retryAfter?: number,
    details?: Record<string, unknown>
  ) {
    super('RATE_LIMITED', message, true, details);
    this.retryAfter = retryAfter;
  }
}

/**
 * Quota exceeded errors
 */
export class QuotaExceededError extends BaseProviderError {
  public readonly quotaType: string;
  public readonly resetTime?: Date;
  
  constructor(
    quotaType: string,
    message: string,
    resetTime?: Date,
    details?: Record<string, unknown>
  ) {
    super('QUOTA_EXCEEDED', message, resetTime ? true : false, details);
    this.quotaType = quotaType;
    this.resetTime = resetTime;
  }
}

/**
 * Validation errors for input data
 */
export class ValidationError extends BaseProviderError {
  public readonly fieldErrors: Record<string, string[]>;
  
  constructor(
    message: string,
    fieldErrors: Record<string, string[]> = {},
    details?: Record<string, unknown>
  ) {
    super('VALIDATION_ERROR', message, false, details);
    this.fieldErrors = fieldErrors;
  }
}

/**
 * Timeout errors for operations that exceed time limits
 */
export class TimeoutError extends BaseProviderError {
  public readonly timeoutMs: number;
  
  constructor(timeoutMs: number, details?: Record<string, unknown>) {
    super(
      'TIMEOUT_ERROR', 
      `Operation timed out after ${timeoutMs}ms`, 
      true, 
      details
    );
    this.timeoutMs = timeoutMs;
  }
}

/**
 * Cancellation errors for aborted operations
 */
export class CancellationError extends BaseProviderError {
  constructor(message = 'Operation was cancelled', details?: Record<string, unknown>) {
    super('CANCELLED', message, false, details);
  }
}

// Email Provider Specific Errors

/**
 * Gmail-specific errors
 */
export class GmailError extends BaseProviderError {
  public readonly googleCode?: number;
  public readonly googleReason?: string;
  
  constructor(
    code: string,
    message: string,
    retryable: boolean,
    googleCode?: number,
    googleReason?: string,
    details?: Record<string, unknown>
  ) {
    super(code, message, retryable, details);
    this.googleCode = googleCode;
    this.googleReason = googleReason;
  }
  
  static fromGoogleError(error: { code?: number; reason?: string; message?: string }): GmailError {
    const baseDetails = { originalError: error.message ?? 'Unknown error' };
    
    if (error.code === 401) {
      return new GmailError(
        'GMAIL_AUTH_EXPIRED',
        'Gmail authentication expired. Please reconnect.',
        false,
        error.code,
        error.reason,
        baseDetails
      );
    }
    
    if (error.code === 403) {
      return new GmailError(
        'GMAIL_FORBIDDEN',
        'Gmail API access forbidden. Check permissions.',
        false,
        error.code,
        error.reason,
        baseDetails
      );
    }
    
    if (error.code === 429) {
      return new GmailError(
        'GMAIL_RATE_LIMITED',
        'Gmail API rate limit exceeded.',
        true,
        error.code,
        error.reason,
        baseDetails
      );
    }
    
    if (error.code != null && error.code >= 500) {
      return new GmailError(
        'GMAIL_SERVER_ERROR',
        'Gmail server error. Please try again.',
        true,
        error.code,
        error.reason,
        baseDetails
      );
    }
    
    return new GmailError(
      'GMAIL_UNKNOWN_ERROR',
      error.message ?? 'Unknown Gmail API error',
      false,
      error.code,
      error.reason,
      baseDetails
    );
  }
}

/**
 * IMAP-specific errors
 */
export class IMAPError extends BaseProviderError {
  public readonly imapCode?: string;
  
  constructor(
    code: string,
    message: string,
    retryable: boolean,
    imapCode?: string,
    details?: Record<string, unknown>
  ) {
    super(code, message, retryable, details);
    this.imapCode = imapCode;
  }
}

// Storage Provider Specific Errors

/**
 * SQLite-specific errors
 */
export class SQLiteError extends BaseProviderError {
  public readonly sqliteCode?: string;
  public readonly query?: string;
  
  constructor(
    code: string,
    message: string,
    retryable: boolean,
    sqliteCode?: string,
    query?: string,
    details?: Record<string, unknown>
  ) {
    super(code, message, retryable, details);
    this.sqliteCode = sqliteCode;
    this.query = query;
  }
}

/**
 * IndexedDB-specific errors
 */
export class IndexedDBError extends BaseProviderError {
  public readonly idbErrorName?: string;
  
  constructor(
    code: string,
    message: string,
    retryable: boolean,
    idbErrorName?: string,
    details?: Record<string, unknown>
  ) {
    super(code, message, retryable, details);
    this.idbErrorName = idbErrorName;
  }
}

// LLM Provider Specific Errors

/**
 * OpenAI-specific errors
 */
export class OpenAIError extends BaseProviderError {
  public readonly openaiType?: string;
  public readonly openaiCode?: string;
  
  constructor(
    code: string,
    message: string,
    retryable: boolean,
    openaiType?: string,
    openaiCode?: string,
    details?: Record<string, unknown>
  ) {
    super(code, message, retryable, details);
    this.openaiType = openaiType;
    this.openaiCode = openaiCode;
  }
  
  static fromOpenAIError(error: { type?: string; code?: string; message?: string }): OpenAIError {
    const baseDetails = { originalError: error.message ?? 'Unknown OpenAI error' };
    
    if (error.type === 'insufficient_quota') {
      return new OpenAIError(
        'OPENAI_QUOTA_EXCEEDED',
        'OpenAI API quota exceeded.',
        false,
        error.type,
        error.code,
        baseDetails
      );
    }
    
    if (error.type === 'invalid_api_key') {
      return new OpenAIError(
        'OPENAI_INVALID_KEY',
        'Invalid OpenAI API key.',
        false,
        error.type,
        error.code,
        baseDetails
      );
    }
    
    if (error.type === 'rate_limit_exceeded') {
      return new OpenAIError(
        'OPENAI_RATE_LIMITED',
        'OpenAI API rate limit exceeded.',
        true,
        error.type,
        error.code,
        baseDetails
      );
    }
    
    if (error.type === 'server_error') {
      return new OpenAIError(
        'OPENAI_SERVER_ERROR',
        'OpenAI server error.',
        true,
        error.type,
        error.code,
        baseDetails
      );
    }
    
    return new OpenAIError(
      'OPENAI_UNKNOWN_ERROR',
      error.message ?? 'Unknown OpenAI API error',
      false,
      error.type,
      error.code,
      baseDetails
    );
  }
}

/**
 * Claude (Anthropic) specific errors
 */
export class ClaudeError extends BaseProviderError {
  public readonly claudeType?: string;
  
  constructor(
    code: string,
    message: string,
    retryable: boolean,
    claudeType?: string,
    details?: Record<string, unknown>
  ) {
    super(code, message, retryable, details);
    this.claudeType = claudeType;
  }
}

/**
 * Local LLM (Ollama) specific errors
 */
export class LocalLLMError extends BaseProviderError {
  public readonly endpoint?: string;
  
  constructor(
    code: string,
    message: string,
    retryable: boolean,
    endpoint?: string,
    details?: Record<string, unknown>
  ) {
    super(code, message, retryable, details);
    this.endpoint = endpoint;
  }
}

/**
 * Type guard to check if an error is retryable
 */
export function isRetryableError(error: ProviderError): boolean {
  return error.retryable;
}

/**
 * Type guard to check if an error is a rate limit error
 */
export function isRateLimitError(error: ProviderError): error is RateLimitError {
  return error instanceof RateLimitError || error.code === 'RATE_LIMITED';
}

/**
 * Type guard to check if an error is an authentication error
 */
export function isAuthenticationError(error: ProviderError): error is AuthenticationError {
  return error instanceof AuthenticationError || error.code === 'AUTHENTICATION_ERROR';
}

/**
 * Type guard to check if an error is a quota exceeded error
 */
export function isQuotaExceededError(error: ProviderError): error is QuotaExceededError {
  return error instanceof QuotaExceededError || error.code === 'QUOTA_EXCEEDED';
}

/**
 * Type guard to check if an error is a validation error
 */
export function isValidationError(error: ProviderError): error is ValidationError {
  return error instanceof ValidationError || error.code === 'VALIDATION_ERROR';
}

/**
 * Type guard to check if an error is a timeout error
 */
export function isTimeoutError(error: ProviderError): error is TimeoutError {
  return error instanceof TimeoutError || error.code === 'TIMEOUT_ERROR';
}

/**
 * Error severity levels for logging and UI display
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Get the severity level of a provider error
 */
export function getErrorSeverity(error: ProviderError): ErrorSeverity {
  if (isAuthenticationError(error)) {
    return ErrorSeverity.HIGH;
  }
  
  if (isQuotaExceededError(error)) {
    return ErrorSeverity.MEDIUM;
  }
  
  if (isRateLimitError(error)) {
    return ErrorSeverity.LOW;
  }
  
  if (isValidationError(error)) {
    return ErrorSeverity.MEDIUM;
  }
  
  if (error.code.includes('SERVER_ERROR')) {
    return ErrorSeverity.HIGH;
  }
  
  return ErrorSeverity.MEDIUM;
}

/**
 * Security-related error for authentication, authorization, and security violations
 */
export class SecurityError extends BaseProviderError {
  constructor(message: string, context?: Record<string, unknown>) {
    super('SECURITY_ERROR', message, false, context);
  }
}

/**
 * Cryptographic operation error for encryption, decryption, and key management
 */
export class CryptoError extends BaseProviderError {
  constructor(message: string, context?: Record<string, unknown>) {
    super('CRYPTO_ERROR', message, false, context);
  }
}

/**
 * Storage-related error for database operations and data persistence
 */
export class StorageError extends BaseProviderError {
  constructor(message: string, context?: Record<string, unknown>) {
    super('STORAGE_ERROR', message, false, context);
  }
}