/**
 * TokenRotationService Concurrent Scenarios Test Suite
 *
 * Tests race conditions, concurrent rotations, and async coordination
 * to verify the fixes implemented for proper async handling.
 */

import { TokenRotationService, RotationStatus } from '@/main/security/TokenRotationService';
import { SecureStorageManager } from '@/main/security/SecureStorageManager';
import { GmailOAuthManager } from '@/main/oauth/GmailOAuthManager';
import {
  createSuccessResult,
  createErrorResult,
  GmailTokens,
  SecurityError,
  AuthenticationError,
} from '@shared/types';

// Mock dependencies
jest.mock('@/main/security/SecureStorageManager');
jest.mock('@/main/oauth/GmailOAuthManager');

const MockSecureStorageManager = SecureStorageManager as jest.MockedClass<
  typeof SecureStorageManager
>;
const MockGmailOAuthManager = GmailOAuthManager as jest.MockedClass<typeof GmailOAuthManager>;

describe('TokenRotationService - Concurrent Scenarios', () => {
  let tokenRotationService: TokenRotationService;
  let mockSecureStorage: jest.Mocked<SecureStorageManager>;
  let mockGmailOAuth: jest.Mocked<GmailOAuthManager>;

  const mockGmailTokens: GmailTokens = {
    accessToken: 'ya29.test_access_token',
    refreshToken: 'test_refresh_token',
    expiryDate: Date.now() + 300000, // Expires in 5 minutes
    scope: 'https://www.googleapis.com/auth/gmail.readonly',
    tokenType: 'Bearer',
  };

  const expiredGmailTokens: GmailTokens = {
    ...mockGmailTokens,
    expiryDate: Date.now() - 60000, // Expired 1 minute ago
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    // Create mock instances
    mockSecureStorage = new MockSecureStorageManager(
      {} as any,
    ) as jest.Mocked<SecureStorageManager>;
    mockGmailOAuth = new MockGmailOAuthManager({} as any) as jest.Mocked<GmailOAuthManager>;

    // Setup default mock implementations
    mockSecureStorage.getGmailTokens.mockResolvedValue(createSuccessResult(mockGmailTokens));
    mockSecureStorage.storeGmailTokens.mockResolvedValue(createSuccessResult(undefined));
    mockGmailOAuth.refreshTokens.mockResolvedValue(
      createSuccessResult({
        ...mockGmailTokens,
        expiryDate: Date.now() + 3600000, // New expiry 1 hour from now
      }),
    );

    tokenRotationService = new TokenRotationService(mockSecureStorage, mockGmailOAuth);

    // Initialize with faster intervals for testing
    await tokenRotationService.initialize({
      rotationIntervalMs: 100, // 100ms for testing
      expirationBufferMs: 60000, // 1 minute buffer
      maxRetryAttempts: 3,
      retryDelayMultiplier: 2,
      enabled: true,
    });
  });

  afterEach(async () => {
    tokenRotationService.shutdown();
  });

  describe('Concurrent Rotation Prevention', () => {
    it('should prevent overlapping rotation attempts for the same provider', async () => {
      // Setup expired tokens to trigger rotation
      mockSecureStorage.getGmailTokens.mockResolvedValue(createSuccessResult(expiredGmailTokens));

      // Make refresh take some time to allow race condition
      mockGmailOAuth.refreshTokens.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve(
                  createSuccessResult({
                    ...mockGmailTokens,
                    expiryDate: Date.now() + 3600000,
                  }),
                ),
              200,
            ),
          ),
      );

      // Attempt concurrent rotations
      const rotation1Promise = tokenRotationService.rotateProviderTokens('gmail');
      const rotation2Promise = tokenRotationService.rotateProviderTokens('gmail');

      const [result1, result2] = await Promise.all([rotation1Promise, rotation2Promise]);

      // One should succeed, one should fail with "already in progress" error
      const successCount = [result1, result2].filter((r) => r.success).length;
      const failureCount = [result1, result2].filter((r) => !r.success).length;

      expect(successCount).toBe(1);
      expect(failureCount).toBe(1);

      // The failure should be due to rotation already in progress
      const failedResult = [result1, result2].find((r) => !r.success);
      expect(failedResult?.error).toBeInstanceOf(SecurityError);
      expect(failedResult?.error.message).toContain('already in progress');
    });

    it('should handle concurrent rotation checks properly with lock', async () => {
      // Setup expired tokens
      mockSecureStorage.getGmailTokens.mockResolvedValue(createSuccessResult(expiredGmailTokens));

      // Access private method for testing
      const checkMethod = (tokenRotationService as any).checkAndRotateTokens.bind(
        tokenRotationService,
      );

      // Start multiple rotation checks concurrently
      const promises = Array(5)
        .fill(0)
        .map(() => checkMethod());

      // All should complete without throwing
      await expect(Promise.all(promises)).resolves.not.toThrow();

      // Only one actual rotation should have occurred due to locking
      expect(mockGmailOAuth.refreshTokens).toHaveBeenCalledTimes(1);
    });
  });

  describe('Timeout Protection', () => {
    it('should timeout long-running rotation operations', async () => {
      // Setup expired tokens
      mockSecureStorage.getGmailTokens.mockResolvedValue(createSuccessResult(expiredGmailTokens));

      // Make refresh hang for longer than timeout
      mockGmailOAuth.refreshTokens.mockImplementation(
        () =>
          new Promise(
            (resolve) => setTimeout(() => resolve(createSuccessResult(mockGmailTokens)), 35000), // 35 seconds, longer than 30s timeout
          ),
      );

      // Access private method for testing rotation check timeout
      const checkMethod = (tokenRotationService as any).checkAndRotateTokens.bind(
        tokenRotationService,
      );

      const startTime = Date.now();
      await checkMethod();
      const duration = Date.now() - startTime;

      // Should complete due to timeout, not due to successful completion
      expect(duration).toBeLessThan(32000); // Should timeout before 32 seconds
      expect(duration).toBeGreaterThan(29000); // But not too early
    });

    it('should cleanup rotation status after timeout', async () => {
      // Setup expired tokens
      mockSecureStorage.getGmailTokens.mockResolvedValue(createSuccessResult(expiredGmailTokens));

      // Make refresh hang
      mockGmailOAuth.refreshTokens.mockImplementation(
        () => new Promise(() => {}), // Never resolves
      );

      // Access private method
      const checkMethod = (tokenRotationService as any).checkAndRotateTokens.bind(
        tokenRotationService,
      );

      // Start rotation check
      const rotationPromise = checkMethod();

      // Check that rotation is in progress
      let status = tokenRotationService.getRotationStatus();
      expect(status.rotationInProgress).toBe(true);

      // Wait for timeout
      await rotationPromise;

      // Status should be cleaned up
      status = tokenRotationService.getRotationStatus();
      expect(status.rotationInProgress).toBe(false);
    });
  });

  describe('Retry Logic and Error Handling', () => {
    it('should retry failed rotations with exponential backoff', async () => {
      // Setup expired tokens
      mockSecureStorage.getGmailTokens.mockResolvedValue(createSuccessResult(expiredGmailTokens));

      // Make first two attempts fail, third succeed
      mockGmailOAuth.refreshTokens
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Temporary server error'))
        .mockResolvedValueOnce(
          createSuccessResult({
            ...mockGmailTokens,
            expiryDate: Date.now() + 3600000,
          }),
        );

      const result = await tokenRotationService.rotateProviderTokens('gmail');

      expect(result.success).toBe(true);
      expect(mockGmailOAuth.refreshTokens).toHaveBeenCalledTimes(3);
    });

    it('should fail after maximum retry attempts', async () => {
      // Setup expired tokens
      mockSecureStorage.getGmailTokens.mockResolvedValue(createSuccessResult(expiredGmailTokens));

      // Make all attempts fail
      mockGmailOAuth.refreshTokens.mockRejectedValue(new Error('Persistent error'));

      const result = await tokenRotationService.rotateProviderTokens('gmail');

      expect(result.success).toBe(false);
      expect(mockGmailOAuth.refreshTokens).toHaveBeenCalledTimes(3); // Max attempts
      expect(result.error).toBeInstanceOf(AuthenticationError);
    });

    it('should update metrics for successful and failed rotations', async () => {
      // Setup expired tokens
      mockSecureStorage.getGmailTokens.mockResolvedValue(createSuccessResult(expiredGmailTokens));

      // Successful rotation
      mockGmailOAuth.refreshTokens.mockResolvedValue(
        createSuccessResult({
          ...mockGmailTokens,
          expiryDate: Date.now() + 3600000,
        }),
      );

      await tokenRotationService.rotateProviderTokens('gmail');

      let status = tokenRotationService.getRotationStatus();
      expect(status.metrics.gmail.successfulRotations).toBe(1);
      expect(status.metrics.gmail.totalAttempts).toBe(1);

      // Failed rotation
      mockGmailOAuth.refreshTokens.mockRejectedValue(new Error('Test error'));
      await tokenRotationService.rotateProviderTokens('gmail');

      status = tokenRotationService.getRotationStatus();
      expect(status.metrics.gmail.successfulRotations).toBe(1);
      expect(status.metrics.gmail.failedRotations).toBeGreaterThan(0);
      expect(status.metrics.gmail.totalAttempts).toBeGreaterThan(1);
    });
  });

  describe('Atomic Status Updates', () => {
    it('should update rotation status atomically', async () => {
      const initialStatus = tokenRotationService.getRotationStatus();
      expect(initialStatus.failedAttempts).toBe(0);

      // Access private method for testing
      const atomicUpdate = (tokenRotationService as any).atomicUpdateRotationStatus.bind(
        tokenRotationService,
      );

      // Update status
      atomicUpdate({ failedAttempts: 5 });

      const updatedStatus = tokenRotationService.getRotationStatus();
      expect(updatedStatus.failedAttempts).toBe(5);
      expect(updatedStatus.active).toBe(initialStatus.active); // Other properties preserved
    });

    it('should maintain consistent status during concurrent updates', async () => {
      // Access private method
      const atomicUpdate = (tokenRotationService as any).atomicUpdateRotationStatus.bind(
        tokenRotationService,
      );

      // Perform multiple concurrent atomic updates
      const promises = Array(10)
        .fill(0)
        .map((_, index) =>
          Promise.resolve().then(() => atomicUpdate({ failedAttempts: index + 1 })),
        );

      await Promise.all(promises);

      // Final status should be consistent (last update wins)
      const finalStatus = tokenRotationService.getRotationStatus();
      expect(finalStatus.failedAttempts).toBeGreaterThan(0);
      expect(finalStatus.failedAttempts).toBeLessThanOrEqual(10);
    });
  });

  describe('Performance Monitoring', () => {
    it('should provide detailed rotation status with performance metrics', async () => {
      const detailedStatus = tokenRotationService.getDetailedRotationStatus();

      expect(detailedStatus).toHaveProperty('uptime');
      expect(detailedStatus).toHaveProperty('isHealthy');
      expect(detailedStatus).toHaveProperty('recentErrorRate');
      expect(detailedStatus).toHaveProperty('metrics');
      expect(detailedStatus.metrics.gmail).toBeDefined();
    });

    it('should calculate error rates correctly', async () => {
      // Setup expired tokens and failing refresh
      mockSecureStorage.getGmailTokens.mockResolvedValue(createSuccessResult(expiredGmailTokens));
      mockGmailOAuth.refreshTokens.mockRejectedValue(new Error('Test error'));

      // Perform some failed rotations
      await tokenRotationService.rotateProviderTokens('gmail');
      await tokenRotationService.rotateProviderTokens('gmail');

      const detailedStatus = tokenRotationService.getDetailedRotationStatus();
      expect(detailedStatus.recentErrorRate).toBeGreaterThan(0);
      expect(detailedStatus.isHealthy).toBe(false); // Should be unhealthy due to high error rate
    });
  });

  describe('Cleanup and Failure Handling', () => {
    it('should cleanup properly on rotation failures', async () => {
      // Setup expired tokens
      mockSecureStorage.getGmailTokens.mockResolvedValue(createSuccessResult(expiredGmailTokens));
      mockGmailOAuth.refreshTokens.mockRejectedValue(new Error('Rotation failure'));

      await tokenRotationService.rotateProviderTokens('gmail');

      const status = tokenRotationService.getRotationStatus();
      expect(status.currentlyRotating).toHaveLength(0); // Should be cleaned up
      expect(status.rotationInProgress).toBe(false);
    });

    it('should stop scheduler after too many failures', async () => {
      // Setup to always fail
      mockSecureStorage.getGmailTokens.mockResolvedValue(createSuccessResult(expiredGmailTokens));
      mockGmailOAuth.refreshTokens.mockRejectedValue(new Error('Persistent failure'));

      // Access private method
      const checkMethod = (tokenRotationService as any).checkAndRotateTokens.bind(
        tokenRotationService,
      );

      // Fail multiple times
      for (let i = 0; i < 4; i++) {
        await checkMethod();
      }

      const status = tokenRotationService.getRotationStatus();
      expect(status.active).toBe(false); // Scheduler should be stopped
    });
  });
});
