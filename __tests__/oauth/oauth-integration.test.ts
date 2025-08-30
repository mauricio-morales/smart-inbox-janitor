/**
 * Integration Tests for OAuth Flow
 *
 * End-to-end tests covering the complete OAuth authentication flow,
 * IPC handler integration, and provider initialization scenarios.
 */

import { GmailProvider } from '../../src/providers/email/gmail/GmailProvider';
import { OpenAIProvider } from '../../src/providers/llm/openai/OpenAIProvider';
import { SecureStorageManager } from '../../src/main/security/SecureStorageManager';
import { OAuthWindow } from '../../src/main/oauth/OAuthWindow';
import { setupIPC } from '../../src/main/ipc';
import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { createSuccessResult, createErrorResult, createProviderError } from '@shared/types';

// Mock all external dependencies
jest.mock('electron', () => ({
  ipcMain: {
    handle: jest.fn(),
    removeHandler: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
  },
}));
jest.mock('googleapis');
jest.mock('openai');
jest.mock('../../src/main/security/SecureStorageManager');
jest.mock('../../src/providers/email/gmail/GmailProvider');
jest.mock('../../src/providers/llm/openai/OpenAIProvider');
jest.mock('../../src/main/oauth/OAuthWindow', () => ({
  OAuthWindow: jest.fn().mockImplementation(() => ({
    createOAuthWindow: jest.fn().mockReturnValue({ success: true, data: {} }),
    navigateAndWaitForCallback: jest.fn().mockResolvedValue({
      success: true,
      data: { code: 'auth-code', state: 'test-state' },
    }),
  })),
}));

const mockIpcMain = ipcMain as jest.Mocked<typeof ipcMain>;
const MockSecureStorageManager = SecureStorageManager as jest.MockedClass<
  typeof SecureStorageManager
>;
const MockGmailProvider = GmailProvider as jest.MockedClass<typeof GmailProvider>;
const MockOpenAIProvider = OpenAIProvider as jest.MockedClass<typeof OpenAIProvider>;

// Cast the OAuthWindow mock
const MockOAuthWindow = OAuthWindow as jest.MockedClass<typeof OAuthWindow>;

// Helper to create mock IpcMainInvokeEvent
function createMockIpcEvent(): IpcMainInvokeEvent {
  return {
    frameId: 1,
    processId: 123,
    sender: {} as any,
    senderFrame: {} as any,
    returnValue: undefined,
    preventDefault: jest.fn(),
    reply: jest.fn(),
  };
}

describe('OAuth Integration', () => {
  let mockSecureStorage: jest.Mocked<SecureStorageManager>;
  let mockGmailProvider: jest.Mocked<GmailProvider>;
  let mockOpenAIProvider: jest.Mocked<OpenAIProvider>;
  let mockStorageProvider: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock SecureStorageManager
    mockSecureStorage = new MockSecureStorageManager() as jest.Mocked<SecureStorageManager>;
    mockSecureStorage.storeGmailTokens = jest
      .fn()
      .mockResolvedValue(createSuccessResult(undefined));
    mockSecureStorage.getGmailTokens = jest.fn().mockResolvedValue(createSuccessResult(null));
    mockSecureStorage.getGmailCredentials = jest.fn().mockResolvedValue(
      createSuccessResult({
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
      }),
    );
    mockSecureStorage.storeGmailCredentials = jest
      .fn()
      .mockResolvedValue(createSuccessResult(undefined));
    mockSecureStorage.storeOpenAIKey = jest.fn().mockResolvedValue(createSuccessResult(undefined));
    mockSecureStorage.getOpenAIConfig = jest.fn().mockResolvedValue(createSuccessResult(null));

    // Mock GmailProvider
    mockGmailProvider = new MockGmailProvider() as jest.Mocked<GmailProvider>;
    mockGmailProvider.getOAuthManager = jest.fn();
    mockGmailProvider.setStorageManager = jest.fn();
    mockGmailProvider.initialize = jest.fn().mockResolvedValue(createSuccessResult(undefined));
    mockGmailProvider.connect = jest.fn().mockResolvedValue(
      createSuccessResult({
        connected: true,
        connectedAt: new Date(),
        accountInfo: {
          email: 'test@gmail.com',
        },
        providerInfo: {
          provider: 'gmail',
          accountEmail: 'test@gmail.com',
        },
      }),
    );

    // Mock OpenAIProvider
    mockOpenAIProvider = new MockOpenAIProvider() as jest.Mocked<OpenAIProvider>;
    mockOpenAIProvider.validateConfiguration = jest
      .fn()
      .mockResolvedValue(createSuccessResult(true));
    mockOpenAIProvider.initialize = jest.fn().mockResolvedValue(createSuccessResult(undefined));
    mockOpenAIProvider.setStorageManager = jest.fn();
    mockOpenAIProvider.testConnection = jest.fn().mockResolvedValue(
      createSuccessResult({
        connected: true,
        responseTimeMs: 150,
        apiKeyValid: true,
        modelAvailable: true,
        testedAt: new Date(),
      }),
    );

    // Mock storage provider
    mockStorageProvider = {
      getUserRules: jest.fn().mockResolvedValue(createSuccessResult({})),
      updateUserRules: jest.fn().mockResolvedValue(createSuccessResult(undefined)),
      getConfig: jest.fn().mockResolvedValue(createSuccessResult({})),
      updateConfig: jest.fn().mockResolvedValue(createSuccessResult(undefined)),
    };

    // Setup IPC handlers
    setupIPC(mockGmailProvider, mockOpenAIProvider, mockStorageProvider, mockSecureStorage);
  });

  describe('Gmail OAuth Flow Integration', () => {
    it('should complete full OAuth flow successfully', async () => {
      // Mock OAuth manager
      const mockOAuthManager = {
        initiateAuth: jest.fn().mockReturnValue(
          createSuccessResult({
            authUrl: 'https://accounts.google.com/oauth/authorize',
            codeVerifier: 'test-verifier',
            state: 'test-state',
          }),
        ),
        exchangeCode: jest.fn().mockResolvedValue(
          createSuccessResult({
            accessToken: 'ya29.test-token',
            refreshToken: 'test-refresh-token',
            expiryDate: Date.now() + 3600000,
            scope: 'gmail-scope',
            tokenType: 'Bearer',
          }),
        ),
      };

      mockGmailProvider.getOAuthManager.mockReturnValue(mockOAuthManager as any);

      // Get the IPC handler
      const gmailOAuthHandler = mockIpcMain.handle.mock.calls.find(
        ([event]) => event === 'gmail:initiate-oauth',
      )?.[1];

      expect(gmailOAuthHandler).toBeDefined();

      // OAuthWindow is already mocked at module level

      // Execute OAuth flow with proper credentials
      const credentials = {
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
      };
      const result = await gmailOAuthHandler!(createMockIpcEvent(), credentials);

      // Debug the actual result
      if (!result.success) {
        console.log('OAuth flow failed with error:', result.error);
      }

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toMatchObject({
          accountEmail: 'test@gmail.com',
          connectedAt: expect.any(Date),
        });
      }

      // Verify flow steps
      expect(mockGmailProvider.getOAuthManager).toHaveBeenCalled();
      expect(mockOAuthManager.initiateAuth).toHaveBeenCalled();
      expect(mockOAuthManager.exchangeCode).toHaveBeenCalledWith(
        'auth-code',
        'test-verifier',
        'test-state',
        'test-state',
      );
      expect(mockSecureStorage.storeGmailTokens).toHaveBeenCalled();
      expect(mockGmailProvider.setStorageManager).toHaveBeenCalledWith(mockSecureStorage);
      expect(mockGmailProvider.connect).toHaveBeenCalled();

      // OAuth flow completed successfully
    });

    it('should handle OAuth initialization failure', async () => {
      mockGmailProvider.getOAuthManager.mockReturnValue(null);

      const gmailOAuthHandler = mockIpcMain.handle.mock.calls.find(
        ([event]) => event === 'gmail:initiate-oauth',
      )?.[1];

      const result = await gmailOAuthHandler!(createMockIpcEvent(), 'test-api-key');

      expect(result.success).toBe(false);
      expect(result.error.code).toBe('OAUTH_ERROR');
      expect(result.error.message).toContain('OAuth manager not initialized');
    });

    it('should handle token storage failure', async () => {
      const mockOAuthManager = {
        initiateAuth: jest.fn().mockReturnValue(
          createSuccessResult({
            authUrl: 'https://accounts.google.com/oauth/authorize',
            codeVerifier: 'test-verifier',
            state: 'test-state',
          }),
        ),
        exchangeCode: jest.fn().mockResolvedValue(
          createSuccessResult({
            accessToken: 'ya29.test-token',
            refreshToken: 'test-refresh-token',
            expiryDate: Date.now() + 3600000,
            scope: 'gmail-scope',
            tokenType: 'Bearer',
          }),
        ),
      };

      mockGmailProvider.getOAuthManager.mockReturnValue(mockOAuthManager as any);
      mockSecureStorage.storeGmailTokens.mockResolvedValue(
        createErrorResult(createProviderError(new Error('Storage failed'), 'STORAGE_ERROR')),
      );

      // OAuthWindow is already mocked at module level

      const gmailOAuthHandler = mockIpcMain.handle.mock.calls.find(
        ([event]) => event === 'gmail:initiate-oauth',
      )?.[1];

      const result = await gmailOAuthHandler!(createMockIpcEvent(), 'test-api-key');

      expect(result.success).toBe(false);
      expect(result.error.message).toContain('Storage failed');

      // Test completed successfully
    });
  });

  describe('Gmail Connection Check Integration', () => {
    it('should return connected status when tokens exist', async () => {
      mockSecureStorage.getGmailTokens.mockResolvedValue(
        createSuccessResult({
          accessToken: 'ya29.test-token',
          refreshToken: 'test-refresh-token',
          expiryDate: Date.now() + 3600000,
          scope: 'gmail-scope',
          tokenType: 'Bearer',
        }),
      );

      const checkHandler = mockIpcMain.handle.mock.calls.find(
        ([event]) => event === 'gmail:check-connection',
      )?.[1];

      const result = await checkHandler!(createMockIpcEvent(), 'test-api-key');

      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        isConnected: true,
        requiresAuth: false,
        accountEmail: 'test@gmail.com',
      });

      expect(mockGmailProvider.setStorageManager).toHaveBeenCalledWith(mockSecureStorage);
      expect(mockGmailProvider.connect).toHaveBeenCalled();
    });

    it('should return requires auth when no tokens exist', async () => {
      mockSecureStorage.getGmailTokens.mockResolvedValue(createSuccessResult(null));

      const checkHandler = mockIpcMain.handle.mock.calls.find(
        ([event]) => event === 'gmail:check-connection',
      )?.[1];

      const result = await checkHandler!(createMockIpcEvent(), 'test-api-key');

      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        isConnected: false,
        requiresAuth: true,
      });

      expect(mockGmailProvider.connect).not.toHaveBeenCalled();
    });

    it('should handle connection failure with expired tokens', async () => {
      mockSecureStorage.getGmailTokens.mockResolvedValue(
        createSuccessResult({
          accessToken: 'ya29.expired-token',
          refreshToken: 'test-refresh-token',
          expiryDate: Date.now() - 3600000, // Expired
          scope: 'gmail-scope',
          tokenType: 'Bearer',
        }),
      );

      mockGmailProvider.connect.mockResolvedValue(
        createErrorResult(createProviderError(new Error('Token expired'), 'AUTHENTICATION_ERROR')),
      );

      const checkHandler = mockIpcMain.handle.mock.calls.find(
        ([event]) => event === 'gmail:check-connection',
      )?.[1];

      const result = await checkHandler!(createMockIpcEvent(), 'test-api-key');

      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        isConnected: false,
        requiresAuth: true,
        error: 'Token expired',
      });
    });
  });

  describe('OpenAI Integration', () => {
    it('should validate and store OpenAI API key successfully', async () => {
      const testApiKey = 'sk-test-api-key-1234567890';

      const validateHandler = mockIpcMain.handle.mock.calls.find(
        ([event]) => event === 'openai:validate-key',
      )?.[1];

      const result = await validateHandler!(createMockIpcEvent(), testApiKey);

      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        apiKeyValid: true,
        modelAvailable: true,
        responseTimeMs: 150,
        testedAt: expect.any(Date),
      });

      expect(mockOpenAIProvider.validateConfiguration).toHaveBeenCalledWith({
        apiKey: testApiKey,
        model: 'gpt-4o-mini',
        temperature: 0.1,
        maxTokens: 1000,
      });
      expect(mockSecureStorage.storeOpenAIKey).toHaveBeenCalledWith(testApiKey);
      expect(mockOpenAIProvider.initialize).toHaveBeenCalled();
      expect(mockOpenAIProvider.setStorageManager).toHaveBeenCalledWith(mockSecureStorage);
      expect(mockOpenAIProvider.testConnection).toHaveBeenCalled();
    });

    it('should reject invalid API key format', async () => {
      const invalidApiKey = 'invalid-key-format';

      const validateHandler = mockIpcMain.handle.mock.calls.find(
        ([event]) => event === 'openai:validate-key',
      )?.[1];

      const result = await validateHandler!(createMockIpcEvent(), invalidApiKey);

      expect(result.success).toBe(false);
      expect(result.error.code).toBe('VALIDATION_ERROR');
      expect(result.error.message).toContain('API key is required and must start with \"sk-\"');
    });

    it('should handle OpenAI validation failure', async () => {
      const testApiKey = 'sk-invalid-api-key';

      mockOpenAIProvider.validateConfiguration.mockResolvedValue(
        createErrorResult(createProviderError(new Error('Invalid API key'), 'VALIDATION_ERROR')),
      );

      const validateHandler = mockIpcMain.handle.mock.calls.find(
        ([event]) => event === 'openai:validate-key',
      )?.[1];

      const result = await validateHandler!(createMockIpcEvent(), testApiKey);

      expect(result.success).toBe(false);
      expect(result.error.message).toContain('Invalid API key');
    });

    it('should handle storage failure during OpenAI setup', async () => {
      const testApiKey = 'sk-test-api-key-1234567890';

      mockSecureStorage.storeOpenAIKey.mockResolvedValue(
        createErrorResult(createProviderError(new Error('Storage failed'), 'STORAGE_ERROR')),
      );

      const validateHandler = mockIpcMain.handle.mock.calls.find(
        ([event]) => event === 'openai:validate-key',
      )?.[1];

      const result = await validateHandler!(createMockIpcEvent(), testApiKey);

      expect(result.success).toBe(false);
      expect(result.error.message).toContain('Storage failed');
    });
  });

  describe('OpenAI Connection Check Integration', () => {
    it('should return configured status when API key exists', async () => {
      mockSecureStorage.getOpenAIConfig.mockResolvedValue(
        createSuccessResult({
          apiKey: 'sk-test-key',
          model: 'gpt-4o-mini',
          temperature: 0.1,
          maxTokens: 1000,
        }),
      );

      const checkHandler = mockIpcMain.handle.mock.calls.find(
        ([event]) => event === 'openai:check-connection',
      )?.[1];

      const result = await checkHandler!(createMockIpcEvent(), 'test-api-key');

      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        isConfigured: true,
        requiresSetup: false,
        modelAvailable: true,
      });

      expect(mockOpenAIProvider.setStorageManager).toHaveBeenCalledWith(mockSecureStorage);
      expect(mockOpenAIProvider.initialize).toHaveBeenCalled();
      expect(mockOpenAIProvider.testConnection).toHaveBeenCalled();
    });

    it('should return requires setup when no API key exists', async () => {
      mockSecureStorage.getOpenAIConfig.mockResolvedValue(createSuccessResult(null));

      const checkHandler = mockIpcMain.handle.mock.calls.find(
        ([event]) => event === 'openai:check-connection',
      )?.[1];

      const result = await checkHandler!(createMockIpcEvent(), 'test-api-key');

      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        isConfigured: false,
        requiresSetup: true,
      });

      expect(mockOpenAIProvider.initialize).not.toHaveBeenCalled();
    });

    it('should handle initialization failure with stored config', async () => {
      mockSecureStorage.getOpenAIConfig.mockResolvedValue(
        createSuccessResult({
          apiKey: 'sk-invalid-key',
          model: 'gpt-4o-mini',
          temperature: 0.1,
          maxTokens: 1000,
        }),
      );

      mockOpenAIProvider.initialize.mockResolvedValue(
        createErrorResult(
          createProviderError(new Error('Invalid API key'), 'AUTHENTICATION_ERROR'),
        ),
      );

      const checkHandler = mockIpcMain.handle.mock.calls.find(
        ([event]) => event === 'openai:check-connection',
      )?.[1];

      const result = await checkHandler!(createMockIpcEvent(), 'test-api-key');

      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        isConfigured: false,
        requiresSetup: true,
        error: 'Invalid API key',
      });
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle IPC handler exceptions gracefully', async () => {
      mockGmailProvider.getOAuthManager.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const gmailOAuthHandler = mockIpcMain.handle.mock.calls.find(
        ([event]) => event === 'gmail:initiate-oauth',
      )?.[1];

      const result = await gmailOAuthHandler!(createMockIpcEvent(), 'test-api-key');

      expect(result.success).toBe(false);
      expect(result.error.code).toBe('IPC_ERROR');
      expect(result.error.message).toContain('Unexpected error');
    });

    it('should handle provider type mismatch', async () => {
      // Use a mock provider that's not GmailProvider
      const wrongProvider = {
        name: 'wrong-provider',
        initialize: jest.fn().mockResolvedValue(createSuccessResult(undefined)),
      };

      setupIPC(wrongProvider as any, mockOpenAIProvider, mockStorageProvider, mockSecureStorage);

      const gmailOAuthHandler = mockIpcMain.handle.mock.calls.find(
        ([event]) => event === 'gmail:initiate-oauth',
      )?.[1];

      const result = await gmailOAuthHandler!(createMockIpcEvent(), {
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
      });

      expect(result.success).toBe(false);
      expect(result.error.code).toBe('OAUTH_ERROR');
      expect(result.error.message).toContain('OAuth manager not initialized');
    });
  });

  describe('Security Integration', () => {
    it('should validate API key format before processing', async () => {
      const emptyApiKey = '';

      const validateHandler = mockIpcMain.handle.mock.calls.find(
        ([event]) => event === 'openai:validate-key',
      )?.[1];

      const result = await validateHandler!(createMockIpcEvent(), emptyApiKey);

      expect(result.success).toBe(false);
      expect(result.error.code).toBe('VALIDATION_ERROR');

      // Should not call any provider methods with invalid input
      expect(mockOpenAIProvider.validateConfiguration).not.toHaveBeenCalled();
      expect(mockSecureStorage.storeOpenAIKey).not.toHaveBeenCalled();
    });

    it('should handle null/undefined API key gracefully', async () => {
      const validateHandler = mockIpcMain.handle.mock.calls.find(
        ([event]) => event === 'openai:validate-key',
      )?.[1];

      const nullResult = await validateHandler!(createMockIpcEvent(), null);
      const undefinedResult = await validateHandler!(createMockIpcEvent(), undefined);

      expect(nullResult.success).toBe(false);
      expect(undefinedResult.success).toBe(false);

      expect(nullResult.error.code).toBe('VALIDATION_ERROR');
      expect(undefinedResult.error.code).toBe('VALIDATION_ERROR');
    });
  });
});
