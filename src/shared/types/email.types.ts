/**
 * Email provider interfaces and supporting types for Smart Inbox Janitor
 *
 * This module defines the EmailProvider and ContactsProvider interfaces
 * along with all supporting types for email operations, batch processing,
 * and contact relationship management.
 *
 * @module EmailTypes
 */

import { Result, TimeoutOptions, HealthStatus } from './base.types.js';
import { GmailProviderConfig, IMAPProviderConfig } from './config.types.js';

/**
 * Email provider interface for fetching, processing, and managing emails
 *
 * Provides a provider-agnostic interface for email operations with Gmail-first
 * design and extensibility for IMAP and other email providers.
 *
 * @template TConfig - Provider-specific configuration type
 */
export interface EmailProvider<TConfig = EmailProviderConfig> {
  readonly name: string;
  readonly version: string;
  initialize(config: TConfig): Promise<Result<void>>;
  shutdown(): Promise<Result<void>>;
  healthCheck(): Promise<Result<HealthStatus>>;
  getConfig(): Readonly<TConfig>;
  isInitialized(): boolean;
  /**
   * Establish connection to the email provider
   *
   * @param options - Optional connection configuration
   * @returns Result indicating connection success or failure
   */
  connect(options?: ConnectionOptions): Promise<Result<ConnectionInfo>>;

  /**
   * Disconnect from the email provider and cleanup resources
   *
   * @returns Result indicating disconnection success or failure
   */
  disconnect(): Promise<Result<void>>;

  /**
   * List emails with pagination and filtering support
   *
   * @param options - Listing configuration and filters
   * @returns Result containing email summaries and pagination info
   */
  list(options?: ListOptions): Promise<Result<ListEmailsResult>>;

  /**
   * Get full email details including headers and body
   *
   * @param emailId - Unique identifier for the email
   * @param options - Optional fetch configuration
   * @returns Result containing complete email data
   */
  get(emailId: string, options?: GetEmailOptions): Promise<Result<EmailFull>>;

  /**
   * Perform batch operations on multiple emails
   *
   * @param request - Batch operation configuration
   * @returns Result indicating batch operation success or failure
   */
  batchModify(request: BatchModifyRequest): Promise<Result<BatchOperationResult>>;

  /**
   * Delete emails (move to trash or permanent delete)
   *
   * @param request - Delete operation configuration
   * @returns Result indicating delete operation success or failure
   */
  batchDelete(request: BatchDeleteRequest): Promise<Result<BatchOperationResult>>;

  /**
   * Report emails as spam (provider-optional)
   *
   * @param emailIds - Email IDs to report as spam
   * @returns Result indicating spam reporting success or failure
   */
  reportSpam?(emailIds: string[]): Promise<Result<BatchOperationResult>>;

  /**
   * Report emails as phishing (provider-optional)
   *
   * @param emailIds - Email IDs to report as phishing
   * @returns Result indicating phishing reporting success or failure
   */
  reportPhishing?(emailIds: string[]): Promise<Result<BatchOperationResult>>;

  /**
   * Search emails using provider-specific query syntax
   *
   * @param query - Search query string
   * @param options - Optional search configuration
   * @returns Result containing search results
   */
  search(query: string, options?: SearchOptions): Promise<Result<SearchResult>>;

  /**
   * Get available folders/labels from the email provider
   *
   * @returns Result containing folder/label information
   */
  getFolders(): Promise<Result<EmailFolder[]>>;

  /**
   * Get account information for the connected email account
   *
   * @returns Result containing account details
   */
  getAccountInfo(): Promise<Result<AccountInfo>>;
}

/**
 * Contacts provider interface for relationship strength evaluation
 *
 * Provides contact lookup and relationship strength determination
 * to enhance email classification accuracy.
 */
export interface ContactsProvider extends BaseProvider {
  /**
   * Check if an email address or domain is known to the user
   *
   * @param emailOrDomain - Email address or domain to check
   * @returns Result indicating if the contact is known
   */
  isKnown(emailOrDomain: string): Promise<Result<boolean>>;

  /**
   * Determine relationship strength with a contact
   *
   * @param email - Email address to evaluate
   * @returns Result containing relationship strength level
   */
  relationshipStrength(email: string): Promise<Result<RelationshipStrength>>;

  /**
   * Get contact information if available
   *
   * @param email - Email address to look up
   * @returns Result containing contact details or null if not found
   */
  getContact(email: string): Promise<Result<ContactInfo | null>>;

  /**
   * Batch lookup for multiple email addresses
   *
   * @param emails - Array of email addresses to look up
   * @returns Result containing contact lookup results
   */
  batchLookup(emails: string[]): Promise<Result<ContactLookupResult[]>>;
}

/**
 * Email provider configuration union type
 */
export type EmailProviderConfig = GmailProviderConfig | IMAPProviderConfig;

/**
 * Relationship strength levels for contact evaluation
 */
export type RelationshipStrength = 'none' | 'weak' | 'strong';

/**
 * Connection options for email provider initialization
 */
export interface ConnectionOptions extends TimeoutOptions {
  /** Whether to validate connection after establishing */
  readonly validateConnection?: boolean;

  /** Whether to fetch initial folder list */
  readonly fetchFolders?: boolean;
}

/**
 * Connection information returned after successful connection
 */
export interface ConnectionInfo {
  /** Whether connection was established successfully */
  readonly connected: boolean;

  /** Connected account information */
  readonly accountInfo: AccountInfo;

  /** Server capabilities and features */
  readonly capabilities?: string[];

  /** Connection timestamp */
  readonly connectedAt: Date;
}

/**
 * Account information for connected email account
 */
export interface AccountInfo {
  /** Account email address */
  readonly email: string;

  /** Display name */
  readonly name?: string;

  /** Profile picture URL */
  readonly profilePicture?: string;

  /** Account type identifier */
  readonly accountType: string;

  /** Storage quota information */
  readonly quota?: QuotaInfo;
}

/**
 * Storage quota information
 */
export interface QuotaInfo {
  /** Total storage quota in bytes */
  readonly totalBytes: number;

  /** Used storage in bytes */
  readonly usedBytes: number;

  /** Available storage in bytes */
  readonly availableBytes: number;

  /** Usage percentage (0-100) */
  readonly usagePercentage: number;
}

/**
 * Options for listing emails
 */
export interface ListOptions extends TimeoutOptions {
  /** Search query to filter emails */
  readonly query?: string;

  /** Maximum number of results to return */
  readonly maxResults?: number;

  /** Pagination token for continued listing */
  readonly pageToken?: string;

  /** Folder/label IDs to search within */
  readonly folderIds?: string[];

  /** Include deleted/trashed emails */
  readonly includeDeleted?: boolean;

  /** Sort order for results */
  readonly sortOrder?: SortOrder;

  /** Date range filter */
  readonly dateRange?: DateRange;
}

/**
 * Sort order for email listings
 */
export interface SortOrder {
  /** Field to sort by */
  readonly field: 'date' | 'subject' | 'sender' | 'size';

  /** Sort direction */
  readonly direction: 'asc' | 'desc';
}

/**
 * Date range filter for email queries
 */
export interface DateRange {
  /** Start date (inclusive) */
  readonly start?: Date;

  /** End date (inclusive) */
  readonly end?: Date;
}

/**
 * Result of email listing operation
 */
export interface ListEmailsResult {
  /** Array of email summaries */
  readonly emails: EmailSummary[];

  /** Total number of emails matching query */
  readonly totalCount?: number;

  /** Token for next page of results */
  readonly nextPageToken?: string;

  /** Whether there are more results available */
  readonly hasMore: boolean;
}

/**
 * Email summary information for listings
 */
export interface EmailSummary {
  /** Unique email identifier */
  readonly id: string;

  /** Thread identifier for conversation grouping */
  readonly threadId: string;

  /** Folder/label identifiers */
  readonly folderIds: string[];

  /** Email subject line */
  readonly subject: string;

  /** Sender email address */
  readonly from: string;

  /** Sender display name */
  readonly fromName?: string;

  /** Recipient email addresses */
  readonly to: string[];

  /** Email received/sent timestamp */
  readonly date: Date;

  /** Email content snippet */
  readonly snippet: string;

  /** Email size in bytes */
  readonly sizeBytes: number;

  /** Whether email has been read */
  readonly read: boolean;

  /** Whether email is marked as important */
  readonly important: boolean;

  /** Whether email is starred/flagged */
  readonly starred: boolean;

  /** Whether email has attachments */
  readonly hasAttachments: boolean;

  /** Provider-specific metadata */
  readonly metadata?: Record<string, unknown>;
}

/**
 * Options for fetching full email details
 */
export interface GetEmailOptions extends TimeoutOptions {
  /** Whether to include raw email headers */
  readonly includeHeaders?: boolean;

  /** Whether to include email body content */
  readonly includeBody?: boolean;

  /** Whether to include attachment metadata */
  readonly includeAttachments?: boolean;

  /** Body format preference */
  readonly bodyFormat?: 'text' | 'html' | 'both';
}

/**
 * Complete email data with headers and body
 */
export interface EmailFull extends EmailSummary {
  /** Email headers */
  readonly headers: EmailHeaders;

  /** Email body content */
  readonly body?: EmailBody;

  /** Email attachments */
  readonly attachments?: EmailAttachment[];

  /** Raw email message (optional) */
  readonly raw?: string;

  /** Message ID from headers */
  readonly messageId?: string;

  /** List-Unsubscribe header for newsletters */
  readonly listUnsubscribe?: string;
}

/**
 * Email headers collection
 */
export interface EmailHeaders {
  /** Message-ID header */
  readonly messageId?: string;

  /** References header for threading */
  readonly references?: string[];

  /** In-Reply-To header */
  readonly inReplyTo?: string;

  /** List-Unsubscribe header for newsletters */
  readonly listUnsubscribe?: string;

  /** List-ID header for mailing lists */
  readonly listId?: string;

  /** SPF authentication result */
  readonly spf?: string;

  /** DKIM authentication result */
  readonly dkim?: string;

  /** DMARC authentication result */
  readonly dmarc?: string;

  /** Content-Type header */
  readonly contentType?: string;

  /** All headers as key-value pairs */
  readonly all: Record<string, string | string[]>;
}

/**
 * Email body content in different formats
 */
export interface EmailBody {
  /** Plain text content */
  readonly text?: string;

  /** HTML content (sanitized) */
  readonly html?: string;

  /** Character encoding */
  readonly encoding?: string;

  /** Content size in bytes */
  readonly sizeBytes?: number;
}

/**
 * Email attachment metadata
 */
export interface EmailAttachment {
  /** Attachment identifier */
  readonly id: string;

  /** Original filename */
  readonly filename: string;

  /** MIME content type */
  readonly contentType: string;

  /** Attachment size in bytes */
  readonly sizeBytes: number;

  /** Whether attachment is inline */
  readonly inline: boolean;

  /** Content-ID for inline attachments */
  readonly contentId?: string;
}

/**
 * Batch modify operation request
 */
export interface BatchModifyRequest {
  /** Email IDs to modify */
  readonly emailIds: string[];

  /** Folder/label IDs to add */
  readonly addFolderIds?: string[];

  /** Folder/label IDs to remove */
  readonly removeFolderIds?: string[];

  /** Whether to mark as read */
  readonly markRead?: boolean;

  /** Whether to mark as important */
  readonly markImportant?: boolean;

  /** Whether to star/flag emails */
  readonly star?: boolean;
}

/**
 * Batch delete operation request
 */
export interface BatchDeleteRequest {
  /** Email IDs to delete */
  readonly emailIds: string[];

  /** Whether to permanently delete (vs move to trash) */
  readonly permanent?: boolean;

  /** Bulk operation group ID for tracking */
  readonly bulkGroupId?: string;
}

/**
 * Result of batch operations
 */
export interface BatchOperationResult {
  /** Number of emails successfully processed */
  readonly successCount: number;

  /** Number of emails that failed processing */
  readonly failureCount: number;

  /** Details of failed operations */
  readonly failures?: BatchOperationFailure[];

  /** Total processing time in milliseconds */
  readonly processingTimeMs: number;
}

/**
 * Details of a failed batch operation
 */
export interface BatchOperationFailure {
  /** Email ID that failed */
  readonly emailId: string;

  /** Error code */
  readonly errorCode: string;

  /** Error message */
  readonly errorMessage: string;

  /** Whether the operation can be retried */
  readonly retryable: boolean;
}

/**
 * Search options for email queries
 */
export interface SearchOptions extends ListOptions {
  /** Search scope (folders to search) */
  readonly scope?: SearchScope;

  /** Whether to search in email body */
  readonly searchBody?: boolean;

  /** Whether to search in attachments */
  readonly searchAttachments?: boolean;
}

/**
 * Search scope configuration
 */
export interface SearchScope {
  /** Folder IDs to include in search */
  readonly includeFolders?: string[];

  /** Folder IDs to exclude from search */
  readonly excludeFolders?: string[];

  /** Whether to search in trash/deleted items */
  readonly includeTrash?: boolean;
}

/**
 * Search operation result
 */
export interface SearchResult extends ListEmailsResult {
  /** Search query that was executed */
  readonly query: string;

  /** Search execution time in milliseconds */
  readonly searchTimeMs: number;

  /** Whether search was truncated due to limits */
  readonly truncated: boolean;
}

/**
 * Email folder/label information
 */
export interface EmailFolder {
  /** Unique folder identifier */
  readonly id: string;

  /** Human-readable folder name */
  readonly name: string;

  /** Folder type */
  readonly type: FolderType;

  /** Parent folder ID (for nested folders) */
  readonly parentId?: string;

  /** Number of total emails in folder */
  readonly totalEmails?: number;

  /** Number of unread emails in folder */
  readonly unreadEmails?: number;

  /** Whether folder is system-defined */
  readonly systemFolder: boolean;
}

/**
 * Email folder types
 */
export type FolderType =
  | 'inbox'
  | 'sent'
  | 'drafts'
  | 'trash'
  | 'spam'
  | 'archive'
  | 'custom'
  | 'label';

/**
 * Contact information from contacts provider
 */
export interface ContactInfo {
  /** Contact email address */
  readonly email: string;

  /** Contact display name */
  readonly name?: string;

  /** Contact phone numbers */
  readonly phones?: string[];

  /** Contact organization */
  readonly organization?: string;

  /** Contact photo URL */
  readonly photoUrl?: string;

  /** When contact was last updated */
  readonly lastUpdated?: Date;

  /** Contact interaction statistics */
  readonly stats?: ContactStats;
}

/**
 * Contact interaction statistics
 */
export interface ContactStats {
  /** Number of emails sent to this contact */
  readonly emailsSent: number;

  /** Number of emails received from this contact */
  readonly emailsReceived: number;

  /** Last email interaction timestamp */
  readonly lastInteraction?: Date;

  /** Average response time in hours */
  readonly avgResponseTimeHours?: number;
}

/**
 * Contact lookup result for batch operations
 */
export interface ContactLookupResult {
  /** Email address that was looked up */
  readonly email: string;

  /** Whether contact was found */
  readonly found: boolean;

  /** Contact information if found */
  readonly contact?: ContactInfo;

  /** Relationship strength if contact exists */
  readonly relationshipStrength?: RelationshipStrength;
}

/**
 * Unsubscribe method information from email headers
 */
export interface UnsubscribeMethod {
  /** Unsubscribe method type */
  readonly type: 'http_link' | 'mailto' | 'none';

  /** Unsubscribe URL or email address */
  readonly value?: string;

  /** Whether method was successfully parsed */
  readonly valid: boolean;

  /** Additional unsubscribe options */
  readonly alternatives?: Array<{ type: string; value: string }>;
}
