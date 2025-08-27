/**
 * Test suite for GmailStartupAuth
 *
 * Tests startup-specific Gmail authentication service with comprehensive
 * token validation, refresh, and error handling scenarios.
 */

import { GmailStartupAuth } from '../../../src/main/security/GmailStartupAuth';
import { GmailOAuthManager } from '../../../src/main/oauth/GmailOAuthManager';
import { SecureStorageManager } from '../../../src/main/security/SecureStorageManager';
import {
  GmailTokens,
  createSuccessResult,
  createErrorResult,
  AuthenticationError,
  SecurityError,
} from '@shared/types';

// Mock dependencies
jest.mock('../../../src/main/oauth/GmailOAuthManager');
jest.mock('../../../src/main/security/SecureStorageManager');
jest.mock('../../../src/main/security/SecurityAuditLogger');

describe('GmailStartupAuth', () => {
  let gmailStartupAuth: GmailStartupAuth;
  let mockOAuthManager: jest.Mocked<GmailOAuthManager>;
  let mockSecureStorageManager: jest.Mocked<SecureStorageManager>;
  let mockSecurityAuditLogger: any;

  const mockValidTokens: GmailTokens = {
    accessToken: 'valid-access-token',
    refreshToken: 'valid-refresh-token',
    expiryDate: Date.now() + 3600000, // 1 hour from now
    scope: 'https://www.googleapis.com/auth/gmail.readonly',
    tokenType: 'Bearer',
  };

  const mockExpiredTokens: GmailTokens = {
    accessToken: 'expired-access-token',
    refreshToken: 'valid-refresh-token',
    expiryDate: Date.now() - 1000, // 1 second ago
    scope: 'https://www.googleapis.com/auth/gmail.readonly',
    tokenType: 'Bearer',
  };

  beforeEach(() => {
    const mockOAuthConfig = {
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      redirectUri: 'http://localhost:3000/callback',
    };
    mockOAuthManager = new GmailOAuthManager(mockOAuthConfig) as jest.Mocked<GmailOAuthManager>;
    mockSecureStorageManager = new SecureStorageManager() as jest.Mocked<SecureStorageManager>;

    // Mock audit logger
    mockSecurityAuditLogger = {
      logSecurityEvent: jest.fn().mockResolvedValue(createSuccessResult(undefined)),
    };

    // Set up audit logger mock on secure storage manager
    (mockSecureStorageManager as any).securityAuditLogger = mockSecurityAuditLogger;

    gmailStartupAuth = new GmailStartupAuth(mockOAuthManager, mockSecureStorageManager);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialize', () => {
    it('should initialize successfully', async () => {
      const result = await gmailStartupAuth.initialize();

      expect(result.success).toBe(true);
    });

    it('should handle initialization errors', async () => {
      // Create a new instance that will simulate initialization error
      const failingAuth = new GmailStartupAuth(mockOAuthManager, mockSecureStorageManager);

      // Mock the internal method to throw an error
      jest.spyOn(failingAuth as any, 'ensureInitialized').mockImplementation(() => {
        throw new Error('Initialization failed');
      });

      const result = await failingAuth.validateAndRefreshTokens(); // This will call ensureInitialized

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('Startup token validation failed');
        expect(result.error.message).toContain('Initialization failed');
      }
    });
  });

  describe('validateAndRefreshTokens', () => {
    beforeEach(async () => {
      await gmailStartupAuth.initialize();
    });

    it('should return false when no tokens are stored', async () => {
      mockSecureStorageManager.getGmailTokens.mockResolvedValue(
        createErrorResult(new SecurityError('No tokens found')),
      );

      const result = await gmailStartupAuth.validateAndRefreshTokens();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(false);
      }
      expect(mockSecurityAuditLogger.logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'credential_retrieve',
          provider: 'gmail',
          success: true,
          metadata: expect.objectContaining({
            result: 'no_tokens_found',
          }),
        }),
      );
    });

    it('should return true when tokens are valid and not expiring soon', async () => {
      mockSecureStorageManager.getGmailTokens.mockResolvedValue(
        createSuccessResult(mockValidTokens),
      );
      mockOAuthManager.willExpireSoon.mockReturnValue(false);

      const result = await gmailStartupAuth.validateAndRefreshTokens();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(true);
      }
      expect(mockSecurityAuditLogger.logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'credential_retrieve',
          provider: 'gmail',
          success: true,
          metadata: expect.objectContaining({
            result: 'tokens_valid',
          }),
        }),
      );
    });

    it('should refresh tokens when they expire soon', async () => {
      mockSecureStorageManager.getGmailTokens.mockResolvedValue(
        createSuccessResult(mockExpiredTokens),
      );
      mockOAuthManager.willExpireSoon.mockReturnValue(true);
      mockOAuthManager.refreshTokens.mockResolvedValue(
        createSuccessResult({
          ...mockValidTokens,
          refreshMetadata: {
            refreshedAt: Date.now(),
            refreshMethod: 'automatic' as const,
            refreshDurationMs: 500,
            attemptNumber: 1,
          },
        }),
      );
      mockSecureStorageManager.storeGmailTokens.mockResolvedValue(createSuccessResult(undefined));

      const result = await gmailStartupAuth.validateAndRefreshTokens();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(true);
      }
      expect(mockOAuthManager.refreshTokens).toHaveBeenCalledWith('valid-refresh-token');
      expect(mockSecurityAuditLogger.logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'token_rotation',
          provider: 'gmail',
          success: true,
          metadata: expect.objectContaining({
            result: 'automatic_refresh_success',
          }),
        }),
      );
    });

    it('should return false when token refresh fails', async () => {
      mockSecureStorageManager.getGmailTokens.mockResolvedValue(
        createSuccessResult(mockExpiredTokens),
      );
      mockOAuthManager.willExpireSoon.mockReturnValue(true);
      mockOAuthManager.refreshTokens.mockResolvedValue(
        createErrorResult(new AuthenticationError('Refresh failed')),
      );

      const result = await gmailStartupAuth.validateAndRefreshTokens();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(false);
      }
      expect(mockSecurityAuditLogger.logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'authentication_failure',
          provider: 'gmail',
          success: false,
          metadata: expect.objectContaining({
            result: 'automatic_refresh_failed',
          }),
        }),
      );
    });

    it('should handle exceptions during validation', async () => {
      mockSecureStorageManager.getGmailTokens.mockRejectedValue(new Error('Storage failure'));

      const result = await gmailStartupAuth.validateAndRefreshTokens();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('Startup token validation failed');
      }
      expect(mockSecurityAuditLogger.logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'authentication_failure',
          provider: 'gmail',
          success: false,
          metadata: expect.objectContaining({
            result: 'validation_exception',
          }),
        }),
      );
    });
  });

  describe('handleStartupAuth', () => {
    beforeEach(async () => {
      await gmailStartupAuth.initialize();
    });

    it('should return success result when tokens are valid', async () => {
      mockSecureStorageManager.getGmailTokens.mockResolvedValue(
        createSuccessResult(mockValidTokens),
      );
      mockOAuthManager.willExpireSoon.mockReturnValue(false);

      jest
        .spyOn(gmailStartupAuth, 'validateAndRefreshTokens')
        .mockResolvedValue(createSuccessResult(true));

      const result = await gmailStartupAuth.handleStartupAuth();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.success).toBe(true);
        expect(result.data.authState.status).toBe('connected');
        expect(result.data.needsReconfiguration).toBe(false);
        expect(result.data.message).toBe('Gmail authentication is ready');
      }
    });

    it('should return needs reconfiguration when tokens are invalid', async () => {
      jest
        .spyOn(gmailStartupAuth, 'validateAndRefreshTokens')
        .mockResolvedValue(createSuccessResult(false));

      const result = await gmailStartupAuth.handleStartupAuth();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.success).toBe(false);
        expect(result.data.authState.status).toBe('needs_reauth');
        expect(result.data.needsReconfiguration).toBe(true);
        expect(result.data.message).toBe('Gmail needs to be connected. Please sign in again.');
      }
    });

    it('should handle validation errors gracefully', async () => {
      jest
        .spyOn(gmailStartupAuth, 'validateAndRefreshTokens')
        .mockResolvedValue(createErrorResult(new SecurityError('Validation failed')));

      const result = await gmailStartupAuth.handleStartupAuth();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.success).toBe(false);
        expect(result.data.authState.status).toBe('needs_reauth');
        expect(result.data.needsReconfiguration).toBe(true);
        expect(result.data.message).toBe(
          'Authentication validation failed. Please check your configuration.',
        );
      }
    });

    it('should handle exceptions during startup auth', async () => {
      jest
        .spyOn(gmailStartupAuth, 'validateAndRefreshTokens')
        .mockRejectedValue(new Error('Unexpected error'));

      const result = await gmailStartupAuth.handleStartupAuth();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.success).toBe(false);
        expect(result.data.authState.status).toBe('needs_reauth');
        expect(result.data.message).toContain('Startup authentication failed');
      }
    });
  });

  describe('getAuthState', () => {
    beforeEach(async () => {
      await gmailStartupAuth.initialize();
    });

    it('should return needs_reauth when no tokens exist', async () => {
      mockSecureStorageManager.getGmailTokens.mockResolvedValue(
        createErrorResult(new SecurityError('No tokens')),
      );

      const result = await gmailStartupAuth.getAuthState();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe('needs_reauth');
        expect(result.data.refreshAttempts).toBe(0);
      }
    });

    it('should return connected when tokens are valid', async () => {
      mockSecureStorageManager.getGmailTokens.mockResolvedValue(
        createSuccessResult(mockValidTokens),
      );
      mockOAuthManager.willExpireSoon.mockReturnValue(false);

      const result = await gmailStartupAuth.getAuthState();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe('connected');
        expect(result.data.expiresAt).toBe(mockValidTokens.expiryDate);
      }
    });

    it('should return needs_reauth when tokens are expiring soon', async () => {
      mockSecureStorageManager.getGmailTokens.mockResolvedValue(
        createSuccessResult(mockExpiredTokens),
      );
      mockOAuthManager.willExpireSoon.mockReturnValue(true);

      const result = await gmailStartupAuth.getAuthState();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe('needs_reauth');
      }
    });

    it('should handle exceptions gracefully', async () => {
      mockSecureStorageManager.getGmailTokens.mockRejectedValue(new Error('Storage error'));

      const result = await gmailStartupAuth.getAuthState();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe('needs_reauth');
        expect(result.data.lastError).toBeDefined();
        expect(result.data.lastError?.code).toBe('AUTH_STATE_ERROR: Storage error');
      }
    });
  });

  describe('resetAuthState', () => {
    beforeEach(async () => {
      await gmailStartupAuth.initialize();
    });

    it('should successfully reset auth state', async () => {
      mockSecureStorageManager.removeCredentials.mockResolvedValue(createSuccessResult(undefined));

      const result = await gmailStartupAuth.resetAuthState();

      expect(result.success).toBe(true);
      expect(mockSecureStorageManager.removeCredentials).toHaveBeenCalledWith('gmail');
      expect(mockSecurityAuditLogger.logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'credential_delete',
          provider: 'gmail',
          success: true,
          metadata: expect.objectContaining({
            action: 'reset_auth_state',
          }),
        }),
      );
    });

    it('should handle credential removal failures', async () => {
      mockSecureStorageManager.removeCredentials.mockResolvedValue(
        createErrorResult(new SecurityError('Removal failed')),
      );

      const result = await gmailStartupAuth.resetAuthState();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('Removal failed');
      }
    });

    it('should handle exceptions during reset', async () => {
      mockSecureStorageManager.removeCredentials.mockRejectedValue(new Error('Storage error'));

      const result = await gmailStartupAuth.resetAuthState();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('Failed to reset auth state');
      }
      expect(mockSecurityAuditLogger.logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'credential_delete',
          provider: 'gmail',
          success: false,
          metadata: expect.objectContaining({
            action: 'reset_auth_state',
          }),
        }),
      );
    });
  });

  describe('shutdown', () => {
    beforeEach(async () => {
      await gmailStartupAuth.initialize();
    });

    it('should shutdown successfully', async () => {
      const result = await gmailStartupAuth.shutdown();

      expect(result.success).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should throw error when not initialized', async () => {
      expect(() => {
        // Access private method to test initialization check
        (gmailStartupAuth as any).ensureInitialized();
      }).toThrow('GmailStartupAuth not initialized');
    });
  });
});
