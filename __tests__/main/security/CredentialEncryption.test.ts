/**
 * Comprehensive tests for CredentialEncryption OS keychain functionality
 *
 * Tests the complete OS keychain storage and retrieval implementation
 * including cross-platform behavior, error handling, and security features.
 *
 * @module CredentialEncryption.test
 */

import { CredentialEncryption } from '../../../src/main/security/CredentialEncryption';
import { CryptoUtils } from '@shared/utils/crypto.utils';
import { SecureFileOperations } from '../../../src/main/security/utils/SecureFileOperations';
import { createSuccessResult, createErrorResult } from '@shared/types';
import * as fs from 'fs';
import * as path from 'path';

// Mock dependencies
jest.mock('electron', () => ({
  safeStorage: {
    isEncryptionAvailable: jest.fn(),
    encryptString: jest.fn(),
    decryptString: jest.fn(),
  },
  app: {
    getPath: jest.fn(),
  },
}));

jest.mock('../../../src/main/security/utils/SecureFileOperations');
jest.mock('@shared/utils/crypto.utils');
jest.mock('fs');

// Import the mocked electron modules
import { safeStorage, app } from 'electron';

// Type the mocked modules
const mockFs = fs as jest.Mocked<typeof fs>;
const mockSecureFileOperations = SecureFileOperations as jest.Mocked<typeof SecureFileOperations>;
const mockCryptoUtils = CryptoUtils as jest.Mocked<typeof CryptoUtils>;
const mockSafeStorage = safeStorage as jest.Mocked<typeof safeStorage>;
const mockApp = app as jest.Mocked<typeof app>;

describe('CredentialEncryption - OS Keychain Implementation', () => {
  let credentialEncryption: CredentialEncryption;
  const mockUserDataPath = '/mock/user/data';
  const mockKeyId = 'test-key';
  const mockKeyData = Buffer.from('mock-key-data-32-bytes-long-test', 'utf8');
  const mockEncryptedKey = Buffer.from('mock-encrypted-data');

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Clean up any existing instance
    if (credentialEncryption) {
      credentialEncryption.shutdown();
    }

    // Setup default mock implementations
    mockApp.getPath.mockReturnValue(mockUserDataPath);
    mockSafeStorage.isEncryptionAvailable.mockReturnValue(true);
    mockSafeStorage.encryptString.mockReturnValue(mockEncryptedKey);
    mockSafeStorage.decryptString.mockReturnValue('bW9jay1rZXktZGF0YS0zMi1ieXRlcy1sb25nLXRlc3Q='); // base64 of mock data

    mockCryptoUtils.generateRandomBytes.mockReturnValue(mockKeyData);
    mockSecureFileOperations.writeFileAtomically.mockReturnValue(createSuccessResult(undefined));
    mockSecureFileOperations.verifyFilePermissions.mockReturnValue(
      createSuccessResult({
        exists: true,
        correctPermissions: true,
        actualMode: 0o600,
        expectedMode: 0o600,
      }),
    );

    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue(mockEncryptedKey);

    // Create fresh instance for each test with test cache configuration
    credentialEncryption = new CredentialEncryption({
      maxSize: 10, // Small cache for testing eviction
      ttlMs: 1000, // 1 second TTL for testing expiration
      updateAgeOnGet: true,
      updateAgeOnHas: false,
    });
    credentialEncryption.initialize();
  });

  describe('storeInOSKeychain()', () => {
    it('should successfully store key in OS keychain on supported platforms', () => {
      // Arrange
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'darwin' });

      // Act & Assert - Using private method access for testing
      expect(() => {
        (credentialEncryption as any).storeInOSKeychain(mockKeyId, mockKeyData);
      }).not.toThrow();

      // Verify interactions
      expect(mockSafeStorage.isEncryptionAvailable).toHaveBeenCalled();
      expect(mockSafeStorage.encryptString).toHaveBeenCalledWith(mockKeyData.toString('base64'));
      expect(mockSecureFileOperations.writeFileAtomically).toHaveBeenCalledWith(
        path.join(mockUserDataPath, 'keychain', `sij-key-${mockKeyId}.enc`),
        mockEncryptedKey,
        {
          mode: 0o600,
          createParents: true,
          dirMode: 0o700,
        },
      );

      // Restore original platform
      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });

    it('should throw Linux not implemented error on Linux platform', () => {
      // Arrange
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'linux' });
      mockSafeStorage.isEncryptionAvailable.mockReturnValue(false);

      // Act & Assert
      expect(() => {
        (credentialEncryption as any).storeInOSKeychain(mockKeyId, mockKeyData);
      }).toThrow(
        'Linux OS keychain not implemented. Contributions welcome! Visit github.com/mauricio-morales/smart-inbox-janitor',
      );

      // Restore original platform
      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });

    it('should throw error when OS encryption is not available', () => {
      // Arrange
      mockSafeStorage.isEncryptionAvailable.mockReturnValue(false);

      // Act & Assert
      expect(() => {
        (credentialEncryption as any).storeInOSKeychain(mockKeyId, mockKeyData);
      }).toThrow(
        process.platform === 'linux'
          ? 'Linux OS keychain not implemented'
          : 'OS encryption not available',
      );
    });

    it('should handle file write errors gracefully', () => {
      // Arrange
      const writeError = new Error('File system error');
      mockSecureFileOperations.writeFileAtomically.mockReturnValue(
        createErrorResult(writeError as any),
      );

      // Act & Assert
      expect(() => {
        (credentialEncryption as any).storeInOSKeychain(mockKeyId, mockKeyData);
      }).toThrow('OS keychain storage failed');
    });

    it('should handle safeStorage encryption errors', () => {
      // Arrange
      mockSafeStorage.encryptString.mockImplementation(() => {
        throw new Error('Encryption failed');
      });

      // Act & Assert
      expect(() => {
        (credentialEncryption as any).storeInOSKeychain(mockKeyId, mockKeyData);
      }).toThrow('OS keychain storage failed: Encryption failed');
    });
  });

  describe('retrieveFromOSKeychain()', () => {
    it('should successfully retrieve key from OS keychain', () => {
      // Arrange
      const expectedBase64Key = 'bW9jay1rZXktZGF0YS0zMi1ieXRlcy1sb25nLXRlc3Q=';
      mockSafeStorage.decryptString.mockReturnValue(expectedBase64Key);

      // Act
      const result = (credentialEncryption as any).retrieveFromOSKeychain(mockKeyId);

      // Assert
      expect(result).toBe(expectedBase64Key);
      expect(mockSafeStorage.isEncryptionAvailable).toHaveBeenCalled();
      expect(mockFs.existsSync).toHaveBeenCalledWith(
        path.join(mockUserDataPath, 'keychain', `sij-key-${mockKeyId}.enc`),
      );
      expect(mockSecureFileOperations.verifyFilePermissions).toHaveBeenCalledWith(
        path.join(mockUserDataPath, 'keychain', `sij-key-${mockKeyId}.enc`),
        0o600,
      );
      expect(mockSafeStorage.decryptString).toHaveBeenCalledWith(mockEncryptedKey);
    });

    it('should return null when OS encryption is not available', () => {
      // Arrange
      mockSafeStorage.isEncryptionAvailable.mockReturnValue(false);

      // Act
      const result = (credentialEncryption as any).retrieveFromOSKeychain(mockKeyId);

      // Assert
      expect(result).toBeNull();
      expect(mockSafeStorage.decryptString).not.toHaveBeenCalled();
    });

    it('should return null when keychain file does not exist', () => {
      // Arrange
      mockFs.existsSync.mockReturnValue(false);

      // Act
      const result = (credentialEncryption as any).retrieveFromOSKeychain(mockKeyId);

      // Assert
      expect(result).toBeNull();
      expect(mockSafeStorage.decryptString).not.toHaveBeenCalled();
    });

    it('should return null when file permissions are incorrect', () => {
      // Arrange
      mockSecureFileOperations.verifyFilePermissions.mockReturnValue(
        createSuccessResult({
          exists: true,
          correctPermissions: false,
          actualMode: 0o644,
          expectedMode: 0o600,
        }),
      );

      // Act
      const result = (credentialEncryption as any).retrieveFromOSKeychain(mockKeyId);

      // Assert
      expect(result).toBeNull();
      expect(mockSafeStorage.decryptString).not.toHaveBeenCalled();
    });

    it('should return null when permission verification fails', () => {
      // Arrange
      mockSecureFileOperations.verifyFilePermissions.mockReturnValue(
        createErrorResult(new Error('Permission check failed') as any),
      );

      // Act
      const result = (credentialEncryption as any).retrieveFromOSKeychain(mockKeyId);

      // Assert
      expect(result).toBeNull();
      expect(mockSafeStorage.decryptString).not.toHaveBeenCalled();
    });

    it('should return null when decrypted key is invalid base64', () => {
      // Arrange
      mockSafeStorage.decryptString.mockReturnValue('invalid-base64-string-with-invalid-chars!@#');

      // Act
      const result = (credentialEncryption as any).retrieveFromOSKeychain(mockKeyId);

      // Assert
      expect(result).toBeNull();
    });

    it('should handle decryption errors gracefully', () => {
      // Arrange
      mockSafeStorage.decryptString.mockImplementation(() => {
        throw new Error('Decryption failed');
      });

      // Act
      const result = (credentialEncryption as any).retrieveFromOSKeychain(mockKeyId);

      // Assert
      expect(result).toBeNull();
    });

    it('should handle file system errors gracefully', () => {
      // Arrange
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error('File read error');
      });

      // Act
      const result = (credentialEncryption as any).retrieveFromOSKeychain(mockKeyId);

      // Assert
      expect(result).toBeNull();
    });

    it('should use default keyId when none provided', () => {
      // Act
      void (credentialEncryption as any).retrieveFromOSKeychain();

      // Assert
      expect(mockFs.existsSync).toHaveBeenCalledWith(
        path.join(mockUserDataPath, 'keychain', 'sij-key-master.enc'),
      );
    });
  });

  describe('Cross-platform behavior', () => {
    const platforms = ['darwin', 'win32', 'linux'];

    platforms.forEach((platform) => {
      it(`should handle ${platform} platform correctly`, () => {
        // Arrange
        const originalPlatform = process.platform;
        Object.defineProperty(process, 'platform', { value: platform });

        if (platform === 'linux') {
          mockSafeStorage.isEncryptionAvailable.mockReturnValue(false);
        } else {
          mockSafeStorage.isEncryptionAvailable.mockReturnValue(true);
        }

        // Act & Assert
        if (platform === 'linux') {
          expect(() => {
            (credentialEncryption as any).storeInOSKeychain(mockKeyId, mockKeyData);
          }).toThrow('Linux OS keychain not implemented');
        } else {
          expect(() => {
            (credentialEncryption as any).storeInOSKeychain(mockKeyId, mockKeyData);
          }).not.toThrow();
        }

        // Restore original platform
        Object.defineProperty(process, 'platform', { value: originalPlatform });
      });
    });
  });

  describe('Security audit logging', () => {
    let consoleSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, 'info').mockImplementation(() => {});
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it('should log successful store operations', () => {
      // Act
      (credentialEncryption as any).storeInOSKeychain(mockKeyId, mockKeyData);

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Security Event: os_keychain_store'),
      );
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('success: true'));
    });

    it('should log successful retrieve operations', () => {
      // Act
      (credentialEncryption as any).retrieveFromOSKeychain(mockKeyId);

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Security Event: os_keychain_retrieve'),
      );
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('success: true'));
    });

    it('should not log sensitive data in error messages', () => {
      // Arrange
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      mockSafeStorage.encryptString.mockImplementation(() => {
        throw new Error('Error with sk-test123456789 api key');
      });

      try {
        // Act
        (credentialEncryption as any).storeInOSKeychain(mockKeyId, mockKeyData);
      } catch {
        // Expected to throw
      }

      // Assert
      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('[REDACTED_API_KEY]'));
      expect(consoleWarnSpy).not.toHaveBeenCalledWith(expect.stringContaining('sk-test123456789'));

      consoleWarnSpy.mockRestore();
    });
  });

  describe('Integration with existing encryption flow', () => {
    it('should integrate with getOrCreateOSKeychainKey method', () => {
      // Arrange - mock successful retrieval of existing key
      const existingKeyBase64 = 'ZXhpc3RpbmctbW9jay1rZXktZGF0YQ==';
      mockSafeStorage.decryptString.mockReturnValue(existingKeyBase64);

      // Act
      const result = (credentialEncryption as any).getOrCreateOSKeychainKey();

      // Assert
      expect(result).toBeInstanceOf(Buffer);
      expect(result.toString('base64')).toBe(existingKeyBase64);
      expect(mockCryptoUtils.generateRandomBytes).not.toHaveBeenCalled(); // Should not generate new key
    });

    it('should create new key when none exists', () => {
      // Arrange - mock file doesn't exist
      mockFs.existsSync.mockReturnValue(false);

      // Act
      const result = (credentialEncryption as any).getOrCreateOSKeychainKey();

      // Assert
      expect(result).toBeInstanceOf(Buffer);
      expect(mockCryptoUtils.generateRandomBytes).toHaveBeenCalledWith(32);
    });
  });

  describe('Base64 validation helper', () => {
    it('should validate correct base64 strings', () => {
      // Arrange
      const validBase64 = 'SGVsbG8gV29ybGQ=';

      // Act
      const result = (credentialEncryption as any).isValidBase64(validBase64);

      // Assert
      expect(result).toBe(true);
    });

    it('should reject invalid base64 strings', () => {
      // Arrange
      const invalidBase64 = 'invalid-base64-string-with-invalid-chars!@#';

      // Act
      const result = (credentialEncryption as any).isValidBase64(invalidBase64);

      // Assert
      expect(result).toBe(false);
    });

    it('should reject empty strings', () => {
      // Act
      const result = (credentialEncryption as any).isValidBase64('');

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('Cache Management and Eviction', () => {
    let consoleInfoSpy: jest.SpyInstance;
    let consoleWarnSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation(() => {});
      consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      // Setup successful crypto operations for cache testing
      mockCryptoUtils.encryptData.mockReturnValue(
        createSuccessResult({
          encryptedData: 'encrypted-data',
          iv: 'initialization-vector',
          authTag: 'authentication-tag',
          algorithm: 'aes-256-gcm',
          createdAt: new Date(),
        }),
      );
    });

    afterEach(() => {
      consoleInfoSpy.mockRestore();
      consoleWarnSpy.mockRestore();

      // Clean up test instance
      credentialEncryption.shutdown();
    });

    describe('LRU Cache Eviction', () => {
      it('should evict oldest items when cache reaches maxSize', () => {
        // Fill cache to capacity (10 items)
        for (let i = 0; i < 10; i++) {
          const result = credentialEncryption.encryptCredential(`data-${i}`, `key-${i}`);
          expect(result.success).toBe(true);
        }

        // Add one more item to trigger eviction
        const result = credentialEncryption.encryptCredential('data-overflow', 'key-overflow');
        expect(result.success).toBe(true);

        // Verify eviction was logged
        expect(consoleInfoSpy).toHaveBeenCalledWith(
          expect.stringContaining('Cache Event: key_evicted'),
        );
      });

      it('should track cache statistics accurately during eviction', () => {
        // Fill cache to capacity
        for (let i = 0; i < 12; i++) {
          // 12 > maxSize of 10
          credentialEncryption.encryptCredential(`data-${i}`, `key-${i}`);
        }

        const stats = credentialEncryption.getCacheStats();

        expect(stats.evictions).toBeGreaterThan(0);
        expect(stats.size).toBeLessThanOrEqual(stats.maxSize);
        expect(stats.utilization).toBeGreaterThan(0);
      });

      it('should prioritize recently used items during eviction', () => {
        // Fill cache with initial items
        for (let i = 0; i < 10; i++) {
          credentialEncryption.encryptCredential(`data-${i}`, `key-${i}`);
        }

        // Access key-5 to make it recently used
        const credential5 = {
          encryptedData: 'encrypted-data',
          iv: 'initialization-vector',
          authTag: 'authentication-tag',
          algorithm: 'aes-256-gcm' as const,
          createdAt: new Date(),
          keyId: 'key-5',
        };

        mockCryptoUtils.decryptData.mockReturnValue(createSuccessResult('data-5'));
        credentialEncryption.decryptCredential(credential5);

        // Add new item to trigger eviction
        credentialEncryption.encryptCredential('new-data', 'new-key');

        // key-5 should still be accessible (not evicted)
        const keyMetadata5 = credentialEncryption.getKeyMetadata('key-5');
        expect(keyMetadata5).toBeTruthy();
      });
    });

    describe('Time-based Expiration', () => {
      it('should expire cache entries after TTL', async () => {
        // Create cache entry
        credentialEncryption.encryptCredential('test-data', 'test-key');

        // Wait for TTL to expire (1 second + buffer)
        await new Promise((resolve) => setTimeout(resolve, 1200));

        // Force cache cleanup
        (credentialEncryption as any).performPeriodicMaintenance();

        // Should register as cache miss now
        credentialEncryption.encryptCredential('test-data', 'test-key');

        const stats = credentialEncryption.getCacheStats();
        expect(stats.misses).toBeGreaterThan(0);
      });

      it('should handle expired credentials gracefully', () => {
        // Create expired credential
        const expiredCredential = {
          encryptedData: 'encrypted-data',
          iv: 'initialization-vector',
          authTag: 'authentication-tag',
          algorithm: 'aes-256-gcm' as const,
          createdAt: new Date(),
          keyId: 'expired-key',
          expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
        };

        const result = credentialEncryption.decryptCredential(expiredCredential);

        expect(result.success).toBe(false);
        expect(result.error?.message).toContain('Credential has expired');
      });
    });

    describe('Cache Statistics and Monitoring', () => {
      it('should track hit/miss ratios accurately', () => {
        const keyId = 'stats-test-key';

        // First access - cache miss
        credentialEncryption.encryptCredential('test-data', keyId);

        // Second access - cache hit
        credentialEncryption.encryptCredential('test-data', keyId);

        const stats = credentialEncryption.getCacheStats();

        expect(stats.hits).toBeGreaterThan(0);
        expect(stats.misses).toBeGreaterThan(0);
        expect(stats.hitRatio).toBeGreaterThan(0);
        expect(stats.hitRatio).toBeLessThanOrEqual(1);
      });

      it('should provide comprehensive cache performance report', () => {
        // Generate some cache activity
        credentialEncryption.encryptCredential('data1', 'key1');
        credentialEncryption.encryptCredential('data2', 'key2');
        credentialEncryption.encryptCredential('data1', 'key1'); // Cache hit

        const report = credentialEncryption.getCachePerformanceReport();

        expect(report).toContain('Cache Performance Report');
        expect(report).toContain('Hit Ratio');
        expect(report).toContain('Utilization');
        expect(report).toContain('Evictions');
        expect(report).toContain('Top Keys');
      });

      it('should track top frequently accessed keys', () => {
        const frequentKey = 'frequent-key';

        // Access the same key multiple times
        for (let i = 0; i < 5; i++) {
          credentialEncryption.encryptCredential(`data-${i}`, frequentKey);
        }

        const stats = credentialEncryption.getCacheStats();

        expect(stats.topKeys).toContain(frequentKey);
      });
    });

    describe('Cache Size Warnings', () => {
      it('should warn when cache utilization exceeds 75%', () => {
        // Fill cache to >75% capacity (8+ items in a 10-item cache)
        for (let i = 0; i < 9; i++) {
          credentialEncryption.encryptCredential(`data-${i}`, `key-${i}`);
        }

        // Trigger cache size check
        (credentialEncryption as any).checkCacheSizeWarnings();

        expect(consoleInfoSpy).toHaveBeenCalledWith(
          expect.stringContaining('Cache Event: size_warning_high'),
        );
      });

      it('should warn critically when cache utilization exceeds 90%', () => {
        // Fill cache to capacity
        for (let i = 0; i < 10; i++) {
          credentialEncryption.encryptCredential(`data-${i}`, `key-${i}`);
        }

        // Trigger cache size check
        (credentialEncryption as any).checkCacheSizeWarnings();

        expect(consoleInfoSpy).toHaveBeenCalledWith(
          expect.stringContaining('Cache Event: size_warning_critical'),
        );
      });

      it('should warn about poor hit ratios', () => {
        // Generate many cache misses
        for (let i = 0; i < 110; i++) {
          credentialEncryption.encryptCredential(`data-${i}`, `unique-key-${i}`);
        }

        // Force cache size check
        (credentialEncryption as any).checkCacheSizeWarnings();

        expect(consoleInfoSpy).toHaveBeenCalledWith(
          expect.stringContaining('Cache Event: hit_ratio_warning'),
        );
      });
    });

    describe('Cache Warming', () => {
      it('should warm cache with frequently accessed keys on initialization', () => {
        // Create new instance to test warming
        const warmedCredentialEncryption = new CredentialEncryption();

        // Mock frequently used keys data
        const mockFrequentKeys = new Map([
          ['frequent-key-1', 10],
          ['frequent-key-2', 8],
          ['frequent-key-3', 6],
        ]);

        (warmedCredentialEncryption as any).frequentlyUsedKeys = mockFrequentKeys;

        // Initialize should trigger warming
        warmedCredentialEncryption.initialize();

        const stats = warmedCredentialEncryption.getCacheStats();

        // Should have attempted warming
        expect(stats.warmingStats.lastWarmingAt).toBeTruthy();
      });

      it('should log cache warming events', () => {
        // Trigger warming manually
        (credentialEncryption as any).warmupCache();

        expect(consoleInfoSpy).toHaveBeenCalledWith(
          expect.stringContaining('Cache Event: cache_warmed'),
        );
      });
    });

    describe('Periodic Maintenance', () => {
      it('should perform periodic cache maintenance', () => {
        // Add some cache entries
        credentialEncryption.encryptCredential('data1', 'key1');
        credentialEncryption.encryptCredential('data2', 'key2');

        // Manually trigger maintenance
        (credentialEncryption as any).performPeriodicMaintenance();

        expect(consoleInfoSpy).toHaveBeenCalledWith(
          expect.stringContaining('Cache Event: periodic_maintenance'),
        );
      });

      it('should clean up old usage stats during maintenance', () => {
        // Add old usage stats
        const oldStats = {
          encryptionCount: 1,
          decryptionCount: 1,
          totalBytesEncrypted: 100,
          totalBytesDecrypted: 100,
          lastUsageAt: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000), // 31 days ago
        };

        (credentialEncryption as any).usageStats.set('old-key', oldStats);

        // Trigger maintenance
        (credentialEncryption as any).performPeriodicMaintenance();

        // Old stats should be cleaned up
        const stats = credentialEncryption.getUsageStats('old-key');
        expect(stats).toBeNull();
      });
    });

    describe('Secure Shutdown', () => {
      it('should securely clear sensitive data during shutdown', () => {
        // Add some cached keys
        credentialEncryption.encryptCredential('sensitive-data', 'sensitive-key');

        // Mock buffer fill method
        const mockBuffer = Buffer.from('mock-sensitive-data');
        const fillSpy = jest.spyOn(mockBuffer, 'fill');

        // Mock the cache to return our spy buffer
        (credentialEncryption as any).keyCache.set('test-key', mockBuffer);

        // Perform shutdown
        credentialEncryption.shutdown();

        // Should have cleared sensitive data
        expect(fillSpy).toHaveBeenCalledWith(0);

        // Cache should be empty
        const stats = credentialEncryption.getCacheStats();
        expect(stats.size).toBe(0);

        fillSpy.mockRestore();
      });

      it('should clear cleanup timer during shutdown', () => {
        const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

        credentialEncryption.shutdown();

        expect(clearIntervalSpy).toHaveBeenCalled();

        clearIntervalSpy.mockRestore();
      });

      it('should handle shutdown errors gracefully', () => {
        // Mock an error during shutdown
        (credentialEncryption as any).keyCache.forEach = jest.fn().mockImplementation(() => {
          throw new Error('Shutdown error');
        });

        // Shutdown should not throw
        expect(() => credentialEncryption.shutdown()).not.toThrow();

        expect(consoleInfoSpy).toHaveBeenCalledWith(
          expect.stringContaining('Cache Event: shutdown_error'),
        );
      });
    });

    describe('WeakMap Usage and Memory Management', () => {
      it('should handle buffer disposal correctly during eviction', () => {
        // Fill cache beyond capacity to trigger eviction
        const buffers: Buffer[] = [];

        for (let i = 0; i < 15; i++) {
          const buffer = Buffer.from(`test-buffer-${i}`);
          buffers.push(buffer);

          // Mock the cache to use real buffers
          (credentialEncryption as any).keyCache.set(`key-${i}`, buffer);
        }

        // Should have triggered eviction
        const stats = credentialEncryption.getCacheStats();
        expect(stats.evictions).toBeGreaterThan(0);
      });
    });

    describe('Cache Clear Operations', () => {
      it('should securely clear cache and reset statistics', () => {
        // Add cache entries and generate stats
        credentialEncryption.encryptCredential('data1', 'key1');
        credentialEncryption.encryptCredential('data2', 'key2');
        credentialEncryption.encryptCredential('data1', 'key1'); // Generate hit

        // Clear cache
        credentialEncryption.clearCache();

        const stats = credentialEncryption.getCacheStats();

        expect(stats.size).toBe(0);
        expect(stats.hits).toBe(0);
        expect(stats.misses).toBe(0);
        expect(stats.evictions).toBe(0);

        expect(consoleInfoSpy).toHaveBeenCalledWith(
          expect.stringContaining('Cache Event: cache_cleared'),
        );
      });
    });
  });
});
