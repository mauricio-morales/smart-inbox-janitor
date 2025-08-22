import { app, BrowserWindow } from 'electron';
import { electronApp, optimizer, is } from '@electron-toolkit/utils';
import { createMainWindow } from './window';
import { setupIPC } from './ipc';
import { GmailProviderStub } from '@providers/email/gmail/GmailProvider';
import { OpenAIProviderStub } from '@providers/llm/openai/OpenAIProvider';
import { SQLiteProvider } from '@providers/storage/sqlite/SQLiteProvider';

// Initialize provider stubs - will be replaced with real implementations later
const emailProvider = new GmailProviderStub();
const llmProvider = new OpenAIProviderStub();
const storageProvider = new SQLiteProvider();

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
  setupIPC(emailProvider, llmProvider, storageProvider);

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
    // Note: These are stub implementations that will return "not implemented" errors
    await emailProvider.initialize();
    await llmProvider.initialize();
    await storageProvider.initialize({ databasePath: './data/app.db' });
  } catch {
    // Provider initialization failed (expected for stubs)
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
