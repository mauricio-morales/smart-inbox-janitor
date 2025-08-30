/**
 * Console Mode Configuration for Headless Electron Operation
 *
 * Provides headless Electron configuration and console-mode application setup
 * without UI dependencies. Handles virtual display setup, provider initialization,
 * and console validation orchestration.
 *
 * @module ConsoleMode
 */

import { app } from 'electron';
import { CommandParser } from '@shared/cli/CommandParser';
import { ConsoleLogger } from '../console/ConsoleLogger';
import { ProviderValidator } from '../console/ProviderValidator';
import { ExitCodes } from '../console/ExitCodes';

/**
 * Console mode configuration and orchestration
 */
export class ConsoleMode {
  private config: ReturnType<typeof CommandParser.parseConsoleArgs> | null = null;
  private logger: ConsoleLogger | null = null;
  private validator: ProviderValidator | null = null;
  private initialized = false;

  constructor() {
    // Configure headless mode immediately on construction
    this.configureHeadlessMode();
  }

  /**
   * Configure Electron for headless operation
   */
  private configureHeadlessMode(): void {
    // CRITICAL: Configure headless switches before app ready
    // Based on Electron documentation requirements for console-only operation

    if (!process.env.DISPLAY) {
      // Set virtual display for headless operation (required for Electron)
      process.env.DISPLAY = ':99';
    }

    // Electron command line switches for headless mode
    app.commandLine.appendSwitch('--headless');
    app.commandLine.appendSwitch('--disable-gpu');
    app.commandLine.appendSwitch('--no-sandbox');
    app.commandLine.appendSwitch('--disable-web-security');
    app.commandLine.appendSwitch('--disable-extensions');
    app.commandLine.appendSwitch('--disable-dev-shm-usage');
    app.commandLine.appendSwitch('--disable-background-timer-throttling');
    app.commandLine.appendSwitch('--disable-backgrounding-occluded-windows');
    app.commandLine.appendSwitch('--disable-renderer-backgrounding');

    // Prevent Electron from creating any windows in console mode
    app.commandLine.appendSwitch('--disable-features', 'VizDisplayCompositor');
  }

  /**
   * Initialize console mode with command-line parsing
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Parse command-line arguments
      this.config = CommandParser.parseConsoleArgs(process.argv);

      // Initialize console logger
      this.logger = new ConsoleLogger(this.config);

      // Initialize provider validator
      this.validator = new ProviderValidator(this.config, this.logger);
      await this.validator.initialize();

      this.initialized = true;

      // Log console mode startup
      this.logger.logProgress('Console mode initialized', 'system');

      if (this.config.verbose) {
        this.logger.logProgress(
          `Console configuration: ${JSON.stringify({
            mode: this.config.mode,
            providers: this.config.providers,
            outputFormat: this.config.outputFormat,
            timeout: this.config.timeout,
            retry: this.config.retry,
          })}`,
          'system',
        );
      }
    } catch (error) {
      console.error('Console mode initialization failed:', error);
      process.exit(ExitCodes.CONFIGURATION_ERROR);
    }
  }

  /**
   * Run console mode validation
   */
  async run(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.logger || !this.validator || !this.config) {
      console.error('Console mode not properly initialized');
      process.exit(ExitCodes.CONFIGURATION_ERROR);
    }

    try {
      // Pre-flight checks
      await this.performPreFlightChecks();

      // Run provider validation
      const validationSummary = await this.validator.validateAllProviders();

      // Flush logs
      await this.logger.flush();

      // Exit with appropriate code
      process.exit(validationSummary.exitCode);
    } catch (error) {
      this.logger?.logError('Console mode execution failed', error as Error);
      await this.logger?.flush();
      process.exit(ExitCodes.UNKNOWN_ERROR);
    }
  }

  /**
   * Perform pre-flight checks before validation
   */
  private async performPreFlightChecks(): Promise<void> {
    if (!this.config || !this.logger) {
      throw new Error('Console mode not initialized');
    }

    // Check Node.js version
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.substring(1).split('.')[0]);

    if (majorVersion < 18) {
      this.logger.logWarning(
        `Node.js version ${nodeVersion} detected. Minimum supported version is 18.0.0`,
      );
    }

    // Check environment variables for provider configurations
    const missingEnvVars = this.checkEnvironmentVariables();
    if (missingEnvVars.length > 0) {
      this.logger.logWarning(
        `Missing environment variables that may affect provider validation: ${missingEnvVars.join(', ')}`,
      );
    }

    // Check virtual display (if on Linux)
    if (process.platform === 'linux' && !process.env.DISPLAY) {
      this.logger.logWarning(
        'No DISPLAY environment variable set on Linux. This may cause Electron to fail. Consider using xvfb-maybe.',
      );
    }

    // Check available memory
    const memoryUsage = process.memoryUsage();
    const availableMemory = memoryUsage.heapTotal;
    const minRequiredMemory = 100 * 1024 * 1024; // 100MB

    if (availableMemory < minRequiredMemory) {
      this.logger.logWarning(
        `Low memory detected (${Math.round(availableMemory / 1024 / 1024)}MB). Provider validation may be affected.`,
      );
    }

    // Log system information
    if (this.config.verbose) {
      this.logger.logProgress(
        `System info: Node ${nodeVersion}, Platform ${process.platform}, Memory ${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB used`,
        'system',
      );
    }
  }

  /**
   * Check for required environment variables
   */
  private checkEnvironmentVariables(): string[] {
    const requiredEnvVars = ['GMAIL_CLIENT_ID', 'GMAIL_CLIENT_SECRET', 'OPENAI_API_KEY'];

    const optionalEnvVars = ['GMAIL_REDIRECT_URI', 'DATABASE_PATH', 'DATABASE_ENCRYPTION_KEY'];

    const missing: string[] = [];

    // Check providers being validated
    if (this.config?.providers.includes('all') || this.config?.providers.includes('gmail')) {
      if (!process.env.GMAIL_CLIENT_ID) missing.push('GMAIL_CLIENT_ID');
      if (!process.env.GMAIL_CLIENT_SECRET) missing.push('GMAIL_CLIENT_SECRET');
    }

    if (this.config?.providers.includes('all') || this.config?.providers.includes('openai')) {
      if (!process.env.OPENAI_API_KEY) missing.push('OPENAI_API_KEY');
    }

    return missing;
  }

  /**
   * Handle graceful shutdown
   */
  async shutdown(): Promise<void> {
    if (this.logger) {
      this.logger.logProgress('Console mode shutting down', 'system');
      await this.logger.flush();
    }

    // Clean up any resources
    this.config = null;
    this.logger = null;
    this.validator = null;
    this.initialized = false;
  }

  /**
   * Get console mode status
   */
  getStatus() {
    return {
      initialized: this.initialized,
      config: this.config
        ? {
            mode: this.config.mode,
            providers: this.config.providers,
            outputFormat: this.config.outputFormat,
            timeout: this.config.timeout,
          }
        : null,
      electronVersion: process.versions.electron || 'N/A',
      nodeVersion: process.version,
      platform: process.platform,
    };
  }

  /**
   * Check if current environment supports console mode
   */
  static isConsoleSupported(): { supported: boolean; issues: string[] } {
    const issues: string[] = [];

    // Check Node.js version
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.substring(1).split('.')[0]);

    if (majorVersion < 18) {
      issues.push(`Node.js version ${nodeVersion} is below minimum supported version 18.0.0`);
    }

    // Check if Electron is available
    if (!process.versions.electron) {
      issues.push('Electron runtime not detected');
    }

    // Check platform-specific requirements
    if (process.platform === 'linux' && !process.env.DISPLAY && !process.env.XVFB) {
      issues.push('Linux platform requires DISPLAY or xvfb for Electron headless operation');
    }

    // Check memory constraints
    const memoryUsage = process.memoryUsage();
    const minRequiredMemory = 50 * 1024 * 1024; // 50MB minimum

    if (memoryUsage.heapTotal < minRequiredMemory) {
      issues.push(
        `Insufficient memory: ${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB available, minimum 50MB required`,
      );
    }

    return {
      supported: issues.length === 0,
      issues,
    };
  }

  /**
   * Create console mode instance with validation
   */
  static create(): ConsoleMode {
    const supportCheck = ConsoleMode.isConsoleSupported();

    if (!supportCheck.supported) {
      console.error('Console mode not supported:');
      supportCheck.issues.forEach((issue) => console.error(`  - ${issue}`));
      process.exit(ExitCodes.CONFIGURATION_ERROR);
    }

    return new ConsoleMode();
  }
}
