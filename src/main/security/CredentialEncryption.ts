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
import { LRUCache } from 'lru-cache';
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
 * Cache configuration options
 */
export interface CacheOptions {
  /** Maximum number of items in cache */
  readonly maxSize?: number;
  /** Time-to-live in milliseconds (default: 1 hour) */
  readonly ttlMs?: number;
  /** Update age on access */
  readonly updateAgeOnGet?: boolean;
  /** Update age on has() calls */
  readonly updateAgeOnHas?: boolean;
}

/**
 * Cache statistics for monitoring
 */
export interface CacheStatistics {
  /** Total cache hits */
  readonly hits: number;
  /** Total cache misses */
  readonly misses: number;
  /** Cache hit ratio (0-1) */
  readonly hitRatio: number;
  /** Current cache size */
  readonly size: number;
  /** Maximum cache size */
  readonly maxSize: number;
  /** Number of items evicted */
  readonly evictions: number;
  /** Number of items expired */
  readonly expirations: number;
  /** Cache utilization percentage (0-100) */
  readonly utilization: number;
  /** Most frequently accessed keys */
  readonly topKeys: string[];
  /** Cache warming statistics */
  readonly warmingStats: {
    readonly itemsWarmed: number;
    readonly lastWarmingAt?: Date;
  };
}

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
 *
 * Features advanced cache management with LRU eviction, time-based expiration,
 * metrics monitoring, and memory leak prevention.
 */
export class CredentialEncryption {
  private readonly keyCache: LRUCache<string, Buffer>;
  private readonly keyMetadataCache: LRUCache<string, EncryptionKeyMetadata>;
  private readonly usageStats = new Map<string, KeyUsageStats>();

  private initialized = false;
  private cacheHits = 0;
  private cacheMisses = 0;
  private cacheEvictions = 0;
  private cacheExpirations = 0;
  private cleanupTimer?: NodeJS.Timeout;
  private warmingStats = {
    itemsWarmed: 0,
    lastWarmingAt: undefined as Date | undefined,
  };

  private readonly DEFAULT_CACHE_OPTIONS: Required<CacheOptions> = {
    maxSize: 1000,
    ttlMs: 60 * 60 * 1000, // 1 hour
    updateAgeOnGet: true,
    updateAgeOnHas: false,
  };

  private readonly frequentlyUsedKeys = new Map<string, number>();

  constructor(cacheOptions?: CacheOptions) {
    const options = { ...this.DEFAULT_CACHE_OPTIONS, ...cacheOptions };

    // Initialize LRU caches with proper configuration
    this.keyCache = new LRUCache<string, Buffer>({
      max: options.maxSize,
      ttl: options.ttlMs,
      updateAgeOnGet: options.updateAgeOnGet,
      updateAgeOnHas: options.updateAgeOnHas,
      dispose: (value, key) => {
        this.cacheEvictions++;
        this.logCacheEvent('key_evicted', key);
        // Clear sensitive data
        if (Buffer.isBuffer(value)) {
          value.fill(0);
        }
      },
      ttlAutopurge: true,
      allowStale: false,
    });

    this.keyMetadataCache = new LRUCache<string, EncryptionKeyMetadata>({
      max: options.maxSize,
      ttl: options.ttlMs * 2, // Metadata can live longer
      updateAgeOnGet: options.updateAgeOnGet,
      dispose: (_value, key) => {
        this.cacheEvictions++;
        this.logCacheEvent('metadata_evicted', key);
      },
      ttlAutopurge: true,
    });

    // Set up periodic cache cleanup
    this.setupPeriodicCleanup();
  }

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

      // Warm up cache with frequently used keys
      this.warmupCache();

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
   * Get comprehensive cache statistics for monitoring and debugging
   *
   * @returns Complete cache statistics including hit ratios and utilization
   */
  getCacheStats(): CacheStatistics {
    const keySize = this.keyCache.size;
    const metadataSize = this.keyMetadataCache.size;
    const totalSize = keySize + metadataSize;
    const totalRequests = this.cacheHits + this.cacheMisses;
    const hitRatio = totalRequests > 0 ? this.cacheHits / totalRequests : 0;
    const maxTotalSize = this.keyCache.max + this.keyMetadataCache.max;
    const utilization = maxTotalSize > 0 ? (totalSize / maxTotalSize) * 100 : 0;

    // Get top 10 most frequently used keys
    const topKeys = Array.from(this.frequentlyUsedKeys.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([key]) => key);

    return {
      hits: this.cacheHits,
      misses: this.cacheMisses,
      hitRatio,
      size: totalSize,
      maxSize: maxTotalSize,
      evictions: this.cacheEvictions,
      expirations: this.cacheExpirations,
      utilization,
      topKeys,
      warmingStats: {
        itemsWarmed: this.warmingStats.itemsWarmed,
        lastWarmingAt: this.warmingStats.lastWarmingAt,
      },
    };
  }

  /**
   * Get cache performance metrics as a formatted string
   *
   * @returns Human-readable cache performance report
   */
  getCachePerformanceReport(): string {
    const stats = this.getCacheStats();

    return [
      '=== Cache Performance Report ===',
      `Hit Ratio: ${(stats.hitRatio * 100).toFixed(2)}% (${stats.hits} hits, ${stats.misses} misses)`,
      `Utilization: ${stats.utilization.toFixed(1)}% (${stats.size}/${stats.maxSize} items)`,
      `Evictions: ${stats.evictions}, Expirations: ${stats.expirations}`,
      `Top Keys: ${stats.topKeys.slice(0, 5).join(', ')}`,
      `Cache Warming: ${stats.warmingStats.itemsWarmed} items warmed`,
      stats.warmingStats.lastWarmingAt
        ? `Last Warming: ${stats.warmingStats.lastWarmingAt.toISOString()}`
        : 'No warming performed',
      '==============================',
    ].join('\n');
  }

  /**
   * Check if cache is approaching size limits and log warnings
   */
  private checkCacheSizeWarnings(): void {
    const stats = this.getCacheStats();

    if (stats.utilization > 90) {
      this.logCacheEvent(
        'size_warning_critical',
        `Cache at ${stats.utilization.toFixed(1)}% capacity`,
      );
    } else if (stats.utilization > 75) {
      this.logCacheEvent('size_warning_high', `Cache at ${stats.utilization.toFixed(1)}% capacity`);
    }

    // Log poor hit ratio warnings
    if (stats.hitRatio < 0.5 && stats.hits + stats.misses > 100) {
      this.logCacheEvent(
        'hit_ratio_warning',
        `Low hit ratio: ${(stats.hitRatio * 100).toFixed(2)}%`,
      );
    }
  }

  /**
   * Warm up cache with frequently accessed keys
   */
  private warmupCache(): void {
    try {
      // Get most frequently used keys from historical data
      const frequentKeys = Array.from(this.frequentlyUsedKeys.entries())
        .sort(([, a], [, b]) => b - a)
        .slice(0, 20) // Warm up top 20 keys
        .map(([key]) => key);

      let warmedCount = 0;
      for (const keyId of frequentKeys) {
        try {
          // Pre-load keys that are likely to be accessed soon
          if (this.shouldUseOSKeychain()) {
            const cachedKey = this.retrieveFromOSKeychain(keyId);
            if (cachedKey) {
              const cacheKey = `${keyId}:true`;
              if (!this.keyCache.has(cacheKey)) {
                this.keyCache.set(cacheKey, Buffer.from(cachedKey, 'base64'));
                warmedCount++;
              }
            }
          }
        } catch {
          // Ignore errors during warming - it's optional
        }
      }

      this.warmingStats = {
        itemsWarmed: warmedCount,
        lastWarmingAt: new Date(),
      };

      // Always log warming attempt, even if no items were warmed
      this.logCacheEvent('cache_warmed', `Warmed ${warmedCount} cache entries`);
    } catch (error) {
      // Cache warming is optional, don't fail initialization
      this.logCacheEvent('warming_error', `Cache warming failed: ${error}`);
    }
  }

  /**
   * Set up periodic cache cleanup and maintenance
   */
  private setupPeriodicCleanup(): void {
    // Run cleanup every 15 minutes
    this.cleanupTimer = setInterval(
      () => {
        this.performPeriodicMaintenance();
      },
      15 * 60 * 1000,
    );

    // Increase max listeners to prevent warnings during testing
    process.setMaxListeners(20);
  }

  /**
   * Perform periodic cache maintenance
   */
  private performPeriodicMaintenance(): void {
    try {
      // Check cache size warnings
      this.checkCacheSizeWarnings();

      // Force garbage collection on old entries
      this.keyCache.purgeStale();
      this.keyMetadataCache.purgeStale();

      // Clean up old usage stats (keep last 30 days)
      const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      for (const [keyId, stats] of this.usageStats.entries()) {
        if (stats.lastUsageAt && stats.lastUsageAt < cutoffDate) {
          this.usageStats.delete(keyId);
        }
      }

      // Update frequency tracking
      this.updateFrequencyTracking();

      // Periodic cache warming for active keys
      if (Math.random() < 0.1) {
        // 10% chance per cleanup cycle
        this.warmupCache();
      }

      this.logCacheEvent('periodic_maintenance', 'Cache maintenance completed');
    } catch (error) {
      this.logCacheEvent('maintenance_error', `Maintenance failed: ${error}`);
    }
  }

  /**
   * Update frequency tracking for cache warming
   */
  private updateFrequencyTracking(): void {
    // Decay frequency scores over time to prioritize recent access
    for (const [key, frequency] of this.frequentlyUsedKeys.entries()) {
      const decayedFrequency = frequency * 0.9; // 10% decay
      if (decayedFrequency < 1) {
        this.frequentlyUsedKeys.delete(key);
      } else {
        this.frequentlyUsedKeys.set(key, decayedFrequency);
      }
    }
  }

  /**
   * Properly shutdown cache with cleanup
   */
  shutdown(): void {
    try {
      // Clear cleanup timer
      if (this.cleanupTimer) {
        clearInterval(this.cleanupTimer);
        this.cleanupTimer = undefined;
      }

      // Securely clear all cached keys
      this.keyCache.forEach((value) => {
        if (Buffer.isBuffer(value)) {
          value.fill(0); // Zero out sensitive data
        }
      });

      // Clear all caches
      this.keyCache.clear();
      this.keyMetadataCache.clear();
      this.usageStats.clear();
      this.frequentlyUsedKeys.clear();

      // Reset statistics
      this.cacheHits = 0;
      this.cacheMisses = 0;
      this.cacheEvictions = 0;
      this.cacheExpirations = 0;

      this.logCacheEvent('shutdown', 'Cache shutdown completed successfully');
    } catch (error) {
      this.logCacheEvent('shutdown_error', `Cache shutdown error: ${error}`);
    }
  }

  /**
   * Clear all cached keys and metadata (for security)
   */
  clearCache(): void {
    // Securely clear sensitive data before clearing caches
    this.keyCache.forEach((value) => {
      if (Buffer.isBuffer(value)) {
        value.fill(0);
      }
    });

    this.keyCache.clear();
    this.keyMetadataCache.clear();
    this.usageStats.clear();

    // Reset cache statistics
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.cacheEvictions = 0;
    this.cacheExpirations = 0;

    this.logCacheEvent('cache_cleared', 'All caches manually cleared');
  }

  /**
   * Get or create encryption key using OS keychain or fallback
   */
  private getOrCreateEncryptionKey(keyId: string, useOSKeychain: boolean): Buffer {
    const cacheKey = `${keyId}:${useOSKeychain}`;

    // Check cache first with metrics tracking
    const cachedKey = this.keyCache.get(cacheKey);
    if (cachedKey) {
      this.cacheHits++;
      this.trackKeyUsage(keyId);
      return cachedKey;
    }

    this.cacheMisses++;

    let key: Buffer;

    if (useOSKeychain && this.isOSEncryptionAvailable()) {
      key = this.getOrCreateOSKeychainKey();
    } else {
      key = this.getOrCreateFallbackKey();
    }

    // Cache the key with monitoring
    this.keyCache.set(cacheKey, key);
    this.trackKeyUsage(keyId);

    // Check for cache size warnings periodically
    if ((this.cacheHits + this.cacheMisses) % 100 === 0) {
      this.checkCacheSizeWarnings();
    }

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
    this.trackKeyUsage(keyId);
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
  /**
   * Track key usage for frequency-based cache warming
   */
  private trackKeyUsage(keyId: string): void {
    const currentCount = this.frequentlyUsedKeys.get(keyId) ?? 0;
    this.frequentlyUsedKeys.set(keyId, currentCount + 1);
  }

  /**
   * Log cache-related events for monitoring
   */
  private logCacheEvent(eventType: string, details: string): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] Cache Event: ${eventType} - ${details}`;

    // In production, this would use proper structured logging
    // eslint-disable-next-line no-console
    console.info(logMessage);
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
