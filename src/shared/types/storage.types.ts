/**
 * Storage provider interfaces and data model types for Smart Inbox Janitor
 *
 * This module defines the StorageProvider interface for local data persistence
 * with support for both SQLite (desktop) and IndexedDB (browser) backends.
 * Includes comprehensive data models for email metadata, user rules, and analytics.
 *
 * @module StorageTypes
 */

import { Result, HealthStatus } from './base.types.js';
import { SQLiteStorageConfig, IndexedDBStorageConfig } from './config.types.js';

/**
 * Storage provider interface for local data persistence
 *
 * Provides a unified interface for storing user rules, email metadata,
 * classification history, and application configuration with support
 * for both SQLite and IndexedDB backends.
 *
 * @template TConfig - Storage provider configuration type
 */
export interface StorageProvider<TConfig = StorageProviderConfig> {
  /** Unique identifier for this provider type */
  readonly name: string;

  /** Semantic version of this provider implementation */
  readonly version: string;

  /**
   * Initialize the provider with the given configuration
   */
  initialize(config: TConfig): Promise<Result<void>>;

  /**
   * Check the health status of this provider
   */
  healthCheck(): Promise<Result<HealthStatus>>;

  /**
   * Gracefully shutdown the provider and cleanup resources
   */
  shutdown(): Promise<Result<void>>;
  /**
   * Initialize storage provider and create required tables/collections
   *
   * @returns Result indicating initialization success or failure
   */
  init(): Promise<Result<void>>;

  /**
   * Perform database migrations to latest schema version
   *
   * @param targetVersion - Target schema version (optional)
   * @returns Result indicating migration success or failure
   */
  migrate(targetVersion?: number): Promise<Result<MigrationResult>>;

  // User Rules Management

  /**
   * Get current user rules and learning data
   *
   * @returns Result containing user rules configuration
   */
  getUserRules(): Promise<Result<UserRules>>;

  /**
   * Update user rules with new configuration
   *
   * @param rules - Updated user rules
   * @returns Result indicating update success or failure
   */
  updateUserRules(rules: UserRules): Promise<Result<void>>;

  /**
   * Add a new user rule
   *
   * @param rule - Rule to add
   * @returns Result indicating addition success or failure
   */
  addUserRule(rule: UserRule): Promise<Result<void>>;

  /**
   * Remove a user rule
   *
   * @param ruleId - Rule identifier to remove
   * @returns Result indicating removal success or failure
   */
  removeUserRule(ruleId: string): Promise<Result<void>>;

  // Email Metadata Management

  /**
   * Get email metadata by email ID
   *
   * @param emailId - Unique email identifier
   * @returns Result containing email metadata or null if not found
   */
  getEmailMetadata(emailId: string): Promise<Result<EmailMetadata | null>>;

  /**
   * Set email metadata for a single email
   *
   * @param emailId - Unique email identifier
   * @param metadata - Email metadata to store
   * @returns Result indicating storage success or failure
   */
  setEmailMetadata(emailId: string, metadata: EmailMetadata): Promise<Result<void>>;

  /**
   * Store email metadata for multiple emails in a single transaction
   *
   * @param entries - Array of email ID and metadata pairs
   * @returns Result indicating bulk storage success or failure
   */
  bulkSetEmailMetadata(
    entries: Array<{ id: string; metadata: EmailMetadata }>,
  ): Promise<Result<BulkOperationResult>>;

  /**
   * Query email metadata with filtering and pagination
   *
   * @param filters - Filtering criteria
   * @returns Result containing filtered email metadata
   */
  queryEmailMetadata(filters: EmailMetadataFilters): Promise<Result<EmailMetadataQueryResult>>;

  /**
   * Delete email metadata
   *
   * @param emailIds - Email IDs to delete metadata for
   * @returns Result indicating deletion success or failure
   */
  deleteEmailMetadata(emailIds: string[]): Promise<Result<void>>;

  // Classification History Management

  /**
   * Get classification history with optional filtering
   *
   * @param filters - Optional filtering criteria
   * @returns Result containing classification history
   */
  getClassificationHistory(filters?: HistoryFilters): Promise<Result<ClassificationHistoryItem[]>>;

  /**
   * Add a new classification result to history
   *
   * @param result - Classification result to store
   * @returns Result indicating storage success or failure
   */
  addClassificationResult(result: ClassificationHistoryItem): Promise<Result<void>>;

  /**
   * Update user feedback for a classification result
   *
   * @param historyId - Classification history item ID
   * @param feedback - User feedback on classification accuracy
   * @returns Result indicating update success or failure
   */
  updateClassificationFeedback(historyId: string, feedback: UserFeedback): Promise<Result<void>>;

  // Processing State Management

  /**
   * Get current email processing state
   *
   * @returns Result containing processing state
   */
  getProcessingState(): Promise<Result<ProcessingState>>;

  /**
   * Update email processing state
   *
   * @param state - Updated processing state
   * @returns Result indicating update success or failure
   */
  updateProcessingState(state: Partial<ProcessingState>): Promise<Result<void>>;

  /**
   * Get folder processing states
   *
   * @returns Result containing folder states
   */
  getFolderStates(): Promise<Result<FolderState[]>>;

  /**
   * Update folder processing state
   *
   * @param folderId - Folder identifier
   * @param state - Updated folder state
   * @returns Result indicating update success or failure
   */
  updateFolderState(folderId: string, state: Partial<FolderState>): Promise<Result<void>>;

  // Action Queue Management

  /**
   * Add actions to the execution queue
   *
   * @param actions - Actions to queue
   * @returns Result indicating queuing success or failure
   */
  queueActions(actions: ActionQueueItem[]): Promise<Result<void>>;

  /**
   * Get pending actions from queue
   *
   * @param limit - Maximum number of actions to retrieve
   * @returns Result containing pending actions
   */
  getPendingActions(limit?: number): Promise<Result<ActionQueueItem[]>>;

  /**
   * Update action status in queue
   *
   * @param actionId - Action identifier
   * @param status - New action status
   * @param errorMessage - Error message if action failed
   * @returns Result indicating update success or failure
   */
  updateActionStatus(
    actionId: string,
    status: ActionStatus,
    errorMessage?: string,
  ): Promise<Result<void>>;

  /**
   * Get action execution history
   *
   * @param filters - Optional filtering criteria
   * @returns Result containing action history
   */
  getActionHistory(filters?: ActionHistoryFilters): Promise<Result<ActionHistoryItem[]>>;

  // Encrypted Token Storage

  /**
   * Get all encrypted tokens
   *
   * @returns Result containing encrypted tokens by provider
   */
  getEncryptedTokens(): Promise<Result<Record<string, string>>>;

  /**
   * Store encrypted token for a provider
   *
   * @param provider - Provider identifier
   * @param encryptedToken - Encrypted token data
   * @returns Result indicating storage success or failure
   */
  setEncryptedToken(provider: string, encryptedToken: string): Promise<Result<void>>;

  /**
   * Remove encrypted token for a provider
   *
   * @param provider - Provider identifier
   * @returns Result indicating removal success or failure
   */
  removeEncryptedToken(provider: string): Promise<Result<void>>;

  // Configuration Management

  /**
   * Get application configuration
   *
   * @returns Result containing application configuration
   */
  getConfig(): Promise<Result<StoredAppConfig>>;

  /**
   * Update application configuration
   *
   * @param config - Configuration updates to apply
   * @returns Result indicating update success or failure
   */
  updateConfig(config: Partial<StoredAppConfig>): Promise<Result<void>>;

  /**
   * Get configuration value by key
   *
   * @param key - Configuration key
   * @returns Result containing configuration value
   */
  getConfigValue<T>(key: string): Promise<Result<T | null>>;

  /**
   * Set configuration value by key
   *
   * @param key - Configuration key
   * @param value - Configuration value
   * @returns Result indicating storage success or failure
   */
  setConfigValue<T>(key: string, value: T): Promise<Result<void>>;

  // Data Management and Cleanup

  /**
   * Clean up old data based on retention policies
   *
   * @param retentionDays - Number of days to retain data
   * @returns Result containing cleanup statistics
   */
  cleanup(retentionDays: number): Promise<Result<CleanupResult>>;

  /**
   * Get database statistics and usage information
   *
   * @returns Result containing database statistics
   */
  getStatistics(): Promise<Result<DatabaseStatistics>>;

  /**
   * Export data for backup purposes
   *
   * @param options - Export configuration
   * @returns Result containing exported data
   */
  exportData(options?: ExportOptions): Promise<Result<ExportResult>>;

  /**
   * Import data from backup
   *
   * @param data - Data to import
   * @param options - Import configuration
   * @returns Result indicating import success or failure
   */
  importData(data: ExportResult, options?: ImportOptions): Promise<Result<ImportResult>>;
}

/**
 * Storage provider configuration union type
 */
export type StorageProviderConfig = SQLiteStorageConfig | IndexedDBStorageConfig;

/**
 * User rules and learning configuration
 */
export interface UserRules {
  /** Rules for emails to always keep */
  readonly alwaysKeep: KeepRules;

  /** Rules for emails to automatically trash */
  readonly autoTrash: TrashRules;

  /** Weighting factors for classification */
  readonly weights?: ClassificationWeights;

  /** Exclusion rules to prevent automatic actions */
  readonly exclusions?: ExclusionRules;

  /** When rules were last updated */
  readonly lastUpdated: Date;

  /** Rule update statistics */
  readonly stats?: RuleStats;
}

/**
 * Rules for emails to always keep
 */
export interface KeepRules {
  /** Email addresses to always keep */
  readonly senders: string[];

  /** Domains to always keep */
  readonly domains: string[];

  /** Mailing list IDs to always keep */
  readonly listIds: string[];

  /** Subject patterns to always keep */
  readonly subjectPatterns?: string[];

  /** Custom rule expressions */
  readonly customRules?: string[];
}

/**
 * Rules for emails to automatically trash
 */
export interface TrashRules {
  /** Email addresses to automatically trash */
  readonly senders: string[];

  /** Domains to automatically trash */
  readonly domains: string[];

  /** Mailing list IDs to automatically trash */
  readonly listIds: string[];

  /** Subject patterns to automatically trash */
  readonly subjectPatterns?: string[];

  /** Content template hashes to automatically trash */
  readonly templates?: string[];

  /** Custom rule expressions */
  readonly customRules?: string[];
}

/**
 * Classification weighting factors
 */
export interface ClassificationWeights {
  /** Bonus weight for known contacts */
  readonly contactsBonus?: number;

  /** Signals that indicate dangerous emails */
  readonly dangerSignals?: string[];

  /** Confidence threshold adjustments */
  readonly thresholdAdjustments?: Record<string, number>;

  /** Custom weighting rules */
  readonly customWeights?: Record<string, number>;
}

/**
 * Exclusion rules to prevent automatic actions
 */
export interface ExclusionRules {
  /** Never auto-trash emails marked as important */
  readonly neverAutoTrashImportant?: boolean;

  /** Respect starred/flagged emails */
  readonly respectStarred?: boolean;

  /** Never auto-trash emails from specific senders */
  readonly protectedSenders?: string[];

  /** Never auto-trash emails in specific folders */
  readonly protectedFolders?: string[];
}

/**
 * Individual user rule
 */
export interface UserRule {
  /** Unique rule identifier */
  readonly id: string;

  /** Rule type */
  readonly type: UserRuleType;

  /** Rule category */
  readonly category: UserRuleCategory;

  /** Rule value or pattern */
  readonly value: string;

  /** When rule was created */
  readonly createdAt: Date;

  /** When rule was last used */
  readonly lastUsed?: Date;

  /** Number of times rule has been applied */
  readonly usageCount: number;

  /** Whether rule is currently active */
  readonly active: boolean;
}

/**
 * User rule types
 */
export type UserRuleType = 'always_keep' | 'auto_trash' | 'weight_adjustment' | 'exclusion';

/**
 * User rule categories
 */
export type UserRuleCategory = 'sender' | 'domain' | 'listid' | 'subject' | 'content' | 'custom';

/**
 * Rule usage statistics
 */
export interface RuleStats {
  /** Total number of active rules */
  readonly totalRules: number;

  /** Number of keep rules */
  readonly keepRules: number;

  /** Number of trash rules */
  readonly trashRules: number;

  /** Total rule applications */
  readonly totalApplications: number;

  /** Rules by category */
  readonly rulesByCategory: Record<UserRuleCategory, number>;
}

/**
 * Email metadata for classification and processing
 */
export interface EmailMetadata {
  /** Unique email identifier */
  readonly id: string;

  /** Email folder/label ID */
  readonly folderId: string;

  /** Email folder/label name */
  readonly folderName?: string;

  /** Email subject */
  readonly subject: string;

  /** Sender email address */
  readonly senderEmail: string;

  /** Sender display name */
  readonly senderName?: string;

  /** Email received date */
  readonly receivedDate: Date;

  /** AI classification result */
  readonly classification?: EmailClassification;

  /** Classification confidence score (0-1) */
  readonly confidence?: number;

  /** Classification reasoning */
  readonly reasons?: string[];

  /** Bulk processing group key */
  readonly bulkKey?: string;

  /** When email was last classified */
  readonly lastClassified?: Date;

  /** User action taken on this email */
  readonly userAction?: UserAction;

  /** When user action was taken */
  readonly userActionTimestamp?: Date;

  /** Processing batch identifier */
  readonly processingBatchId?: string;

  /** Email size in bytes */
  readonly sizeBytes?: number;

  /** Whether email has attachments */
  readonly hasAttachments?: boolean;

  /** Additional metadata */
  readonly metadata?: Record<string, unknown>;
}

/**
 * Email classification types
 */
export type EmailClassification =
  | 'keep'
  | 'newsletter'
  | 'promotion'
  | 'spam'
  | 'dangerous_phishing'
  | 'unknown';

/**
 * User actions on emails
 */
export type UserAction = 'kept' | 'deleted' | 'unsubscribed' | 'reported' | 'pending' | 'ignored';

/**
 * Filters for querying email metadata
 */
export interface EmailMetadataFilters {
  /** Filter by folder IDs */
  readonly folderIds?: string[];

  /** Filter by classification */
  readonly classifications?: EmailClassification[];

  /** Filter by user actions */
  readonly userActions?: UserAction[];

  /** Filter by date range */
  readonly dateRange?: DateRangeFilter;

  /** Filter by confidence threshold */
  readonly minConfidence?: number;

  /** Filter by processing batch */
  readonly batchId?: string;

  /** Filter by bulk group */
  readonly bulkKey?: string;

  /** Pagination offset */
  readonly offset?: number;

  /** Maximum results to return */
  readonly limit?: number;

  /** Sort order */
  readonly sortBy?: EmailMetadataSortField;

  /** Sort direction */
  readonly sortOrder?: 'asc' | 'desc';
}

/**
 * Email metadata sort fields
 */
export type EmailMetadataSortField =
  | 'receivedDate'
  | 'lastClassified'
  | 'confidence'
  | 'userActionTimestamp'
  | 'senderEmail'
  | 'subject';

/**
 * Date range filter
 */
export interface DateRangeFilter {
  /** Start date (inclusive) */
  readonly start?: Date;

  /** End date (inclusive) */
  readonly end?: Date;
}

/**
 * Email metadata query result
 */
export interface EmailMetadataQueryResult {
  /** Matching email metadata records */
  readonly items: EmailMetadata[];

  /** Total count of matching records */
  readonly totalCount: number;

  /** Whether there are more results */
  readonly hasMore: boolean;

  /** Query execution time in milliseconds */
  readonly queryTimeMs: number;
}

/**
 * Classification history item for analytics and learning
 */
export interface ClassificationHistoryItem {
  /** Unique history item identifier */
  readonly id: string;

  /** When classification was performed */
  readonly timestamp: Date;

  /** Email that was classified */
  readonly emailId: string;

  /** Classification result */
  readonly classification: EmailClassification;

  /** Confidence score */
  readonly confidence: number;

  /** Classification reasoning */
  readonly reasons: string[];

  /** User action taken (if any) */
  readonly userAction?: UserAction;

  /** User feedback on classification accuracy */
  readonly userFeedback?: UserFeedback;

  /** Processing batch identifier */
  readonly batchId?: string;

  /** Model version used for classification */
  readonly modelVersion?: string;

  /** Processing time in milliseconds */
  readonly processingTimeMs?: number;
}

/**
 * User feedback on classification accuracy
 */
export type UserFeedback = 'correct' | 'incorrect' | 'partial';

/**
 * History filtering options
 */
export interface HistoryFilters {
  /** Filter by date range */
  readonly dateRange?: DateRangeFilter;

  /** Filter by classification type */
  readonly classifications?: EmailClassification[];

  /** Filter by user feedback */
  readonly feedback?: UserFeedback[];

  /** Filter by batch ID */
  readonly batchId?: string;

  /** Maximum results to return */
  readonly limit?: number;

  /** Pagination offset */
  readonly offset?: number;
}

/**
 * Processing state for resumable email processing
 */
export interface ProcessingState {
  /** Total emails discovered across all folders */
  readonly totalEmailsDiscovered: number;

  /** Total emails processed so far */
  readonly totalEmailsProcessed: number;

  /** Total emails with actions taken */
  readonly totalEmailsActioned: number;

  /** Current processing batch ID */
  readonly currentBatchId?: string;

  /** Last processed email ID */
  readonly lastProcessedEmailId?: string;

  /** Last processing timestamp */
  readonly lastProcessedTimestamp?: Date;

  /** Processing session statistics */
  readonly sessionStats: SessionStats;

  /** When processing state was created */
  readonly createdAt: Date;

  /** When processing state was last updated */
  readonly updatedAt: Date;
}

/**
 * Processing session statistics
 */
export interface SessionStats {
  /** Number of completed processing sessions */
  readonly sessionsCompleted: number;

  /** Total time spent processing (minutes) */
  readonly totalTimeSpent: number;

  /** Total API calls made */
  readonly totalApiCalls: number;

  /** Total cost in USD */
  readonly totalCostUSD: number;

  /** Average processing speed (emails per minute) */
  readonly avgProcessingSpeed?: number;
}

/**
 * Folder processing state
 */
export interface FolderState {
  /** Folder identifier */
  readonly folderId: string;

  /** Folder display name */
  readonly folderName: string;

  /** Total emails in folder */
  readonly totalEmails: number;

  /** Number of emails processed */
  readonly processedEmails: number;

  /** Last processed email ID in this folder */
  readonly lastProcessedEmailId?: string;

  /** Whether discovery is complete for this folder */
  readonly discoveryCompleted: boolean;

  /** When folder processing was created */
  readonly createdAt: Date;

  /** When folder processing was last updated */
  readonly updatedAt: Date;
}

/**
 * Action queue item for email operations
 */
export interface ActionQueueItem {
  /** Unique action identifier */
  readonly id: string;

  /** Email ID to act upon */
  readonly emailId: string;

  /** Type of action to perform */
  readonly actionType: ActionType;

  /** Action-specific parameters */
  readonly actionParams: ActionParams;

  /** Bulk group ID for related actions */
  readonly bulkGroupId?: string;

  /** Current action status */
  readonly status: ActionStatus;

  /** Action priority (1=highest, 10=lowest) */
  readonly priority: number;

  /** Number of retry attempts */
  readonly retryCount: number;

  /** Maximum retry attempts allowed */
  readonly maxRetries: number;

  /** Last attempt timestamp */
  readonly lastAttempted?: Date;

  /** Next retry timestamp for exponential backoff */
  readonly nextRetryAfter?: Date;

  /** Error message from last failed attempt */
  readonly errorMessage?: string;

  /** When action was created */
  readonly createdAt: Date;

  /** When action was completed */
  readonly completedAt?: Date;
}

/**
 * Email action types
 */
export type ActionType =
  | 'delete'
  | 'trash'
  | 'label'
  | 'unsubscribe'
  | 'report_spam'
  | 'report_phishing';

/**
 * Action-specific parameters
 */
export type ActionParams =
  | { readonly type: 'trash' }
  | { readonly type: 'delete'; readonly permanent: boolean }
  | { readonly type: 'label'; readonly addLabels: string[]; readonly removeLabels: string[] }
  | { readonly type: 'unsubscribe'; readonly method: 'http' | 'mailto'; readonly url: string }
  | { readonly type: 'report_spam' }
  | { readonly type: 'report_phishing' };

/**
 * Action execution status
 */
export type ActionStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'retrying'
  | 'cancelled';

/**
 * Action history filters
 */
export interface ActionHistoryFilters {
  /** Filter by email ID */
  readonly emailId?: string;

  /** Filter by action types */
  readonly actionTypes?: ActionType[];

  /** Filter by status */
  readonly statuses?: ActionStatus[];

  /** Filter by date range */
  readonly dateRange?: DateRangeFilter;

  /** Filter by bulk group */
  readonly bulkGroupId?: string;

  /** Maximum results */
  readonly limit?: number;

  /** Pagination offset */
  readonly offset?: number;
}

/**
 * Action history item
 */
export interface ActionHistoryItem {
  /** Unique history item ID */
  readonly id: string;

  /** Original action queue item ID */
  readonly actionQueueId: string;

  /** Email ID that was acted upon */
  readonly emailId: string;

  /** Action type performed */
  readonly actionType: ActionType;

  /** Attempt number */
  readonly attemptNumber: number;

  /** Execution status */
  readonly status: 'success' | 'rate_limited' | 'auth_error' | 'api_error' | 'network_error';

  /** HTTP response code (if applicable) */
  readonly responseCode?: number;

  /** Response message */
  readonly responseMessage?: string;

  /** Execution time in milliseconds */
  readonly executionTimeMs: number;

  /** When attempt was made */
  readonly attemptedAt: Date;
}

/**
 * Stored application configuration
 */
export interface StoredAppConfig {
  /** Configuration values by key */
  readonly values: Record<string, unknown>;

  /** When configuration was last updated */
  readonly lastUpdated: Date;

  /** Configuration schema version */
  readonly schemaVersion: number;
}

/**
 * Migration result information
 */
export interface MigrationResult {
  /** Previous schema version */
  readonly fromVersion: number;

  /** New schema version */
  readonly toVersion: number;

  /** Migrations that were applied */
  readonly migrationsApplied: string[];

  /** Migration execution time in milliseconds */
  readonly migrationTimeMs: number;

  /** Whether migration was successful */
  readonly success: boolean;
}

/**
 * Bulk operation result
 */
export interface BulkOperationResult {
  /** Number of items successfully processed */
  readonly successCount: number;

  /** Number of items that failed */
  readonly failureCount: number;

  /** Details of failed items */
  readonly failures?: Array<{ id: string; error: string }>;

  /** Total processing time in milliseconds */
  readonly processingTimeMs: number;
}

/**
 * Database cleanup result
 */
export interface CleanupResult {
  /** Number of records deleted */
  readonly recordsDeleted: number;

  /** Space freed in bytes */
  readonly spaceFreedBytes: number;

  /** Cleanup execution time in milliseconds */
  readonly cleanupTimeMs: number;

  /** Cleanup operations performed */
  readonly operations: string[];
}

/**
 * Database statistics
 */
export interface DatabaseStatistics {
  /** Total database size in bytes */
  readonly totalSizeBytes: number;

  /** Number of tables/collections */
  readonly tableCount: number;

  /** Record counts by table */
  readonly recordCounts: Record<string, number>;

  /** Index statistics */
  readonly indexStats?: Record<string, IndexStatistics>;

  /** Last vacuum/optimization timestamp */
  readonly lastOptimized?: Date;
}

/**
 * Index statistics
 */
export interface IndexStatistics {
  /** Index size in bytes */
  readonly sizeBytes: number;

  /** Number of index entries */
  readonly entryCount: number;

  /** Index efficiency score (0-1) */
  readonly efficiency?: number;
}

/**
 * Data export options
 */
export interface ExportOptions {
  /** Tables/collections to include */
  readonly includeTables?: string[];

  /** Tables/collections to exclude */
  readonly excludeTables?: string[];

  /** Whether to include encrypted data */
  readonly includeEncrypted?: boolean;

  /** Date range for time-based data */
  readonly dateRange?: DateRangeFilter;

  /** Export format */
  readonly format?: 'json' | 'sql' | 'csv';

  /** Whether to compress export data */
  readonly compress?: boolean;
}

/**
 * Data export result
 */
export interface ExportResult {
  /** Export metadata */
  readonly metadata: ExportMetadata;

  /** Exported data by table */
  readonly data: Record<string, unknown[]>;

  /** Export size in bytes */
  readonly sizeBytes: number;

  /** Export creation timestamp */
  readonly createdAt: Date;
}

/**
 * Export metadata
 */
export interface ExportMetadata {
  /** Application version that created export */
  readonly appVersion: string;

  /** Database schema version */
  readonly schemaVersion: number;

  /** Export format */
  readonly format: string;

  /** Record counts by table */
  readonly recordCounts: Record<string, number>;

  /** Whether data is compressed */
  readonly compressed: boolean;
}

/**
 * Data import options
 */
export interface ImportOptions {
  /** Whether to overwrite existing data */
  readonly overwrite?: boolean;

  /** Whether to validate data before import */
  readonly validate?: boolean;

  /** Tables to import (if not all) */
  readonly includeTables?: string[];

  /** Whether to run in transaction */
  readonly transactional?: boolean;
}

/**
 * Data import result
 */
export interface ImportResult {
  /** Number of records imported by table */
  readonly importedCounts: Record<string, number>;

  /** Number of records skipped by table */
  readonly skippedCounts: Record<string, number>;

  /** Import errors by table */
  readonly errors: Record<string, string[]>;

  /** Import execution time in milliseconds */
  readonly importTimeMs: number;

  /** Whether import was successful */
  readonly success: boolean;
}
