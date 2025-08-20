import { ipcMain, app, BrowserWindow } from 'electron';
import type {
  EmailProvider,
  StorageProvider,
  LLMProvider,
  ListOptions,
  GetEmailOptions,
  BatchModifyRequest,
  BatchDeleteRequest,
  UserRules,
  ClassifyInput,
  SearchOptions,
  EmailMetadata,
  StoredAppConfig,
} from '@shared/types';

export function setupIPC(
  emailProvider: EmailProvider,
  llmProvider: LLMProvider,
  storageProvider: StorageProvider
): void {
  // Email provider operations
  ipcMain.handle('email:list', async (_, options?: ListOptions) => {
    try {
      return await emailProvider.list(options);
    } catch (error) {
      // console.error('Email list error:', error);
      return {
        success: false,
        error: {
          code: 'IPC_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          retryable: false,
          timestamp: new Date(),
          details: {},
        },
      };
    }
  });

  ipcMain.handle('email:get', async (_, emailId: string, options?: GetEmailOptions) => {
    try {
      return await emailProvider.get(emailId, options);
    } catch (error) {
      // console.error('Email get error:', error);
      return {
        success: false,
        error: {
          code: 'IPC_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          retryable: false,
          timestamp: new Date(),
          details: {},
        },
      };
    }
  });

  ipcMain.handle('email:batchModify', async (_, request: BatchModifyRequest) => {
    try {
      return await emailProvider.batchModify(request);
    } catch (error) {
      // console.error('Email batch modify error:', error);
      return {
        success: false,
        error: {
          code: 'IPC_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          retryable: false,
          timestamp: new Date(),
          details: {},
        },
      };
    }
  });

  ipcMain.handle('email:batchDelete', async (_, request: BatchDeleteRequest) => {
    try {
      return await emailProvider.batchDelete(request);
    } catch (error) {
      // console.error('Email batch delete error:', error);
      return {
        success: false,
        error: {
          code: 'IPC_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          retryable: false,
          timestamp: new Date(),
          details: {},
        },
      };
    }
  });

  ipcMain.handle('email:search', async (_, query: string, options?: SearchOptions) => {
    try {
      return await emailProvider.search(query, options);
    } catch (error) {
      // console.error('Email search error:', error);
      return {
        success: false,
        error: {
          code: 'IPC_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          retryable: false,
          timestamp: new Date(),
          details: {},
        },
      };
    }
  });

  ipcMain.handle('email:getFolders', async () => {
    try {
      return await emailProvider.getFolders();
    } catch (error) {
      // console.error('Get folders error:', error);
      return {
        success: false,
        error: {
          code: 'IPC_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          retryable: false,
          timestamp: new Date(),
          details: {},
        },
      };
    }
  });

  // Storage provider operations
  ipcMain.handle('storage:getUserRules', async () => {
    try {
      return await storageProvider.getUserRules();
    } catch (error) {
      // console.error('Get user rules error:', error);
      return {
        success: false,
        error: {
          code: 'IPC_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          retryable: false,
          timestamp: new Date(),
          details: {},
        },
      };
    }
  });

  ipcMain.handle('storage:updateUserRules', async (_, rules: UserRules) => {
    try {
      return await storageProvider.updateUserRules(rules);
    } catch (error) {
      // console.error('Update user rules error:', error);
      return {
        success: false,
        error: {
          code: 'IPC_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          retryable: false,
          timestamp: new Date(),
          details: {},
        },
      };
    }
  });

  ipcMain.handle('storage:getEmailMetadata', async (_, emailId: string) => {
    try {
      return await storageProvider.getEmailMetadata(emailId);
    } catch (error) {
      // console.error('Get email metadata error:', error);
      return {
        success: false,
        error: {
          code: 'IPC_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          retryable: false,
          timestamp: new Date(),
          details: {},
        },
      };
    }
  });

  ipcMain.handle('storage:setEmailMetadata', async (_, emailId: string, metadata: EmailMetadata) => {
    try {
      return await storageProvider.setEmailMetadata(emailId, metadata);
    } catch (error) {
      // console.error('Set email metadata error:', error);
      return {
        success: false,
        error: {
          code: 'IPC_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          retryable: false,
          timestamp: new Date(),
          details: {},
        },
      };
    }
  });

  ipcMain.handle('storage:getConfig', async () => {
    try {
      return await storageProvider.getConfig();
    } catch (error) {
      // console.error('Get config error:', error);
      return {
        success: false,
        error: {
          code: 'IPC_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          retryable: false,
          timestamp: new Date(),
          details: {},
        },
      };
    }
  });

  ipcMain.handle('storage:updateConfig', async (_, config: Partial<StoredAppConfig>) => {
    try {
      return await storageProvider.updateConfig(config);
    } catch (error) {
      // console.error('Update config error:', error);
      return {
        success: false,
        error: {
          code: 'IPC_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          retryable: false,
          timestamp: new Date(),
          details: {},
        },
      };
    }
  });

  // LLM provider operations
  ipcMain.handle('llm:classify', async (_, input: ClassifyInput) => {
    try {
      return await llmProvider.classifyEmails(input);
    } catch (error) {
      // console.error('LLM classify error:', error);
      return {
        success: false,
        error: {
          code: 'IPC_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          retryable: false,
          timestamp: new Date(),
          details: {},
        },
      };
    }
  });

  ipcMain.handle('llm:healthCheck', async () => {
    try {
      return await llmProvider.healthCheck();
    } catch (error) {
      // console.error('LLM health check error:', error);
      return {
        success: false,
        error: {
          code: 'IPC_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          retryable: false,
          timestamp: new Date(),
          details: {},
        },
      };
    }
  });

  // Application-level operations
  ipcMain.handle('app:getVersion', () => {
    return app.getVersion();
  });

  ipcMain.handle('app:quit', () => {
    app.quit();
  });

  ipcMain.handle('app:minimize', () => {
    const window = BrowserWindow.getFocusedWindow();
    if (window) {
      window.minimize();
    }
  });

  ipcMain.handle('app:maximize', () => {
    const window = BrowserWindow.getFocusedWindow();
    if (window) {
      if (window.isMaximized()) {
        window.unmaximize();
      } else {
        window.maximize();
      }
    }
  });

  ipcMain.handle('app:unmaximize', () => {
    const window = BrowserWindow.getFocusedWindow();
    if (window) {
      window.unmaximize();
    }
  });

  ipcMain.handle('app:isMaximized', () => {
    const window = BrowserWindow.getFocusedWindow();
    return window ? window.isMaximized() : false;
  });
}
