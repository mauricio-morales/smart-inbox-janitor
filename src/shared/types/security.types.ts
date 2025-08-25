/**
 * Security-specific type definitions for Smart Inbox Janitor
 * 
 * This module defines types for secure credential storage, security audit events,
 * and other security-related data structures used throughout the application.
 * 
 * @module SecurityTypes
 */

/**
 * Secure credential structure with all necessary encryption metadata
 */
export interface SecureCredential {
  /** Base64-encoded encrypted credential data */
  readonly encryptedData: string;
  /** Base64-encoded initialization vector */
  readonly iv: string;
  /** Base64-encoded authentication tag for tamper detection */
  readonly authTag: string;
  /** Encryption algorithm used */
  readonly algorithm: string;
  /** When the credential was encrypted */
  readonly createdAt: Date;
  /** Optional expiration timestamp for the credential */
  readonly expiresAt?: Date;
  /** Key identifier used for encryption */
  readonly keyId: string;
  /** Additional metadata */
  readonly metadata?: Record<string, unknown>;
}

/**
 * Security audit event for compliance and monitoring
 */
export interface SecurityAuditEvent {
  /** Unique event identifier */
  readonly id: string;
  /** When the security event occurred */
  readonly timestamp: Date;
  /** Type of security event */
  readonly eventType: SecurityEventType;
  /** Provider or service involved */
  readonly provider: string;
  /** Whether the operation was successful */
  readonly success: boolean;
  /** Session identifier for correlation */
  readonly sessionId?: string;
  /** User identifier (if applicable) */
  readonly userId?: string;
  /** Additional event metadata (no sensitive data) */
  readonly metadata: Record<string, unknown>;
  /** Error code if operation failed */
  readonly errorCode?: string;
  /** Sanitized error message (no sensitive data) */
  readonly errorMessage?: string;
}

/**
 * Types of security events for audit logging
 */
export type SecurityEventType = 
  | 'credential_store'
  | 'credential_retrieve'
  | 'credential_delete'
  | 'token_rotation'
  | 'encryption_key_rotation'
  | 'security_violation'
  | 'authentication_failure'
  | 'tamper_detection'
  | 'os_keychain_access'
  | 'database_encryption_init'
  | 'key_derivation'
  | 'secure_storage_init'
  | 'secure_storage_shutdown';

/**
 * Security configuration for credential storage
 */
export interface SecurityConfig {
  /** Whether to use OS keychain for primary storage */
  readonly useOSKeychain: boolean;
  /** Whether to enable fallback encryption if OS keychain unavailable */
  readonly enableFallback: boolean;
  /** Token rotation interval in milliseconds */
  readonly tokenRotationIntervalMs: number;
  /** Key rotation interval in milliseconds */
  readonly keyRotationIntervalMs: number;
  /** Whether to enable audit logging */
  readonly enableAuditLogging: boolean;
  /** Maximum age for audit logs in days */
  readonly auditLogRetentionDays: number;
  /** Security level configuration */
  readonly securityLevel: SecurityLevel;
}

/**
 * Security levels for different deployment scenarios
 */
export type SecurityLevel = 'standard' | 'high' | 'maximum';

/**
 * Provider-specific credential storage options
 */
export interface CredentialStorageOptions {
  /** Provider name (gmail, openai, etc.) */
  readonly provider: string;
  /** Whether credential should expire */
  readonly shouldExpire: boolean;
  /** Expiration time in milliseconds from now */
  readonly expirationMs?: number;
  /** Additional storage metadata */
  readonly metadata?: Record<string, unknown>;
  /** Key rotation policy */
  readonly rotationPolicy?: RotationPolicy;
}

/**
 * Key and token rotation policies
 */
export interface RotationPolicy {
  /** Whether automatic rotation is enabled */
  readonly enabled: boolean;
  /** Rotation interval in milliseconds */
  readonly intervalMs: number;
  /** Grace period for old keys/tokens in milliseconds */
  readonly gracePeriodMs: number;
  /** Maximum number of versions to keep */
  readonly maxVersions: number;
}

/**
 * Security validation result
 */
export interface SecurityValidationResult {
  /** Whether validation passed */
  readonly valid: boolean;
  /** Validation error message if failed */
  readonly errorMessage?: string;
  /** Validation details */
  readonly details: SecurityValidationDetails;
}

/**
 * Details from security validation
 */
export interface SecurityValidationDetails {
  /** Whether OS encryption is available */
  readonly osEncryptionAvailable: boolean;
  /** Whether database encryption is working */
  readonly databaseEncryptionActive: boolean;
  /** Whether all required keys are present */
  readonly requiredKeysPresent: boolean;
  /** Whether audit logging is functional */
  readonly auditLoggingFunctional: boolean;
  /** Any detected security issues */
  readonly securityIssues: string[];
  /** Security recommendations */
  readonly recommendations: string[];
}

/**
 * Encryption key metadata
 */
export interface EncryptionKeyMetadata {
  /** Unique key identifier */
  readonly keyId: string;
  /** Key creation timestamp */
  readonly createdAt: Date;
  /** Key last used timestamp */
  readonly lastUsedAt?: Date;
  /** Key rotation timestamp */
  readonly rotatedAt?: Date;
  /** Key derivation method used */
  readonly derivationMethod: KeyDerivationMethod;
  /** Key usage statistics */
  readonly usageStats: KeyUsageStats;
  /** Whether key is currently active */
  readonly active: boolean;
}

/**
 * Key derivation methods
 */
export type KeyDerivationMethod = 
  | 'os_keychain'
  | 'machine_characteristics'
  | 'pbkdf2'
  | 'hybrid';

/**
 * Key usage statistics for monitoring
 */
export interface KeyUsageStats {
  /** Number of times key was used for encryption */
  readonly encryptionCount: number;
  /** Number of times key was used for decryption */
  readonly decryptionCount: number;
  /** Total bytes encrypted with this key */
  readonly totalBytesEncrypted: number;
  /** Total bytes decrypted with this key */
  readonly totalBytesDecrypted: number;
  /** Last usage timestamp */
  readonly lastUsageAt?: Date;
}

/**
 * Token refresh request structure
 */
export interface TokenRefreshRequest {
  /** Provider identifier */
  readonly provider: string;
  /** Current refresh token */
  readonly refreshToken: string;
  /** Optional scopes for the refresh */
  readonly scopes?: string[];
  /** Whether to force refresh even if not expired */
  readonly forceRefresh?: boolean;
}

/**
 * Token refresh response structure
 */
export interface TokenRefreshResponse {
  /** New access token */
  readonly accessToken: string;
  /** New refresh token (if provided) */
  readonly refreshToken?: string;
  /** Token expiration timestamp */
  readonly expiresAt: Date;
  /** Token scope */
  readonly scope?: string;
  /** Token type */
  readonly tokenType: string;
}

/**
 * Secure storage status information
 */
export interface SecureStorageStatus {
  /** Whether secure storage is initialized */
  readonly initialized: boolean;
  /** Whether OS keychain is available */
  readonly osKeychainAvailable: boolean;
  /** Whether database encryption is active */
  readonly databaseEncrypted: boolean;
  /** Number of stored credentials */
  readonly credentialCount: number;
  /** Storage health status */
  readonly healthStatus: StorageHealthStatus;
  /** Last security audit timestamp */
  readonly lastAuditAt?: Date;
  /** Security configuration summary */
  readonly securityConfig: SecurityConfigSummary;
}

/**
 * Storage health status
 */
export type StorageHealthStatus = 'healthy' | 'warning' | 'critical' | 'unavailable';

/**
 * Security configuration summary (no sensitive data)
 */
export interface SecurityConfigSummary {
  /** Security level in use */
  readonly securityLevel: SecurityLevel;
  /** Whether audit logging is enabled */
  readonly auditLoggingEnabled: boolean;
  /** Whether token rotation is active */
  readonly tokenRotationActive: boolean;
  /** Whether key rotation is active */
  readonly keyRotationActive: boolean;
  /** Encryption algorithms in use */
  readonly encryptionAlgorithms: string[];
}

/**
 * Recovery information for corrupted storage
 */
export interface RecoveryInfo {
  /** Whether recovery is possible */
  readonly recoverable: boolean;
  /** Recovery procedure steps */
  readonly recoverySteps: string[];
  /** Data that can be recovered */
  readonly recoverableData: string[];
  /** Data that will be lost */
  readonly dataLoss: string[];
  /** Estimated recovery time */
  readonly estimatedRecoveryTimeMs: number;
}

/**
 * Credential backup structure for recovery scenarios
 */
export interface CredentialBackup {
  /** Backup creation timestamp */
  readonly createdAt: Date;
  /** Backup format version */
  readonly formatVersion: string;
  /** Encrypted backup data */
  readonly encryptedBackupData: string;
  /** Backup integrity hash */
  readonly integrityHash: string;
  /** Recovery instructions */
  readonly recoveryInstructions: string[];
}

export {
  CryptoError,
  SecurityError,
  AuthenticationError,
  ValidationError
} from './errors.types.js';