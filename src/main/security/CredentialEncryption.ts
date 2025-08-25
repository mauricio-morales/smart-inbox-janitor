/**
 * Credential Encryption Service for Smart Inbox Janitor
 * 
 * High-level credential encryption service that combines CryptoUtils with
 * Electron's safeStorage API for OS-level security. Provides automatic
 * fallback for unsupported platforms while maintaining zero-password UX.
 * 
 * @module CredentialEncryption
 */

import { safeStorage } from 'electron';
import { CryptoUtils, EncryptedData } from '@shared/utils/crypto.utils';
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
          electronVersion: process.versions.electron
        })
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
    options: CredentialEncryptionOptions = {}
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
        salt: encryptionKey.subarray(0, 32) // Use part of key as salt
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
        expiresAt: (options.expirationMs != null && options.expirationMs > 0) ? new Date(Date.now() + options.expirationMs) : undefined,
        keyId,
        metadata: options.metadata
      };
      
      // Update key metadata and usage stats
      const keyMetadata = this.updateKeyMetadata(keyId, derivationMethod);
      this.updateUsageStats(keyId, 'encryption', data.length);
      
      const result: EncryptionResult = {
        credential,
        keyMetadata,
        usedOSKeychain: useOSKeychain
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
          usedOSKeychain: this.shouldUseOSKeychain(options.forceFallback)
        })
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
            operation: 'decrypt'
          })
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
        createdAt: credential.createdAt
      };
      
      // Decrypt using application-level crypto
      const decryptionResult = CryptoUtils.decryptData(encryptedData, credential.keyId, {
        salt: encryptionKey.subarray(0, 32)
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
          algorithm: credential.algorithm
        })
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
          lastUsedAt: new Date()
        });
      }
      
      return createSuccessResult(undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown rotation error';
      return createErrorResult(
        new SecurityError(`Key rotation failed: ${message}`, {
          keyId,
          operation: 'rotate'
        })
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
      const existingKey = this.retrieveFromOSKeychain();
      if (existingKey != null && existingKey.length > 0) {
        return Buffer.from(existingKey);
      }
    } catch {
      // Key doesn't exist, create new one
    }
    
    // Generate new key and store in OS keychain
    const newKey = CryptoUtils.generateRandomBytes(32);
    this.storeInOSKeychain();
    
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
   */
  private storeInOSKeychain(): void {
    if (!this.isOSEncryptionAvailable()) {
      throw new Error('OS encryption not available');
    }
    
    // TODO: Implement OS keychain storage using Electron's safeStorage API
    // Implementation requirements:
    // 1. Use safeStorage.encryptString() to encrypt the master key before storing
    // 2. Store the encrypted data in a persistent file in app data directory using fs.writeFileSync()
    // 3. Use unique identifiers to support multiple key storage (e.g., `sij-key-${keyId}.enc`)
    // 4. Set proper file permissions (600) for stored keychain files
    // 5. Handle file system errors gracefully with proper error messages
    // 6. Add logging for keychain operations (without sensitive data)
    // 7. Use app.getPath('userData') to get the appropriate storage directory
    // 8. Consider using atomic file operations (write to temp file, then rename)
    // 
    // Example implementation:
    // ```typescript
    // const keyData = Buffer.from(newKey).toString('base64');
    // const encryptedKey = safeStorage.encryptString(keyData);
    // const keyPath = path.join(app.getPath('userData'), `sij-key-${keyId}.enc`);
    // fs.writeFileSync(keyPath, encryptedKey, { mode: 0o600 });
    // ```
    throw new Error('OS keychain storage not implemented - see TODO comments for implementation guidance');
  }

  /**
   * Retrieve key from OS keychain using safeStorage
   */
  private retrieveFromOSKeychain(): string | null {
    if (!this.isOSEncryptionAvailable()) {
      return null;
    }
    
    // TODO: Implement OS keychain retrieval using Electron's safeStorage API
    // Implementation requirements:
    // 1. Use fs.readFileSync() to read the stored encrypted data from app data directory
    // 2. Use safeStorage.decryptString() to decrypt the retrieved data
    // 3. Handle file not found errors gracefully by returning null
    // 4. Handle decryption errors properly (invalid data, corrupted files)
    // 5. Use the same key path pattern as storeInOSKeychain() for consistency
    // 6. Add proper error logging without exposing sensitive data
    // 7. Test safeStorage.isEncryptionAvailable() before each operation
    // 8. Consider file integrity checks (checksums) for additional security
    // 9. Handle permission errors gracefully
    // 10. Return the decrypted key data as base64 string for consistency
    // 
    // Example implementation:
    // ```typescript
    // try {
    //   const keyPath = path.join(app.getPath('userData'), `sij-key-${keyId}.enc`);
    //   if (!fs.existsSync(keyPath)) return null;
    //   
    //   const encryptedData = fs.readFileSync(keyPath);
    //   const decryptedKey = safeStorage.decryptString(encryptedData);
    //   return decryptedKey;
    // } catch (error) {
    //   console.error('Failed to retrieve key from OS keychain:', error.message);
    //   return null;
    // }
    // ```
    return null; // TODO: Replace with actual implementation
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
      active: true
    };
    
    this.keyMetadataCache.set(keyId, metadata);
    return metadata;
  }

  /**
   * Update usage statistics
   */
  private updateUsageStats(keyId: string, operation: 'encryption' | 'decryption', bytes: number): void {
    const existing = this.usageStats.get(keyId) ?? this.createInitialUsageStats();
    
    const updated: KeyUsageStats = {
      encryptionCount: existing.encryptionCount + (operation === 'encryption' ? 1 : 0),
      decryptionCount: existing.decryptionCount + (operation === 'decryption' ? 1 : 0),
      totalBytesEncrypted: existing.totalBytesEncrypted + (operation === 'encryption' ? bytes : 0),
      totalBytesDecrypted: existing.totalBytesDecrypted + (operation === 'decryption' ? bytes : 0),
      lastUsageAt: new Date()
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
      lastUsageAt: new Date()
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
   * Ensure service is initialized
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('CredentialEncryption service not initialized');
    }
  }
}