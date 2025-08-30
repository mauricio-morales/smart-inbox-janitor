/**
 * Console Mode Exit Codes
 *
 * Standard exit codes for console-mode provider validation and automated tooling integration.
 * Follows UNIX/Linux conventions with specific codes for provider failure scenarios.
 *
 * @module ExitCodes
 */

/**
 * Standard exit codes for console mode validation
 */
export enum ExitCodes {
  /** Successful execution - all providers validated successfully */
  SUCCESS = 0,

  /** Authentication failure - OAuth tokens invalid/expired */
  AUTHENTICATION_FAILURE = 1,

  /** Network failure - API connectivity issues */
  NETWORK_FAILURE = 2,

  /** Configuration error - Invalid configuration or setup required */
  CONFIGURATION_ERROR = 3,

  /** Setup required - Provider needs initial OAuth setup through UI */
  SETUP_REQUIRED = 4,

  /** Timeout error - Provider validation exceeded time limit */
  TIMEOUT_ERROR = 5,

  /** Permission denied - OS-level permissions or keychain access issues */
  PERMISSION_DENIED = 13,

  /** Unknown error - Unexpected failure during validation */
  UNKNOWN_ERROR = 99,
}

/**
 * Map error types to appropriate exit codes for automation
 */
export const ERROR_TYPE_TO_EXIT_CODE: Record<string, ExitCodes> = {
  // Authentication errors
  AUTHENTICATION_ERROR: ExitCodes.AUTHENTICATION_FAILURE,
  AUTH_EXPIRED: ExitCodes.AUTHENTICATION_FAILURE,
  INVALID_TOKEN: ExitCodes.AUTHENTICATION_FAILURE,
  OAUTH_ERROR: ExitCodes.AUTHENTICATION_FAILURE,

  // Network errors
  NETWORK_ERROR: ExitCodes.NETWORK_FAILURE,
  CONNECTION_FAILED: ExitCodes.NETWORK_FAILURE,
  API_ERROR: ExitCodes.NETWORK_FAILURE,
  RATE_LIMIT: ExitCodes.NETWORK_FAILURE,

  // Configuration errors
  CONFIGURATION_ERROR: ExitCodes.CONFIGURATION_ERROR,
  VALIDATION_ERROR: ExitCodes.CONFIGURATION_ERROR,
  MISSING_CONFIG: ExitCodes.CONFIGURATION_ERROR,
  INVALID_CONFIG: ExitCodes.CONFIGURATION_ERROR,

  // Setup required
  SETUP_REQUIRED: ExitCodes.SETUP_REQUIRED,
  INITIAL_SETUP: ExitCodes.SETUP_REQUIRED,
  OAUTH_SETUP: ExitCodes.SETUP_REQUIRED,

  // Timeout errors
  TIMEOUT_ERROR: ExitCodes.TIMEOUT_ERROR,
  VALIDATION_TIMEOUT: ExitCodes.TIMEOUT_ERROR,
  PROVIDER_TIMEOUT: ExitCodes.TIMEOUT_ERROR,

  // Permission errors
  PERMISSION_DENIED: ExitCodes.PERMISSION_DENIED,
  KEYCHAIN_ERROR: ExitCodes.PERMISSION_DENIED,
  ACCESS_DENIED: ExitCodes.PERMISSION_DENIED,
};

/**
 * Get appropriate exit code for an error type or error object
 *
 * @param error - Error type string or Error object
 * @returns Appropriate exit code for automation
 */
export function getExitCodeForError(
  error: string | Error | { code?: string; type?: string; message?: string },
): ExitCodes {
  if (typeof error === 'string') {
    return ERROR_TYPE_TO_EXIT_CODE[error] || ExitCodes.UNKNOWN_ERROR;
  }

  if (error instanceof Error) {
    // Try to extract error type from error name or message
    const errorName = error.name?.toUpperCase();
    const errorMessage = error.message?.toUpperCase();

    // Check error name first
    if (errorName && ERROR_TYPE_TO_EXIT_CODE[errorName]) {
      return ERROR_TYPE_TO_EXIT_CODE[errorName];
    }

    // Check for common patterns in error message
    for (const [errorType, exitCode] of Object.entries(ERROR_TYPE_TO_EXIT_CODE)) {
      if (
        errorMessage?.includes(errorType) ||
        errorMessage?.includes(errorType.replace('_', ' '))
      ) {
        return exitCode;
      }
    }

    return ExitCodes.UNKNOWN_ERROR;
  }

  // Handle error objects with code/type properties
  if (typeof error === 'object' && error !== null) {
    const errorCode = (error as any).code;
    const errorType = (error as any).type;

    if (errorCode && ERROR_TYPE_TO_EXIT_CODE[errorCode]) {
      return ERROR_TYPE_TO_EXIT_CODE[errorCode];
    }

    if (errorType && ERROR_TYPE_TO_EXIT_CODE[errorType]) {
      return ERROR_TYPE_TO_EXIT_CODE[errorType];
    }
  }

  return ExitCodes.UNKNOWN_ERROR;
}

/**
 * Get human-readable description for exit code
 *
 * @param exitCode - Exit code to describe
 * @returns Human-readable description
 */
export function getExitCodeDescription(exitCode: ExitCodes): string {
  switch (exitCode) {
    case ExitCodes.SUCCESS:
      return 'All providers validated successfully';
    case ExitCodes.AUTHENTICATION_FAILURE:
      return 'Authentication failure - OAuth tokens invalid or expired';
    case ExitCodes.NETWORK_FAILURE:
      return 'Network failure - API connectivity issues';
    case ExitCodes.CONFIGURATION_ERROR:
      return 'Configuration error - Invalid configuration or setup required';
    case ExitCodes.SETUP_REQUIRED:
      return 'Setup required - Provider needs initial OAuth setup through UI';
    case ExitCodes.TIMEOUT_ERROR:
      return 'Timeout error - Provider validation exceeded time limit';
    case ExitCodes.PERMISSION_DENIED:
      return 'Permission denied - OS-level permissions or keychain access issues';
    case ExitCodes.UNKNOWN_ERROR:
      return 'Unknown error - Unexpected failure during validation';
    default:
      return `Unknown exit code: ${exitCode}`;
  }
}

/**
 * Check if exit code indicates success
 *
 * @param exitCode - Exit code to check
 * @returns True if successful
 */
export function isSuccessExitCode(exitCode: ExitCodes): boolean {
  return exitCode === ExitCodes.SUCCESS;
}

/**
 * Check if exit code indicates a retryable error
 *
 * @param exitCode - Exit code to check
 * @returns True if error is retryable
 */
export function isRetryableExitCode(exitCode: ExitCodes): boolean {
  return [
    ExitCodes.NETWORK_FAILURE,
    ExitCodes.TIMEOUT_ERROR,
    ExitCodes.AUTHENTICATION_FAILURE, // May be retryable after token refresh
  ].includes(exitCode);
}

/**
 * Check if exit code indicates a setup/configuration issue
 *
 * @param exitCode - Exit code to check
 * @returns True if setup or configuration is required
 */
export function requiresSetupExitCode(exitCode: ExitCodes): boolean {
  return [ExitCodes.SETUP_REQUIRED, ExitCodes.CONFIGURATION_ERROR].includes(exitCode);
}
