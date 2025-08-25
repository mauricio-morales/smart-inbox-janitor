import { ipcMain, app, BrowserWindow, shell } from 'electron';
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
  OpenAIConfig,
} from '@shared/types';
import { OAuthWindow } from './oauth/OAuthWindow';
import { SecureStorageManager } from './security/SecureStorageManager';
import { GmailProvider } from '../providers/email/gmail/GmailProvider';
import { OpenAIProvider } from '../providers/llm/openai/OpenAIProvider';

export function setupIPC(
  emailProvider: EmailProvider,
  llmProvider: LLMProvider,
  storageProvider: StorageProvider,
  secureStorageManager: SecureStorageManager
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

  ipcMain.handle(
    'storage:setEmailMetadata',
    async (_, emailId: string, metadata: EmailMetadata) => {
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
    }
  );

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

  // Shell operations
  ipcMain.handle('shell:openExternal', async (_, url: string) => {
    try {
      await shell.openExternal(url);
    } catch (error) {
      // External URL open error logged internally
      return {
        success: false,
        error: {
          code: 'SHELL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to open URL',
          retryable: false,
          timestamp: new Date(),
          details: { url },
        },
      };
    }
  });

  // OAuth and Authentication operations
  ipcMain.handle('gmail:initiate-oauth', async (_event, credentials?: { clientId: string; clientSecret: string }) => {
    try {
      // Use provided credentials if available
      // TODO: Implement credential validation and temporary storage
      console.log('OAuth initiate with credentials:', credentials ? 'provided' : 'none');
      
      // Get Gmail provider's OAuth manager
      if (!(emailProvider instanceof GmailProvider)) {
        return {
          success: false,
          error: {
            code: 'PROVIDER_ERROR',
            message: 'Gmail provider not available',
            retryable: false,
            timestamp: new Date(),
            details: { provider: emailProvider.name },
          },
        };
      }

      const oauthManager = emailProvider.getOAuthManager();
      if (!oauthManager) {
        return {
          success: false,
          error: {
            code: 'OAUTH_ERROR',
            message: 'OAuth manager not initialized',
            retryable: false,
            timestamp: new Date(),
            details: {},
          },
        };
      }

      // Initiate OAuth flow
      const authResult = oauthManager.initiateAuth();
      if (!authResult.success) {
        return authResult;
      }

      // Create OAuth window
      const oauthWindow = new OAuthWindow('http://localhost:8080');
      const windowResult = oauthWindow.createOAuthWindow({
        title: 'Sign in to Gmail',
        width: 500,
        height: 700,
        modal: true
      });

      if (!windowResult.success) {
        return windowResult;
      }

      // Navigate and wait for callback
      const callbackResult = await oauthWindow.navigateAndWaitForCallback(
        authResult.data.authUrl,
        5 * 60 * 1000 // 5 minute timeout
      );

      if (!callbackResult.success) {
        return callbackResult;
      }

      // Exchange authorization code for tokens
      const tokensResult = await oauthManager.exchangeCode(
        callbackResult.data.code,
        authResult.data.codeVerifier,
        callbackResult.data.state,
        authResult.data.state
      );

      if (!tokensResult.success) {
        return tokensResult;
      }

      // Store tokens securely
      const storeResult = await secureStorageManager.storeGmailTokens(tokensResult.data);
      if (!storeResult.success) {
        return storeResult;
      }

      // Set storage manager for the provider
      emailProvider.setStorageManager(secureStorageManager);

      // Connect the provider
      const connectResult = await emailProvider.connect();
      if (!connectResult.success) {
        return connectResult;
      }

      return {
        success: true,
        data: {
          accountEmail: connectResult.data?.accountInfo?.email,
          connectedAt: connectResult.data?.connectedAt
        }
      };
    } catch (error) {
      // Gmail OAuth error logged internally
      return {
        success: false,
        error: {
          code: 'IPC_ERROR',
          message: error instanceof Error ? error.message : 'Unknown OAuth error',
          retryable: false,
          timestamp: new Date(),
          details: {},
        },
      };
    }
  });

  ipcMain.handle('gmail:check-connection', async () => {
    try {
      if (!(emailProvider instanceof GmailProvider)) {
        return {
          success: false,
          error: {
            code: 'PROVIDER_ERROR',
            message: 'Gmail provider not available',
            retryable: false,
            timestamp: new Date(),
            details: {},
          },
        };
      }

      // Check if we have stored tokens
      const tokensResult = await secureStorageManager.getGmailTokens();
      if (!tokensResult.success || !tokensResult.data) {
        return {
          success: true,
          data: {
            isConnected: false,
            requiresAuth: true
          }
        };
      }

      // Set storage manager and try to connect
      emailProvider.setStorageManager(secureStorageManager);
      const connectResult = await emailProvider.connect();
      
      return {
        success: true,
        data: {
          isConnected: connectResult.success,
          requiresAuth: !connectResult.success,
          accountEmail: connectResult.success ? connectResult.data?.accountInfo?.email : undefined,
          error: connectResult.success ? undefined : connectResult.error?.message
        }
      };
    } catch (error) {
      // Gmail connection check error logged internally
      return {
        success: false,
        error: {
          code: 'IPC_ERROR',
          message: error instanceof Error ? error.message : 'Unknown connection check error',
          retryable: false,
          timestamp: new Date(),
          details: {},
        },
      };
    }
  });

  ipcMain.handle('openai:validate-key', async (_, apiKey: string) => {
    try {
      if (!apiKey || typeof apiKey !== 'string') {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'API key is required',
            retryable: false,
            timestamp: new Date(),
            details: { field: 'apiKey' },
          },
        };
      }

      // Create OpenAI configuration
      const config: OpenAIConfig = {
        apiKey,
        model: 'gpt-4o-mini',
        temperature: 0.1,
        maxTokens: 1000
      };

      // Validate configuration with OpenAI provider
      if (!(llmProvider instanceof OpenAIProvider)) {
        return {
          success: false,
          error: {
            code: 'PROVIDER_ERROR',
            message: 'OpenAI provider not available',
            retryable: false,
            timestamp: new Date(),
            details: { provider: llmProvider.name },
          },
        };
      }

      const validationResult = await llmProvider.validateConfiguration(config);
      if (!validationResult.success) {
        return validationResult;
      }

      // Store the API key securely
      const storeResult = await secureStorageManager.storeOpenAIKey(apiKey);
      if (!storeResult.success) {
        return storeResult;
      }

      // Initialize the provider with the configuration
      const initResult = await llmProvider.initialize(config);
      if (!initResult.success) {
        return initResult;
      }

      // Set storage manager for the provider
      llmProvider.setStorageManager(secureStorageManager);

      // Test connection
      const testResult = await llmProvider.testConnection();
      if (!testResult.success) {
        return testResult;
      }

      return {
        success: true,
        data: {
          apiKeyValid: true,
          modelAvailable: testResult.data?.modelAvailable ?? false,
          responseTimeMs: testResult.data?.responseTimeMs ?? 0,
          testedAt: new Date()
        }
      };
    } catch (error) {
      // OpenAI key validation error logged internally
      return {
        success: false,
        error: {
          code: 'IPC_ERROR',
          message: error instanceof Error ? error.message : 'Unknown validation error',
          retryable: false,
          timestamp: new Date(),
          details: {},
        },
      };
    }
  });

  ipcMain.handle('openai:check-connection', async () => {
    try {
      if (!(llmProvider instanceof OpenAIProvider)) {
        return {
          success: false,
          error: {
            code: 'PROVIDER_ERROR',
            message: 'OpenAI provider not available',
            retryable: false,
            timestamp: new Date(),
            details: {},
          },
        };
      }

      // Check if we have stored API key
      const configResult = await secureStorageManager.getOpenAIConfig();
      if (!configResult.success || !configResult.data) {
        return {
          success: true,
          data: {
            isConfigured: false,
            requiresSetup: true
          }
        };
      }

      // Set storage manager and initialize
      llmProvider.setStorageManager(secureStorageManager);
      const initResult = await llmProvider.initialize(configResult.data);
      
      if (!initResult.success) {
        return {
          success: true,
          data: {
            isConfigured: false,
            requiresSetup: true,
            error: initResult.error.message
          }
        };
      }

      // Test connection
      const testResult = await llmProvider.testConnection();
      
      return {
        success: true,
        data: {
          isConfigured: testResult.success,
          requiresSetup: !testResult.success,
          modelAvailable: testResult.success ? testResult.data.modelAvailable : undefined,
          error: testResult.success ? undefined : testResult.error.message
        }
      };
    } catch (error) {
      // OpenAI connection check error logged internally
      return {
        success: false,
        error: {
          code: 'IPC_ERROR',
          message: error instanceof Error ? error.message : 'Unknown connection check error',
          retryable: false,
          timestamp: new Date(),
          details: {},
        },
      };
    }
  });
}
