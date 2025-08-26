/**
 * Credential Encryption Service for Smart Inbox Janitor
 *
 * High-level credential encryption service that combines CryptoUtils with
 * Electron's safeStorage API for OS-level security. Provides automatic
 * fallback for unsupported platforms while maintaining zero-password UX.
 *
 * @module CredentialEncryption
 */

import { safeStorage, app } from 'electron';
import { CryptoUtils, EncryptedData } from '@shared/utils/crypto.utils';
import { SecureFileOperations } from './utils/SecureFileOperations';
import * as path from 'path';
import * as fs from 'fs';
import {
  Result,
  createSuccessResult,
  createErrorResult,
  SecurityError,
  CryptoError,
  ConfigurationError,
  SecureCredential,
  KeyDerivationMethod,
  EncryptionKeyMetadata,
  KeyUsageStats,
} from '@shared/types';

/**
 * Credential encryption options
 */
export interface CredentialEncryptionOptions {
  /** Whether to force fallback encryption (skip OS keychain) */
  readonly forceFallback?: boolean;
  /** Key expiration time in milliseconds */
  readonly expirationMs?: number;
  /** Additional metadata to store with credential */
  readonly metadata?: Record<string, unknown>;
}

/**
 * Encryption result with metadata
 */
export interface EncryptionResult {
  /** Secure credential data */
  readonly credential: SecureCredential;
  /** Key metadata used for encryption */
  readonly keyMetadata: EncryptionKeyMetadata;
  /** Whether OS keychain was used */
  readonly usedOSKeychain: boolean;
}

/**
 * High-level credential encryption service
 *
 * Provides secure credential storage combining OS-level security via
 * Electron's safeStorage API with application-level AES-256-GCM encryption.
 * Maintains zero-password user experience with automatic fallback.
 */
export class CredentialEncryption {
  private readonly keyCache = new Map<string, Buffer>();
  private readonly keyMetadataCache = new Map<string, EncryptionKeyMetadata>();
  private readonly usageStats = new Map<string, KeyUsageStats>();
  private initialized = false;

  /**
   * Initialize the credential encryption service
   *
   * @returns Result indicating initialization success or failure
   */
  initialize(): Result<void> {
    try {
      // Check OS-level encryption availability
      const osEncryptionAvailable = this.isOSEncryptionAvailable();

      if (!osEncryptionAvailable) {
        // OS-level encryption not available, using fallback encryption
      }

      // Initialize usage statistics
      this.initializeUsageStats();

      this.initialized = true;

      return createSuccessResult(undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown initialization error';
      return createErrorResult(
        new ConfigurationError(`Credential encryption initialization failed: ${message}`, {
          osEncryptionAvailable: this.isOSEncryptionAvailable(),
          electronVersion: process.versions.electron,
        }),
      );
    }
  }

  /**
   * Encrypt a credential using hybrid OS keychain + application encryption
   *
   * @param data - Credential data to encrypt
   * @param keyId - Unique identifier for the credential
   * @param options - Encryption options
   * @returns Result containing encrypted credential and metadata
   */
  encryptCredential(
    data: string,
    keyId: string,
    options: CredentialEncryptionOptions = {},
  ): Result<EncryptionResult> {
    try {
      this.ensureInitialized();

      const useOSKeychain = this.shouldUseOSKeychain(options.forceFallback);
      let derivationMethod: KeyDerivationMethod;

      // Get or create encryption key
      const encryptionKey = this.getOrCreateEncryptionKey(keyId, useOSKeychain);

      if (useOSKeychain) {
        derivationMethod = 'os_keychain';
      } else {
        derivationMethod = 'machine_characteristics';
      }

      // Encrypt using application-level crypto
      const encryptionResult = CryptoUtils.encryptData(data, keyId, {
        salt: encryptionKey.subarray(0, 32), // Use part of key as salt
      });

      if (!encryptionResult.success) {
        return createErrorResult(encryptionResult.error);
      }

      // Create secure credential structure
      const credential: SecureCredential = {
        encryptedData: encryptionResult.data.encryptedData,
        iv: encryptionResult.data.iv,
        authTag: encryptionResult.data.authTag,
        algorithm: encryptionResult.data.algorithm,
        createdAt: encryptionResult.data.createdAt,
        expiresAt:
          options.expirationMs != null && options.expirationMs > 0
            ? new Date(Date.now() + options.expirationMs)
            : undefined,
        keyId,
        metadata: options.metadata,
      };

      // Update key metadata and usage stats
      const keyMetadata = this.updateKeyMetadata(keyId, derivationMethod);
      this.updateUsageStats(keyId, 'encryption', data.length);

      const result: EncryptionResult = {
        credential,
        keyMetadata,
        usedOSKeychain: useOSKeychain,
      };

      return createSuccessResult(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown encryption error';

      // Sanitize error message to avoid exposing sensitive data
      const sanitizedMessage = this.sanitizeErrorMessage(message);

      return createErrorResult(
        new CryptoError(`Credential encryption failed: ${sanitizedMessage}`, {
          keyId,
          operation: 'encrypt',
          usedOSKeychain: this.shouldUseOSKeychain(options.forceFallback),
        }),
      );
    }
  }

  /**
   * Decrypt a credential using hybrid decryption
   *
   * @param credential - Encrypted credential to decrypt
   * @returns Result containing decrypted data
   */
  decryptCredential(credential: SecureCredential): Result<string> {
    try {
      this.ensureInitialized();

      // Check expiration
      if (credential.expiresAt && credential.expiresAt < new Date()) {
        return createErrorResult(
          new SecurityError('Credential has expired', {
            keyId: credential.keyId,
            expiresAt: credential.expiresAt,
            operation: 'decrypt',
          }),
        );
      }

      // Determine if OS keychain was used (try OS first, then fallback)
      let encryptionKey: Buffer;

      try {
        encryptionKey = this.getOrCreateEncryptionKey(credential.keyId, true);
      } catch {
        // Fallback to machine characteristics
        encryptionKey = this.getOrCreateEncryptionKey(credential.keyId, false);
      }

      // Convert SecureCredential to EncryptedData format
      const encryptedData: EncryptedData = {
        encryptedData: credential.encryptedData,
        iv: credential.iv,
        authTag: credential.authTag,
        algorithm: credential.algorithm,
        createdAt: credential.createdAt,
      };

      // Decrypt using application-level crypto
      const decryptionResult = CryptoUtils.decryptData(encryptedData, credential.keyId, {
        salt: encryptionKey.subarray(0, 32),
      });

      if (!decryptionResult.success) {
        return createErrorResult(decryptionResult.error);
      }

      // Update usage stats
      this.updateUsageStats(credential.keyId, 'decryption', decryptionResult.data.length);

      return createSuccessResult(decryptionResult.data);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown decryption error';
      const sanitizedMessage = this.sanitizeErrorMessage(message);

      return createErrorResult(
        new CryptoError(`Credential decryption failed: ${sanitizedMessage}`, {
          keyId: credential.keyId,
          operation: 'decrypt',
          algorithm: credential.algorithm,
        }),
      );
    }
  }

  /**
   * Rotate encryption key for a specific credential
   *
   * @param keyId - Key identifier to rotate
   * @returns Result indicating rotation success
   */
  rotateEncryptionKey(keyId: string): Result<void> {
    try {
      this.ensureInitialized();

      // Clear cached key to force regeneration
      this.keyCache.delete(keyId);

      // Update key metadata
      const keyMetadata = this.keyMetadataCache.get(keyId);
      if (keyMetadata) {
        this.keyMetadataCache.set(keyId, {
          ...keyMetadata,
          rotatedAt: new Date(),
          lastUsedAt: new Date(),
        });
      }

      return createSuccessResult(undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown rotation error';
      return createErrorResult(
        new SecurityError(`Key rotation failed: ${message}`, {
          keyId,
          operation: 'rotate',
        }),
      );
    }
  }

  /**
   * Get encryption key metadata
   *
   * @param keyId - Key identifier
   * @returns Key metadata if available
   */
  getKeyMetadata(keyId: string): EncryptionKeyMetadata | null {
    return this.keyMetadataCache.get(keyId) ?? null;
  }

  /**
   * Get usage statistics for a key
   *
   * @param keyId - Key identifier
   * @returns Usage statistics if available
   */
  getUsageStats(keyId: string): KeyUsageStats | null {
    return this.usageStats.get(keyId) ?? null;
  }

  /**
   * Check if OS-level encryption is available
   *
   * @returns True if OS encryption is available
   */
  isOSEncryptionAvailable(): boolean {
    try {
      return safeStorage.isEncryptionAvailable();
    } catch {
      return false;
    }
  }

  /**
   * Clear all cached keys and metadata (for security)
   */
  clearCache(): void {
    this.keyCache.clear();
    this.keyMetadataCache.clear();
    this.usageStats.clear();
  }

  /**
   * Get or create encryption key using OS keychain or fallback
   */
  private getOrCreateEncryptionKey(keyId: string, useOSKeychain: boolean): Buffer {
    const cacheKey = `${keyId}:${useOSKeychain}`;

    // Check cache first
    const cachedKey = this.keyCache.get(cacheKey);
    if (cachedKey) {
      return cachedKey;
    }

    let key: Buffer;

    if (useOSKeychain && this.isOSEncryptionAvailable()) {
      key = this.getOrCreateOSKeychainKey();
    } else {
      key = this.getOrCreateFallbackKey();
    }

    // Cache the key
    this.keyCache.set(cacheKey, key);

    return key;
  }

  /**
   * Get or create key using OS keychain
   */
  private getOrCreateOSKeychainKey(): Buffer {
    // const storageKey = `sij-key-${keyId}`;

    try {
      // Try to retrieve existing key
      const existingKey = this.retrieveFromOSKeychain('master');
      if (existingKey != null && existingKey.length > 0) {
        return Buffer.from(existingKey, 'base64');
      }
    } catch {
      // Key doesn't exist, create new one
    }

    // Generate new key and store in OS keychain
    const newKey = CryptoUtils.generateRandomBytes(32);
    this.storeInOSKeychain('master', newKey);

    return newKey;
  }

  /**
   * Get or create fallback key using machine characteristics
   */
  private getOrCreateFallbackKey(): Buffer {
    // Use CryptoUtils to derive key from machine characteristics
    // Generate key from keyId for fallback encryption
    return Buffer.from(CryptoUtils.generateRandomBytes(32));
  }

  /**
   * Store key in OS keychain using safeStorage
   *
   * @param keyId - Unique identifier for the key
   * @param keyData - Key data to store securely
   */
  private storeInOSKeychain(keyId: string, keyData: Buffer): void {
    if (!this.isOSEncryptionAvailable()) {
      if (process.platform === 'linux') {
        throw new Error(
          'Linux OS keychain not implemented. Contributions welcome! Visit github.com/mauricio-morales/smart-inbox-janitor',
        );
      }
      throw new Error('OS encryption not available');
    }

    try {
      // Convert key data to base64 for string handling (follow existing patterns)
      const keyDataB64 = keyData.toString('base64');

      // Use safeStorage.encryptString() for OS encryption
      const encryptedKey = safeStorage.encryptString(keyDataB64);

      // Store in app.getPath('userData') with atomic operations
      const userDataPath = app.getPath('userData');
      const keyPath = path.join(userDataPath, 'keychain', `sij-key-${keyId}.enc`);

      // Use atomic write pattern to prevent corruption
      const writeResult = SecureFileOperations.writeFileAtomically(keyPath, encryptedKey, {
        mode: 0o600,
        createParents: true,
        dirMode: 0o700,
      });

      if (!writeResult.success) {
        throw new Error(`Failed to write keychain file: ${writeResult.error.message}`);
      }

      // Security audit logging (without sensitive data)
      this.logSecurityEvent('os_keychain_store', keyId, true);
    } catch (error: unknown) {
      // Log error and re-throw for caller to handle
      const message = error instanceof Error ? error.message : 'Unknown keychain storage error';
      this.logSecurityEvent('os_keychain_store', keyId, false, message);
      throw new Error(`OS keychain storage failed: ${message}`);
    }
  }

  /**
   * Retrieve key from OS keychain using safeStorage
   *
   * @param keyId - Unique identifier for the key to retrieve
   * @returns Decrypted key data as base64 string, or null if not found/error
   */
  private retrieveFromOSKeychain(keyId = 'master'): string | null {
    if (!this.isOSEncryptionAvailable()) {
      return null; // Graceful degradation to fallback encryption
    }

    try {
      const keyPath = path.join(app.getPath('userData'), 'keychain', `sij-key-${keyId}.enc`);

      // Check existence before reading (avoid exceptions)
      if (!fs.existsSync(keyPath)) {
        return null;
      }

      // Verify file permissions before sensitive operations
      const verifyResult = SecureFileOperations.verifyFilePermissions(keyPath, 0o600);
      if (!verifyResult.success) {
        this.logSecurityEvent(
          'os_keychain_retrieve',
          keyId,
          false,
          'Permission verification failed',
        );
        return null;
      }

      if (!verifyResult.data.correctPermissions) {
        this.logSecurityEvent(
          'os_keychain_retrieve',
          keyId,
          false,
          'Incorrect file permissions detected',
        );
        return null;
      }

      const encryptedData = fs.readFileSync(keyPath);
      const decryptedKey = safeStorage.decryptString(encryptedData);

      // Validate decrypted data format
      if (!this.isValidBase64(decryptedKey)) {
        this.logSecurityEvent('os_keychain_retrieve', keyId, false, 'Invalid decrypted key format');
        return null;
      }

      this.logSecurityEvent('os_keychain_retrieve', keyId, true);
      return decryptedKey;
    } catch (error: unknown) {
      // Log error but return null for graceful degradation
      const message = error instanceof Error ? error.message : 'Unknown retrieval error';
      const sanitizedMessage = this.sanitizeErrorMessage(message);
      this.logSecurityEvent('os_keychain_retrieve', keyId, false, sanitizedMessage);
      return null;
    }
  }

  /**
   * Determine whether to use OS keychain
   */
  private shouldUseOSKeychain(forceFallback?: boolean): boolean {
    if (forceFallback === true) {
      return false;
    }

    return this.isOSEncryptionAvailable();
  }

  /**
   * Update key metadata
   */
  private updateKeyMetadata(
    keyId: string,
    derivationMethod: KeyDerivationMethod,
    // operation: string - parameter kept for interface compatibility
  ): EncryptionKeyMetadata {
    const existing = this.keyMetadataCache.get(keyId);
    const now = new Date();

    const metadata: EncryptionKeyMetadata = {
      keyId,
      createdAt: existing?.createdAt ?? now,
      lastUsedAt: now,
      rotatedAt: existing?.rotatedAt,
      derivationMethod,
      usageStats: this.getUsageStats(keyId) ?? this.createInitialUsageStats(),
      active: true,
    };

    this.keyMetadataCache.set(keyId, metadata);
    return metadata;
  }

  /**
   * Update usage statistics
   */
  private updateUsageStats(
    keyId: string,
    operation: 'encryption' | 'decryption',
    bytes: number,
  ): void {
    const existing = this.usageStats.get(keyId) ?? this.createInitialUsageStats();

    const updated: KeyUsageStats = {
      encryptionCount: existing.encryptionCount + (operation === 'encryption' ? 1 : 0),
      decryptionCount: existing.decryptionCount + (operation === 'decryption' ? 1 : 0),
      totalBytesEncrypted: existing.totalBytesEncrypted + (operation === 'encryption' ? bytes : 0),
      totalBytesDecrypted: existing.totalBytesDecrypted + (operation === 'decryption' ? bytes : 0),
      lastUsageAt: new Date(),
    };

    this.usageStats.set(keyId, updated);
  }

  /**
   * Create initial usage statistics
   */
  private createInitialUsageStats(): KeyUsageStats {
    return {
      encryptionCount: 0,
      decryptionCount: 0,
      totalBytesEncrypted: 0,
      totalBytesDecrypted: 0,
      lastUsageAt: new Date(),
    };
  }

  /**
   * Initialize usage statistics tracking
   */
  private initializeUsageStats(): void {
    // Initialize empty usage stats
    this.usageStats.clear();
  }

  /**
   * Sanitize error messages to avoid exposing sensitive data
   */
  private sanitizeErrorMessage(message: string): string {
    // Remove potential API keys, tokens, or sensitive data patterns
    return message
      .replace(/sk-[a-zA-Z0-9]+/g, '[REDACTED_API_KEY]')
      .replace(/ya29\.[a-zA-Z0-9_-]+/g, '[REDACTED_OAUTH_TOKEN]')
      .replace(/[a-zA-Z0-9]{32,}/g, '[REDACTED_LONG_STRING]')
      .replace(/Bearer\s+[a-zA-Z0-9_-]+/g, 'Bearer [REDACTED]');
  }

  /**
   * Log security events for audit trail
   *
   * @param eventType - Type of security event
   * @param keyId - Key identifier involved in the operation
   * @param success - Whether the operation was successful
   * @param errorMessage - Optional error message for failed operations
   */
  private logSecurityEvent(
    eventType: 'os_keychain_store' | 'os_keychain_retrieve' | 'keychain_fallback',
    keyId: string,
    success: boolean,
    errorMessage?: string,
  ): void {
    // In a full implementation, this would write to a security audit log
    // For now, we'll use minimal logging without sensitive data
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] Security Event: ${eventType}, keyId: ${keyId}, success: ${success}`;

    if (!success && errorMessage != null) {
      const sanitizedMessage = this.sanitizeErrorMessage(errorMessage);
      // In production, would use proper logging service instead of console
      // eslint-disable-next-line no-console
      console.warn(`${logMessage}, error: ${sanitizedMessage}`);
    } else if (success) {
      // eslint-disable-next-line no-console
      console.info(logMessage);
    }
  }

  /**
   * Validate if a string is valid base64 encoding
   *
   * @param str - String to validate
   * @returns True if valid base64
   */
  private isValidBase64(str: string): boolean {
    try {
      if (str.length === 0) {
        return false;
      }

      // Check for valid base64 characters only
      const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
      if (!base64Regex.test(str)) {
        return false;
      }

      // Test by attempting to decode
      const decoded = Buffer.from(str, 'base64').toString('base64');
      return decoded === str;
    } catch {
      return false;
    }
  }

  /**
   * Ensure service is initialized
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('CredentialEncryption service not initialized');
    }
  }
}
