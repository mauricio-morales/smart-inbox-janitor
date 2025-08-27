/**
 * Test suite for TokenRotationService startup functionality
 * 
 * Tests startup-specific token refresh operations, integration with
 * GmailStartupAuth patterns, and comprehensive metadata tracking.
 */

import { TokenRotationService } from '../../../src/main/security/TokenRotationService';
import { SecureStorageManager } from '../../../src/main/security/SecureStorageManager';
import {
  GmailTokens,
  createSuccessResult,
  createErrorResult,
  SecurityError,
} from '@shared/types';

// Mock dependencies
jest.mock('../../../src/main/security/SecureStorageManager');

describe('TokenRotationService - Startup Integration', () => {
  let tokenRotationService: TokenRotationService;
  let mockSecureStorageManager: jest.Mocked<SecureStorageManager>;

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
    expiryDate: Date.now() - 1000, // 1 second ago (expired)
    scope: 'https://www.googleapis.com/auth/gmail.readonly',
    tokenType: 'Bearer',
  };

  const mockExpiringSoonTokens: GmailTokens = {
    accessToken: 'expiring-access-token',
    refreshToken: 'valid-refresh-token',
    expiryDate: Date.now() + 240000, // 4 minutes from now (within 5-minute buffer)
    scope: 'https://www.googleapis.com/auth/gmail.readonly',
    tokenType: 'Bearer',
  };

  beforeEach(() => {
    mockSecureStorageManager = new SecureStorageManager() as jest.Mocked<SecureStorageManager>;
    tokenRotationService = new TokenRotationService(mockSecureStorageManager);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('startupTokenRefresh', () => {
    beforeEach(async () => {
      // Initialize service with default config (5-minute buffer)
      await tokenRotationService.initialize({
        enabled: true,
        expirationBufferMs: 5 * 60 * 1000, // 5 minutes
      });
    });

    it('should succeed when no tokens exist (first run scenario)', async () => {
      mockSecureStorageManager.getGmailTokens.mockResolvedValue(
        createErrorResult(new SecurityError('No tokens found'))
      );

      const result = await tokenRotationService.startupTokenRefresh();
      
      expect(result.success).toBe(true);
      expect(mockSecureStorageManager.getGmailTokens).toHaveBeenCalled();
    });

    it('should succeed when tokens are still valid', async () => {
      mockSecureStorageManager.getGmailTokens.mockResolvedValue(
        createSuccessResult(mockValidTokens)
      );

      const result = await tokenRotationService.startupTokenRefresh();
      
      expect(result.success).toBe(true);
      expect(mockSecureStorageManager.getGmailTokens).toHaveBeenCalled();
      // Should not attempt refresh since tokens are valid
    });

    it('should refresh tokens when they expire within buffer period', async () => {
      mockSecureStorageManager.getGmailTokens.mockResolvedValue(
        createSuccessResult(mockExpiringSoonTokens)
      );

      // Mock the performTokenRefresh method (which is private, so we need to spy on it)
      const performTokenRefreshSpy = jest.spyOn(
        tokenRotationService as any,
        'performTokenRefresh'
      );
      
      performTokenRefreshSpy.mockReturnValue(createSuccessResult({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresAt: new Date(Date.now() + 3600000),
        scope: 'https://www.googleapis.com/auth/gmail.readonly',
        tokenType: 'Bearer',
      }));

      mockSecureStorageManager.storeGmailTokens.mockResolvedValue(
        createSuccessResult(undefined)
      );

      const result = await tokenRotationService.startupTokenRefresh();
      
      expect(result.success).toBe(true);
      expect(performTokenRefreshSpy).toHaveBeenCalledWith({
        provider: 'gmail',
        refreshToken: 'valid-refresh-token',
        scopes: ['https://www.googleapis.com/auth/gmail.readonly'],
        forceRefresh: true,
      });
      
      expect(mockSecureStorageManager.storeGmailTokens).toHaveBeenCalledWith(
        expect.objectContaining({
          accessToken: 'new-access-token',
        }),
        expect.objectContaining({
          provider: 'gmail',
          shouldExpire: true,
          metadata: expect.objectContaining({
            startupRefresh: true,
            refreshMetadata: expect.objectContaining({
              refreshMethod: 'startup',
            }),
          }),
        })
      );
    });

    it('should fail when tokens are expired and no refresh token available', async () => {
      const tokensWithoutRefresh: GmailTokens = {
        ...mockExpiredTokens,
        refreshToken: undefined,
      };
      
      mockSecureStorageManager.getGmailTokens.mockResolvedValue(
        createSuccessResult(tokensWithoutRefresh)
      );

      const result = await tokenRotationService.startupTokenRefresh();
      
      expect(result.success).toBe(false);
      expect(result.error.message).toContain('no refresh token available for startup refresh');
    });

    it('should fail when token refresh fails', async () => {
      mockSecureStorageManager.getGmailTokens.mockResolvedValue(
        createSuccessResult(mockExpiringSoonTokens)
      );

      const performTokenRefreshSpy = jest.spyOn(
        tokenRotationService as any,
        'performTokenRefresh'
      );
      
      performTokenRefreshSpy.mockReturnValue(
        createErrorResult(new SecurityError('Refresh failed'))
      );

      const result = await tokenRotationService.startupTokenRefresh();
      
      expect(result.success).toBe(false);
      expect(result.error.message).toContain('Refresh failed');
    });

    it('should handle exceptions during startup refresh', async () => {
      mockSecureStorageManager.getGmailTokens.mockRejectedValue(
        new Error('Storage failure')
      );

      const result = await tokenRotationService.startupTokenRefresh();
      
      expect(result.success).toBe(false);
      expect(result.error.message).toContain('Startup token refresh failed');
      expect(result.error.message).toContain('Storage failure');
    });

    it('should create startup-specific metadata', async () => {
      mockSecureStorageManager.getGmailTokens.mockResolvedValue(
        createSuccessResult(mockExpiredTokens)
      );

      const performTokenRefreshSpy = jest.spyOn(
        tokenRotationService as any,
        'performTokenRefresh'
      );
      
      performTokenRefreshSpy.mockReturnValue(createSuccessResult({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresAt: new Date(Date.now() + 3600000),
        scope: 'https://www.googleapis.com/auth/gmail.readonly',
        tokenType: 'Bearer',
      }));

      mockSecureStorageManager.storeGmailTokens.mockResolvedValue(
        createSuccessResult(undefined)
      );

      const result = await tokenRotationService.startupTokenRefresh();
      
      expect(result.success).toBe(true);
      
      // Verify startup-specific metadata was created
      const storeCall = mockSecureStorageManager.storeGmailTokens.mock.calls[0];
      const metadata = storeCall[1]?.metadata;
      
      expect(metadata).toEqual(
        expect.objectContaining({
          startupRefresh: true,
          refreshedAt: expect.any(String),
          refreshMetadata: expect.objectContaining({
            refreshMethod: 'startup',
            refreshDurationMs: expect.any(Number),
            attemptNumber: 1,
            previousExpiryDate: mockExpiredTokens.expiryDate,
          }),
        })
      );
    });

    it('should not be initialized error', async () => {
      const uninitializedService = new TokenRotationService(mockSecureStorageManager);
      
      const result = await uninitializedService.startupTokenRefresh();
      
      expect(result.success).toBe(false);
      expect(result.error.message).toContain('TokenRotationService not initialized');
    });
  });

  describe('integration with existing rotation methods', () => {
    beforeEach(async () => {
      await tokenRotationService.initialize({
        enabled: true,
        expirationBufferMs: 5 * 60 * 1000,
      });
    });

    it('should work alongside regular rotation service', async () => {
      // Test that startup refresh doesn't interfere with regular rotation
      mockSecureStorageManager.getGmailTokens.mockResolvedValue(
        createSuccessResult(mockValidTokens)
      );

      const startupResult = await tokenRotationService.startupTokenRefresh();
      expect(startupResult.success).toBe(true);

      // Should be able to start regular rotation after startup
      const rotationResult = await tokenRotationService.startRotationScheduler();
      expect(rotationResult.success).toBe(true);

      const status = tokenRotationService.getRotationStatus();
      expect(status.active).toBe(true);
    });

    it('should handle both startup and scheduled rotation', async () => {
      // Start with tokens that need refresh
      mockSecureStorageManager.getGmailTokens
        .mockResolvedValueOnce(createSuccessResult(mockExpiringSoonTokens))  // Startup call
        .mockResolvedValueOnce(createSuccessResult(mockValidTokens));        // Scheduled call

      const performTokenRefreshSpy = jest.spyOn(
        tokenRotationService as any,
        'performTokenRefresh'
      );
      
      performTokenRefreshSpy.mockReturnValue(createSuccessResult({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresAt: new Date(Date.now() + 3600000),
        scope: 'https://www.googleapis.com/auth/gmail.readonly',
        tokenType: 'Bearer',
      }));

      mockSecureStorageManager.storeGmailTokens.mockResolvedValue(
        createSuccessResult(undefined)
      );

      // Perform startup refresh
      const startupResult = await tokenRotationService.startupTokenRefresh();
      expect(startupResult.success).toBe(true);

      // Then start regular scheduler
      const rotationResult = await tokenRotationService.startRotationScheduler();
      expect(rotationResult.success).toBe(true);

      // Both should work without conflicts
      expect(performTokenRefreshSpy).toHaveBeenCalled();
      expect(mockSecureStorageManager.storeGmailTokens).toHaveBeenCalled();
    });

    it('should preserve different metadata for different refresh methods', async () => {
      mockSecureStorageManager.getGmailTokens.mockResolvedValue(
        createSuccessResult(mockExpiringSoonTokens)
      );

      const performTokenRefreshSpy = jest.spyOn(
        tokenRotationService as any,
        'performTokenRefresh'
      );
      
      performTokenRefreshSpy.mockReturnValue(createSuccessResult({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresAt: new Date(Date.now() + 3600000),
        scope: 'https://www.googleapis.com/auth/gmail.readonly',
        tokenType: 'Bearer',
      }));

      mockSecureStorageManager.storeGmailTokens.mockResolvedValue(
        createSuccessResult(undefined)
      );

      const result = await tokenRotationService.startupTokenRefresh();
      expect(result.success).toBe(true);

      // Verify the metadata indicates startup refresh
      const storeCall = mockSecureStorageManager.storeGmailTokens.mock.calls[0];
      const metadata = storeCall[1]?.metadata;
      
      expect(metadata?.refreshMetadata).toEqual(
        expect.objectContaining({
          refreshMethod: 'startup',
        })
      );
    });
  });

  describe('error scenarios', () => {
    beforeEach(async () => {
      await tokenRotationService.initialize();
    });

    it('should handle missing scope in tokens', async () => {
      const tokensWithoutScope: GmailTokens = {
        ...mockExpiringSoonTokens,
        scope: undefined,
      };
      
      mockSecureStorageManager.getGmailTokens.mockResolvedValue(
        createSuccessResult(tokensWithoutScope)
      );

      const performTokenRefreshSpy = jest.spyOn(
        tokenRotationService as any,
        'performTokenRefresh'
      );
      
      performTokenRefreshSpy.mockReturnValue(createSuccessResult({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresAt: new Date(Date.now() + 3600000),
        scope: undefined,
        tokenType: 'Bearer',
      }));

      mockSecureStorageManager.storeGmailTokens.mockResolvedValue(
        createSuccessResult(undefined)
      );

      const result = await tokenRotationService.startupTokenRefresh();
      
      expect(result.success).toBe(true);
      expect(performTokenRefreshSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          scopes: [], // Should handle undefined scope gracefully
        })
      );
    });

    it('should handle storage failures during token saving', async () => {
      mockSecureStorageManager.getGmailTokens.mockResolvedValue(
        createSuccessResult(mockExpiringSoonTokens)
      );

      const performTokenRefreshSpy = jest.spyOn(
        tokenRotationService as any,
        'performTokenRefresh'
      );
      
      performTokenRefreshSpy.mockReturnValue(createSuccessResult({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresAt: new Date(Date.now() + 3600000),
        scope: 'https://www.googleapis.com/auth/gmail.readonly',
        tokenType: 'Bearer',
      }));

      mockSecureStorageManager.storeGmailTokens.mockResolvedValue(
        createErrorResult(new SecurityError('Storage failed'))
      );

      const result = await tokenRotationService.startupTokenRefresh();
      
      expect(result.success).toBe(false);
      expect(result.error.message).toContain('Storage failed');
    });
  });
});