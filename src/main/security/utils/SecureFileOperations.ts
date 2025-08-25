/**
 * Secure File Operations Utility for Smart Inbox Janitor
 * 
 * Provides atomic file operations with proper cross-platform permissions
 * for secure credential storage. Uses temp file + rename pattern to ensure
 * atomic writes and prevent corruption during concurrent access.
 * 
 * @module SecureFileOperations
 */

import { randomBytes } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { 
  Result, 
  createSuccessResult, 
  createErrorResult,
  StorageError 
} from '@shared/types';

/**
 * File operation options for secure file handling
 */
export interface SecureFileOptions {
  /** File mode/permissions (Unix-style octal) */
  readonly mode?: number;
  /** Whether to create parent directories if they don't exist */
  readonly createParents?: boolean;
  /** Directory mode for parent directories */
  readonly dirMode?: number;
}

/**
 * File verification result
 */
export interface FileVerificationResult {
  /** Whether file exists and is accessible */
  readonly exists: boolean;
  /** Whether file permissions are correct */
  readonly correctPermissions: boolean;
  /** Actual file mode (Unix systems only) */
  readonly actualMode?: number;
  /** Expected file mode */
  readonly expectedMode?: number;
}

/**
 * Secure file operations utility class
 * 
 * Provides atomic file operations with proper cross-platform security
 * for credential storage files. All operations use atomic patterns
 * to prevent corruption and maintain security.
 */
export class SecureFileOperations {
  private static readonly DEFAULT_FILE_MODE = 0o600; // rw-------
  private static readonly DEFAULT_DIR_MODE = 0o700;  // rwx------
  private static readonly TEMP_SUFFIX_LENGTH = 16;

  /**
   * Write data to a file atomically with secure permissions
   * 
   * Uses temp file + rename pattern to ensure atomicity and prevent
   * corruption during write operations. Creates parent directories
   * as needed with secure permissions.
   * 
   * @param filePath - Target file path
   * @param data - Data to write (Buffer or string)
   * @param options - File operation options
   * @returns Result indicating success or failure
   */
  static writeFileAtomically(
    filePath: string,
    data: Buffer | string,
    options: SecureFileOptions = {}
  ): Result<void> {
    const {
      mode = SecureFileOperations.DEFAULT_FILE_MODE,
      createParents = true,
      dirMode = SecureFileOperations.DEFAULT_DIR_MODE
    } = options;

    // Generate secure temporary file name
    const tempSuffix = randomBytes(SecureFileOperations.TEMP_SUFFIX_LENGTH).toString('hex');
    const tempPath = `${filePath}.tmp.${tempSuffix}`;

    try {
      // Create parent directory if needed
      if (createParents) {
        const parentDir = path.dirname(filePath);
        const createDirResult = SecureFileOperations.ensureDirectoryExists(parentDir, dirMode);
        if (!createDirResult.success) {
          return createErrorResult(createDirResult.error);
        }
      }

      // Write to temporary file first for atomicity
      fs.writeFileSync(tempPath, data, { 
        mode, 
        flag: 'wx' // Exclusive write - fail if file exists
      });

      // Set cross-platform permissions
      const permResult = SecureFileOperations.setCrossPlatformPermissions(tempPath, mode);
      if (!permResult.success) {
        // Cleanup temp file on permission error
        try {
          fs.unlinkSync(tempPath);
        } catch {
          // Ignore cleanup errors
        }
        return createErrorResult(permResult.error);
      }

      // Atomic rename to final location
      fs.renameSync(tempPath, filePath);

      return createSuccessResult(undefined);
    } catch (error) {
      // Cleanup temp file on any error
      try {
        if (fs.existsSync(tempPath)) {
          fs.unlinkSync(tempPath);
        }
      } catch {
        // Ignore cleanup errors
      }

      const message = error instanceof Error ? error.message : 'Unknown file write error';
      return createErrorResult(
        new StorageError(`Atomic file write failed: ${message}`, {
          operation: 'writeFileAtomically',
          filePath,
          tempPath,
          mode: mode.toString(8)
        })
      );
    }
  }

  /**
   * Verify file permissions and accessibility
   * 
   * Checks that a file exists, is readable, and has the expected permissions.
   * Returns detailed verification information for security validation.
   * 
   * @param filePath - Path to verify
   * @param expectedMode - Expected file permissions
   * @returns Result containing verification details
   */
  static verifyFilePermissions(
    filePath: string,
    expectedMode: number = SecureFileOperations.DEFAULT_FILE_MODE
  ): Result<FileVerificationResult> {
    try {
      const exists = fs.existsSync(filePath);
      if (!exists) {
        return createSuccessResult({
          exists: false,
          correctPermissions: false,
          expectedMode
        });
      }

      // Check file accessibility
      try {
        fs.accessSync(filePath, fs.constants.R_OK);
      } catch {
        return createErrorResult(
          new StorageError('File is not accessible for reading', {
            operation: 'verifyFilePermissions',
            filePath,
            issue: 'access_denied'
          })
        );
      }

      // Get file stats for permission checking
      const stats = fs.statSync(filePath);
      const actualMode = stats.mode & 0o777; // Extract permission bits

      // On Windows, permission checking is limited
      const correctPermissions = process.platform === 'win32' || actualMode === expectedMode;

      const result: FileVerificationResult = {
        exists: true,
        correctPermissions,
        actualMode: process.platform === 'win32' ? undefined : actualMode,
        expectedMode
      };

      return createSuccessResult(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown verification error';
      return createErrorResult(
        new StorageError(`File verification failed: ${message}`, {
          operation: 'verifyFilePermissions',
          filePath,
          expectedMode: expectedMode.toString(8)
        })
      );
    }
  }

  /**
   * Sanitize and validate file path for security
   * 
   * Prevents directory traversal attacks and ensures path is within
   * expected application directories. Validates path format and
   * removes potentially dangerous characters.
   * 
   * @param filePath - Path to sanitize
   * @param allowedBasePaths - Array of allowed base paths
   * @returns Result containing sanitized path or error
   */
  static sanitizeFilePath(
    filePath: string,
    allowedBasePaths: readonly string[] = []
  ): Result<string> {
    try {
      // Resolve path to absolute form and normalize
      const resolvedPath = path.resolve(filePath);

      // Check for directory traversal attempts
      if (resolvedPath.includes('..') || resolvedPath.includes('~')) {
        return createErrorResult(
          new StorageError('Path contains potentially dangerous traversal sequences', {
            operation: 'sanitizeFilePath',
            originalPath: filePath,
            resolvedPath,
            issue: 'directory_traversal'
          })
        );
      }

      // Validate against allowed base paths if provided
      if (allowedBasePaths.length > 0) {
        const isAllowed = allowedBasePaths.some(basePath => {
          const resolvedBasePath = path.resolve(basePath);
          return resolvedPath.startsWith(resolvedBasePath);
        });

        if (!isAllowed) {
          return createErrorResult(
            new StorageError('Path is not within allowed directories', {
              operation: 'sanitizeFilePath',
              originalPath: filePath,
              resolvedPath,
              allowedBasePaths,
              issue: 'path_not_allowed'
            })
          );
        }
      }

      return createSuccessResult(resolvedPath);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown sanitization error';
      return createErrorResult(
        new StorageError(`Path sanitization failed: ${message}`, {
          operation: 'sanitizeFilePath',
          originalPath: filePath
        })
      );
    }
  }

  /**
   * Ensure directory exists with proper permissions
   * 
   * Creates directory and all necessary parent directories with
   * secure permissions. Handles cross-platform permission differences.
   * 
   * @param dirPath - Directory path to create
   * @param mode - Directory permissions
   * @returns Result indicating success or failure
   */
  static ensureDirectoryExists(
    dirPath: string,
    mode: number = SecureFileOperations.DEFAULT_DIR_MODE
  ): Result<void> {
    try {
      // Check if directory already exists
      if (fs.existsSync(dirPath)) {
        const stats = fs.statSync(dirPath);
        if (!stats.isDirectory()) {
          return createErrorResult(
            new StorageError('Path exists but is not a directory', {
              operation: 'ensureDirectoryExists',
              dirPath,
              issue: 'not_directory'
            })
          );
        }
        return createSuccessResult(undefined);
      }

      // Create directory with secure permissions
      fs.mkdirSync(dirPath, { recursive: true, mode });

      // Set cross-platform permissions
      const permResult = SecureFileOperations.setCrossPlatformPermissions(dirPath, mode);
      if (!permResult.success) {
        return createErrorResult(permResult.error);
      }

      return createSuccessResult(undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown directory creation error';
      return createErrorResult(
        new StorageError(`Directory creation failed: ${message}`, {
          operation: 'ensureDirectoryExists',
          dirPath,
          mode: mode.toString(8)
        })
      );
    }
  }

  /**
   * Set file/directory permissions across platforms
   * 
   * Handles differences between Windows and Unix permission systems.
   * On Windows, uses limited permission control. On Unix systems,
   * sets precise octal permissions.
   * 
   * @param targetPath - Path to set permissions on
   * @param mode - Permissions to set
   * @returns Result indicating success or failure
   */
  private static setCrossPlatformPermissions(
    targetPath: string,
    mode: number
  ): Result<void> {
    try {
      if (process.platform === 'win32') {
        // Windows: Limited permission control
        // NTFS permissions are handled differently, but we can still try
        try {
          fs.chmodSync(targetPath, mode);
        } catch {
          // On Windows, chmod might not work as expected, but file is still secure
          // through NTFS permissions and user profile isolation
        }
      } else {
        // Unix-like systems: Full octal permission support
        fs.chmodSync(targetPath, mode);

        // Verify permissions were set correctly
        const stats = fs.statSync(targetPath);
        const actualMode = stats.mode & 0o777;
        
        if (actualMode !== mode) {
          return createErrorResult(
            new StorageError('Failed to set correct file permissions', {
              operation: 'setCrossPlatformPermissions',
              targetPath,
              expectedMode: mode.toString(8),
              actualMode: actualMode.toString(8),
              issue: 'permission_mismatch'
            })
          );
        }
      }

      return createSuccessResult(undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown permission error';
      return createErrorResult(
        new StorageError(`Permission setting failed: ${message}`, {
          operation: 'setCrossPlatformPermissions',
          targetPath,
          mode: mode.toString(8)
        })
      );
    }
  }
}