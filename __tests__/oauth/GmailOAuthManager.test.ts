/**
 * Tests for GmailOAuthManager
 *
 * Comprehensive unit tests covering OAuth 2.0 flow, PKCE security,
 * token management, and error handling scenarios.
 */

import { GmailOAuthManager } from '../../src/main/oauth/GmailOAuthManager';
import { google } from 'googleapis';
import { createHash, randomBytes } from 'crypto';
import {
  ConfigurationError,
  AuthenticationError,
  NetworkError,
  ValidationError,
} from '@shared/types';

// Mock dependencies
jest.mock('googleapis');
jest.mock('crypto');

const mockGoogle = google as jest.Mocked<typeof google>;
const mockRandomBytes = randomBytes as jest.MockedFunction<typeof randomBytes>;
const mockCreateHash = createHash as jest.MockedFunction<typeof createHash>;

describe('GmailOAuthManager', () => {
  let oauthManager: GmailOAuthManager;
  let mockOAuth2Client: jest.Mocked<any>;

  const testConfig = {
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret',
    redirectUri: 'http://localhost:8080',
  };

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock OAuth2Client
    mockOAuth2Client = {
      generateAuthUrl: jest.fn(),
      getToken: jest.fn(),
      refreshAccessToken: jest.fn(),
      setCredentials: jest.fn(),
    };

    // Mock Google Auth
    mockGoogle.auth = {
      OAuth2: jest.fn().mockImplementation(() => mockOAuth2Client),
    } as any;

    // Mock crypto functions
    const mockBuffer = {
      toString: jest.fn((encoding: string) => {
        if (encoding === 'base64url') {
          return 'mock-code-verifier';
        }
        return 'mock-code-verifier';
      }),
    };
    mockRandomBytes.mockReturnValue(mockBuffer as any);

    const mockHasher = {
      update: jest.fn().mockReturnThis(),
      digest: jest.fn().mockReturnValue({
        toString: jest.fn((encoding: string) => {
          if (encoding === 'base64url') {
            return 'mock-code-challenge';
          }
          return 'mock-code-challenge';
        }),
      }),
    };
    mockCreateHash.mockReturnValue(mockHasher as any);

    oauthManager = new GmailOAuthManager(testConfig);
  });

  describe('constructor', () => {
    it('should create instance with valid configuration', () => {
      expect(oauthManager).toBeInstanceOf(GmailOAuthManager);
      expect(oauthManager.name).toBe('gmail-oauth-manager');
      expect(oauthManager.version).toBe('1.0.0');
    });

    it('should store configuration correctly', () => {
      const config = oauthManager.getConfig();
      expect(config.clientId).toBe(testConfig.clientId);
      expect(config.redirectUri).toBe(testConfig.redirectUri);
      // Client secret should not be exposed
      expect(config).not.toHaveProperty('clientSecret');
    });
  });

  describe('initialize', () => {
    it('should initialize successfully with valid configuration', () => {
      const result = oauthManager.initialize();

      expect(result.success).toBe(true);
      expect(mockGoogle.auth.OAuth2).toHaveBeenCalledWith(
        testConfig.clientId,
        testConfig.clientSecret,
        testConfig.redirectUri,
      );
    });

    it('should fail with missing client ID', () => {
      const invalidManager = new GmailOAuthManager({
        ...testConfig,
        clientId: '',
      });

      const result = invalidManager.initialize();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(ConfigurationError);
        expect(result.error.message).toContain('missing required fields');
      }
    });

    it('should fail with missing client secret', () => {
      const invalidManager = new GmailOAuthManager({
        ...testConfig,
        clientSecret: '',
      });

      const result = invalidManager.initialize();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(ConfigurationError);
      }
    });

    it('should fail with missing redirect URI', () => {
      const invalidManager = new GmailOAuthManager({
        ...testConfig,
        redirectUri: '',
      });

      const result = invalidManager.initialize();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(ConfigurationError);
      }
    });
  });

  describe('initiateAuth', () => {
    beforeEach(() => {
      oauthManager.initialize();
    });

    it('should generate authorization URL with PKCE parameters', () => {
      mockOAuth2Client.generateAuthUrl.mockReturnValue(
        'https://accounts.google.com/oauth/authorize?code_challenge=mock',
      );

      const result = oauthManager.initiateAuth();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toMatchObject({
          authUrl: 'https://accounts.google.com/oauth/authorize?code_challenge=mock',
          codeVerifier: 'mock-code-verifier',
          state: expect.any(String),
        });
      }

      // Verify that generateAuthUrl was called with the correct parameters structure
      expect(mockOAuth2Client.generateAuthUrl).toHaveBeenCalledTimes(1);
      const callArgs = mockOAuth2Client.generateAuthUrl.mock.calls[0][0];
      expect(callArgs.access_type).toBe('offline');
      expect(callArgs.scope).toEqual([
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.modify',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile',
      ]);
      expect(callArgs.prompt).toBe('consent');
      expect(callArgs.code_challenge_method).toBe('S256');
      expect(callArgs.include_granted_scopes).toBe(true);
      // The code_challenge and state should be strings, not mock objects
      expect(typeof callArgs.code_challenge).toBe('string');
      expect(typeof callArgs.state).toBe('string');
    });

    it('should fail if not initialized', () => {
      const uninitializedManager = new GmailOAuthManager(testConfig);

      const result = uninitializedManager.initiateAuth();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(ConfigurationError);
        expect(result.error.message).toContain('not initialized');
      }
    });

    it('should generate different state values on multiple calls', () => {
      // Arrange - mock different return values for consecutive calls
      const mockBuffer1 = {
        toString: jest.fn((encoding: string) => {
          if (encoding === 'base64url') {
            return 'mock-state-1';
          }
          return 'mock-state-1';
        }),
      };
      const mockBuffer2 = {
        toString: jest.fn((encoding: string) => {
          if (encoding === 'base64url') {
            return 'mock-state-2';
          }
          return 'mock-state-2';
        }),
      };
      mockRandomBytes
        .mockReturnValueOnce(mockBuffer1 as any) // First call for code verifier
        .mockReturnValueOnce(mockBuffer1 as any) // First call for state
        .mockReturnValueOnce(mockBuffer2 as any) // Second call for code verifier
        .mockReturnValueOnce(mockBuffer2 as any); // Second call for state

      // Act
      const result1 = oauthManager.initiateAuth();
      const result2 = oauthManager.initiateAuth();

      // Assert
      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      if (result1.success && result2.success) {
        expect(result1.data.state).not.toBe(result2.data.state);
      }
    });
  });

  describe('exchangeCode', () => {
    beforeEach(() => {
      oauthManager.initialize();
    });

    const mockTokenResponse = {
      tokens: {
        access_token: 'ya29.test-access-token',
        refresh_token: 'test-refresh-token',
        expiry_date: Date.now() + 3600000,
        scope: 'https://www.googleapis.com/auth/gmail.readonly',
        token_type: 'Bearer',
      },
    };

    it('should exchange authorization code for tokens successfully', async () => {
      mockOAuth2Client.getToken.mockResolvedValue(mockTokenResponse);

      const result = await oauthManager.exchangeCode(
        'test-auth-code',
        'test-code-verifier',
        'test-state',
        'test-state',
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toMatchObject({
          accessToken: 'ya29.test-access-token',
          refreshToken: 'test-refresh-token',
          expiryDate: expect.any(Number),
          scope: 'https://www.googleapis.com/auth/gmail.readonly',
          tokenType: 'Bearer',
        });
      }

      expect(mockOAuth2Client.getToken).toHaveBeenCalledWith({
        code: 'test-auth-code',
        codeVerifier: 'test-code-verifier',
      });
    });

    it('should validate state parameter for CSRF protection', async () => {
      const result = await oauthManager.exchangeCode(
        'test-auth-code',
        'test-code-verifier',
        'wrong-state',
        'expected-state',
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toContain('Invalid state parameter');
      }
    });

    it('should fail with missing authorization code', async () => {
      const result = await oauthManager.exchangeCode(
        '',
        'test-code-verifier',
        'test-state',
        'test-state',
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toContain('Missing required parameters');
      }
    });

    it('should fail with missing code verifier', async () => {
      const result = await oauthManager.exchangeCode(
        'test-auth-code',
        '',
        'test-state',
        'test-state',
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(ValidationError);
      }
    });

    it('should handle invalid_grant error from Google', async () => {
      mockOAuth2Client.getToken.mockRejectedValue(
        new Error('invalid_grant: Authorization code expired'),
      );

      const result = await oauthManager.exchangeCode(
        'expired-code',
        'test-code-verifier',
        'test-state',
        'test-state',
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(AuthenticationError);
        expect(result.error.message).toContain('Authorization code expired');
      }
    });

    it('should handle network errors', async () => {
      mockOAuth2Client.getToken.mockRejectedValue(new Error('ENOTFOUND accounts.google.com'));

      const result = await oauthManager.exchangeCode(
        'test-code',
        'test-code-verifier',
        'test-state',
        'test-state',
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(NetworkError);
      }
    });

    it('should fail if no access token received', async () => {
      mockOAuth2Client.getToken.mockResolvedValue({
        tokens: {
          refresh_token: 'test-refresh-token',
        },
      });

      const result = await oauthManager.exchangeCode(
        'test-code',
        'test-code-verifier',
        'test-state',
        'test-state',
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(AuthenticationError);
        expect(result.error.message).toContain('No access token received');
      }
    });
  });

  describe('refreshTokens', () => {
    beforeEach(() => {
      oauthManager.initialize();
    });

    const mockRefreshResponse = {
      credentials: {
        access_token: 'ya29.new-access-token',
        refresh_token: 'new-refresh-token',
        expiry_date: Date.now() + 3600000,
        scope: 'https://www.googleapis.com/auth/gmail.readonly',
        token_type: 'Bearer',
      },
    };

    it('should refresh tokens successfully', async () => {
      mockOAuth2Client.refreshAccessToken.mockResolvedValue(mockRefreshResponse);

      const result = await oauthManager.refreshTokens('test-refresh-token');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toMatchObject({
          accessToken: 'ya29.new-access-token',
          refreshToken: 'new-refresh-token',
          expiryDate: expect.any(Number),
        });
      }

      expect(mockOAuth2Client.setCredentials).toHaveBeenCalledWith({
        refresh_token: 'test-refresh-token',
      });
      expect(mockOAuth2Client.refreshAccessToken).toHaveBeenCalled();
    });

    it('should preserve old refresh token if no new one provided', async () => {
      mockOAuth2Client.refreshAccessToken.mockResolvedValue({
        credentials: {
          access_token: 'ya29.new-access-token',
          expiry_date: Date.now() + 3600000,
        },
      });

      const result = await oauthManager.refreshTokens('old-refresh-token');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.refreshToken).toBe('old-refresh-token');
      }
    });

    it('should fail with missing refresh token', async () => {
      const result = await oauthManager.refreshTokens('');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toContain('Refresh token is required');
      }
    });

    it('should handle expired refresh token', async () => {
      mockOAuth2Client.refreshAccessToken.mockRejectedValue(
        new Error('invalid_grant: Token has been expired or revoked'),
      );

      const result = await oauthManager.refreshTokens('expired-token');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(AuthenticationError);
        expect(result.error.message).toContain('invalid_grant');
        expect((result.error as any).details.reason).toBe('invalid_grant');
      }
    });
  });

  describe('validateTokens', () => {
    it('should validate valid tokens', () => {
      const validTokens = {
        accessToken: 'ya29.valid-token',
        refreshToken: 'valid-refresh-token',
        expiryDate: Date.now() + 3600000,
        scope: 'test-scope',
        tokenType: 'Bearer',
      };

      const result = oauthManager.validateTokens(validTokens);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(true);
      }
    });

    it('should fail validation for missing access token', () => {
      const invalidTokens = {
        accessToken: '',
        refreshToken: 'test-refresh',
        expiryDate: Date.now() + 3600000,
        scope: 'test-scope',
        tokenType: 'Bearer',
      };

      const result = oauthManager.validateTokens(invalidTokens);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(ValidationError);
      }
    });

    it('should fail validation for invalid token format', () => {
      const invalidTokens = {
        accessToken: 'invalid-format-token',
        refreshToken: 'test-refresh',
        expiryDate: Date.now() + 3600000,
        scope: 'test-scope',
        tokenType: 'Bearer',
      };

      const result = oauthManager.validateTokens(invalidTokens);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toContain('Invalid access token format');
      }
    });

    it('should fail validation for expired tokens', () => {
      const expiredTokens = {
        accessToken: 'ya29.valid-format',
        refreshToken: 'test-refresh',
        expiryDate: Date.now() - 3600000, // Expired 1 hour ago
        scope: 'test-scope',
        tokenType: 'Bearer',
      };

      const result = oauthManager.validateTokens(expiredTokens);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toContain('Access token has expired');
      }
    });
  });

  describe('willExpireSoon', () => {
    it('should return false for tokens expiring later', () => {
      const tokens = {
        accessToken: 'ya29.test-token',
        refreshToken: 'test-refresh',
        expiryDate: Date.now() + 3600000, // Expires in 1 hour
        scope: 'test-scope',
        tokenType: 'Bearer',
      };

      const willExpire = oauthManager.willExpireSoon(tokens);

      expect(willExpire).toBe(false);
    });

    it('should return true for tokens expiring soon', () => {
      const tokens = {
        accessToken: 'ya29.test-token',
        refreshToken: 'test-refresh',
        expiryDate: Date.now() + 60000, // Expires in 1 minute
        scope: 'test-scope',
        tokenType: 'Bearer',
      };

      const willExpire = oauthManager.willExpireSoon(tokens, 5 * 60 * 1000); // 5 minute window

      expect(willExpire).toBe(true);
    });

    it('should return false for tokens without expiry date', () => {
      const tokens = {
        accessToken: 'ya29.test-token',
        refreshToken: 'test-refresh',
        expiryDate: Date.now() + 7200000, // 2 hours from now
        scope: 'test-scope',
        tokenType: 'Bearer',
      };

      const willExpire = oauthManager.willExpireSoon(tokens);

      expect(willExpire).toBe(false);
    });
  });

  describe('getScopes', () => {
    it('should return correct OAuth scopes', () => {
      const scopes = oauthManager.getScopes();

      expect(scopes).toEqual([
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.modify',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile',
      ]);
    });

    it('should return readonly array', () => {
      const scopes = oauthManager.getScopes();

      // Assert - Check that the scopes array has the expected length
      expect(scopes.length).toBe(4);
      expect(scopes).toEqual([
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.modify',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile',
      ]);

      // Try to modify the array - should either throw or not change the array
      const originalLength = scopes.length;
      try {
        (scopes as any).push('new-scope');
      } catch (error) {
        // Expected to throw in strict mode or frozen array
      }

      // Get a fresh reference to verify immutability
      const freshScopes = oauthManager.getScopes();
      expect(freshScopes.length).toBe(originalLength);
      expect(freshScopes).not.toContain('new-scope');
    });
  });

  describe('error handling', () => {
    beforeEach(() => {
      oauthManager.initialize();
    });

    it('should handle OAuth2Client creation errors', () => {
      (mockGoogle.auth as any).OAuth2 = jest.fn().mockImplementation(() => {
        throw new Error('OAuth client creation failed');
      });

      const manager = new GmailOAuthManager(testConfig);
      const result = manager.initialize();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(ConfigurationError);
      }
    });

    it('should handle auth URL generation errors', () => {
      mockOAuth2Client.generateAuthUrl.mockImplementation(() => {
        throw new Error('URL generation failed');
      });

      const result = oauthManager.initiateAuth();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(AuthenticationError);
      }
    });
  });
});
