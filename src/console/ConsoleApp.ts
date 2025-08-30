/**
 * Main Console Application Entry Point
 *
 * Provides the main entry point for console mode operations with CLI integration.
 * Coordinates command-line parsing, validation orchestration, and result processing
 * for AI agent integration and automated provider validation.
 *
 * @module ConsoleApp
 */

import { CommandParser, type ConsoleConfig } from '@shared/cli/CommandParser';
import { ConsoleLogger, type ValidationSummary } from './ConsoleLogger';
import { ProviderValidator } from './ProviderValidator';
import { ExitCodes, getExitCodeDescription } from './ExitCodes';

/**
 * Console application error types
 */
class ConsoleAppError extends Error {
  constructor(
    message: string,
    public exitCode: ExitCodes = ExitCodes.UNKNOWN_ERROR,
  ) {
    super(message);
    this.name = 'ConsoleAppError';
  }
}

/**
 * Console application statistics
 */
interface ConsoleAppStats {
  startTime: number;
  endTime: number;
  totalDurationMs: number;
  config: ConsoleConfig;
  validationSummary?: ValidationSummary;
  errors: Error[];
  warnings: string[];
}

/**
 * Main console application for provider validation and debugging
 */
export class ConsoleApp {
  private config: ConsoleConfig | null = null;
  private logger: ConsoleLogger | null = null;
  private validator: ProviderValidator | null = null;
  private stats: ConsoleAppStats;

  constructor() {
    this.stats = {
      startTime: Date.now(),
      endTime: 0,
      totalDurationMs: 0,
      config: {} as ConsoleConfig,
      errors: [],
      warnings: [],
    };
  }

  /**
   * Main application entry point
   *
   * @param argv - Command-line arguments (defaults to process.argv)
   * @returns Promise that resolves when validation is complete
   */
  async run(argv: string[] = process.argv): Promise<void> {
    try {
      // Parse command-line arguments
      this.config = CommandParser.parseConsoleArgs(argv);
      this.stats.config = this.config;

      // Show help and exit if requested
      if (this.shouldShowHelp(argv)) {
        console.log(CommandParser.getHelpText());
        process.exit(ExitCodes.SUCCESS);
      }

      // Initialize components
      await this.initialize();

      // Run provider validation
      const validationSummary = await this.validateProviders();
      this.stats.validationSummary = validationSummary;

      // Process results and exit
      await this.processResults(validationSummary);
    } catch (error) {
      await this.handleError(error as Error);
    } finally {
      await this.cleanup();
    }
  }

  /**
   * Initialize console application components
   */
  private async initialize(): Promise<void> {
    if (!this.config) {
      throw new ConsoleAppError('Configuration not initialized', ExitCodes.CONFIGURATION_ERROR);
    }

    try {
      // Initialize console logger
      this.logger = new ConsoleLogger(this.config);

      // Initialize provider validator
      this.validator = new ProviderValidator(this.config, this.logger);
      await this.validator.initialize();

      // Log initialization if verbose mode
      if (this.config.verbose) {
        this.logger.logProgress('Console application initialized', 'system');
        this.logger.logProgress(
          `Running with configuration: ${JSON.stringify({
            mode: this.config.mode,
            providers: this.config.providers,
            outputFormat: this.config.outputFormat,
            timeout: this.config.timeout,
          })}`,
          'system',
        );
      }
    } catch (error) {
      throw new ConsoleAppError(
        `Console app initialization failed: ${(error as Error).message}`,
        ExitCodes.CONFIGURATION_ERROR,
      );
    }
  }

  /**
   * Run provider validation
   */
  private async validateProviders(): Promise<ValidationSummary> {
    if (!this.validator || !this.logger) {
      throw new ConsoleAppError('Validator not initialized', ExitCodes.CONFIGURATION_ERROR);
    }

    try {
      this.logger.logProgress('Starting provider validation', 'system');

      const validationSummary = await this.validator.validateAllProviders();

      if (this.config?.verbose) {
        this.logger.logProgress(
          `Validation completed: ${validationSummary.connectedProviders}/${validationSummary.totalProviders} providers connected`,
          'system',
        );
      }

      return validationSummary;
    } catch (error) {
      this.stats.errors.push(error as Error);
      throw new ConsoleAppError(
        `Provider validation failed: ${(error as Error).message}`,
        ExitCodes.UNKNOWN_ERROR,
      );
    }
  }

  /**
   * Process validation results and determine exit strategy
   */
  private async processResults(validationSummary: ValidationSummary): Promise<void> {
    if (!this.logger) {
      throw new ConsoleAppError('Logger not initialized', ExitCodes.CONFIGURATION_ERROR);
    }

    this.stats.endTime = Date.now();
    this.stats.totalDurationMs = this.stats.endTime - this.stats.startTime;

    // Log final statistics if verbose
    if (this.config?.verbose) {
      this.logger.logProgress(`Total execution time: ${this.stats.totalDurationMs}ms`, 'system');
      this.logger.logProgress(
        `Exit code: ${validationSummary.exitCode} - ${getExitCodeDescription(validationSummary.exitCode as ExitCodes)}`,
        'system',
      );
    }

    // Log summary to console (already logged by validator, but we can add app-level context)
    const appSummary = {
      type: 'console_app_summary',
      timestamp: new Date().toISOString(),
      appDurationMs: this.stats.totalDurationMs,
      validationDurationMs: validationSummary.totalDurationMs,
      success: validationSummary.exitCode === ExitCodes.SUCCESS,
      exitCode: validationSummary.exitCode,
      exitCodeDescription: getExitCodeDescription(validationSummary.exitCode as ExitCodes),
      errors: this.stats.errors.length,
      warnings: this.stats.warnings.length,
    };

    console.log(JSON.stringify(appSummary));

    // Flush logs before exit
    await this.logger.flush();

    // Exit with appropriate code
    process.exit(validationSummary.exitCode);
  }

  /**
   * Handle application errors
   */
  private async handleError(error: Error): Promise<void> {
    const consoleError =
      error instanceof ConsoleAppError ? error : new ConsoleAppError(error.message);
    this.stats.errors.push(consoleError);

    const errorEntry = {
      type: 'console_app_error',
      timestamp: new Date().toISOString(),
      error: {
        message: consoleError.message,
        name: consoleError.name,
        stack: consoleError.stack,
      },
      exitCode: consoleError.exitCode,
      exitCodeDescription: getExitCodeDescription(consoleError.exitCode),
      stats: {
        durationMs: Date.now() - this.stats.startTime,
        errorsCount: this.stats.errors.length,
        warningsCount: this.stats.warnings.length,
      },
    };

    console.error(JSON.stringify(errorEntry));

    if (this.logger && this.config?.verbose) {
      console.error(`❌ Console app error: ${consoleError.message}`);
      if (consoleError.stack) {
        console.error(`   Stack: ${consoleError.stack}`);
      }
    }

    // Flush logs if available
    if (this.logger) {
      await this.logger.flush();
    }

    process.exit(consoleError.exitCode);
  }

  /**
   * Check if help should be displayed
   */
  private shouldShowHelp(argv: string[]): boolean {
    return (
      argv.includes('--help') ||
      argv.includes('-h') ||
      argv.includes('help') ||
      (argv.includes('--console') && argv.length === 3)
    ); // Just --console with no other args
  }

  /**
   * Cleanup resources
   */
  private async cleanup(): Promise<void> {
    try {
      if (this.logger) {
        await this.logger.flush();
      }
    } catch (error) {
      // Ignore cleanup errors
    }

    this.config = null;
    this.logger = null;
    this.validator = null;
  }

  /**
   * Get application statistics
   */
  getStats(): ConsoleAppStats {
    return { ...this.stats };
  }

  /**
   * Static helper to run console app
   */
  static async run(argv?: string[]): Promise<void> {
    const app = new ConsoleApp();
    await app.run(argv);
  }
}

/**
 * Convenience function to run console application (for external use)
 */
export async function runConsoleApp(argv?: string[]): Promise<void> {
  return ConsoleApp.run(argv);
}

// Allow direct execution of this module for testing
if (require.main === module) {
  ConsoleApp.run(process.argv).catch((error) => {
    console.error('Unhandled console app error:', error);
    process.exit(ExitCodes.UNKNOWN_ERROR);
  });
}
