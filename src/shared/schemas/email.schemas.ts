/**
 * Zod validation schemas for email provider configurations and operations
 *
 * This module provides runtime validation schemas for email provider types,
 * ensuring type safety and data integrity for Gmail and IMAP configurations.
 *
 * @module EmailSchemas
 */

import { z } from 'zod';

/**
 * Gmail OAuth configuration schema
 */
export const GmailAuthConfigSchema = z.object({
  clientId: z.string().min(1, 'Client ID is required'),
  clientSecret: z.string().min(1, 'Client secret is required'),
  redirectUri: z.string().url('Redirect URI must be a valid URL'),
  scopes: z.array(z.string()).min(1, 'At least one scope is required').readonly(),
});

/**
 * Gmail OAuth tokens schema
 */
export const GmailTokensSchema = z.object({
  accessToken: z.string().min(1, 'Access token is required'),
  refreshToken: z.string().optional(),
  expiryDate: z.number().int().positive('Expiry date must be a positive integer'),
  scope: z.string().optional(),
  tokenType: z.string().optional(),
});

/**
 * Rate limiting configuration schema
 */
export const RateLimitConfigSchema = z.object({
  maxRequests: z.number().int().positive('Max requests must be positive'),
  windowMs: z.number().int().positive('Window must be positive'),
  requestDelayMs: z.number().int().nonnegative('Request delay must be non-negative').optional(),
  exponentialBackoff: z.boolean().optional(),
});

/**
 * Gmail provider configuration schema
 */
export const GmailProviderConfigSchema = z.object({
  auth: GmailAuthConfigSchema,
  tokens: GmailTokensSchema.optional(),
  timeoutMs: z.number().int().positive().max(300000).optional(), // Max 5 minutes
  maxRetries: z.number().int().min(0).max(10).optional(),
  rateLimitConfig: RateLimitConfigSchema.optional(),
});

/**
 * IMAP authentication configuration schema
 */
export const IMAPAuthConfigSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
  method: z.enum(['plain', 'oauth2', 'xoauth2']).optional(),
});

/**
 * IMAP provider configuration schema
 */
export const IMAPProviderConfigSchema = z.object({
  host: z.string().min(1, 'Host is required'),
  port: z.number().int().min(1).max(65535, 'Port must be between 1 and 65535'),
  secure: z.boolean(),
  auth: IMAPAuthConfigSchema,
  timeoutMs: z.number().int().positive().max(300000).optional(),
  keepAliveMs: z.number().int().positive().optional(),
});

/**
 * Email provider configuration union schema
 */
export const EmailProviderConfigSchema = z.union([
  GmailProviderConfigSchema,
  IMAPProviderConfigSchema,
]);

/**
 * Connection options schema
 */
export const ConnectionOptionsSchema = z.object({
  timeoutMs: z.number().int().positive().max(300000),
  signal: z.instanceof(AbortSignal).optional(),
  validateConnection: z.boolean().optional(),
  fetchFolders: z.boolean().optional(),
});

/**
 * Account information schema
 */
export const AccountInfoSchema = z.object({
  email: z.string().email('Must be a valid email address'),
  name: z.string().optional(),
  profilePicture: z.string().url().optional(),
  accountType: z.string().min(1, 'Account type is required'),
  quota: z
    .object({
      totalBytes: z.number().int().nonnegative(),
      usedBytes: z.number().int().nonnegative(),
      availableBytes: z.number().int().nonnegative(),
      usagePercentage: z.number().min(0).max(100),
    })
    .optional(),
});

/**
 * Connection information schema
 */
export const ConnectionInfoSchema = z.object({
  connected: z.boolean(),
  accountInfo: AccountInfoSchema,
  capabilities: z.array(z.string()).optional(),
  connectedAt: z.date(),
});

/**
 * Sort order schema
 */
export const SortOrderSchema = z.object({
  field: z.enum(['date', 'subject', 'sender', 'size']),
  direction: z.enum(['asc', 'desc']),
});

/**
 * Date range schema
 */
export const DateRangeSchema = z
  .object({
    start: z.date().optional(),
    end: z.date().optional(),
  })
  .refine((data) => !data.start || !data.end || data.start <= data.end, {
    message: 'Start date must be before or equal to end date',
    path: ['end'],
  });

/**
 * List options schema
 */
export const ListOptionsSchema = z.object({
  timeoutMs: z.number().int().positive().max(300000),
  signal: z.instanceof(AbortSignal).optional(),
  query: z.string().optional(),
  maxResults: z.number().int().positive().max(1000).optional(),
  pageToken: z.string().optional(),
  folderIds: z.array(z.string()).optional(),
  includeDeleted: z.boolean().optional(),
  sortOrder: SortOrderSchema.optional(),
  dateRange: DateRangeSchema.optional(),
});

/**
 * Email summary schema
 */
export const EmailSummarySchema = z.object({
  id: z.string().min(1, 'Email ID is required'),
  threadId: z.string().min(1, 'Thread ID is required'),
  folderIds: z.array(z.string()),
  subject: z.string(),
  from: z.string().email('From must be a valid email address'),
  fromName: z.string().optional(),
  to: z.array(z.string().email()),
  date: z.date(),
  snippet: z.string(),
  sizeBytes: z.number().int().nonnegative(),
  read: z.boolean(),
  important: z.boolean(),
  starred: z.boolean(),
  hasAttachments: z.boolean(),
  metadata: z.record(z.unknown()).optional(),
});

/**
 * List emails result schema
 */
export const ListEmailsResultSchema = z.object({
  emails: z.array(EmailSummarySchema),
  totalCount: z.number().int().nonnegative().optional(),
  nextPageToken: z.string().optional(),
  hasMore: z.boolean(),
});

/**
 * Get email options schema
 */
export const GetEmailOptionsSchema = z.object({
  timeoutMs: z.number().int().positive().max(300000),
  signal: z.instanceof(AbortSignal).optional(),
  includeHeaders: z.boolean().optional(),
  includeBody: z.boolean().optional(),
  includeAttachments: z.boolean().optional(),
  bodyFormat: z.enum(['text', 'html', 'both']).optional(),
});

/**
 * Email headers schema
 */
export const EmailHeadersSchema = z.object({
  messageId: z.string().optional(),
  references: z.array(z.string()).optional(),
  inReplyTo: z.string().optional(),
  listUnsubscribe: z.string().optional(),
  listId: z.string().optional(),
  spf: z.string().optional(),
  dkim: z.string().optional(),
  dmarc: z.string().optional(),
  contentType: z.string().optional(),
  all: z.record(z.union([z.string(), z.array(z.string())])),
});

/**
 * Email body schema
 */
export const EmailBodySchema = z
  .object({
    text: z.string().optional(),
    html: z.string().optional(),
    encoding: z.string().optional(),
    sizeBytes: z.number().int().nonnegative().optional(),
  })
  .refine((data) => Boolean(data.text) || Boolean(data.html), {
    message: 'Either text or html body is required',
    path: ['text'],
  });

/**
 * Email attachment schema
 */
export const EmailAttachmentSchema = z.object({
  id: z.string().min(1, 'Attachment ID is required'),
  filename: z.string().min(1, 'Filename is required'),
  contentType: z.string().min(1, 'Content type is required'),
  sizeBytes: z.number().int().nonnegative(),
  inline: z.boolean(),
  contentId: z.string().optional(),
});

/**
 * Full email schema
 */
export const EmailFullSchema = EmailSummarySchema.extend({
  headers: EmailHeadersSchema,
  body: EmailBodySchema.optional(),
  attachments: z.array(EmailAttachmentSchema).optional(),
  raw: z.string().optional(),
});

/**
 * Batch modify request schema
 */
export const BatchModifyRequestSchema = z.object({
  emailIds: z.array(z.string().min(1)).min(1, 'At least one email ID is required'),
  addFolderIds: z.array(z.string()).optional(),
  removeFolderIds: z.array(z.string()).optional(),
  markRead: z.boolean().optional(),
  markImportant: z.boolean().optional(),
  star: z.boolean().optional(),
});

/**
 * Batch delete request schema
 */
export const BatchDeleteRequestSchema = z.object({
  emailIds: z.array(z.string().min(1)).min(1, 'At least one email ID is required'),
  permanent: z.boolean().optional(),
  bulkGroupId: z.string().optional(),
});

/**
 * Batch operation failure schema
 */
export const BatchOperationFailureSchema = z.object({
  emailId: z.string().min(1),
  errorCode: z.string().min(1),
  errorMessage: z.string().min(1),
  retryable: z.boolean(),
});

/**
 * Batch operation result schema
 */
export const BatchOperationResultSchema = z.object({
  successCount: z.number().int().nonnegative(),
  failureCount: z.number().int().nonnegative(),
  failures: z.array(BatchOperationFailureSchema).optional(),
  processingTimeMs: z.number().nonnegative(),
});

/**
 * Search scope schema
 */
export const SearchScopeSchema = z.object({
  includeFolders: z.array(z.string()).optional(),
  excludeFolders: z.array(z.string()).optional(),
  includeTrash: z.boolean().optional(),
});

/**
 * Search options schema
 */
export const SearchOptionsSchema = ListOptionsSchema.extend({
  scope: SearchScopeSchema.optional(),
  searchBody: z.boolean().optional(),
  searchAttachments: z.boolean().optional(),
});

/**
 * Search result schema
 */
export const SearchResultSchema = ListEmailsResultSchema.extend({
  query: z.string().min(1),
  searchTimeMs: z.number().nonnegative(),
  truncated: z.boolean(),
});

/**
 * Email folder schema
 */
export const EmailFolderSchema = z.object({
  id: z.string().min(1, 'Folder ID is required'),
  name: z.string().min(1, 'Folder name is required'),
  type: z.enum(['inbox', 'sent', 'drafts', 'trash', 'spam', 'archive', 'custom', 'label']),
  parentId: z.string().optional(),
  totalEmails: z.number().int().nonnegative().optional(),
  unreadEmails: z.number().int().nonnegative().optional(),
  systemFolder: z.boolean(),
});

/**
 * Contact information schema
 */
export const ContactInfoSchema = z.object({
  email: z.string().email('Must be a valid email address'),
  name: z.string().optional(),
  phones: z.array(z.string()).optional(),
  organization: z.string().optional(),
  photoUrl: z.string().url().optional(),
  lastUpdated: z.date().optional(),
  stats: z
    .object({
      emailsSent: z.number().int().nonnegative(),
      emailsReceived: z.number().int().nonnegative(),
      lastInteraction: z.date().optional(),
      avgResponseTimeHours: z.number().nonnegative().optional(),
    })
    .optional(),
});

/**
 * Contact lookup result schema
 */
export const ContactLookupResultSchema = z.object({
  email: z.string().email(),
  found: z.boolean(),
  contact: ContactInfoSchema.optional(),
  relationshipStrength: z.enum(['none', 'weak', 'strong']).optional(),
});

/**
 * Unsubscribe method schema
 */
export const UnsubscribeMethodSchema = z.object({
  type: z.enum(['http_link', 'mailto', 'none']),
  value: z.string().optional(),
  valid: z.boolean(),
  alternatives: z
    .array(
      z.object({
        type: z.string(),
        value: z.string(),
      }),
    )
    .optional(),
});

/**
 * Gmail connection state schema
 */
export const GmailConnectionStateSchema = z.object({
  isSignedIn: z.boolean(),
  accountEmail: z.string().email().optional(),
  accountName: z.string().optional(),
  profilePicture: z.string().url().optional(),
  sessionExpiresAt: z.string().optional(),
  lastRefreshAt: z.string().optional(),
  needsReSignIn: z.boolean(),
  lastError: z.string().optional(),
});

/**
 * Relationship strength schema
 */
export const RelationshipStrengthSchema = z.enum(['none', 'weak', 'strong']);

// Type inference from schemas
export type GmailAuthConfig = z.infer<typeof GmailAuthConfigSchema>;
export type GmailTokens = z.infer<typeof GmailTokensSchema>;
export type GmailProviderConfig = z.infer<typeof GmailProviderConfigSchema>;
export type IMAPAuthConfig = z.infer<typeof IMAPAuthConfigSchema>;
export type IMAPProviderConfig = z.infer<typeof IMAPProviderConfigSchema>;
export type EmailProviderConfig = z.infer<typeof EmailProviderConfigSchema>;
export type ConnectionOptions = z.infer<typeof ConnectionOptionsSchema>;
export type AccountInfo = z.infer<typeof AccountInfoSchema>;
export type ConnectionInfo = z.infer<typeof ConnectionInfoSchema>;
export type ListOptions = z.infer<typeof ListOptionsSchema>;
export type EmailSummary = z.infer<typeof EmailSummarySchema>;
export type ListEmailsResult = z.infer<typeof ListEmailsResultSchema>;
export type GetEmailOptions = z.infer<typeof GetEmailOptionsSchema>;
export type EmailHeaders = z.infer<typeof EmailHeadersSchema>;
export type EmailBody = z.infer<typeof EmailBodySchema>;
export type EmailAttachment = z.infer<typeof EmailAttachmentSchema>;
export type EmailFull = z.infer<typeof EmailFullSchema>;
export type BatchModifyRequest = z.infer<typeof BatchModifyRequestSchema>;
export type BatchDeleteRequest = z.infer<typeof BatchDeleteRequestSchema>;
export type BatchOperationResult = z.infer<typeof BatchOperationResultSchema>;
export type SearchOptions = z.infer<typeof SearchOptionsSchema>;
export type SearchResult = z.infer<typeof SearchResultSchema>;
export type EmailFolder = z.infer<typeof EmailFolderSchema>;
export type ContactInfo = z.infer<typeof ContactInfoSchema>;
export type ContactLookupResult = z.infer<typeof ContactLookupResultSchema>;
export type UnsubscribeMethod = z.infer<typeof UnsubscribeMethodSchema>;
export type GmailConnectionState = z.infer<typeof GmailConnectionStateSchema>;
export type RelationshipStrength = z.infer<typeof RelationshipStrengthSchema>;

/**
 * Validation helper functions
 */

/**
 * Validate Gmail provider configuration
 */
export function validateGmailConfig(data: unknown): GmailProviderConfig {
  return GmailProviderConfigSchema.parse(data);
}

/**
 * Validate IMAP provider configuration
 */
export function validateIMAPConfig(data: unknown): IMAPProviderConfig {
  return IMAPProviderConfigSchema.parse(data);
}

/**
 * Validate email provider configuration
 */
export function validateEmailProviderConfig(data: unknown): EmailProviderConfig {
  return EmailProviderConfigSchema.parse(data);
}

/**
 * Validate email address
 */
export function validateEmailAddress(email: unknown): string {
  return z.string().email().parse(email);
}

/**
 * Validate email addresses array
 */
export function validateEmailAddresses(emails: unknown): string[] {
  return z.array(z.string().email()).parse(emails);
}

/**
 * Validate batch operation request
 */
export function validateBatchRequest(data: unknown): BatchModifyRequest | BatchDeleteRequest {
  // Try batch modify first, then batch delete
  try {
    return BatchModifyRequestSchema.parse(data);
  } catch {
    return BatchDeleteRequestSchema.parse(data);
  }
}

/**
 * Safe validation that returns Result type
 */
export function safeValidateGmailConfig(
  data: unknown,
): { success: true; data: GmailProviderConfig } | { success: false; error: z.ZodError } {
  try {
    const result = GmailProviderConfigSchema.parse(data);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error as z.ZodError };
  }
}

/**
 * Safe validation for IMAP config
 */
export function safeValidateIMAPConfig(
  data: unknown,
): { success: true; data: IMAPProviderConfig } | { success: false; error: z.ZodError } {
  try {
    const result = IMAPProviderConfigSchema.parse(data);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error as z.ZodError };
  }
}

/**
 * Create validation error message from ZodError
 */
export function createValidationErrorMessage(error: z.ZodError): string {
  return error.errors.map((err) => `${err.path.join('.')}: ${err.message}`).join('; ');
}
