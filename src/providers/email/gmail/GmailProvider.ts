/**
 * Gmail Provider Implementation for Smart Inbox Janitor
 * 
 * Implements the EmailProvider interface using Gmail API with OAuth 2.0 authentication.
 * Provides secure email access, batch operations, and comprehensive error handling
 * following the Result pattern for consistent error management.
 * 
 * @module GmailProvider
 */

import { google, gmail_v1 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import {
  type EmailProvider,
  type Result,
  type HealthStatus,
  type ListEmailsResult,
  type EmailFull,
  type EmailSummary,
  type BatchModifyRequest,
  type BatchDeleteRequest,
  type BatchOperationResult,
  type SearchResult,
  type EmailFolder,
  type ConnectionInfo,
  type AccountInfo,
  type GmailProviderConfig,
  type GmailTokens,
  type ListOptions,
  type GetEmailOptions,
  type SearchOptions,
  type ConnectionOptions,
  createSuccessResult,
  createErrorResult,
  ConfigurationError,
  AuthenticationError,
  NetworkError,
  ValidationError,
  RateLimitError,
  QuotaExceededError
} from '@shared/types';
import { GmailOAuthManager } from '../../../main/oauth/GmailOAuthManager';
import { SecureStorageManager } from '../../../main/security/SecureStorageManager';

/**
 * Gmail Provider Implementation
 * 
 * Provides complete Gmail integration using OAuth 2.0 for authentication
 * and the Gmail API for email operations. Implements all EmailProvider
 * interface methods with comprehensive error handling and rate limiting.
 */
export class GmailProvider implements EmailProvider<GmailProviderConfig> {
  readonly name = 'gmail-provider';
  readonly version = '1.0.0';

  private config: GmailProviderConfig | null = null;
  private oauth2Client: OAuth2Client | null = null;
  private gmail: gmail_v1.Gmail | null = null;
  private oauthManager: GmailOAuthManager | null = null;
  private storageManager: SecureStorageManager | null = null;
  private initialized = false;
  private connected = false;

  /**
   * Initialize the Gmail provider with OAuth configuration
   * 
   * @param config - Gmail provider configuration
   * @returns Result indicating initialization success or failure
   */
  async initialize(config: GmailProviderConfig): Promise<Result<void>> {
    try {
      this.config = config;
      
      // Ensure async operation for proper await requirement
      await Promise.resolve();

      // Validate configuration
      if (!config.auth.clientId || !config.auth.clientSecret) {
        return createErrorResult(
          new ConfigurationError('Gmail OAuth configuration missing required fields', {
            hasClientId: Boolean(config.auth.clientId),
            hasClientSecret: Boolean(config.auth.clientSecret),
            hasRedirectUri: Boolean(config.auth.redirectUri)
          })
        );
      }

      // Create OAuth manager
      this.oauthManager = new GmailOAuthManager({
        clientId: config.auth.clientId,
        clientSecret: config.auth.clientSecret,
        redirectUri: config.auth.redirectUri || 'http://localhost:8080'
      });

      const oauthInitResult = this.oauthManager.initialize();
      if (!oauthInitResult.success) {
        return createErrorResult(oauthInitResult.error);
      }

      // Create OAuth2 client
      this.oauth2Client = new google.auth.OAuth2(
        config.auth.clientId,
        config.auth.clientSecret,
        config.auth.redirectUri || 'http://localhost:8080'
      );

      // Create Gmail API client
      this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });

      this.initialized = true;

      return createSuccessResult(undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown initialization error';
      return createErrorResult(
        new ConfigurationError(`Gmail provider initialization failed: ${message}`, {
          provider: 'gmail'
        })
      );
    }
  }

  /**
   * Check Gmail provider health and authentication status
   * 
   * @returns Result containing health status
   */
  async healthCheck(): Promise<Result<HealthStatus>> {
    try {
      this.ensureInitialized();

      if (!this.connected || !this.gmail) {
        return createSuccessResult({
          healthy: false,
          message: 'Not connected to Gmail',
          metrics: { connected: 0 }
        });
      }

      // Test Gmail API access - gmail is already checked above
      if (this.gmail === null) {
        return createErrorResult(new NetworkError('Gmail client not initialized'));
      }
      
      const profileResult = await this.callWithErrorHandling(async () => {
        return await this.gmail.users.getProfile({ userId: 'me' });
      });

      if (!profileResult.success) {
        return createSuccessResult({
          healthy: false,
          message: `Gmail API error: ${profileResult.error.message}`,
          metrics: { apiError: 1 }
        });
      }

      return createSuccessResult({
        healthy: true,
        message: 'Gmail connection healthy',
        lastSuccess: new Date(),
        metrics: { 
          connected: 1,
          emailAddress: profileResult.data.data.emailAddress?.length ?? 0
        }
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown health check error';
      return createSuccessResult({
        healthy: false,
        message: `Health check failed: ${message}`,
        metrics: { error: 1 }
      });
    }
  }

  /**
   * Gracefully shutdown the Gmail provider
   * 
   * @returns Result indicating shutdown success or failure
   */
  async shutdown(): Promise<Result<void>> {
    try {
      if (this.connected) {
        await this.disconnect();
      }

      this.config = null;
      this.oauth2Client = null;
      this.gmail = null;
      this.oauthManager = null;
      this.storageManager = null;
      this.initialized = false;

      return createSuccessResult(undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown shutdown error';
      return createErrorResult(
        new ConfigurationError(`Gmail provider shutdown failed: ${message}`, {
          provider: 'gmail'
        })
      );
    }
  }

  /**
   * Get current Gmail provider configuration
   * 
   * @returns Readonly copy of configuration (with sanitized secrets)
   */
  getConfig(): Readonly<GmailProviderConfig> {
    if (!this.config) {
      return {
        auth: {
          clientId: '',
          clientSecret: '',
          redirectUri: '',
          scopes: []
        }
      } as const;
    }

    return {
      auth: {
        ...this.config.auth,
        clientSecret: '[REDACTED]'
      }
    } as const;
  }

  /**
   * Connect to Gmail using stored OAuth tokens
   * 
   * @param options - Optional connection configuration
   * @returns Result containing connection information
   */
  async connect(options?: ConnectionOptions): Promise<Result<ConnectionInfo>> {
    try {
      this.ensureInitialized();

      if (!this.storageManager) {
        return createErrorResult(
          new ConfigurationError('Secure storage manager not available', {
            operation: 'connect'
          })
        );
      }

      // Try to get stored tokens
      const tokensResult = await this.storageManager.getGmailTokens();
      if (!tokensResult.success) {
        return createErrorResult(
          new AuthenticationError('No Gmail tokens available - authentication required', {
            operation: 'connect',
            requiresAuth: true
          })
        );
      }

      if (!tokensResult.data) {
        return createErrorResult(
          new AuthenticationError('Gmail tokens not found - authentication required', {
            operation: 'connect',
            requiresAuth: true
          })
        );
      }

      // Set credentials in OAuth client
      if (this.oauth2Client === null) {
        return createErrorResult(
          new ConfigurationError('OAuth client not initialized')
        );
      }
      
      this.oauth2Client.setCredentials({
        // eslint-disable-next-line @typescript-eslint/naming-convention
        access_token: tokensResult.data.accessToken,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        refresh_token: tokensResult.data.refreshToken,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        expiry_date: tokensResult.data.expiryDate,
        scope: tokensResult.data.scope,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        token_type: tokensResult.data.tokenType
      });

      // Test connection
      if (!this.gmail) {
        return createErrorResult(
          new ConfigurationError('Gmail client not initialized')
        );
      }
      
      const profileResult = await this.callWithErrorHandling(async () => {
        if (this.gmail === null) {
          throw new Error('Gmail client not initialized');
        }
        return await this.gmail.users.getProfile({ userId: 'me' });
      });

      if (!profileResult.success) {
        // Try to refresh tokens if authentication failed
        if (profileResult.error instanceof AuthenticationError && tokensResult.data.refreshToken !== null && tokensResult.data.refreshToken !== undefined && tokensResult.data.refreshToken.length > 0) {
          const refreshResult = await this.refreshTokens(tokensResult.data.refreshToken);
          if (refreshResult.success) {
            // Retry connection with new tokens
            return await this.connect(options);
          }
        }
        return createErrorResult(profileResult.error);
      }

      this.connected = true;

      const connectionInfo: ConnectionInfo = {
        connected: true,
        connectedAt: new Date(),
        providerInfo: {
          provider: 'gmail',
          accountEmail: profileResult.data.data.emailAddress ?? undefined,
          accountId: profileResult.data.data.historyId ?? undefined
        }
      };

      return createSuccessResult(connectionInfo);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown connection error';
      return createErrorResult(
        new NetworkError(`Gmail connection failed: ${message}`, {
          operation: 'connect'
        })
      );
    }
  }

  /**
   * Disconnect from Gmail and clear session
   * 
   * @returns Result indicating disconnection success or failure
   */
  async disconnect(): Promise<Result<void>> {
    try {
      // Ensure async operation for proper await requirement
      await Promise.resolve();
      
      if (this.oauth2Client) {
        // Clear credentials but don't revoke tokens (keep for next session)
        this.oauth2Client.setCredentials({});
      }

      this.connected = false;

      return createSuccessResult(undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown disconnection error';
      return createErrorResult(
        new NetworkError(`Gmail disconnection failed: ${message}`, {
          operation: 'disconnect'
        })
      );
    }
  }

  /**
   * List emails from Gmail with pagination and filtering
   * 
   * @param options - Listing configuration and filters
   * @returns Result containing email summaries and pagination info
   */
  async list(options?: ListOptions): Promise<Result<ListEmailsResult>> {
    try {
      this.ensureConnected();

      const maxResults = Math.min(options?.maxResults ?? 50, 500); // Gmail API limit
      const query = this.buildGmailQuery(options);

      const listResult = await this.callWithErrorHandling(async () => {
        if (!this.gmail) {
          throw new Error('Gmail API client not initialized');
        }
        return await this.gmail.users.messages.list({
          userId: 'me',
          q: query,
          maxResults,
          pageToken: options?.pageToken,
          labelIds: options?.labelIds,
          includeSpamTrash: options?.includeSpamTrash ?? false
        });
      });

      if (!listResult.success) {
        return createErrorResult(listResult.error);
      }

      const messages: EmailSummary[] = [];
      const messageList = listResult.data.data.messages ?? [];

      // Fetch summary data for each message
      for (const message of messageList) {
        if (message.id) {
          const summaryResult = await this.getEmailSummary(message.id);
          if (summaryResult.success) {
            messages.push(summaryResult.data);
          }
        }
      }

      const result: ListEmailsResult = {
        emails: messages,
        totalCount: listResult.data.data.resultSizeEstimate ?? messages.length,
        hasMore: Boolean(listResult.data.data.nextPageToken),
        nextPageToken: listResult.data.data.nextPageToken ?? undefined
      };

      return createSuccessResult(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown list error';
      return createErrorResult(
        new NetworkError(`Failed to list emails: ${message}`, {
          operation: 'list',
          options: { maxResults: options?.maxResults, hasQuery: Boolean(options?.query) }
        })
      );
    }
  }

  /**
   * Get full email details including headers and body
   * 
   * @param emailId - Unique Gmail message ID
   * @param options - Optional fetch configuration
   * @returns Result containing complete email data
   */
  async get(emailId: string, options?: GetEmailOptions): Promise<Result<EmailFull>> {
    try {
      this.ensureConnected();

      if (!emailId) {
        return createErrorResult(
          new ValidationError('Email ID is required', {
            operation: 'get'
          })
        );
      }

      const messageResult = await this.callWithErrorHandling(async () => {
        return await this.gmail!.users.messages.get({
          userId: 'me',
          id: emailId,
          format: options?.includeBody ? 'full' : 'metadata',
          metadataHeaders: ['From', 'To', 'Cc', 'Bcc', 'Subject', 'Date', 'Message-ID', 'List-Unsubscribe']
        });
      });

      if (!messageResult.success) {
        return createErrorResult(messageResult.error);
      }

      const email = this.parseGmailMessage(messageResult.data.data, options?.includeBody ?? false);
      return createSuccessResult(email);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown get error';
      return createErrorResult(
        new NetworkError(`Failed to get email: ${message}`, {
          operation: 'get',
          emailId,
          includeBody: options?.includeBody
        })
      );
    }
  }

  /**
   * Perform batch operations on multiple emails
   * 
   * @param request - Batch operation configuration
   * @returns Result indicating batch operation success or failure
   */
  async batchModify(request: BatchModifyRequest): Promise<Result<BatchOperationResult>> {
    try {
      this.ensureConnected();

      if (!request.emailIds.length) {
        return createSuccessResult({
          successful: [],
          failed: [],
          totalRequested: 0,
          totalSuccessful: 0,
          totalFailed: 0
        });
      }

      // Gmail API supports batch modify up to 1000 messages
      const batchSize = 1000;
      const successful: string[] = [];
      const failed: Array<{ emailId: string; error: string }> = [];

      for (let i = 0; i < request.emailIds.length; i += batchSize) {
        const batch = request.emailIds.slice(i, i + batchSize);

        const batchResult = await this.callWithErrorHandling(async () => {
          return await this.gmail!.users.messages.batchModify({
            userId: 'me',
            requestBody: {
              ids: batch,
              addLabelIds: request.addLabels,
              removeLabelIds: request.removeLabels
            }
          });
        });

        if (batchResult.success) {
          successful.push(...batch);
        } else {
          // All messages in batch failed
          batch.forEach(id => {
            failed.push({
              emailId: id,
              error: batchResult.error.message
            });
          });
        }
      }

      const result: BatchOperationResult = {
        successful,
        failed,
        totalRequested: request.emailIds.length,
        totalSuccessful: successful.length,
        totalFailed: failed.length
      };

      return createSuccessResult(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown batch modify error';
      return createErrorResult(
        new NetworkError(`Batch modify failed: ${message}`, {
          operation: 'batchModify',
          emailCount: request.emailIds.length
        })
      );
    }
  }

  /**
   * Delete emails (move to trash)
   * 
   * @param request - Delete operation configuration
   * @returns Result indicating delete operation success or failure
   */
  async batchDelete(request: BatchDeleteRequest): Promise<Result<BatchOperationResult>> {
    try {
      this.ensureConnected();

      if (!request.emailIds.length) {
        return createSuccessResult({
          successful: [],
          failed: [],
          totalRequested: 0,
          totalSuccessful: 0,
          totalFailed: 0
        });
      }

      const successful: string[] = [];
      const failed: Array<{ emailId: string; error: string }> = [];

      // Process emails individually for delete operations
      for (const emailId of request.emailIds) {
        const deleteResult = await this.callWithErrorHandling(async () => {
          if (request.permanent) {
            // Permanent delete
            return await this.gmail!.users.messages.delete({
              userId: 'me',
              id: emailId
            });
          } else {
            // Move to trash
            return await this.gmail!.users.messages.trash({
              userId: 'me',
              id: emailId
            });
          }
        });

        if (deleteResult.success) {
          successful.push(emailId);
        } else {
          failed.push({
            emailId,
            error: deleteResult.error.message
          });
        }
      }

      const result: BatchOperationResult = {
        successful,
        failed,
        totalRequested: request.emailIds.length,
        totalSuccessful: successful.length,
        totalFailed: failed.length
      };

      return createSuccessResult(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown batch delete error';
      return createErrorResult(
        new NetworkError(`Batch delete failed: ${message}`, {
          operation: 'batchDelete',
          emailCount: request.emailIds.length
        })
      );
    }
  }

  /**
   * Report emails as spam
   * 
   * @param emailIds - Email IDs to report as spam
   * @returns Result indicating spam reporting success or failure
   */
  async reportSpam(emailIds: string[]): Promise<Result<BatchOperationResult>> {
    try {
      this.ensureConnected();

      // Use batch modify to add SPAM label
      const request: BatchModifyRequest = {
        emailIds,
        addLabels: ['SPAM'],
        removeLabels: ['INBOX']
      };

      return await this.batchModify(request);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown spam reporting error';
      return createErrorResult(
        new NetworkError(`Spam reporting failed: ${message}`, {
          operation: 'reportSpam',
          emailCount: emailIds.length
        })
      );
    }
  }

  /**
   * Report emails as phishing
   * 
   * @param emailIds - Email IDs to report as phishing
   * @returns Result indicating phishing reporting success or failure
   */
  async reportPhishing(emailIds: string[]): Promise<Result<BatchOperationResult>> {
    try {
      this.ensureConnected();

      // Use batch modify to add SPAM label and remove from INBOX
      const request: BatchModifyRequest = {
        emailIds,
        addLabels: ['SPAM'],
        removeLabels: ['INBOX']
      };

      return await this.batchModify(request);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown phishing reporting error';
      return createErrorResult(
        new NetworkError(`Phishing reporting failed: ${message}`, {
          operation: 'reportPhishing',
          emailCount: emailIds.length
        })
      );
    }
  }

  /**
   * Search emails using Gmail query syntax
   * 
   * @param query - Gmail search query string
   * @param options - Optional search configuration
   * @returns Result containing search results
   */
  async search(query: string, options?: SearchOptions): Promise<Result<SearchResult>> {
    try {
      this.ensureConnected();

      if (!query.trim()) {
        return createErrorResult(
          new ValidationError('Search query cannot be empty', {
            operation: 'search'
          })
        );
      }

      const maxResults = Math.min(options?.maxResults ?? 100, 500);

      const searchResult = await this.callWithErrorHandling(async () => {
        return await this.gmail!.users.messages.list({
          userId: 'me',
          q: query,
          maxResults,
          pageToken: options?.pageToken
        });
      });

      if (!searchResult.success) {
        return createErrorResult(searchResult.error);
      }

      const messages: EmailSummary[] = [];
      const messageList = searchResult.data.data.messages ?? [];

      // Fetch summary data for search results
      for (const message of messageList) {
        if (message.id) {
          const summaryResult = await this.getEmailSummary(message.id);
          if (summaryResult.success) {
            messages.push(summaryResult.data);
          }
        }
      }

      const result: SearchResult = {
        emails: messages,
        totalCount: searchResult.data.data.resultSizeEstimate ?? messages.length,
        hasMore: Boolean(searchResult.data.data.nextPageToken),
        nextPageToken: searchResult.data.data.nextPageToken ?? undefined,
        query
      };

      return createSuccessResult(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown search error';
      return createErrorResult(
        new NetworkError(`Search failed: ${message}`, {
          operation: 'search',
          query: query.substring(0, 100) // Truncate for logging
        })
      );
    }
  }

  /**
   * Get available Gmail labels (folders)
   * 
   * @returns Result containing label information
   */
  async getFolders(): Promise<Result<EmailFolder[]>> {
    try {
      this.ensureConnected();

      const labelsResult = await this.callWithErrorHandling(async () => {
        return await this.gmail!.users.labels.list({
          userId: 'me'
        });
      });

      if (!labelsResult.success) {
        return createErrorResult(labelsResult.error);
      }

      const folders: EmailFolder[] = (labelsResult.data.data.labels ?? []).map(label => ({
        id: label.id ?? '',
        name: label.name ?? '',
        type: this.getLabelType(label.type),
        messageCount: label.messagesTotal ?? 0,
        unreadCount: label.messagesUnread ?? 0,
        visible: label.labelListVisibility === 'labelShow' || label.labelListVisibility === 'labelShowIfUnread'
      }));

      return createSuccessResult(folders);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown get folders error';
      return createErrorResult(
        new NetworkError(`Failed to get folders: ${message}`, {
          operation: 'getFolders'
        })
      );
    }
  }

  /**
   * Get Gmail account information
   * 
   * @returns Result containing account details
   */
  async getAccountInfo(): Promise<Result<AccountInfo>> {
    try {
      this.ensureConnected();

      const profileResult = await this.callWithErrorHandling(async () => {
        return await this.gmail!.users.getProfile({
          userId: 'me'
        });
      });

      if (!profileResult.success) {
        return createErrorResult(profileResult.error);
      }

      const profile = profileResult.data.data;
      const accountInfo: AccountInfo = {
        id: profile.historyId ?? '',
        email: profile.emailAddress ?? '',
        name: profile.emailAddress ?? '', // Gmail doesn't provide display name in profile
        provider: 'gmail',
        quotaUsed: 0, // Gmail API doesn't provide quota in profile
        quotaTotal: 0,
        lastSyncAt: new Date()
      };

      return createSuccessResult(accountInfo);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown get account info error';
      return createErrorResult(
        new NetworkError(`Failed to get account info: ${message}`, {
          operation: 'getAccountInfo'
        })
      );
    }
  }

  /**
   * Set secure storage manager for token management
   * 
   * @param storageManager - Initialized secure storage manager
   */
  setStorageManager(storageManager: SecureStorageManager): void {
    this.storageManager = storageManager;
  }

  /**
   * Get OAuth manager for authentication flows
   * 
   * @returns OAuth manager instance or null if not initialized
   */
  getOAuthManager(): GmailOAuthManager | null {
    return this.oauthManager;
  }

  // Private helper methods

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('Gmail provider not initialized');
    }
  }

  private ensureConnected(): void {
    this.ensureInitialized();
    if (!this.connected || !this.gmail) {
      throw new Error('Gmail provider not connected');
    }
  }

  private async refreshTokens(refreshToken: string): Promise<Result<GmailTokens>> {
    if (!this.oauthManager || !this.storageManager) {
      return createErrorResult(
        new ConfigurationError('OAuth manager or storage manager not available', {
          operation: 'refreshTokens'
        })
      );
    }

    const refreshResult = await this.oauthManager.refreshTokens(refreshToken);
    if (!refreshResult.success) {
      return createErrorResult(refreshResult.error);
    }

    // Store new tokens
    const storeResult = await this.storageManager.storeGmailTokens(refreshResult.data);
    if (!storeResult.success) {
      return createErrorResult(storeResult.error);
    }

    return refreshResult;
  }

  private async callWithErrorHandling<T>(
    apiCall: () => Promise<T>
  ): Promise<Result<T>> {
    try {
      const result = await apiCall();
      return createSuccessResult(result);
    } catch (error: any) {
      // Handle specific Gmail API errors
      if (error.code === 401) {
        return createErrorResult(
          new AuthenticationError('Gmail authentication expired', {
            operation: 'api-call',
            requiresReauth: true
          })
        );
      } else if (error.code === 403) {
        const errorDetails = error.errors?.[0];
        if (errorDetails?.reason === 'dailyLimitExceeded') {
          return createErrorResult(
            new QuotaExceededError('Gmail API daily limit exceeded', {
              operation: 'api-call',
              quotaType: 'daily'
            })
          );
        } else if (errorDetails?.reason === 'userRateLimitExceeded') {
          return createErrorResult(
            new RateLimitError('Gmail API rate limit exceeded', {
              operation: 'api-call',
              retryAfter: 60000 // 1 minute
            })
          );
        } else {
          return createErrorResult(
            new ValidationError(`Gmail API access denied: ${errorDetails?.message ?? error.message}`, {
              operation: 'api-call'
            })
          );
        }
      } else if (error.code === 429) {
        return createErrorResult(
          new RateLimitError('Too many requests to Gmail API', {
            operation: 'api-call',
            retryAfter: 60000
          })
        );
      } else if (error.code >= 500) {
        return createErrorResult(
          new NetworkError('Gmail API server error', {
            operation: 'api-call',
            retryable: true,
            statusCode: error.code
          })
        );
      } else {
        const message = error instanceof Error ? error.message : 'Unknown API error';
        return createErrorResult(
          new NetworkError(`Gmail API error: ${message}`, {
            operation: 'api-call',
            statusCode: error.code
          })
        );
      }
    }
  }

  private buildGmailQuery(options?: ListOptions): string {
    const queryParts: string[] = [];

    if (options?.query) {
      queryParts.push(options.query);
    }

    if (options?.dateRange) {
      if (options.dateRange.after) {
        const afterDate = new Date(options.dateRange.after).toISOString().split('T')[0];
        queryParts.push(`after:${afterDate}`);
      }
      if (options.dateRange.before) {
        const beforeDate = new Date(options.dateRange.before).toISOString().split('T')[0];
        queryParts.push(`before:${beforeDate}`);
      }
    }

    if (options?.unreadOnly) {
      queryParts.push('is:unread');
    }

    return queryParts.join(' ');
  }

  private async getEmailSummary(messageId: string): Promise<Result<EmailSummary>> {
    try {
      const messageResult = await this.callWithErrorHandling(async () => {
        return await this.gmail!.users.messages.get({
          userId: 'me',
          id: messageId,
          format: 'metadata',
          metadataHeaders: ['From', 'To', 'Subject', 'Date']
        });
      });

      if (!messageResult.success) {
        return createErrorResult(messageResult.error);
      }

      const message = messageResult.data.data;
      const headers = message.payload?.headers ?? [];

      const summary: EmailSummary = {
        id: message.id ?? '',
        threadId: message.threadId ?? '',
        subject: this.getHeader(headers, 'Subject') ?? '',
        from: this.getHeader(headers, 'From') ?? '',
        to: this.getHeader(headers, 'To') ?? '',
        date: new Date(parseInt(message.internalDate ?? '0')),
        snippet: message.snippet ?? '',
        unread: message.labelIds?.includes('UNREAD') ?? false,
        labels: message.labelIds ?? [],
        hasAttachments: this.hasAttachments(message.payload),
        size: message.sizeEstimate ?? 0
      };

      return createSuccessResult(summary);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return createErrorResult(
        new NetworkError(`Failed to get email summary: ${message}`, {
          operation: 'getEmailSummary',
          messageId
        })
      );
    }
  }

  private parseGmailMessage(message: gmail_v1.Schema$Message, includeBody: boolean): EmailFull {
    const headers = message.payload?.headers ?? [];
    
    const emailFull: EmailFull = {
      id: message.id ?? '',
      threadId: message.threadId ?? '',
      subject: this.getHeader(headers, 'Subject') ?? '',
      from: this.getHeader(headers, 'From') ?? '',
      to: this.getHeader(headers, 'To') ?? '',
      cc: this.getHeader(headers, 'Cc'),
      bcc: this.getHeader(headers, 'Bcc'),
      date: new Date(parseInt(message.internalDate ?? '0')),
      body: includeBody ? this.extractMessageBody(message.payload) : '',
      snippet: message.snippet ?? '',
      unread: message.labelIds?.includes('UNREAD') ?? false,
      labels: message.labelIds ?? [],
      headers: this.extractAllHeaders(headers),
      hasAttachments: this.hasAttachments(message.payload),
      size: message.sizeEstimate ?? 0,
      messageId: this.getHeader(headers, 'Message-ID'),
      listUnsubscribe: this.getHeader(headers, 'List-Unsubscribe')
    };

    return emailFull;
  }

  private getHeader(headers: gmail_v1.Schema$MessagePartHeader[], name: string): string | undefined {
    const header = headers.find(h => h.name?.toLowerCase() === name.toLowerCase());
    return header?.value ?? undefined;
  }

  private extractAllHeaders(headers: gmail_v1.Schema$MessagePartHeader[]): Record<string, string> {
    const headerMap: Record<string, string> = {};
    headers.forEach(header => {
      if (header.name && header.value) {
        headerMap[header.name] = header.value;
      }
    });
    return headerMap;
  }

  private extractMessageBody(payload?: gmail_v1.Schema$MessagePart): string {
    if (!payload) return '';

    // Handle single part message
    if (payload.body?.data) {
      return Buffer.from(payload.body.data, 'base64').toString('utf-8');
    }

    // Handle multipart message
    if (payload.parts) {
      for (const part of payload.parts) {
        // Prefer text/plain over text/html
        if (part.mimeType === 'text/plain' && part.body?.data) {
          return Buffer.from(part.body.data, 'base64').toString('utf-8');
        }
      }

      // Fallback to HTML if no plain text
      for (const part of payload.parts) {
        if (part.mimeType === 'text/html' && part.body?.data) {
          return Buffer.from(part.body.data, 'base64').toString('utf-8');
        }
      }

      // Recursively check nested parts
      for (const part of payload.parts) {
        const body = this.extractMessageBody(part);
        if (body) return body;
      }
    }

    return '';
  }

  private hasAttachments(payload?: gmail_v1.Schema$MessagePart): boolean {
    if (!payload) return false;

    if (payload.filename && payload.filename.length > 0) {
      return true;
    }

    if (payload.parts) {
      return payload.parts.some(part => this.hasAttachments(part));
    }

    return false;
  }

  private getLabelType(gmailType?: string): 'system' | 'user' {
    return gmailType === 'system' ? 'system' : 'user';
  }
}