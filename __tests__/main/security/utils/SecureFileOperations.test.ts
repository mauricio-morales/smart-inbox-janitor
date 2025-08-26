/**
 * Unit tests for SecureFileOperations utility
 *
 * Tests atomic file operations, cross-platform permission handling,
 * and security features for credential storage file operations.
 *
 * @module SecureFileOperations.test
 */

import { SecureFileOperations } from '../../../../src/main/security/utils/SecureFileOperations';
import { StorageError } from '@shared/types';
import * as fs from 'fs';
import * as path from 'path';
import { randomBytes } from 'crypto';

// Mock fs module
jest.mock('fs');
jest.mock('crypto');
jest.mock('path', () => {
  const originalPath = jest.requireActual('path');
  return {
    ...originalPath,
    resolve: jest.fn(),
  };
});

// Type the mocked modules
const mockFs = fs as jest.Mocked<typeof fs>;
const mockRandomBytes = randomBytes as jest.MockedFunction<typeof randomBytes>;
const mockPath = path as jest.Mocked<typeof path>;

describe('SecureFileOperations', () => {
  const mockFilePath = '/test/secure/file.enc';
  const mockDirPath = '/test/secure';
  const mockData = Buffer.from('test-data');
  const mockTempSuffix = 'abcd1234';

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Setup default mock implementations
    mockRandomBytes.mockReturnValue(Buffer.from(mockTempSuffix, 'hex') as any);
    mockFs.existsSync.mockReturnValue(false);
    mockFs.writeFileSync.mockImplementation(() => {});
    mockFs.renameSync.mockImplementation(() => {});
    mockFs.mkdirSync.mockImplementation(() => undefined);
    mockFs.chmodSync.mockImplementation(() => {});
    mockFs.statSync.mockReturnValue({
      mode: 0o100600, // file type bits + permission bits (matches expected permissions)
      isDirectory: () => false,
    } as any);
    mockFs.unlinkSync.mockImplementation(() => {});
    mockFs.accessSync.mockImplementation(() => {});
    mockPath.resolve.mockImplementation((p: string) => p); // Simple passthrough by default
  });

  describe('writeFileAtomically()', () => {
    it('should write file atomically with correct permissions', () => {
      // Arrange
      const expectedTempPath = `${mockFilePath}.tmp.${mockTempSuffix}`;

      // Mock the platform and ensure correct permissions are returned
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'linux', configurable: true });

      // Mock statSync to return appropriate permissions for directories vs files
      mockFs.statSync.mockImplementation((path: fs.PathLike) => {
        if (path === mockDirPath) {
          // Directory should have 700 permissions
          return { mode: 0o040700 } as any; // directory type bits + 700 permissions
        } else {
          // File should have 600 permissions
          return { mode: 0o100600 } as any; // file type bits + 600 permissions
        }
      });

      // Act
      const result = SecureFileOperations.writeFileAtomically(mockFilePath, mockData);

      // Debug output
      if (!result.success) {
        console.log('Test failed with error:', result.error.message);
        console.log('Platform:', process.platform);
        console.log('Error details:', result.error.details);
      }

      // Assert
      expect(result.success).toBe(true);
      expect(mockFs.mkdirSync).toHaveBeenCalledWith(mockDirPath, {
        recursive: true,
        mode: 0o700,
      });
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(expectedTempPath, mockData, {
        mode: 0o600,
        flag: 'wx',
      });
      expect(mockFs.renameSync).toHaveBeenCalledWith(expectedTempPath, mockFilePath);

      // Restore original platform
      Object.defineProperty(process, 'platform', { value: originalPlatform, configurable: true });
    });

    it('should create parent directories when requested', () => {
      // Arrange
      mockFs.existsSync.mockReturnValue(false); // Parent directory doesn't exist

      // Act
      const result = SecureFileOperations.writeFileAtomically(mockFilePath, mockData, {
        createParents: true,
        dirMode: 0o755,
      });

      // Assert
      expect(result.success).toBe(true);
      expect(mockFs.mkdirSync).toHaveBeenCalledWith(mockDirPath, {
        recursive: true,
        mode: 0o755,
      });
    });

    it('should not create parent directories when disabled', () => {
      // Act
      const result = SecureFileOperations.writeFileAtomically(mockFilePath, mockData, {
        createParents: false,
      });

      // Assert
      expect(result.success).toBe(true);
      expect(mockFs.mkdirSync).not.toHaveBeenCalled();
    });

    it('should use custom file mode when provided', () => {
      // Arrange
      const customMode = 0o644;
      const expectedTempPath = `${mockFilePath}.tmp.${mockTempSuffix}`;

      // Act
      const result = SecureFileOperations.writeFileAtomically(mockFilePath, mockData, {
        mode: customMode,
      });

      // Assert
      expect(result.success).toBe(true);
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(expectedTempPath, mockData, {
        mode: customMode,
        flag: 'wx',
      });
    });

    it('should clean up temp file on write failure', () => {
      // Arrange
      const writeError = new Error('Write failed');
      const expectedTempPath = `${mockFilePath}.tmp.${mockTempSuffix}`;
      mockFs.writeFileSync.mockImplementation(() => {
        throw writeError;
      });
      mockFs.existsSync.mockImplementation((path: fs.PathLike) => {
        return path === expectedTempPath; // Temp file exists for cleanup
      });

      // Act
      const result = SecureFileOperations.writeFileAtomically(mockFilePath, mockData);

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(StorageError);
        expect(result.error.message).toContain('Atomic file write failed');
      }
      expect(mockFs.unlinkSync).toHaveBeenCalledWith(expectedTempPath);
    });

    it('should handle permission setting errors gracefully', () => {
      // Arrange
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'linux' });

      mockFs.chmodSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });
      const expectedTempPath = `${mockFilePath}.tmp.${mockTempSuffix}`;

      // Act
      const result = SecureFileOperations.writeFileAtomically(mockFilePath, mockData);

      // Assert
      expect(result.success).toBe(false);
      expect(mockFs.unlinkSync).toHaveBeenCalledWith(expectedTempPath);

      // Restore original platform
      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });

    it('should handle string data correctly', () => {
      // Arrange
      const stringData = 'test string data';
      const expectedTempPath = `${mockFilePath}.tmp.${mockTempSuffix}`;

      // Act
      const result = SecureFileOperations.writeFileAtomically(mockFilePath, stringData);

      // Assert
      expect(result.success).toBe(true);
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(expectedTempPath, stringData, {
        mode: 0o600,
        flag: 'wx',
      });
    });
  });

  describe('verifyFilePermissions()', () => {
    it('should verify correct file permissions on Unix systems', () => {
      // Arrange
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'linux' });

      mockFs.existsSync.mockReturnValue(true);
      mockFs.accessSync.mockImplementation(() => {}); // File is accessible
      mockFs.statSync.mockReturnValue({
        mode: 0o100600, // file type bits + 600 permissions
      } as any);

      // Act
      const result = SecureFileOperations.verifyFilePermissions(mockFilePath, 0o600);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.exists).toBe(true);
        expect(result.data.correctPermissions).toBe(true);
        expect(result.data.actualMode).toBe(0o600);
        expect(result.data.expectedMode).toBe(0o600);
      }

      // Restore original platform
      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });

    it('should handle non-existent files', () => {
      // Arrange
      mockFs.existsSync.mockReturnValue(false);

      // Act
      const result = SecureFileOperations.verifyFilePermissions(mockFilePath);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.exists).toBe(false);
        expect(result.data.correctPermissions).toBe(false);
        expect(result.data.actualMode).toBeUndefined();
      }
    });

    it('should handle inaccessible files', () => {
      // Arrange
      mockFs.existsSync.mockReturnValue(true);
      mockFs.accessSync.mockImplementation(() => {
        throw new Error('Access denied');
      });

      // Act
      const result = SecureFileOperations.verifyFilePermissions(mockFilePath);

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(StorageError);
        expect(result.error.message).toContain('not accessible');
      }
    });

    it('should detect incorrect permissions on Unix systems', () => {
      // Arrange
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'linux' });

      mockFs.existsSync.mockReturnValue(true);
      mockFs.accessSync.mockImplementation(() => {});
      mockFs.statSync.mockReturnValue({
        mode: 0o100644, // file type bits + 644 permissions (incorrect)
      } as any);

      // Act
      const result = SecureFileOperations.verifyFilePermissions(mockFilePath, 0o600);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.correctPermissions).toBe(false);
        expect(result.data.actualMode).toBe(0o644);
      }

      // Restore original platform
      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });

    it('should skip permission checking on Windows', () => {
      // Arrange
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'win32' });

      mockFs.existsSync.mockReturnValue(true);
      mockFs.accessSync.mockImplementation(() => {});
      mockFs.statSync.mockReturnValue({
        mode: 0o100644, // Different permissions, but should be ignored on Windows
      } as any);

      // Act
      const result = SecureFileOperations.verifyFilePermissions(mockFilePath, 0o600);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.correctPermissions).toBe(true); // Always true on Windows
        expect(result.data.actualMode).toBeUndefined(); // Not reported on Windows
      }

      // Restore original platform
      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });
  });

  describe('sanitizeFilePath()', () => {
    it('should sanitize and resolve valid file paths', () => {
      // Arrange
      const inputPath = './test/secure/file.enc';
      const expectedPath = '/current/secure/file.enc';

      // Mock path.resolve to return expected path
      mockPath.resolve.mockReturnValue(expectedPath);

      // Act
      const result = SecureFileOperations.sanitizeFilePath(inputPath);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(expectedPath);
      }
    });

    it('should reject paths with directory traversal attempts', () => {
      // Arrange
      const dangerousPath = '/test/../../../etc/passwd';
      mockPath.resolve.mockReturnValue(dangerousPath);

      // Act
      const result = SecureFileOperations.sanitizeFilePath(dangerousPath);

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('directory traversal');
      }
    });

    it('should validate against allowed base paths', () => {
      // Arrange
      const inputPath = '/allowed/base/file.enc';
      const allowedBases = ['/allowed', '/another/allowed'];
      mockPath.resolve.mockReturnValueOnce(inputPath).mockReturnValueOnce('/allowed');

      // Act
      const result = SecureFileOperations.sanitizeFilePath(inputPath, allowedBases);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(inputPath);
      }
    });

    it('should reject paths outside allowed directories', () => {
      // Arrange
      const inputPath = '/forbidden/path/file.enc';
      const allowedBases = ['/allowed', '/another/allowed'];
      mockPath.resolve
        .mockReturnValueOnce(inputPath)
        .mockReturnValueOnce('/allowed')
        .mockReturnValueOnce('/another/allowed');

      // Act
      const result = SecureFileOperations.sanitizeFilePath(inputPath, allowedBases);

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('not within allowed directories');
      }
    });

    it('should handle path resolution errors', () => {
      // Arrange
      mockPath.resolve.mockImplementation(() => {
        throw new Error('Path resolution failed');
      });

      // Act
      const result = SecureFileOperations.sanitizeFilePath('/some/path');

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('Path sanitization failed');
      }
    });
  });

  describe('ensureDirectoryExists()', () => {
    it('should create directory with correct permissions', () => {
      // Arrange
      mockFs.existsSync.mockReturnValue(false);

      // Act
      const result = SecureFileOperations.ensureDirectoryExists(mockDirPath, 0o755);

      // Assert
      expect(result.success).toBe(true);
      expect(mockFs.mkdirSync).toHaveBeenCalledWith(mockDirPath, {
        recursive: true,
        mode: 0o755,
      });
    });

    it('should handle existing directories gracefully', () => {
      // Arrange
      mockFs.existsSync.mockReturnValue(true);
      mockFs.statSync.mockReturnValue({
        isDirectory: () => true,
      } as any);

      // Act
      const result = SecureFileOperations.ensureDirectoryExists(mockDirPath);

      // Assert
      expect(result.success).toBe(true);
      expect(mockFs.mkdirSync).not.toHaveBeenCalled();
    });

    it('should reject existing files that are not directories', () => {
      // Arrange
      mockFs.existsSync.mockReturnValue(true);
      mockFs.statSync.mockReturnValue({
        isDirectory: () => false,
      } as any);

      // Act
      const result = SecureFileOperations.ensureDirectoryExists(mockDirPath);

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('not a directory');
      }
    });

    it('should handle directory creation errors', () => {
      // Arrange
      mockFs.existsSync.mockReturnValue(false);
      mockFs.mkdirSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      // Act
      const result = SecureFileOperations.ensureDirectoryExists(mockDirPath);

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('Directory creation failed');
      }
    });
  });

  describe('Cross-platform permission handling', () => {
    it('should handle Windows permission limitations', () => {
      // Arrange
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'win32' });

      // Mock chmod to fail (common on Windows)
      mockFs.chmodSync.mockImplementation(() => {
        throw new Error('Operation not supported');
      });

      // Act - Should not throw error on Windows
      const result = SecureFileOperations.writeFileAtomically(mockFilePath, mockData);

      // Assert
      expect(result.success).toBe(true); // Should succeed despite chmod failure on Windows

      // Restore original platform
      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });

    it('should enforce strict permissions on Unix systems', () => {
      // Arrange
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'linux' });

      mockFs.statSync.mockReturnValue({
        mode: 0o100644, // Wrong permissions set
      } as any);

      // Act
      const result = SecureFileOperations.writeFileAtomically(mockFilePath, mockData);

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('correct file permissions');
      }

      // Restore original platform
      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });
  });

  describe('Error handling and cleanup', () => {
    it('should ignore cleanup errors when temp file removal fails', () => {
      // Arrange
      const writeError = new Error('Write failed');
      const expectedTempPath = `${mockFilePath}.tmp.${mockTempSuffix}`;

      mockFs.writeFileSync.mockImplementation(() => {
        throw writeError;
      });
      mockFs.existsSync.mockImplementation((path: fs.PathLike) => {
        return path === expectedTempPath;
      });
      mockFs.unlinkSync.mockImplementation(() => {
        throw new Error('Cleanup failed'); // This should be ignored
      });

      // Act
      const result = SecureFileOperations.writeFileAtomically(mockFilePath, mockData);

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('Write failed'); // Original error preserved
      }
    });

    it('should generate unique temp file names', () => {
      // Arrange
      const suffix1 = 'abcd1234';
      const suffix2 = 'efgh5678';
      mockRandomBytes
        .mockReturnValueOnce(Buffer.from(suffix1, 'hex') as any)
        .mockReturnValueOnce(Buffer.from(suffix2, 'hex') as any);

      // Act
      SecureFileOperations.writeFileAtomically('/path/file1.enc', mockData);
      SecureFileOperations.writeFileAtomically('/path/file2.enc', mockData);

      // Assert
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        `/path/file1.enc.tmp.${suffix1}`,
        expect.anything(),
        expect.anything(),
      );
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        `/path/file2.enc.tmp.${suffix2}`,
        expect.anything(),
        expect.anything(),
      );
    });
  });
});
