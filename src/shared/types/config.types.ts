/**
 * Configuration interfaces and connection state management for Smart Inbox Janitor
 *
 * This module defines configuration types for all providers and connection state
 * management for tracking authentication and connectivity status.
 *
 * @module ConfigTypes
 */

/**
 * Connection state for tracking authentication and connectivity status
 *
 * Provides comprehensive tracking of Gmail, OpenAI, and other provider
 * connection states with session management and error tracking.
 */
export interface ConnectionState {
  /** Gmail connection state */
  readonly gmail: GmailConnectionState;

  /** OpenAI LLM connection state */
  readonly openai: OpenAIConnectionState;

  /** Overall setup completion status */
  readonly setupComplete: boolean;

  /** Current onboarding step for new users */
  readonly onboardingStep?: OnboardingStep;
}

/**
 * Gmail connection state with OAuth session management
 */
export interface GmailConnectionState {
  /** Whether user is currently signed in */
  readonly isSignedIn: boolean;

  /** Connected Gmail account email address */
  readonly accountEmail?: string;

  /** Display name from Gmail account */
  readonly accountName?: string;

  /** Profile picture URL from Gmail account */
  readonly profilePicture?: string;

  /** OAuth token expiration timestamp */
  readonly sessionExpiresAt?: string;

  /** Last successful token refresh timestamp */
  readonly lastRefreshAt?: string;

  /** Whether user needs to re-authenticate */
  readonly needsReSignIn: boolean;

  /** Last error that occurred during connection */
  readonly lastError?: string;
}

/**
 * OpenAI connection state with API key management and cost tracking
 */
export interface OpenAIConnectionState {
  /** Whether a valid API key is configured */
  readonly hasValidKey: boolean;

  /** Last 4 characters of API key (for privacy) */
  readonly keyLastFour?: string;

  /** Timestamp of last successful API key validation */
  readonly lastValidated?: string;

  /** Current monthly spending in USD */
  readonly monthlySpendingUSD?: number;

  /** Estimated daily spending rate in USD */
  readonly estimatedDailyRate?: number;

  /** API key validation error if any */
  readonly validationError?: string;
}

/**
 * Onboarding flow steps for new users
 */
export type OnboardingStep =
  | 'gmail-signin'
  | 'openai-setup'
  | 'preferences'
  | 'first-scan'
  | 'ready';

/**
 * Gmail OAuth configuration for authentication
 */
export interface GmailAuthConfig {
  /** Google OAuth client ID */
  readonly clientId: string;

  /** Google OAuth client secret */
  readonly clientSecret: string;

  /** OAuth redirect URI for authentication flow */
  readonly redirectUri: string;

  /** Required OAuth scopes for Gmail access */
  readonly scopes: readonly string[];
}

/**
 * Gmail OAuth tokens for authenticated sessions
 */
export interface GmailTokens {
  /** OAuth access token */
  readonly accessToken: string;

  /** OAuth refresh token for session renewal */
  readonly refreshToken?: string;

  /** Token expiration timestamp (Unix timestamp) */
  readonly expiryDate: number;

  /** Token scope permissions */
  readonly scope?: string;

  /** Token type (usually 'Bearer') */
  readonly tokenType?: string;
}

/**
 * Token refresh failure reason for error categorization
 */
export type RefreshFailureReason =
  | 'invalid_grant' // Refresh token revoked/expired
  | 'consent_revoked' // User removed app permissions
  | 'insufficient_scope' // Scope changes require re-auth
  | 'client_misconfigured' // OAuth client credentials invalid
  | 'network_error' // Transient network issues
  | 'rate_limit_exceeded' // Too many refresh attempts
  | 'unknown';

/**
 * Gmail authentication state for comprehensive token renewal
 */
export interface GmailAuthState {
  readonly status: 'connected' | 'refreshing' | 'needs_reauth';
  readonly accountEmail?: string;
  readonly expiresAt?: number;
  readonly lastRefreshAt?: number;
  readonly refreshAttempts?: number;
  readonly lastError?: {
    readonly code: string;
    readonly reason: RefreshFailureReason;
    readonly timestamp: number;
  };
}

/**
 * Token refresh metadata for audit logging and tracking
 */
export interface TokenRefreshMetadata {
  readonly refreshedAt: number;
  readonly refreshMethod: 'automatic' | 'manual' | 'startup';
  readonly previousExpiryDate?: number;
  readonly refreshDurationMs: number;
  readonly attemptNumber: number;
}

/**
 * Gmail provider configuration combining auth and operational settings
 */
export interface GmailProviderConfig {
  /** OAuth authentication configuration */
  readonly auth: GmailAuthConfig;

  /** Current OAuth tokens */
  readonly tokens?: GmailTokens;

  /** Request timeout in milliseconds */
  readonly timeoutMs?: number;

  /** Maximum retry attempts for failed requests */
  readonly maxRetries?: number;

  /** Rate limiting configuration */
  readonly rateLimitConfig?: RateLimitConfig;
}

/**
 * OpenAI LLM provider configuration
 */
export interface OpenAIConfig {
  /** OpenAI API key */
  readonly apiKey: string;

  /** OpenAI organization ID (optional) */
  readonly organization?: string;

  /** Model to use for email classification */
  readonly model: string;

  /** Request timeout in milliseconds */
  readonly timeoutMs?: number;

  /** Maximum retry attempts for failed requests */
  readonly maxRetries?: number;

  /** Temperature setting for model responses */
  readonly temperature?: number;

  /** Maximum tokens per request */
  readonly maxTokens?: number;
}

/**
 * Claude (Anthropic) LLM provider configuration
 */
export interface ClaudeConfig {
  /** Anthropic API key */
  readonly apiKey: string;

  /** Model to use for email classification */
  readonly model: string;

  /** Request timeout in milliseconds */
  readonly timeoutMs?: number;

  /** Maximum retry attempts for failed requests */
  readonly maxRetries?: number;

  /** Maximum tokens per request */
  readonly maxTokens?: number;
}

/**
 * Local LLM (Ollama) provider configuration
 */
export interface LocalLLMConfig {
  /** Ollama server endpoint URL */
  readonly endpoint: string;

  /** Model name to use */
  readonly model: string;

  /** Request timeout in milliseconds */
  readonly timeoutMs?: number;

  /** Maximum retry attempts for failed requests */
  readonly maxRetries?: number;

  /** Model parameters */
  readonly parameters?: Record<string, unknown>;
}

/**
 * SQLite storage provider configuration
 */
export interface SQLiteStorageConfig {
  /** Database file path */
  readonly databasePath: string;

  /** Whether to enable WAL mode for better concurrent access */
  readonly walMode?: boolean;

  /** Connection timeout in milliseconds */
  readonly timeoutMs?: number;

  /** Maximum number of connections in pool */
  readonly maxConnections?: number;

  /** Whether to enable foreign key constraints */
  readonly foreignKeys?: boolean;

  /** Database encryption key (optional) */
  readonly encryptionKey?: string;
}

/**
 * IndexedDB storage provider configuration
 */
export interface IndexedDBStorageConfig {
  /** Database name */
  readonly databaseName: string;

  /** Database version */
  readonly version: number;

  /** Storage quota limit in bytes */
  readonly quotaLimit?: number;

  /** Whether to enable compression */
  readonly compression?: boolean;

  /** Encryption settings for sensitive data */
  readonly encryption?: EncryptionConfig;
}

/**
 * Rate limiting configuration
 */
export interface RateLimitConfig {
  /** Maximum requests per time window */
  readonly maxRequests: number;

  /** Time window in milliseconds */
  readonly windowMs: number;

  /** Delay between requests in milliseconds */
  readonly requestDelayMs?: number;

  /** Whether to use exponential backoff on rate limit errors */
  readonly exponentialBackoff?: boolean;
}

/**
 * Encryption configuration for sensitive data
 */
export interface EncryptionConfig {
  /** Encryption algorithm to use */
  readonly algorithm: string;

  /** Key derivation method */
  readonly keyDerivation: 'pbkdf2' | 'scrypt' | 'argon2';

  /** Salt for key derivation */
  readonly salt?: string;

  /** Number of iterations for key derivation */
  readonly iterations?: number;
}

/**
 * Application-wide configuration
 */
export interface AppConfig {
  /** Email provider configuration */
  readonly emailProvider: EmailProviderConfig;

  /** LLM provider configuration */
  readonly llmProvider: LLMProviderConfig;

  /** Storage provider configuration */
  readonly storageProvider: StorageProviderConfig;

  /** User preferences */
  readonly preferences: UserPreferences;

  /** Development and debugging settings */
  readonly debug?: DebugConfig;
}

/**
 * Email provider configuration union type
 */
export type EmailProviderConfig =
  | { readonly type: 'gmail'; readonly config: GmailProviderConfig }
  | { readonly type: 'imap'; readonly config: IMAPProviderConfig };

/**
 * LLM provider configuration union type
 */
export type LLMProviderConfig =
  | { readonly type: 'openai'; readonly config: OpenAIConfig }
  | { readonly type: 'claude'; readonly config: ClaudeConfig }
  | { readonly type: 'local'; readonly config: LocalLLMConfig };

/**
 * Storage provider configuration union type
 */
export type StorageProviderConfig =
  | { readonly type: 'sqlite'; readonly config: SQLiteStorageConfig }
  | { readonly type: 'indexeddb'; readonly config: IndexedDBStorageConfig };

/**
 * IMAP provider configuration (for future extensibility)
 */
export interface IMAPProviderConfig {
  /** IMAP server hostname */
  readonly host: string;

  /** IMAP server port */
  readonly port: number;

  /** Whether to use TLS/SSL */
  readonly secure: boolean;

  /** Authentication credentials */
  readonly auth: IMAPAuthConfig;

  /** Connection timeout in milliseconds */
  readonly timeoutMs?: number;

  /** Keep-alive interval in milliseconds */
  readonly keepAliveMs?: number;
}

/**
 * IMAP authentication configuration
 */
export interface IMAPAuthConfig {
  /** Username for IMAP authentication */
  readonly username: string;

  /** Password for IMAP authentication */
  readonly password: string;

  /** Authentication method */
  readonly method?: 'plain' | 'oauth2' | 'xoauth2';
}

/**
 * User preferences for application behavior
 */
export interface UserPreferences {
  /** Email processing preferences */
  readonly processing: ProcessingPreferences;

  /** UI/UX preferences */
  readonly ui: UIPreferences;

  /** Notification preferences */
  readonly notifications: NotificationPreferences;

  /** Privacy and security preferences */
  readonly privacy: PrivacyPreferences;
}

/**
 * Email processing preferences
 */
export interface ProcessingPreferences {
  /** Default batch size for email processing */
  readonly batchSize: number;

  /** Maximum API cost per session in USD */
  readonly maxCostPerSession?: number;

  /** Whether to auto-apply high-confidence classifications */
  readonly autoApplyHighConfidence: boolean;

  /** Minimum confidence threshold for auto-apply */
  readonly autoApplyThreshold: number;

  /** Whether to process emails in background */
  readonly backgroundProcessing: boolean;
}

/**
 * UI/UX preferences
 */
export interface UIPreferences {
  /** UI theme preference */
  readonly theme: 'light' | 'dark' | 'system';

  /** Language preference */
  readonly language: string;

  /** Whether to show advanced options */
  readonly showAdvanced: boolean;

  /** Default view mode for email lists */
  readonly defaultView: 'list' | 'grid' | 'compact';
}

/**
 * Notification preferences
 */
export interface NotificationPreferences {
  /** Whether to show desktop notifications */
  readonly desktop: boolean;

  /** Whether to show processing completion notifications */
  readonly processingComplete: boolean;

  /** Whether to show error notifications */
  readonly errors: boolean;

  /** Whether to show quota warnings */
  readonly quotaWarnings: boolean;
}

/**
 * Privacy and security preferences
 */
export interface PrivacyPreferences {
  /** Whether to encrypt email content cache */
  readonly encryptCache: boolean;

  /** Whether to automatically clear cache on exit */
  readonly clearCacheOnExit: boolean;

  /** Maximum cache retention time in days */
  readonly cacheRetentionDays: number;

  /** Whether to send anonymous usage analytics */
  readonly analytics: boolean;
}

/**
 * Debug and development configuration
 */
export interface DebugConfig {
  /** Whether debug mode is enabled */
  readonly enabled: boolean;

  /** Log level for debugging */
  readonly logLevel: 'debug' | 'info' | 'warn' | 'error';

  /** Whether to log API requests/responses */
  readonly logRequests: boolean;

  /** Whether to simulate errors for testing */
  readonly simulateErrors: boolean;

  /** Mock data configuration for development */
  readonly mockData?: MockDataConfig;
}

/**
 * Mock data configuration for development and testing
 */
export interface MockDataConfig {
  /** Whether to use mock email data */
  readonly mockEmails: boolean;

  /** Whether to use mock LLM responses */
  readonly mockLLM: boolean;

  /** Whether to use mock storage */
  readonly mockStorage: boolean;

  /** Number of mock emails to generate */
  readonly emailCount?: number;
}

/**
 * Default configuration values
 */
export const DEFAULT_APP_CONFIG: Partial<AppConfig> = {
  preferences: {
    processing: {
      batchSize: 100,
      maxCostPerSession: 5.0, // $5 USD
      autoApplyHighConfidence: false,
      autoApplyThreshold: 0.95,
      backgroundProcessing: true,
    },
    ui: {
      theme: 'system',
      language: 'en',
      showAdvanced: false,
      defaultView: 'list',
    },
    notifications: {
      desktop: true,
      processingComplete: true,
      errors: true,
      quotaWarnings: true,
    },
    privacy: {
      encryptCache: true,
      clearCacheOnExit: false,
      cacheRetentionDays: 30,
      analytics: false,
    },
  },
  debug: {
    enabled: false,
    logLevel: 'info',
    logRequests: false,
    simulateErrors: false,
  },
} as const;
