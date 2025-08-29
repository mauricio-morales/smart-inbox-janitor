/**
 * Command-line argument parsing for console mode provider validation
 *
 * Provides simple command-line parsing with validation and type safety for
 * console mode provider debugging and validation operations.
 * Simplified implementation without yargs for Electron compatibility.
 *
 * @module CommandParser
 */

/**
 * Console command configuration interface
 */
export interface ConsoleConfig {
  /** Console mode type */
  mode: 'console' | 'headless';

  /** Providers to validate - 'all' or specific provider names */
  providers: string[];

  /** Enable verbose output */
  verbose: boolean;

  /** Output format for results */
  outputFormat: 'json' | 'table' | 'compact';

  /** Global timeout in seconds for all operations */
  timeout: number;

  /** Exit immediately on first failure */
  exitOnFailure: boolean;

  /** Retry failed operations */
  retry: boolean;

  /** Number of retry attempts */
  retryAttempts: number;
}

/**
 * Available providers for validation
 */
export const AVAILABLE_PROVIDERS = ['gmail', 'openai', 'storage'] as const;

/**
 * Default console configuration
 */
export const DEFAULT_CONSOLE_CONFIG: ConsoleConfig = {
  mode: 'console',
  providers: ['all'],
  verbose: false,
  outputFormat: 'json',
  timeout: 30,
  exitOnFailure: false,
  retry: false,
  retryAttempts: 3,
};

/**
 * Simple command-line parser for console mode operations
 */
export class CommandParser {
  /**
   * Parse command-line arguments for console mode
   *
   * @param argv - Process arguments (defaults to process.argv)
   * @returns Parsed and validated console configuration
   */
  static parseConsoleArgs(argv: string[] = process.argv): ConsoleConfig {
    const config = { ...DEFAULT_CONSOLE_CONFIG };

    // Simple parsing without external dependencies
    for (let i = 0; i < argv.length; i++) {
      const arg = argv[i];
      const nextArg = argv[i + 1];

      switch (arg) {
        case '--console':
          config.mode = 'console';
          break;
        case '--headless':
          config.mode = 'headless';
          break;
        case '--verbose':
        case '-v':
          config.verbose = true;
          break;
        case '--format':
        case '-f':
          if (nextArg && ['json', 'table', 'compact'].includes(nextArg)) {
            config.outputFormat = nextArg as 'json' | 'table' | 'compact';
            i++; // Skip next arg as it's consumed
          }
          break;
        case '--timeout':
        case '-t':
          if (nextArg && !isNaN(Number(nextArg))) {
            const timeout = Number(nextArg);
            if (timeout > 0 && timeout <= 300) {
              config.timeout = timeout;
            }
            i++; // Skip next arg as it's consumed
          }
          break;
        case '--providers':
          if (nextArg) {
            config.providers = CommandParser.parseProviders(nextArg);
            i++; // Skip next arg as it's consumed
          }
          break;
        case '--exit-on-failure':
          config.exitOnFailure = true;
          break;
        case '--retry':
          config.retry = true;
          break;
        case '--retry-attempts':
          if (nextArg && !isNaN(Number(nextArg))) {
            const attempts = Number(nextArg);
            if (attempts > 0 && attempts <= 10) {
              config.retryAttempts = attempts;
              config.retry = true; // Enable retry if attempts specified
            }
            i++; // Skip next arg as it's consumed
          }
          break;
        case '--help':
        case '-h':
          console.log(CommandParser.getHelpText());
          process.exit(0);
          break;
      }
    }

    return CommandParser.validateArgs(config);
  }

  /**
   * Parse providers list from command-line argument
   */
  private static parseProviders(providersArg: string): string[] {
    if (providersArg === 'all') {
      return ['all'];
    }

    const providers = providersArg
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);
    const invalid = providers.filter((p) => !AVAILABLE_PROVIDERS.includes(p as any) && p !== 'all');

    if (invalid.length > 0) {
      console.error(
        `Invalid providers: ${invalid.join(', ')}. Available: ${AVAILABLE_PROVIDERS.join(', ')}`,
      );
      process.exit(3); // Configuration error
    }

    return providers;
  }

  /**
   * Validate parsed arguments for consistency
   *
   * @param config - Parsed console configuration
   * @returns Validated configuration
   */
  static validateArgs(config: ConsoleConfig): ConsoleConfig {
    // Validate provider list
    if (config.providers.length === 0) {
      console.error('At least one provider must be specified');
      process.exit(3); // Configuration error
    }

    // Expand 'all' providers
    if (config.providers.includes('all')) {
      config.providers = [...AVAILABLE_PROVIDERS];
    }

    // Validate format compatibility
    if (config.outputFormat === 'table' && !config.verbose) {
      console.warn('Table format is more informative with --verbose flag');
    }

    // Validate timeout vs retry configuration
    if (config.retry && config.timeout < 10) {
      console.warn(
        'Short timeout with retry enabled may not allow sufficient time for retry attempts',
      );
    }

    return config;
  }

  /**
   * Generate help text for console mode
   *
   * @returns Formatted help text
   */
  static getHelpText(): string {
    return `
Smart Inbox Janitor - Console Mode Provider Validation

USAGE:
  npm run debug:providers [options]
  electron . --console [options]

EXAMPLES:
  # Basic console validation
  npm run debug:providers --verbose

  # Validate specific providers
  npm run debug:providers --providers=gmail,openai --format=table

  # Headless mode with retry
  npm run debug:providers --headless --retry --timeout=60

  # AI agent integration
  npm run debug:providers --format=json --exit-on-failure

OPTIONS:
  --console              Run in console mode without UI
  --headless             Run in headless mode (alias for --console)
  --verbose, -v          Enable verbose output with detailed logging
  --format, -f FORMAT    Output format: json (default), table, compact
  --timeout, -t SECONDS  Global timeout in seconds (1-300, default: 30)
  --providers LIST       Comma-separated providers: gmail,openai,storage or all (default)
  --exit-on-failure      Exit immediately on first provider failure
  --retry                Retry failed provider validations
  --retry-attempts N     Number of retry attempts (1-10, default: 3)
  --help, -h             Show this help message

PROVIDERS:
  gmail    - Gmail API provider validation
  openai   - OpenAI API provider validation  
  storage  - SQLite storage provider validation
  all      - Validate all providers (default)

OUTPUT FORMATS:
  json     - JSON output for AI agent parsing (default)
  table    - Human-readable table format
  compact  - Condensed output format

EXIT CODES:
  0  - Success (all providers validated)
  1  - Authentication failure (OAuth tokens invalid)
  2  - Network failure (API connectivity issues)
  3  - Configuration error (invalid setup)
  4  - Setup required (OAuth setup needed)
  5  - Timeout error (validation exceeded time limit)
  99 - Unknown error

ENVIRONMENT VARIABLES:
  GMAIL_CLIENT_ID      - Gmail OAuth client ID
  GMAIL_CLIENT_SECRET  - Gmail OAuth client secret
  OPENAI_API_KEY       - OpenAI API key
  DATABASE_PATH        - SQLite database path (optional)

For more information, visit: https://github.com/your-repo/smart-inbox-janitor
    `.trim();
  }

  /**
   * Check if console mode is enabled from process arguments
   *
   * @param argv - Process arguments (defaults to process.argv)
   * @returns True if console or headless mode is enabled
   */
  static isConsoleMode(argv: string[] = process.argv): boolean {
    return (
      argv.includes('--console') ||
      argv.includes('--headless') ||
      argv.includes('-c') ||
      process.env.NODE_ENV === 'console'
    );
  }

  /**
   * Get minimal configuration for console mode detection
   *
   * @param argv - Process arguments (defaults to process.argv)
   * @returns Minimal console configuration
   */
  static getMinimalConfig(argv: string[] = process.argv): Partial<ConsoleConfig> {
    const isConsole = CommandParser.isConsoleMode(argv);

    if (!isConsole) {
      return {};
    }

    return {
      mode: 'console',
      verbose: argv.includes('--verbose') || argv.includes('-v'),
      outputFormat: 'json',
    };
  }
}

/**
 * Utility function to parse console arguments (convenience export)
 *
 * @param argv - Process arguments (defaults to process.argv)
 * @returns Parsed console configuration
 */
export function parseConsoleArgs(argv?: string[]): ConsoleConfig {
  return CommandParser.parseConsoleArgs(argv);
}

/**
 * Utility function to check console mode (convenience export)
 *
 * @param argv - Process arguments (defaults to process.argv)
 * @returns True if console mode is enabled
 */
export function isConsoleMode(argv?: string[]): boolean {
  return CommandParser.isConsoleMode(argv);
}
