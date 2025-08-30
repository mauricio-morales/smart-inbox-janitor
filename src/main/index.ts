import { app, BrowserWindow } from 'electron';
import { electronApp, optimizer, is } from '@electron-toolkit/utils';
import { config } from 'dotenv';
import { createMainWindow } from './window';
import { setupIPC } from './ipc';
import { ConsoleMode } from './ConsoleMode';
// Console mode imports

// Load environment variables
config();
import { GmailProvider } from '@providers/email/gmail/GmailProvider';
import { OpenAIProvider } from '@providers/llm/openai/OpenAIProvider';
import { SQLiteProvider } from '@providers/storage/sqlite/SQLiteProvider';
import { SecureStorageManager } from './security/SecureStorageManager';
import { GmailStartupAuth } from './security/GmailStartupAuth';
import { TokenRotationService } from './security/TokenRotationService';
import { GmailOAuthManager } from './oauth/GmailOAuthManager';

// Initialize real provider implementations
const emailProvider = new GmailProvider();
const llmProvider = new OpenAIProvider();
const storageProvider = new SQLiteProvider();
const secureStorageManager = new SecureStorageManager();

// Console mode detection - must happen before app.whenReady()
// In Electron, check command line arguments directly
const isConsoleMode =
  process.argv.includes('--console') ||
  process.argv.includes('--headless') ||
  process.env.NODE_ENV === 'console';

// Log console mode detection for debugging
if (isConsoleMode) {
  console.log('[Console Mode] Detected console/headless mode');
}

if (isConsoleMode) {
  // Console mode: Configure headless operation and run validation
  console.log('[Console Mode] Detected console/headless mode - starting provider validation');

  const consoleMode = ConsoleMode.create();

  // This method will be called when Electron has finished initialization (console mode)
  void app.whenReady().then(async () => {
    // Set app user model id (required even in console mode)
    electronApp.setAppUserModelId('com.smartinboxjanitor.app');

    // Prevent any window creation in console mode
    app.on('browser-window-created', (_, window) => {
      window.destroy(); // Immediately destroy any windows created
    });

    // Run console mode validation
    await consoleMode.run();
  });
} else {
  // Normal UI mode: Standard Electron application startup
  // This method will be called when Electron has finished initialization
  void app.whenReady().then(async () => {
    // Set app user model id for windows
    electronApp.setAppUserModelId('com.smartinboxjanitor.app');

    // Default open or close DevTools by F12 in development
    // and ignore CommandOrControl + R in production.
    app.on('browser-window-created', (_, window) => {
      optimizer.watchWindowShortcuts(window);
    });

    // Create the main application window
    createMainWindow();

    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    app.on('activate', function () {
      if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow();
      }
    });

    // CRITICAL: Setup IPC handlers FIRST to ensure UI can communicate even if provider initialization fails
    console.log('🚀 Setting up IPC handlers early (before provider initialization)...');
    try {
      setupIPC(emailProvider, llmProvider, storageProvider, secureStorageManager);
      console.log('✅ IPC handlers registered successfully (early setup)');
    } catch (ipcError) {
      console.error('❌ Failed to setup IPC handlers:', ipcError);
    }

    // Initialize providers after setting up IPC
    try {
      console.log('Initializing SQLite storage provider...');
      const storageInitResult = await storageProvider.initialize({ databasePath: './data/app.db' });

      if (!storageInitResult.success) {
        console.error('Failed to initialize SQLite storage provider:', storageInitResult.error);
        console.error('Storage error details:', JSON.stringify(storageInitResult.error, null, 2));
        throw new Error(`Storage initialization failed: ${storageInitResult.error.message}`);
      }
      console.log('✓ SQLite storage provider initialized successfully');

      // Initialize secure storage manager with the storage provider
      console.log('Initializing secure storage manager...');
      const secureStorageInitResult = await secureStorageManager.initialize({
        storageProvider,
        enableTokenRotation: true,
        sessionId: `session-${Date.now()}`,
        userId: 'default-user',
      });

      if (!secureStorageInitResult.success) {
        console.error(
          'Failed to initialize secure storage manager:',
          secureStorageInitResult.error,
        );
        console.error('Error details:', JSON.stringify(secureStorageInitResult.error, null, 2));
        throw new Error(
          `Secure storage initialization failed: ${secureStorageInitResult.error.message}`,
        );
      }
      console.log('✓ Secure storage manager initialized successfully');

      // PATTERN: Gmail startup authentication integration
      // Initialize startup authentication services (wait for secure storage first)
      console.log('Initializing startup authentication services...');

      // Try to get stored Gmail credentials for OAuth manager initialization
      console.log('Checking for stored Gmail OAuth credentials...');
      const storedCredentialsResult = await secureStorageManager.getGmailCredentials();

      let gmailOAuthManager: GmailOAuthManager;
      let gmailOAuthInitResult;

      if (storedCredentialsResult.success && storedCredentialsResult.data) {
        // Use stored credentials
        console.log('Using stored Gmail credentials for OAuth manager');
        const gmailOAuthConfig = {
          clientId: storedCredentialsResult.data.clientId,
          clientSecret: storedCredentialsResult.data.clientSecret,
          redirectUri: 'http://localhost:8080/oauth/callback',
        };
        gmailOAuthManager = new GmailOAuthManager(gmailOAuthConfig);
        gmailOAuthInitResult = gmailOAuthManager.initialize();
      } else {
        // Use placeholder credentials - will be configured during OAuth flow
        console.log('No stored Gmail credentials found, using placeholder OAuth manager');
        const gmailOAuthConfig = {
          clientId: 'placeholder',
          clientSecret: 'placeholder',
          redirectUri: 'http://localhost:8080/oauth/callback',
        };
        gmailOAuthManager = new GmailOAuthManager(gmailOAuthConfig);
        gmailOAuthInitResult = {
          success: false,
          error: { message: 'Credentials not configured yet' },
        };
      }

      if (!gmailOAuthInitResult.success) {
        console.error('Gmail OAuth manager initialization failed:', gmailOAuthInitResult.error);
        // Continue without OAuth manager - it may be reconfigured later
      } else {
        console.log('✓ Gmail OAuth manager initialized successfully');
      }

      // Create token rotation service with OAuth manager dependency
      const tokenRotationService = new TokenRotationService(
        secureStorageManager,
        gmailOAuthManager,
      );
      const tokenRotationInitResult = await tokenRotationService.initialize();

      if (!tokenRotationInitResult.success) {
        console.error(
          'Token rotation service initialization failed:',
          tokenRotationInitResult.error,
        );
        // Continue without token rotation - manual refresh will be needed
      } else {
        console.log('✓ Token rotation service initialized successfully');
      }

      // Create startup auth service (depends on both OAuth manager and secure storage)
      const gmailStartupAuth = new GmailStartupAuth(gmailOAuthManager, secureStorageManager);
      const startupAuthInitResult = await gmailStartupAuth.initialize();

      if (!startupAuthInitResult.success) {
        console.error('Gmail startup auth initialization failed:', startupAuthInitResult.error);
        // Continue without startup auth - manual OAuth flow will be needed
      } else {
        console.log('✓ Gmail startup auth initialized successfully');
      }

      // CRITICAL: Perform startup token validation and refresh
      console.log('🔐 Validating and refreshing Gmail tokens...');

      try {
        console.log('🔐 Calling gmailStartupAuth.handleStartupAuth()...');
        const startupAuthResult = await gmailStartupAuth.handleStartupAuth();
        console.log('🔐 handleStartupAuth() completed');

        if (startupAuthResult.success) {
          const authResult = startupAuthResult.data;

          if (authResult.success) {
            console.log('✓ Gmail authentication ready:', authResult.message);
            console.log('Auth state:', authResult.authState.status);
          } else {
            console.log('⚠ Gmail needs setup:', authResult.message);
            console.log('Needs reconfiguration:', authResult.needsReconfiguration);
          }
        } else {
          console.error('Startup authentication failed:', startupAuthResult.error);
        }
        console.log('🔐 Startup authentication section completed');
      } catch (error) {
        console.error('Exception during startup authentication:', error);
      }

      // Optionally perform startup token refresh via rotation service
      if (tokenRotationInitResult.success) {
        try {
          console.log('⏰ Starting token refresh process...');
          const startupRefreshResult = await tokenRotationService.startupTokenRefresh();
          if (startupRefreshResult.success) {
            console.log('✓ Startup token refresh completed successfully');
          } else {
            console.log('⚠ Startup token refresh:', startupRefreshResult.error.message);
          }
          console.log('⏰ Token refresh process completed');
        } catch (error) {
          console.error('Exception during startup token refresh:', error);
        }
      } else {
        console.log('⏰ Skipping token refresh (service not initialized)');
      }

      // Note: IPC handlers were already setup early in the initialization process
      // Note: Email and LLM providers will be initialized during OAuth flow
      console.log('🎯 Provider initialization completed - IPC handlers were setup early');
    } catch (error) {
      // Provider initialization failed - logged for debugging
      // eslint-disable-next-line no-console
      console.error('Provider initialization failed:', error);
      console.log(
        '⚠️ Provider initialization failed but IPC handlers were setup early, so UI should still work',
      );
    }
  });
} // End of else block for normal UI mode

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

// Security: Prevent new window creation
app.on('web-contents-created', (_, contents) => {
  contents.setWindowOpenHandler(() => {
    // In production, prevent all new windows
    if (!is.dev) {
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });
});
