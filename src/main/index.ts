import { app, BrowserWindow } from 'electron';
import { electronApp, optimizer, is } from '@electron-toolkit/utils';
import { config } from 'dotenv';
import { createMainWindow } from './window';
import { setupIPC } from './ipc';

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

  // Initialize providers before setting up IPC
  try {
    await storageProvider.initialize({ databasePath: './data/app.db' });

    // Initialize secure storage manager with the storage provider
    console.log('Initializing secure storage manager...');
    const secureStorageInitResult = await secureStorageManager.initialize({
      storageProvider,
      enableTokenRotation: true,
      sessionId: `session-${Date.now()}`,
      userId: 'default-user',
    });

    if (!secureStorageInitResult.success) {
      console.error('Failed to initialize secure storage manager:', secureStorageInitResult.error);
      console.error('Error details:', JSON.stringify(secureStorageInitResult.error, null, 2));
    } else {
      console.log('Secure storage manager initialized successfully');
    }

    // PATTERN: Gmail startup authentication integration
    // Initialize startup authentication services
    console.log('Initializing startup authentication services...');

    // Create OAuth manager for Gmail authentication
    const gmailOAuthConfig = {
      clientId: process.env.GMAIL_CLIENT_ID || '',
      clientSecret: process.env.GMAIL_CLIENT_SECRET || '',
      redirectUri: 'http://localhost:8080/oauth/callback',
    };
    const gmailOAuthManager = new GmailOAuthManager(gmailOAuthConfig);
    const gmailOAuthInitResult = gmailOAuthManager.initialize();

    if (!gmailOAuthInitResult.success) {
      console.error('Gmail OAuth manager initialization failed:', gmailOAuthInitResult.error);
    }

    // Create token rotation service
    const tokenRotationService = new TokenRotationService(secureStorageManager);
    const tokenRotationInitResult = await tokenRotationService.initialize();

    if (!tokenRotationInitResult.success) {
      console.error('Token rotation service initialization failed:', tokenRotationInitResult.error);
    }

    // Create startup auth service
    const gmailStartupAuth = new GmailStartupAuth(gmailOAuthManager, secureStorageManager);
    const startupAuthInitResult = await gmailStartupAuth.initialize();

    if (!startupAuthInitResult.success) {
      console.error('Gmail startup auth initialization failed:', startupAuthInitResult.error);
    } else {
      console.log('Gmail startup auth initialized successfully');
    }

    // CRITICAL: Perform startup token validation and refresh
    console.log('Validating and refreshing Gmail tokens...');

    try {
      const startupAuthResult = await gmailStartupAuth.handleStartupAuth();

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
    } catch (error) {
      console.error('Exception during startup authentication:', error);
    }

    // Optionally perform startup token refresh via rotation service
    if (tokenRotationInitResult.success) {
      try {
        const startupRefreshResult = await tokenRotationService.startupTokenRefresh();
        if (startupRefreshResult.success) {
          console.log('✓ Startup token refresh completed successfully');
        } else {
          console.log('⚠ Startup token refresh:', startupRefreshResult.error.message);
        }
      } catch (error) {
        console.error('Exception during startup token refresh:', error);
      }
    }

    // Setup IPC handlers AFTER all services are initialized
    setupIPC(emailProvider, llmProvider, storageProvider, secureStorageManager);

    // Note: Email and LLM providers will be initialized during OAuth flow
  } catch (error) {
    // Provider initialization failed - logged for debugging
    // eslint-disable-next-line no-console
    console.error('Provider initialization failed:', error);
  }
});

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
