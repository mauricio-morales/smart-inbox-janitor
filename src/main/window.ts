import { BrowserWindow, shell } from 'electron';
import { join } from 'path';
import { is } from '@electron-toolkit/utils';

export function createMainWindow(): BrowserWindow {
  // Create the browser window with secure defaults
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      // Security: Enable context isolation and disable node integration
      sandbox: false, // We need access to Node.js APIs in preload
      nodeIntegration: false,
      nodeIntegrationInWorker: false,
      nodeIntegrationInSubFrames: false,
      contextIsolation: true,
      webSecurity: true,
    },
  });

  // Show window when ready to prevent visual flash
  mainWindow.on('ready-to-show', () => {
    mainWindow.show();

    // Focus the window on creation
    if (is.dev) {
      mainWindow.webContents.openDevTools();
    }
  });

  // Handle external links securely - open in default browser
  mainWindow.webContents.setWindowOpenHandler((details) => {
    void shell.openExternal(details.url);
    return { action: 'deny' };
  });

  // Security: Handle navigation attempts
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);

    // Allow navigation in development
    if (is.dev && parsedUrl.origin === 'http://localhost:5173') {
      return;
    }

    // Prevent navigation to external sites in production
    if (!is.dev) {
      event.preventDefault();
    }
  });

  // Load the app - development server or built files
  if (is.dev && process.env['ELECTRON_RENDERER_URL'] !== undefined) {
    void mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    void mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }

  // macOS: Handle window close behavior
  mainWindow.on('closed', () => {
    // On macOS, keep the app running even when all windows are closed
    if (process.platform !== 'darwin') {
      // On other platforms, quit the app when main window is closed
    }
  });

  return mainWindow;
}
