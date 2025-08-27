/**
 * Gmail OAuth 2.0 Manager for Smart Inbox Janitor
 *
 * Implements complete Gmail OAuth 2.0 flow with PKCE security for desktop applications.
 * Provides secure authorization code exchange, token management, and automatic refresh.
 *
 * @module GmailOAuthManager
 */

import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { randomBytes, createHash } from 'crypto';
import {
  Result,
  createSuccessResult,
  createErrorResult,
  AuthenticationError,
  ConfigurationError,
  NetworkError,
  ValidationError,
  GmailTokens,
  RefreshFailureReason,
  TokenRefreshMetadata,
} from '@shared/types';

/**
 * OAuth initialization result with authorization URL and code verifier
 */
export interface AuthInitResult {
  /** Authorization URL for user to visit */
  readonly authUrl: string;
  /** PKCE code verifier for token exchange */
  readonly codeVerifier: string;
  /** State parameter for CSRF protection */
  readonly state: string;
}

/**
 * Gmail OAuth configuration
 */
export interface GmailOAuthConfig {
  /** OAuth 2.0 Client ID */
  readonly clientId: string;
  /** OAuth 2.0 Client Secret */
  readonly clientSecret: string;
  /** Redirect URI for OAuth callback */
  readonly redirectUri: string;
}

/**
 * Gmail OAuth 2.0 Manager
 *
 * Provides complete OAuth 2.0 flow implementation for Gmail access:
 * - PKCE-secured authorization code flow
 * - Automatic token refresh and rotation
 * - Secure state management for CSRF protection
 * - Comprehensive error handling with Result pattern
 */
export class GmailOAuthManager {
  readonly name = 'gmail-oauth-manager';
  readonly version = '1.0.0';

  private oauth2Client: OAuth2Client | null = null;
  private readonly config: GmailOAuthConfig;
  private readonly scopes = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.modify',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
  ];

  constructor(config: GmailOAuthConfig) {
    this.config = config;
  }

  /**
   * Initialize the OAuth manager and create OAuth2 client
   *
   * @returns Result indicating initialization success or failure
   */
  initialize(): Result<void> {
    try {
      this.oauth2Client = new google.auth.OAuth2(
        this.config.clientId,
        this.config.clientSecret,
        this.config.redirectUri,
      );

      // Validate configuration
      if (!this.config.clientId || !this.config.clientSecret || !this.config.redirectUri) {
        return createErrorResult(
          new ConfigurationError('Invalid OAuth configuration - missing required fields', {
            hasClientId: Boolean(this.config.clientId),
            hasClientSecret: Boolean(this.config.clientSecret),
            hasRedirectUri: Boolean(this.config.redirectUri),
          }),
        );
      }

      return createSuccessResult(undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown initialization error';
      return createErrorResult(
        new ConfigurationError(`OAuth manager initialization failed: ${message}`, {
          config: { ...this.config, clientSecret: '[REDACTED]' },
        }),
      );
    }
  }

  /**
   * Initiate OAuth 2.0 authorization flow with PKCE
   *
   * @returns Result containing authorization URL and PKCE verifier
   */
  initiateAuth(): Result<AuthInitResult> {
    try {
      if (!this.oauth2Client) {
        return createErrorResult(
          new ConfigurationError('OAuth manager not initialized', {
            operation: 'initiateAuth',
          }),
        );
      }

      // Generate PKCE parameters
      const codeVerifier = this.generateCodeVerifier();
      const codeChallenge = this.generateCodeChallenge(codeVerifier);
      const state = this.generateState();

      // Generate authorization URL
      const authUrl = this.oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: this.scopes,
        prompt: 'consent', // Force consent to ensure refresh token

        code_challenge: codeChallenge,

        code_challenge_method: 'S256' as any,
        state,

        include_granted_scopes: true,
      });

      const result: AuthInitResult = {
        authUrl,
        codeVerifier,
        state,
      };

      return createSuccessResult(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return createErrorResult(
        new AuthenticationError(`Failed to initiate OAuth flow: ${message}`, false, {
          operation: 'initiateAuth',
          scopes: this.scopes.length,
        }),
      );
    }
  }

  /**
   * Exchange authorization code for access and refresh tokens
   *
   * @param authCode - Authorization code from OAuth callback
   * @param codeVerifier - PKCE code verifier from initiation
   * @param state - State parameter for CSRF validation
   * @param expectedState - Expected state value for validation
   * @returns Result containing Gmail tokens
   */
  async exchangeCode(
    authCode: string,
    codeVerifier: string,
    state: string,
    expectedState: string,
  ): Promise<Result<GmailTokens>> {
    try {
      if (!this.oauth2Client) {
        return createErrorResult(
          new ConfigurationError('OAuth manager not initialized', {
            operation: 'exchangeCode',
          }),
        );
      }

      // Validate state parameter for CSRF protection
      if (state !== expectedState) {
        return createErrorResult(
          new ValidationError(
            'Invalid state parameter - potential CSRF attack',
            {},
            {
              operation: 'exchangeCode',
              providedState: state.length,
              expectedState: expectedState.length,
            },
          ),
        );
      }

      // Validate inputs
      if (authCode.length === 0 || codeVerifier.length === 0) {
        return createErrorResult(
          new ValidationError(
            'Missing required parameters for token exchange',
            {},
            {
              hasAuthCode: Boolean(authCode),
              hasCodeVerifier: Boolean(codeVerifier),
            },
          ),
        );
      }

      // Exchange authorization code for tokens
      const { tokens } = await this.oauth2Client.getToken({
        code: authCode,
        codeVerifier,
      });

      // Validate token response
      if (
        tokens.access_token === null ||
        tokens.access_token === undefined ||
        tokens.access_token === '' ||
        tokens.access_token.length === 0
      ) {
        return createErrorResult(
          new AuthenticationError('No access token received from Google', false, {
            operation: 'exchangeCode',
            hasRefreshToken: Boolean(tokens.refresh_token),
            hasIdToken: Boolean(tokens.id_token),
          }),
        );
      }

      // Convert to our token format
      const gmailTokens: GmailTokens = {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || undefined,
        expiryDate: tokens.expiry_date ?? Date.now() + 3600000, // Default 1 hour
        scope: tokens.scope,
        tokenType: tokens.token_type || undefined,
      };

      return createSuccessResult(gmailTokens);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';

      // Check for specific Google OAuth errors
      if (message.includes('invalid_grant')) {
        return createErrorResult(
          new AuthenticationError('Authorization code expired or invalid', false, {
            operation: 'exchangeCode',
            errorType: 'invalid_grant',
          }),
        );
      } else if (message.includes('invalid_client')) {
        return createErrorResult(
          new ConfigurationError('Invalid OAuth client configuration', {
            operation: 'exchangeCode',
            errorType: 'invalid_client',
          }),
        );
      } else if (message.includes('ENOTFOUND') || message.includes('ECONNREFUSED')) {
        return createErrorResult(
          new NetworkError(`Network error during token exchange: ${message}`, true, {
            operation: 'exchangeCode',
          }),
        );
      }

      return createErrorResult(
        new AuthenticationError(`Token exchange failed: ${message}`, false, {
          operation: 'exchangeCode',
        }),
      );
    }
  }

  /**
   * Refresh access token using refresh token with comprehensive error handling
   *
   * @param refreshToken - Valid refresh token
   * @param attemptNumber - Current attempt number for retry logic (default: 1)
   * @returns Result containing new Gmail tokens with refresh metadata
   */
  async refreshTokens(
    refreshToken: string,
    attemptNumber = 1,
  ): Promise<Result<GmailTokens & { refreshMetadata: TokenRefreshMetadata }>> {
    const startTime = Date.now();

    try {
      if (!this.oauth2Client) {
        return createErrorResult(
          new ConfigurationError('OAuth manager not initialized', {
            operation: 'refreshTokens',
          }),
        );
      }

      if (refreshToken.length === 0) {
        return createErrorResult(
          new ValidationError(
            'Refresh token is required',
            {},
            {
              operation: 'refreshTokens',
            },
          ),
        );
      }

      // PATTERN: Follow existing oauth2Client setup (lines 278-290)
      this.oauth2Client.setCredentials({ refresh_token: refreshToken });

      const { credentials } = await this.oauth2Client.refreshAccessToken();

      if (
        credentials.access_token === null ||
        credentials.access_token === undefined ||
        credentials.access_token === '' ||
        credentials.access_token.length === 0
      ) {
        return createErrorResult(
          new AuthenticationError('No access token received from refresh', false, {
            operation: 'refreshTokens',
            hasRefreshToken: Boolean(credentials.refresh_token),
          }),
        );
      }

      // CRITICAL: Atomic token update with metadata
      const refreshMetadata: TokenRefreshMetadata = {
        refreshedAt: Date.now(),
        refreshMethod: 'automatic',
        refreshDurationMs: Date.now() - startTime,
        attemptNumber,
      };

      const gmailTokens: GmailTokens = {
        accessToken: credentials.access_token,
        refreshToken: (credentials.refresh_token as string | undefined) || refreshToken, // Fallback pattern
        expiryDate: credentials.expiry_date || Date.now() + 3600000,
        scope: credentials.scope,
        tokenType: credentials.token_type || undefined,
      };

      return createSuccessResult({
        ...gmailTokens,
        refreshMetadata,
      });
    } catch (error) {
      // PATTERN: Error categorization for user-friendly handling
      const failureReason = this.categorizeRefreshError(error);
      return createErrorResult(
        new AuthenticationError(`Token refresh failed: ${failureReason}`, true, {
          code: 'OAUTH_REFRESH_FAILED',
          reason: failureReason,
          attemptNumber,
          refreshDurationMs: Date.now() - startTime,
        }),
      );
    }
  }

  /**
   * Validate that tokens are properly formatted and not expired
   *
   * @param tokens - Gmail tokens to validate
   * @returns Result indicating validation success or failure
   */
  validateTokens(tokens: GmailTokens): Result<boolean> {
    try {
      // Check required fields
      if (!tokens.accessToken) {
        return createErrorResult(
          new ValidationError(
            'Access token is required',
            {},
            {
              operation: 'validateTokens',
            },
          ),
        );
      }

      // Check token format (basic validation)
      if (!tokens.accessToken.startsWith('ya29.')) {
        return createErrorResult(
          new ValidationError(
            'Invalid access token format',
            {},
            {
              operation: 'validateTokens',
              tokenPrefix: tokens.accessToken.substring(0, 5),
            },
          ),
        );
      }

      // Check expiration
      const now = Date.now();
      if (tokens.expiryDate && tokens.expiryDate <= now) {
        return createErrorResult(
          new ValidationError(
            'Access token has expired',
            {},
            {
              operation: 'validateTokens',
              expiryDate: new Date(tokens.expiryDate).toISOString(),
              now: new Date(now).toISOString(),
            },
          ),
        );
      }

      return createSuccessResult(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return createErrorResult(
        new ValidationError(
          `Token validation failed: ${message}`,
          {},
          {
            operation: 'validateTokens',
          },
        ),
      );
    }
  }

  /**
   * Check if tokens will expire within a specified time window
   *
   * @param tokens - Gmail tokens to check
   * @param windowMs - Time window in milliseconds (default: 5 minutes)
   * @returns True if tokens will expire within the window
   */
  willExpireSoon(tokens: GmailTokens, windowMs = 5 * 60 * 1000): boolean {
    if (!tokens.expiryDate) {
      return false;
    }

    const expiryTime = tokens.expiryDate;
    const checkTime = Date.now() + windowMs;

    return expiryTime <= checkTime;
  }

  /**
   * Generate PKCE code verifier
   */
  private generateCodeVerifier(): string {
    return randomBytes(32).toString('base64url');
  }

  /**
   * Generate PKCE code challenge from verifier
   */
  private generateCodeChallenge(verifier: string): string {
    return createHash('sha256').update(verifier).digest('base64url');
  }

  /**
   * Generate state parameter for CSRF protection
   */
  private generateState(): string {
    return randomBytes(16).toString('base64url');
  }

  /**
   * Categorize OAuth refresh errors for user-friendly handling
   *
   * @param error - Error from OAuth refresh attempt
   * @returns RefreshFailureReason for appropriate error handling
   */
  private categorizeRefreshError(error: unknown): RefreshFailureReason {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const err = error as { code?: number; message?: string };

    // Check for specific OAuth error patterns
    if (
      message.includes('invalid_grant') ||
      message.includes('Token has been expired or revoked')
    ) {
      return 'invalid_grant';
    }

    if (message.includes('invalid_client') || message.includes('Unauthorized client')) {
      return 'client_misconfigured';
    }

    if (message.includes('consent_required') || message.includes('consent_revoked')) {
      return 'consent_revoked';
    }

    if (message.includes('insufficient_scope') || message.includes('scope')) {
      return 'insufficient_scope';
    }

    if (
      message.includes('rate_limit') ||
      message.includes('too_many_requests') ||
      err.code === 429
    ) {
      return 'rate_limit_exceeded';
    }

    // Network-related errors
    if (
      message.includes('ENOTFOUND') ||
      message.includes('ECONNREFUSED') ||
      message.includes('ETIMEDOUT') ||
      message.includes('Network')
    ) {
      return 'network_error';
    }

    // Default to unknown for unrecognized errors
    return 'unknown';
  }

  /**
   * Get current OAuth configuration (sanitized)
   */
  getConfig(): Readonly<Omit<GmailOAuthConfig, 'clientSecret'>> {
    return {
      clientId: this.config.clientId,
      redirectUri: this.config.redirectUri,
    } as const;
  }

  /**
   * Get OAuth scopes being requested
   */
  getScopes(): readonly string[] {
    return [...this.scopes] as const;
  }
}
