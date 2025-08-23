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

  // Setup IPC handlers for provider operations
  setupIPC(emailProvider, llmProvider, storageProvider, secureStorageManager);

  // Create the main application window
  createMainWindow();

  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });

  // Initialize providers after window is created
  try {
    await storageProvider.initialize({ databasePath: './data/app.db' });
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
