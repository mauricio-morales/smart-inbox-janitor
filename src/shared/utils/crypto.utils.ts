/**
 * Cryptographic utilities for Smart Inbox Janitor
 * 
 * Provides AES-256-GCM encryption/decryption with proper authentication tag handling,
 * secure random IV generation, and automatic key derivation without user passwords.
 * 
 * @module CryptoUtils
 */

import { randomBytes, createCipheriv, createDecipheriv, pbkdf2Sync } from 'crypto';
import { Result, createSuccessResult, createErrorResult } from '@shared/types';
import { CryptoError } from '@shared/types';
import * as os from 'os';

/**
 * Encrypted data structure with all necessary components for AES-GCM
 */
export interface EncryptedData {
  /** Base64-encoded encrypted data */
  readonly encryptedData: string;
  /** Base64-encoded initialization vector */
  readonly iv: string;
  /** Base64-encoded authentication tag */
  readonly authTag: string;
  /** Encryption algorithm identifier */
  readonly algorithm: string;
  /** Creation timestamp */
  readonly createdAt: Date;
}

/**
 * Key derivation options for automatic key generation
 */
export interface KeyDerivationOptions {
  /** Salt for key derivation (optional - will generate if not provided) */
  readonly salt?: Buffer;
  /** Number of PBKDF2 iterations */
  readonly iterations?: number;
  /** Key length in bytes */
  readonly keyLength?: number;
  /** Hash algorithm for PBKDF2 */
  readonly digest?: string;
}

/**
 * Cryptographic utility class providing secure encryption/decryption
 * 
 * Features:
 * - AES-256-GCM encryption with authentication
 * - Automatic IV generation
 * - Secure key derivation without user passwords
 * - Machine-specific key derivation fallback
 * - Tamper detection via authentication tags
 */
export class CryptoUtils {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly KEY_LENGTH = 32; // 256 bits
  private static readonly IV_LENGTH = 16; // 128 bits
  private static readonly TAG_LENGTH = 16; // 128 bits
  private static readonly DEFAULT_ITERATIONS = 100000;
  private static readonly AAD_IDENTIFIER = 'smart-inbox-janitor';

  /**
   * Encrypt data using AES-256-GCM with automatic key derivation
   * 
   * @param data - Plaintext data to encrypt
   * @param keyId - Unique identifier for key derivation
   * @param options - Key derivation options
   * @returns Result containing encrypted data or error
   */
  static async encryptData(
    data: string,
    keyId: string,
    options: KeyDerivationOptions = {}
  ): Promise<Result<EncryptedData>> {
    try {
      // Generate secure random IV
      const iv = randomBytes(CryptoUtils.IV_LENGTH);
      
      // Derive encryption key automatically (no user passwords)
      const key = await CryptoUtils.deriveKey(keyId, options);
      
      // Create cipher with additional authenticated data
      const cipher = createCipheriv(CryptoUtils.ALGORITHM, key, iv);
      cipher.setAAD(Buffer.from(CryptoUtils.AAD_IDENTIFIER));
      
      // Encrypt the data
      let encrypted = cipher.update(data, 'utf8', 'base64');
      encrypted += cipher.final('base64');
      
      // Get authentication tag for tamper detection
      const authTag = cipher.getAuthTag();
      
      const result: EncryptedData = {
        encryptedData: encrypted,
        iv: iv.toString('base64'),
        authTag: authTag.toString('base64'),
        algorithm: CryptoUtils.ALGORITHM,
        createdAt: new Date()
      };
      
      return createSuccessResult(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown encryption error';
      return createErrorResult(
        new CryptoError(`Encryption failed: ${message}`, {
          operation: 'encrypt',
          keyId,
          algorithm: CryptoUtils.ALGORITHM
        })
      );
    }
  }

  /**
   * Decrypt data using AES-256-GCM with authentication verification
   * 
   * @param encryptedData - Encrypted data structure
   * @param keyId - Unique identifier for key derivation
   * @param options - Key derivation options
   * @returns Result containing decrypted plaintext or error
   */
  static async decryptData(
    encryptedData: EncryptedData,
    keyId: string,
    options: KeyDerivationOptions = {}
  ): Promise<Result<string>> {
    try {
      // Validate algorithm compatibility
      if (encryptedData.algorithm !== CryptoUtils.ALGORITHM) {
        return createErrorResult(
          new CryptoError(`Unsupported algorithm: ${encryptedData.algorithm}`, {
            operation: 'decrypt',
            keyId,
            providedAlgorithm: encryptedData.algorithm,
            expectedAlgorithm: CryptoUtils.ALGORITHM
          })
        );
      }
      
      // Derive the same encryption key
      const key = await CryptoUtils.deriveKey(keyId, options);
      
      // Parse components from base64
      const iv = Buffer.from(encryptedData.iv, 'base64');
      const authTag = Buffer.from(encryptedData.authTag, 'base64');
      
      // Create decipher with authentication
      const decipher = createDecipheriv(CryptoUtils.ALGORITHM, key, iv);
      decipher.setAAD(Buffer.from(CryptoUtils.AAD_IDENTIFIER));
      decipher.setAuthTag(authTag);
      
      // Decrypt the data
      let decrypted = decipher.update(encryptedData.encryptedData, 'base64', 'utf8');
      decrypted += decipher.final('utf8');
      
      return createSuccessResult(decrypted);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown decryption error';
      
      // Check for tamper detection
      const isTamperDetected = message.includes('authentication tag') || 
                              message.includes('auth') ||
                              message.includes('tag');
      
      return createErrorResult(
        new CryptoError(
          isTamperDetected ? 'Data tampering detected - authentication failed' : `Decryption failed: ${message}`,
          {
            operation: 'decrypt',
            keyId,
            tamperDetected: isTamperDetected,
            algorithm: encryptedData.algorithm
          }
        )
      );
    }
  }

  /**
   * Derive encryption key from keyId using machine-specific characteristics
   * 
   * Provides automatic key derivation without requiring user passwords.
   * Uses machine-specific information for entropy while maintaining deterministic output.
   * 
   * @param keyId - Unique identifier for this key
   * @param options - Key derivation configuration
   * @returns Derived encryption key
   */
  private static async deriveKey(
    keyId: string,
    options: KeyDerivationOptions = {}
  ): Promise<Buffer> {
    const {
      salt = CryptoUtils.generateDeterministicSalt(keyId),
      iterations = CryptoUtils.DEFAULT_ITERATIONS,
      keyLength = CryptoUtils.KEY_LENGTH,
      digest = 'sha256'
    } = options;

    // Create machine-specific entropy source (no user passwords required)
    const machineInfo = CryptoUtils.getMachineCharacteristics();
    const keyMaterial = `${keyId}:${machineInfo}`;

    // Derive key using PBKDF2
    return pbkdf2Sync(keyMaterial, salt, iterations, keyLength, digest);
  }

  /**
   * Generate deterministic salt based on keyId and machine characteristics
   * 
   * @param keyId - Unique key identifier
   * @returns Deterministic salt buffer
   */
  private static generateDeterministicSalt(keyId: string): Buffer {
    // Create deterministic but unique salt
    const saltSource = `salt:${keyId}:${os.hostname()}:${process.platform}`;
    return pbkdf2Sync(saltSource, 'smart-inbox-janitor-salt', 10000, 32, 'sha256');
  }

  /**
   * Get machine-specific characteristics for key derivation
   * 
   * Combines hostname, username, and platform information to create
   * machine-specific entropy without requiring user input.
   * 
   * @returns Machine characteristics string
   */
  private static getMachineCharacteristics(): string {
    try {
      const userInfo = os.userInfo();
      return [
        os.hostname(),
        userInfo.username,
        process.platform,
        process.arch,
        // Add additional machine-specific entropy
        os.type(),
        process.version
      ].join(':');
    } catch (error) {
      // Fallback if user info is not available
      return [
        os.hostname(),
        process.platform,
        process.arch,
        os.type(),
        process.version
      ].join(':');
    }
  }

  /**
   * Generate secure random bytes for cryptographic operations
   * 
   * @param length - Number of bytes to generate
   * @returns Promise resolving to random bytes
   */
  static async generateRandomBytes(length: number): Promise<Buffer> {
    return randomBytes(length);
  }

  /**
   * Generate a secure random string for use as an identifier
   * 
   * @param length - Length of random string (default: 32)
   * @param encoding - Encoding for the string (default: 'base64url')
   * @returns Random string
   */
  static generateRandomString(length = 32, encoding: 'base64url' | 'hex' | 'base64' = 'base64url'): string {
    const bytes = randomBytes(Math.ceil(length * 3 / 4)); // Account for base64 expansion
    const result = bytes.toString(encoding);
    return result.substring(0, length);
  }

  /**
   * Securely compare two strings in constant time
   * 
   * Prevents timing attacks when comparing sensitive data.
   * 
   * @param a - First string
   * @param b - Second string
   * @returns True if strings are equal
   */
  static constantTimeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return result === 0;
  }

  /**
   * Validate encrypted data structure
   * 
   * @param data - Data to validate
   * @returns True if valid encrypted data structure
   */
  static isValidEncryptedData(data: unknown): data is EncryptedData {
    if (!data || typeof data !== 'object') {
      return false;
    }

    const obj = data as Record<string, unknown>;
    
    return Boolean(
      typeof obj.encryptedData === 'string' &&
      typeof obj.iv === 'string' &&
      typeof obj.authTag === 'string' &&
      typeof obj.algorithm === 'string' &&
      obj.createdAt instanceof Date &&
      obj.algorithm === CryptoUtils.ALGORITHM
    );
  }

  /**
   * Get algorithm information and security parameters
   * 
   * @returns Algorithm metadata
   */
  static getAlgorithmInfo() {
    return {
      algorithm: CryptoUtils.ALGORITHM,
      keyLength: CryptoUtils.KEY_LENGTH,
      ivLength: CryptoUtils.IV_LENGTH,
      tagLength: CryptoUtils.TAG_LENGTH,
      defaultIterations: CryptoUtils.DEFAULT_ITERATIONS,
      aadIdentifier: CryptoUtils.AAD_IDENTIFIER
    };
  }
}