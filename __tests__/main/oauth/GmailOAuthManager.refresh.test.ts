/**
 * Test suite for GmailOAuthManager token refresh functionality
 *
 * Tests comprehensive OAuth token refresh with error categorization,
 * retry logic, and metadata tracking as implemented in the PRP.
 */

import { GmailOAuthManager } from '../../../src/main/oauth/GmailOAuthManager';
import { OAuth2Client } from 'google-auth-library';
import { AuthenticationError, ConfigurationError, ValidationError } from '@shared/types';

// Mock google-auth-library
jest.mock('google-auth-library');

describe('GmailOAuthManager - Token Refresh', () => {
  let gmailOAuthManager: GmailOAuthManager;
  let mockOAuth2Client: jest.Mocked<OAuth2Client>;

  const mockRefreshToken = 'valid-refresh-token';
  const mockCredentials = {
    access_token: 'new-access-token',
    refresh_token: 'new-refresh-token',
    expiry_date: Date.now() + 3600000,
    scope: 'https://www.googleapis.com/auth/gmail.readonly',
    token_type: 'Bearer',
  };

  beforeEach(() => {
    mockOAuth2Client = {
      setCredentials: jest.fn(),
      refreshAccessToken: jest.fn().mockResolvedValue({ credentials: mockCredentials }),
    } as unknown as jest.Mocked<OAuth2Client>;

    const mockConfig = {
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      redirectUri: 'http://localhost:3000/callback',
    };
    gmailOAuthManager = new GmailOAuthManager(mockConfig);

    // Mock the internal oauth2Client
    (gmailOAuthManager as any).oauth2Client = mockOAuth2Client;

    // Initialize the manager
    gmailOAuthManager.initialize();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('refreshTokens', () => {
    it('should successfully refresh tokens with metadata', async () => {
      mockOAuth2Client.refreshAccessToken.mockResolvedValue({
        credentials: mockCredentials,
      });

      const result = await gmailOAuthManager.refreshTokens(mockRefreshToken);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.accessToken).toBe('new-access-token');
        expect(result.data.refreshToken).toBe('new-refresh-token');
        expect(result.data.expiryDate).toBe(mockCredentials.expiry_date);
        expect(result.data.refreshMetadata).toBeDefined();
        expect(result.data.refreshMetadata.refreshMethod).toBe('automatic');
        expect(result.data.refreshMetadata.attemptNumber).toBe(1);
        expect(result.data.refreshMetadata.refreshDurationMs).toBeGreaterThanOrEqual(0);
      }

      expect(mockOAuth2Client.setCredentials).toHaveBeenCalledWith({
        refresh_token: mockRefreshToken,
      });
    });

    it('should handle refresh token with attempt number', async () => {
      mockOAuth2Client.refreshAccessToken.mockResolvedValue({
        credentials: mockCredentials,
      });

      const result = await gmailOAuthManager.refreshTokens(mockRefreshToken, 3);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.refreshMetadata.attemptNumber).toBe(3);
      }
    });

    it('should fallback to old refresh token when no new one provided', async () => {
      const credentialsWithoutRefresh = {
        ...mockCredentials,
        refresh_token: undefined,
      };

      mockOAuth2Client.refreshAccessToken.mockResolvedValue({
        credentials: credentialsWithoutRefresh,
      });

      const result = await gmailOAuthManager.refreshTokens(mockRefreshToken);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.refreshToken).toBe(mockRefreshToken); // Fallback to original
      }
    });

    it('should fail when OAuth manager not initialized', async () => {
      const mockConfig = {
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        redirectUri: 'http://localhost:3000/callback',
      };
      const uninitializedManager = new GmailOAuthManager(mockConfig);

      const result = await uninitializedManager.refreshTokens(mockRefreshToken);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(ConfigurationError);
        expect(result.error.message).toContain('OAuth manager not initialized');
      }
    });

    it('should fail when refresh token is empty', async () => {
      const result = await gmailOAuthManager.refreshTokens('');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toContain('Refresh token is required');
      }
    });

    it('should fail when no access token received', async () => {
      mockOAuth2Client.refreshAccessToken.mockResolvedValue({
        credentials: {
          access_token: null,
          refresh_token: 'new-refresh-token',
        },
      });

      const result = await gmailOAuthManager.refreshTokens(mockRefreshToken);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(AuthenticationError);
        expect(result.error.message).toContain('No access token received');
      }
    });
  });

  describe('error categorization', () => {
    it('should categorize invalid_grant errors', async () => {
      const invalidGrantError = new Error('invalid_grant: Token has been expired or revoked');
      mockOAuth2Client.refreshAccessToken.mockRejectedValue(invalidGrantError);

      const result = await gmailOAuthManager.refreshTokens(mockRefreshToken);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(AuthenticationError);
        expect(result.error.message).toContain('invalid_grant');
        expect((result.error as any).details?.reason).toBe('invalid_grant');
      }
    });

    it('should categorize client misconfiguration errors', async () => {
      const clientError = new Error('invalid_client: Unauthorized client');
      mockOAuth2Client.refreshAccessToken.mockRejectedValue(clientError);

      const result = await gmailOAuthManager.refreshTokens(mockRefreshToken);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(AuthenticationError);
        expect((result.error as any).details?.reason).toBe('client_misconfigured');
      }
    });

    it('should categorize consent revoked errors', async () => {
      const consentError = new Error('consent_required: User consent required');
      mockOAuth2Client.refreshAccessToken.mockRejectedValue(consentError);

      const result = await gmailOAuthManager.refreshTokens(mockRefreshToken);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(AuthenticationError);
        expect((result.error as any).details?.reason).toBe('consent_revoked');
      }
    });

    it('should categorize insufficient scope errors', async () => {
      const scopeError = new Error('insufficient_scope: Additional scope required');
      mockOAuth2Client.refreshAccessToken.mockRejectedValue(scopeError);

      const result = await gmailOAuthManager.refreshTokens(mockRefreshToken);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(AuthenticationError);
        expect((result.error as any).details?.reason).toBe('insufficient_scope');
      }
    });

    it('should categorize rate limit errors', async () => {
      const rateLimitError = {
        message: 'rate_limit_exceeded',
        code: 429,
      };
      mockOAuth2Client.refreshAccessToken.mockRejectedValue(rateLimitError);

      const result = await gmailOAuthManager.refreshTokens(mockRefreshToken);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(AuthenticationError);
        expect((result.error as any).details?.reason).toBe('rate_limit_exceeded');
      }
    });

    it('should categorize network errors', async () => {
      const networkError = new Error('ENOTFOUND: Network connection failed');
      mockOAuth2Client.refreshAccessToken.mockRejectedValue(networkError);

      const result = await gmailOAuthManager.refreshTokens(mockRefreshToken);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(AuthenticationError);
        expect((result.error as any).details?.reason).toBe('network_error');
      }
    });

    it('should categorize unknown errors', async () => {
      const unknownError = new Error('Some unexpected error');
      mockOAuth2Client.refreshAccessToken.mockRejectedValue(unknownError);

      const result = await gmailOAuthManager.refreshTokens(mockRefreshToken);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(AuthenticationError);
        expect((result.error as any).details?.reason).toBe('unknown');
      }
    });
  });

  describe('private categorizeRefreshError', () => {
    it('should categorize errors correctly', () => {
      // Access private method for testing
      const categorizeError = (gmailOAuthManager as any).categorizeRefreshError;

      expect(categorizeError(new Error('invalid_grant'))).toBe('invalid_grant');
      expect(categorizeError(new Error('Token has been expired or revoked'))).toBe('invalid_grant');
      expect(categorizeError(new Error('invalid_client'))).toBe('client_misconfigured');
      expect(categorizeError(new Error('Unauthorized client'))).toBe('client_misconfigured');
      expect(categorizeError(new Error('consent_required'))).toBe('consent_revoked');
      expect(categorizeError(new Error('consent_revoked'))).toBe('consent_revoked');
      expect(categorizeError(new Error('insufficient_scope'))).toBe('insufficient_scope');
      expect(categorizeError(new Error('rate_limit'))).toBe('rate_limit_exceeded');
      expect(categorizeError(new Error('too_many_requests'))).toBe('rate_limit_exceeded');
      expect(categorizeError({ code: 429, message: 'Rate limited' })).toBe('rate_limit_exceeded');
      expect(categorizeError(new Error('ENOTFOUND'))).toBe('network_error');
      expect(categorizeError(new Error('ECONNREFUSED'))).toBe('network_error');
      expect(categorizeError(new Error('ETIMEDOUT'))).toBe('network_error');
      expect(categorizeError(new Error('Network error'))).toBe('network_error');
      expect(categorizeError(new Error('Random error'))).toBe('unknown');
    });

    it('should handle non-Error objects', () => {
      const categorizeError = (gmailOAuthManager as any).categorizeRefreshError;

      expect(categorizeError({ message: 'invalid_grant' })).toBe('invalid_grant');
      expect(categorizeError({ message: null })).toBe('unknown');
      expect(categorizeError(null)).toBe('unknown');
      expect(categorizeError(undefined)).toBe('unknown');
    });
  });

  describe('integration scenarios', () => {
    it('should measure refresh duration accurately', async () => {
      // Add delay to refresh operation
      mockOAuth2Client.refreshAccessToken.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => {
              resolve({ credentials: mockCredentials });
            }, 100);
          }),
      );

      const result = await gmailOAuthManager.refreshTokens(mockRefreshToken);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.refreshMetadata.refreshDurationMs).toBeGreaterThanOrEqual(100);
        expect(result.data.refreshMetadata.refreshDurationMs).toBeLessThan(200); // Allow some tolerance
      }
    });

    it('should include proper timestamps', async () => {
      const beforeRefresh = Date.now();

      mockOAuth2Client.refreshAccessToken.mockResolvedValue({
        credentials: mockCredentials,
      });

      const result = await gmailOAuthManager.refreshTokens(mockRefreshToken);

      const afterRefresh = Date.now();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.refreshMetadata.refreshedAt).toBeGreaterThanOrEqual(beforeRefresh);
        expect(result.data.refreshMetadata.refreshedAt).toBeLessThanOrEqual(afterRefresh);
      }
    });

    it('should preserve token type and scope', async () => {
      mockOAuth2Client.refreshAccessToken.mockResolvedValue({
        credentials: {
          ...mockCredentials,
          scope: 'custom-scope',
          token_type: 'CustomBearer',
        },
      });

      const result = await gmailOAuthManager.refreshTokens(mockRefreshToken);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.scope).toBe('custom-scope');
        expect(result.data.tokenType).toBe('CustomBearer');
      }
    });
  });
});
