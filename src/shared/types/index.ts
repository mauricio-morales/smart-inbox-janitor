/**
 * Centralized type exports for Smart Inbox Janitor
 *
 * This module provides a single entry point for importing all type definitions
 * while maintaining tree-shaking compatibility and logical organization.
 *
 * @module SharedTypes
 */

// Base types and Result pattern
export type {
  Result,
  ProviderError,
  HealthStatus,
  BaseProvider,
  ValidationResult,
  ConnectionState as BaseConnectionState,
  TimeoutOptions,
  RetryOptions,
} from './base.types.js';

export {
  DEFAULT_RETRY_OPTIONS,
  DEFAULT_TIMEOUT_OPTIONS,
  isSuccessResult,
  isErrorResult,
  createSuccessResult,
  createErrorResult,
  createProviderError,
} from './base.types.js';

// Error hierarchy and classes
export {
  BaseProviderError,
  ConfigurationError,
  AuthenticationError,
  NetworkError,
  RateLimitError,
  QuotaExceededError,
  ValidationError,
  TimeoutError,
  CancellationError,
  SecurityError,
  CryptoError,
  StorageError,
  isRetryableError,
  isRateLimitError,
  isAuthenticationError,
  isQuotaExceededError,
  isValidationError,
  isTimeoutError,
  getErrorSeverity,
  ErrorSeverity,
} from './errors.types.js';

// Configuration types
export type {
  ConnectionState,
  GmailConnectionState,
  OpenAIConnectionState,
  OnboardingStep,
  GmailAuthConfig,
  GmailTokens,
  RefreshFailureReason,
  GmailAuthState,
  TokenRefreshMetadata,
  GmailProviderConfig,
  OpenAIConfig,
  ClaudeConfig,
  LocalLLMConfig,
  SQLiteStorageConfig,
  IndexedDBStorageConfig,
  AppConfig,
  StorageProviderConfig,
  UserPreferences,
} from './config.types.js';

export { DEFAULT_APP_CONFIG } from './config.types.js';

// Email provider types
export type {
  EmailProvider,
  EmailProviderConfig,
  ContactsProvider,
  RelationshipStrength,
  EmailSummary,
  EmailFull,
  EmailFolder,
  EmailHeaders,
  FolderType,
  ContactInfo,
  UnsubscribeMethod,
  DateRange,
  ListOptions,
  GetEmailOptions,
  ListEmailsResult,
  BatchModifyRequest,
  BatchDeleteRequest,
  BatchOperationResult,
  SearchOptions,
  SearchResult,
  ConnectionOptions,
  ConnectionInfo,
  AccountInfo,
} from './email.types.js';

// Storage provider types
export type {
  StorageProvider,
  StoredAppConfig,
  UserRules,
  UserRule,
  EmailMetadata,
  EmailClassification,
  UserAction,
  ClassificationHistoryItem,
  UserFeedback,
  ProcessingState,
  ActionQueueItem,
  ActionType,
  ActionStatus,
  FolderState,
  ActionHistoryItem,
  MigrationResult,
  BulkOperationResult,
  EmailMetadataFilters,
  EmailMetadataQueryResult,
  CleanupResult,
  DatabaseStatistics,
  ExportResult,
  ImportResult,
} from './storage.types.js';

// LLM provider types
export type {
  LLMProvider,
  ClassifyInput,
  ClassifyOutput,
  ClassifyItem,
  LikelihoodLevel,
  EmailAction,
  RiskAssessment,
  RiskLevel,
  UsageStatistics,
  CostEstimation,
  ContactSignal,
  GroupingInput,
  GroupOutput,
  ContentValidationInput,
  ContentValidationResult,
  ExplanationInput,
  ClassificationExplanation,
  ConnectionTestResult,
  CostEstimationInput,
} from './llm.types.js';

// Rules engine types
export type {
  RulesEngine,
  RuleEvaluationResult,
  RuleAction,
  RuleSuggestion,
  RuleValidationResult,
  RuleTestResult,
  RuleAnalytics,
} from './rules.types.js';

// Security types
export type {
  SecureCredential,
  SecurityAuditEvent,
  SecurityEventType,
  SecurityConfig,
  SecurityLevel,
  CredentialStorageOptions,
  RotationPolicy,
  SecurityValidationResult,
  SecurityValidationDetails,
  EncryptionKeyMetadata,
  KeyDerivationMethod,
  KeyUsageStats,
  TokenRefreshRequest,
  TokenRefreshResponse,
  SecureStorageStatus,
  StorageHealthStatus,
  SecurityConfigSummary,
  RecoveryInfo,
  CredentialBackup,
} from './security.types.js';
