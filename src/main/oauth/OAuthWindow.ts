/**
 * OAuth Window Manager for Smart Inbox Janitor
 *
 * Provides secure BrowserWindow configuration and management for OAuth flows.
 * Implements proper security isolation to prevent script injection and maintain
 * a secure OAuth experience for desktop applications.
 *
 * @module OAuthWindow
 */

import { BrowserWindow, shell } from 'electron';
import type * as Electron from 'electron';
import { URL } from 'url';
import {
  Result,
  createSuccessResult,
  createErrorResult,
  SecurityError,
  ValidationError,
  NetworkError,
} from '@shared/types';

/**
 * OAuth callback result containing authorization code and state
 */
export interface OAuthCallbackResult {
  /** Authorization code from OAuth provider */
  readonly code: string;
  /** State parameter for CSRF validation */
  readonly state: string;
  /** Any error from OAuth provider */
  readonly error?: string;
  /** Error description if error occurred */
  readonly errorDescription?: string;
}

/**
 * OAuth window configuration options
 */
export interface OAuthWindowOptions {
  /** Window width in pixels */
  readonly width?: number;
  /** Window height in pixels */
  readonly height?: number;
  /** Window title */
  readonly title?: string;
  /** Whether window should be modal */
  readonly modal?: boolean;
  /** Parent window for modal behavior */
  readonly parent?: BrowserWindow;
  /** Whether to show window immediately */
  readonly show?: boolean;
}

/**
 * OAuth Window Manager
 *
 * Creates and manages secure BrowserWindows for OAuth authentication flows.
 * Implements comprehensive security measures to prevent script injection and
 * unauthorized access while providing a smooth user experience.
 */
export class OAuthWindow {
  readonly name = 'oauth-window-manager';
  readonly version = '1.0.0';

  private window: BrowserWindow | null = null;
  private readonly redirectUri: string;

  private authCallback: ((result: Result<OAuthCallbackResult>) => void) | null = null;

  constructor(redirectUri: string) {
    this.redirectUri = redirectUri;
  }

  /**
   * Create secure OAuth BrowserWindow with proper security isolation
   *
   * @param options - Window configuration options
   * @returns Result containing the created BrowserWindow
   */
  createOAuthWindow(options: OAuthWindowOptions = {}): Result<BrowserWindow> {
    try {
      // Close existing window if any
      if (this.window && !this.window.isDestroyed()) {
        this.window.close();
      }

      const windowOptions: Electron.BrowserWindowConstructorOptions = {
        width: options.width ?? 500,
        height: options.height ?? 700,
        title: options.title ?? 'Sign in to Gmail',
        modal: options.modal ?? false,
        parent: options.parent,
        show: options.show ?? true,
        center: true,
        resizable: true,
        minimizable: false,
        maximizable: false,
        fullscreenable: false,
        autoHideMenuBar: true,
        backgroundColor: '#ffffff',
        titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
        webPreferences: {
          // CRITICAL SECURITY SETTINGS
          contextIsolation: true, // Prevent script injection
          nodeIntegration: false, // No Node.js access in OAuth window
          nodeIntegrationInWorker: false, // No Node.js in web workers
          nodeIntegrationInSubFrames: false, // No Node.js in subframes
          sandbox: true, // Enable process sandboxing
          experimentalFeatures: false, // Disable experimental web features
          enableBlinkFeatures: '', // Disable Blink features
          disableBlinkFeatures: '', // Additional security
          webSecurity: true, // Maintain web security
          allowRunningInsecureContent: false, // Block insecure content
          plugins: false, // Disable plugins
          images: true, // Allow images for OAuth UI
          textAreasAreResizable: false, // Prevent textarea manipulation
          webgl: false, // Disable WebGL
          // webaudio: false, // Disable Web Audio API - property doesn't exist
          spellcheck: false, // Disable spellcheck
          scrollBounce: false, // Disable scroll bounce
          preload: undefined, // CRITICAL: No preload script for OAuth window
        },
      };

      this.window = new BrowserWindow(windowOptions);

      // Set up security event handlers
      this.setupSecurityHandlers();

      // Set up navigation handlers
      this.setupNavigationHandlers();

      return createSuccessResult(this.window);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return createErrorResult(
        new ValidationError(
          `Failed to create OAuth window: ${message}`,
          {},
          {
            operation: 'createOAuthWindow',
          },
        ),
      );
    }
  }

  /**
   * Navigate OAuth window to authorization URL and handle callback
   *
   * @param authUrl - OAuth authorization URL
   * @param timeoutMs - Timeout for OAuth flow in milliseconds
   * @returns Promise resolving to OAuth callback result
   */
  async navigateAndWaitForCallback(
    authUrl: string,
    timeoutMs = 5 * 60 * 1000, // 5 minutes default
  ): Promise<Result<OAuthCallbackResult>> {
    return new Promise((resolve) => {
      try {
        if (!this.window || this.window.isDestroyed()) {
          resolve(
            createErrorResult(
              new SecurityError('OAuth window not available', {
                operation: 'navigateAndWaitForCallback',
              }),
            ),
          );
          return;
        }

        // Validate auth URL
        const validationResult = this.validateAuthUrl(authUrl);
        if (!validationResult.success) {
          resolve(createErrorResult(validationResult.error));
          return;
        }

        // Set up timeout
        const timeoutId = global.setTimeout(() => {
          this.cleanup();
          resolve(
            createErrorResult(
              new NetworkError('OAuth flow timed out', true, {
                operation: 'navigateAndWaitForCallback',
              }),
            ),
          );
        }, timeoutMs);

        // Set up callback handler
        this.authCallback = (result: Result<OAuthCallbackResult>): void => {
          global.clearTimeout(timeoutId);
          this.cleanup();
          resolve(result);
        };

        // Navigate to auth URL
        void this.window.loadURL(authUrl);

        // Handle window close
        this.window.on('closed', () => {
          global.clearTimeout(timeoutId);
          if (this.authCallback) {
            this.authCallback(
              createErrorResult(
                new ValidationError(
                  'OAuth window closed by user',
                  {},
                  {
                    operation: 'navigateAndWaitForCallback',
                  },
                ),
              ),
            );
          }
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        resolve(
          createErrorResult(
            new ValidationError(
              `OAuth navigation failed: ${message}`,
              {},
              {
                operation: 'navigateAndWaitForCallback',
              },
            ),
          ),
        );
      }
    });
  }

  /**
   * Handle OAuth callback URL and extract authorization code
   *
   * @param callbackUrl - Full callback URL from OAuth provider
   * @returns Result containing parsed callback data
   */
  handleCallback(callbackUrl: string): Result<OAuthCallbackResult> {
    try {
      const url = new URL(callbackUrl);

      // Validate that this is our redirect URI
      const baseUrl = `${url.protocol}//${url.host}${url.pathname}`;
      const expectedBaseUrl = new URL(this.redirectUri);
      const expectedBase = `${expectedBaseUrl.protocol}//${expectedBaseUrl.host}${expectedBaseUrl.pathname}`;

      if (baseUrl !== expectedBase) {
        return createErrorResult(
          new SecurityError('Invalid redirect URI in callback', {
            operation: 'handleCallback',
            provided: baseUrl,
            expected: expectedBase,
          }),
        );
      }

      // Extract parameters
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');
      const error = url.searchParams.get('error');
      const errorDescription = url.searchParams.get('error_description');

      // Check for OAuth errors
      if (error !== null && error.length > 0) {
        return createErrorResult(
          new ValidationError(
            `OAuth error: ${error}`,
            {},
            {
              operation: 'handleCallback',
            },
          ),
        );
      }

      // Validate required parameters
      if (
        code === null ||
        code === undefined ||
        code.length === 0 ||
        state === null ||
        state === undefined ||
        state.length === 0
      ) {
        return createErrorResult(
          new ValidationError(
            'Missing required OAuth parameters',
            {},
            {
              operation: 'handleCallback',
            },
          ),
        );
      }

      const result: OAuthCallbackResult = {
        code,
        state,
        error: error ?? undefined,
        errorDescription: errorDescription ?? undefined,
      };

      return createSuccessResult(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return createErrorResult(
        new ValidationError(
          `Failed to parse OAuth callback: ${message}`,
          {},
          {
            operation: 'handleCallback',
          },
        ),
      );
    }
  }

  /**
   * Close and cleanup OAuth window
   */
  close(): void {
    this.cleanup();
  }

  /**
   * Check if OAuth window is currently open
   */
  isOpen(): boolean {
    return this.window !== null && !this.window.isDestroyed();
  }

  /**
   * Setup security event handlers for the OAuth window
   */
  private setupSecurityHandlers(): void {
    if (!this.window) return;

    const { webContents } = this.window;

    // Prevent new window creation
    webContents.setWindowOpenHandler(() => {
      return { action: 'deny' };
    });

    // Handle certificate errors
    webContents.on('certificate-error', (event, _url, error, _certificate, callback) => {
      // Deny all certificate errors for security
      event.preventDefault();
      callback(false);

      if (this.authCallback) {
        this.authCallback(
          createErrorResult(
            new SecurityError(`Certificate error during OAuth: ${error}`, {
              operation: 'oauth-certificate-error',
            }),
          ),
        );
      }
    });

    // Prevent downloads
    webContents.session.on('will-download', (event) => {
      event.preventDefault();
    });

    // Block file:// protocols and other dangerous protocols
    webContents.on('will-navigate', (event, navigationUrl) => {
      const url = new URL(navigationUrl);

      // Only allow https and our localhost redirect
      if (url.protocol !== 'https:' && !navigationUrl.startsWith(this.redirectUri)) {
        event.preventDefault();

        if (this.authCallback) {
          this.authCallback(
            createErrorResult(
              new SecurityError('Blocked navigation to unsafe URL', {
                operation: 'oauth-navigation-blocked',
              }),
            ),
          );
        }
      }
    });
  }

  /**
   * Setup navigation handlers for OAuth flow
   */
  private setupNavigationHandlers(): void {
    if (!this.window) return;

    const { webContents } = this.window;

    // Handle navigation to redirect URI
    webContents.on('will-redirect', (event, url) => {
      if (url.startsWith(this.redirectUri)) {
        event.preventDefault();

        // Parse callback and notify
        const callbackResult = this.handleCallback(url);
        if (this.authCallback) {
          this.authCallback(callbackResult);
        }
      }
    });

    // Handle direct navigation to redirect URI
    webContents.on('will-navigate', (event, url) => {
      if (url.startsWith(this.redirectUri)) {
        event.preventDefault();

        // Parse callback and notify
        const callbackResult = this.handleCallback(url);
        if (this.authCallback) {
          this.authCallback(callbackResult);
        }
      }
    });

    // Handle external links
    webContents.setWindowOpenHandler(({ url }) => {
      // Only open external links in system browser for Google domains
      const urlObj = new URL(url);
      if (urlObj.hostname.endsWith('.google.com') || urlObj.hostname.endsWith('.googleapis.com')) {
        void shell.openExternal(url);
      }
      return { action: 'deny' };
    });
  }

  /**
   * Validate authorization URL for security
   */
  private validateAuthUrl(authUrl: string): Result<void> {
    try {
      const url = new URL(authUrl);

      // Must be HTTPS
      if (url.protocol !== 'https:') {
        return createErrorResult(
          new ValidationError(
            'Authorization URL must use HTTPS',
            {},
            {
              operation: 'validateAuthUrl',
              protocol: url.protocol,
            },
          ),
        );
      }

      // Must be Google OAuth endpoint
      if (!url.hostname.endsWith('.google.com') && !url.hostname.endsWith('.googleapis.com')) {
        return createErrorResult(
          new ValidationError(
            'Authorization URL must be Google domain',
            {},
            {
              operation: 'validateAuthUrl',
            },
          ),
        );
      }

      return createSuccessResult(undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return createErrorResult(
        new ValidationError(
          `Invalid authorization URL: ${message}`,
          {},
          {
            operation: 'validateAuthUrl',
          },
        ),
      );
    }
  }

  /**
   * Cleanup window and reset state
   */
  private cleanup(): void {
    if (this.window && !this.window.isDestroyed()) {
      this.window.close();
    }
    this.window = null;
    this.authCallback = null;
  }
}
