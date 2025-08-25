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
    decryptString: jest.fn()
  },
  app: {
    getPath: jest.fn()
  }
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
    
    // Setup default mock implementations
    mockApp.getPath.mockReturnValue(mockUserDataPath);
    mockSafeStorage.isEncryptionAvailable.mockReturnValue(true);
    mockSafeStorage.encryptString.mockReturnValue(mockEncryptedKey);
    mockSafeStorage.decryptString.mockReturnValue('bW9jay1rZXktZGF0YS0zMi1ieXRlcy1sb25nLXRlc3Q='); // base64 of mock data
    
    mockCryptoUtils.generateRandomBytes.mockReturnValue(mockKeyData);
    mockSecureFileOperations.writeFileAtomically.mockReturnValue(createSuccessResult(undefined));
    mockSecureFileOperations.verifyFilePermissions.mockReturnValue(createSuccessResult({
      exists: true,
      correctPermissions: true,
      actualMode: 0o600,
      expectedMode: 0o600
    }));
    
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue(mockEncryptedKey);

    // Create fresh instance for each test
    credentialEncryption = new CredentialEncryption();
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
          dirMode: 0o700
        }
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
      }).toThrow('Linux OS keychain not implemented. Contributions welcome! Visit github.com/mauricio-morales/smart-inbox-janitor');

      // Restore original platform
      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });

    it('should throw error when OS encryption is not available', () => {
      // Arrange
      mockSafeStorage.isEncryptionAvailable.mockReturnValue(false);

      // Act & Assert
      expect(() => {
        (credentialEncryption as any).storeInOSKeychain(mockKeyId, mockKeyData);
      }).toThrow('OS encryption not available');
    });

    it('should handle file write errors gracefully', () => {
      // Arrange
      const writeError = new Error('File system error');
      mockSecureFileOperations.writeFileAtomically.mockReturnValue(createErrorResult(writeError as any));

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
        path.join(mockUserDataPath, 'keychain', `sij-key-${mockKeyId}.enc`)
      );
      expect(mockSecureFileOperations.verifyFilePermissions).toHaveBeenCalledWith(
        path.join(mockUserDataPath, 'keychain', `sij-key-${mockKeyId}.enc`),
        0o600
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
      mockSecureFileOperations.verifyFilePermissions.mockReturnValue(createSuccessResult({
        exists: true,
        correctPermissions: false,
        actualMode: 0o644,
        expectedMode: 0o600
      }));

      // Act
      const result = (credentialEncryption as any).retrieveFromOSKeychain(mockKeyId);

      // Assert
      expect(result).toBeNull();
      expect(mockSafeStorage.decryptString).not.toHaveBeenCalled();
    });

    it('should return null when permission verification fails', () => {
      // Arrange
      mockSecureFileOperations.verifyFilePermissions.mockReturnValue(
        createErrorResult(new Error('Permission check failed') as any)
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
        path.join(mockUserDataPath, 'keychain', 'sij-key-master.enc')
      );
    });
  });

  describe('Cross-platform behavior', () => {
    const platforms = ['darwin', 'win32', 'linux'];

    platforms.forEach(platform => {
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
        expect.stringContaining('Security Event: os_keychain_store')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('success: true')
      );
    });

    it('should log successful retrieve operations', () => {
      // Act
      (credentialEncryption as any).retrieveFromOSKeychain(mockKeyId);

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Security Event: os_keychain_retrieve')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('success: true')
      );
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
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[REDACTED_API_KEY]')
      );
      expect(consoleWarnSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('sk-test123456789')
      );

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
});