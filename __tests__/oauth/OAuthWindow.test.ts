/**
 * Tests for OAuthWindow
 *
 * Comprehensive unit tests covering secure window creation, navigation handling,
 * callback parsing, and security measures for OAuth flows.
 */

import { OAuthWindow } from '../../src/main/oauth/OAuthWindow';
import { BrowserWindow, shell } from 'electron';
import { SecurityError, ValidationError, NetworkError } from '@shared/types';

// Mock Electron dependencies
jest.mock('electron', () => ({
  BrowserWindow: jest.fn(),
  shell: {
    openExternal: jest.fn(),
  },
}));

const MockBrowserWindow = BrowserWindow as jest.MockedClass<typeof BrowserWindow>;
const mockShell = shell as jest.Mocked<typeof shell>;

describe('OAuthWindow', () => {
  let oauthWindow: OAuthWindow;
  let mockWindow: jest.Mocked<Partial<BrowserWindow>>;
  let mockWebContents: jest.Mocked<any>;

  const testRedirectUri = 'http://localhost:8080';

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock WebContents
    mockWebContents = {
      setWindowOpenHandler: jest.fn(),
      on: jest.fn(),
      session: {
        on: jest.fn(),
      },
      loadURL: jest.fn().mockResolvedValue(undefined),
    };

    // Mock BrowserWindow instance
    mockWindow = {
      isDestroyed: jest.fn().mockReturnValue(false),
      close: jest.fn(),
      on: jest.fn(),
      webContents: mockWebContents,
    };

    // Mock BrowserWindow constructor
    MockBrowserWindow.mockImplementation(() => mockWindow as BrowserWindow);

    oauthWindow = new OAuthWindow(testRedirectUri);
  });

  describe('constructor', () => {
    it('should create instance with redirect URI', () => {
      expect(oauthWindow).toBeInstanceOf(OAuthWindow);
      expect(oauthWindow.name).toBe('oauth-window-manager');
      expect(oauthWindow.version).toBe('1.0.0');
    });
  });

  describe('createOAuthWindow', () => {
    it('should create secure BrowserWindow with default options', () => {
      const result = oauthWindow.createOAuthWindow();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(mockWindow);
      }

      expect(MockBrowserWindow).toHaveBeenCalledWith({
        width: 500,
        height: 700,
        title: 'Sign in to Gmail',
        modal: false,
        parent: undefined,
        show: true,
        center: true,
        resizable: true,
        minimizable: false,
        maximizable: false,
        fullscreenable: false,
        autoHideMenuBar: true,
        backgroundColor: '#ffffff',
        titleBarStyle: expect.any(String),
        webPreferences: {
          contextIsolation: true,
          nodeIntegration: false,
          nodeIntegrationInWorker: false,
          nodeIntegrationInSubFrames: false,
          sandbox: true,
          experimentalFeatures: false,
          enableBlinkFeatures: '',
          disableBlinkFeatures: '',
          webSecurity: true,
          allowRunningInsecureContent: false,
          plugins: false,
          java: false,
          images: true,
          textAreasAreResizable: false,
          webgl: false,
          webaudio: false,
          spellcheck: false,
          scrollBounce: false,
          preload: undefined,
        },
      });
    });

    it('should create window with custom options', () => {
      const options = {
        width: 800,
        height: 900,
        title: 'Custom OAuth',
        modal: true,
      };

      const result = oauthWindow.createOAuthWindow(options);

      expect(result.success).toBe(true);
      expect(MockBrowserWindow).toHaveBeenCalledWith(
        expect.objectContaining({
          width: 800,
          height: 900,
          title: 'Custom OAuth',
          modal: true,
        }),
      );
    });

    it('should close existing window before creating new one', () => {
      // Create first window
      const result1 = oauthWindow.createOAuthWindow();
      expect(result1.success).toBe(true);

      // Create second window
      const result2 = oauthWindow.createOAuthWindow();
      expect(result2.success).toBe(true);

      // First window should be closed
      expect(mockWindow.close).toHaveBeenCalled();
    });

    it('should setup security handlers', () => {
      const result = oauthWindow.createOAuthWindow();

      expect(result.success).toBe(true);
      expect(mockWebContents.setWindowOpenHandler).toHaveBeenCalled();
      expect(mockWebContents.on).toHaveBeenCalledWith('certificate-error', expect.any(Function));
      expect(mockWebContents.on).toHaveBeenCalledWith('will-navigate', expect.any(Function));
      expect(mockWebContents.on).toHaveBeenCalledWith('will-redirect', expect.any(Function));
      expect(mockWebContents.on).toHaveBeenCalledWith('new-window', expect.any(Function));
      expect(mockWebContents.session.on).toHaveBeenCalledWith(
        'will-download',
        expect.any(Function),
      );
    });

    it('should handle window creation errors', () => {
      MockBrowserWindow.mockImplementation(() => {
        throw new Error('Window creation failed');
      });

      const result = oauthWindow.createOAuthWindow();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(SecurityError);
        expect(result.error.message).toContain('Failed to create OAuth window');
      }
    });
  });

  describe('navigateAndWaitForCallback', () => {
    beforeEach(() => {
      oauthWindow.createOAuthWindow();
    });

    it('should navigate to auth URL and wait for callback', async () => {
      const authUrl = 'https://accounts.google.com/oauth/authorize?client_id=test';

      // Simulate successful callback after navigation
      mockWebContents.loadURL.mockImplementation(async () => {
        // Simulate redirect to callback URL
        setTimeout(() => {
          const redirectHandler = mockWebContents.on.mock.calls.find(
            ([event]) => event === 'will-redirect',
          )?.[1];

          if (redirectHandler) {
            const mockEvent: { preventDefault: jest.Mock } = { preventDefault: jest.fn() };
            const callbackUrl = 'http://localhost:8080?code=test-code&state=test-state';
            redirectHandler(mockEvent, callbackUrl);
          }
        }, 10);
      });

      const resultPromise = oauthWindow.navigateAndWaitForCallback(authUrl);

      // Fast-forward timers
      jest.advanceTimersByTime(100);

      const result = await resultPromise;

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toMatchObject({
          code: 'test-code',
          state: 'test-state',
        });
      }
      expect(mockWebContents.loadURL).toHaveBeenCalledWith(authUrl);
    });

    it('should validate auth URL for security', async () => {
      const invalidUrl = 'http://evil.com/oauth';

      const result = await oauthWindow.navigateAndWaitForCallback(invalidUrl);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(SecurityError);
        expect(result.error.message).toContain('Authorization URL must be Google domain');
      }
    });

    it('should require HTTPS for auth URL', async () => {
      const httpUrl = 'http://accounts.google.com/oauth/authorize';

      const result = await oauthWindow.navigateAndWaitForCallback(httpUrl);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(SecurityError);
        expect(result.error.message).toContain('Authorization URL must use HTTPS');
      }
    });

    it('should timeout if callback takes too long', async () => {
      jest.useFakeTimers();

      const authUrl = 'https://accounts.google.com/oauth/authorize';
      const timeoutMs = 5000;

      const resultPromise = oauthWindow.navigateAndWaitForCallback(authUrl, timeoutMs);

      // Fast-forward past timeout
      jest.advanceTimersByTime(timeoutMs + 1000);

      const result = await resultPromise;

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(NetworkError);
        expect(result.error.message).toContain('OAuth flow timed out');
      }

      jest.useRealTimers();
    });

    it('should handle user closing window', async () => {
      const authUrl = 'https://accounts.google.com/oauth/authorize';

      // Simulate user closing window
      mockWebContents.loadURL.mockImplementation(async () => {
        setTimeout(() => {
          const closeHandler = mockWindow.on?.mock.calls.find(([event]) => event === 'closed')?.[1];

          if (closeHandler) {
            closeHandler();
          }
        }, 10);
      });

      const result = await oauthWindow.navigateAndWaitForCallback(authUrl);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toContain('OAuth window closed by user');
      }
    });

    it('should fail if window not available', async () => {
      // Destroy the window
      mockWindow.isDestroyed?.mockReturnValue(true);

      const result = await oauthWindow.navigateAndWaitForCallback('https://test.com');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(SecurityError);
        expect(result.error.message).toContain('OAuth window not available');
      }
    });
  });

  describe('handleCallback', () => {
    it('should parse successful callback URL', () => {
      const callbackUrl = 'http://localhost:8080?code=auth-code&state=csrf-state';

      const result = oauthWindow.handleCallback(callbackUrl);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({
          code: 'auth-code',
          state: 'csrf-state',
          error: null,
          errorDescription: undefined,
        });
      }
    });

    it('should parse OAuth error responses', () => {
      const errorUrl =
        'http://localhost:8080?error=access_denied&error_description=User%20denied%20access';

      const result = oauthWindow.handleCallback(errorUrl);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toContain('OAuth error: access_denied');
      }
    });

    it('should validate redirect URI for security', () => {
      const maliciousUrl = 'http://evil.com:8080?code=stolen-code&state=csrf-state';

      const result = oauthWindow.handleCallback(maliciousUrl);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(SecurityError);
        expect(result.error.message).toContain('Invalid redirect URI');
      }
    });

    it('should fail with missing required parameters', () => {
      const incompleteUrl = 'http://localhost:8080?code=auth-code';

      const result = oauthWindow.handleCallback(incompleteUrl);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toContain('Missing required OAuth parameters');
      }
    });

    it('should handle malformed callback URLs', () => {
      const malformedUrl = 'not-a-valid-url';

      const result = oauthWindow.handleCallback(malformedUrl);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toContain('Failed to parse OAuth callback');
      }
    });
  });

  describe('security handlers', () => {
    beforeEach(() => {
      oauthWindow.createOAuthWindow();
    });

    it('should prevent new window creation', () => {
      const setWindowOpenHandler = mockWebContents.setWindowOpenHandler;
      expect(setWindowOpenHandler).toHaveBeenCalled();

      const handler = setWindowOpenHandler.mock.calls[0][0];
      const result = handler();

      expect(result).toEqual({ action: 'deny' });
    });

    it('should prevent downloads', () => {
      const sessionOn = mockWebContents.session.on;
      expect(sessionOn).toHaveBeenCalledWith('will-download', expect.any(Function));

      const handler = sessionOn.mock.calls.find(([event]) => event === 'will-download')?.[1];

      const mockEvent = { preventDefault: jest.fn() };
      handler(mockEvent);

      expect(mockEvent.preventDefault).toHaveBeenCalled();
    });

    it('should block navigation to unsafe URLs', () => {
      const onNavigate = mockWebContents.on.mock.calls.find(
        ([event]) => event === 'will-navigate',
      )?.[1];

      const mockEvent = { preventDefault: jest.fn() };
      const unsafeUrl = 'file:///etc/passwd';

      onNavigate(mockEvent, unsafeUrl);

      expect(mockEvent.preventDefault).toHaveBeenCalled();
    });

    it('should allow navigation to HTTPS URLs', () => {
      const onNavigate = mockWebContents.on.mock.calls.find(
        ([event]) => event === 'will-navigate',
      )?.[1];

      const mockEvent = { preventDefault: jest.fn() };
      const safeUrl = 'https://accounts.google.com/oauth/authorize';

      onNavigate(mockEvent, safeUrl);

      expect(mockEvent.preventDefault).not.toHaveBeenCalled();
    });

    it('should open external Google links in system browser', () => {
      const onNewWindow = mockWebContents.on.mock.calls.find(
        ([event]) => event === 'new-window',
      )?.[1];

      const mockEvent = { preventDefault: jest.fn() };
      const googleUrl = 'https://support.google.com/accounts';

      onNewWindow(mockEvent, googleUrl);

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockShell.openExternal).toHaveBeenCalledWith(googleUrl);
    });

    it('should block non-Google external links', () => {
      const onNewWindow = mockWebContents.on.mock.calls.find(
        ([event]) => event === 'new-window',
      )?.[1];

      const mockEvent = { preventDefault: jest.fn() };
      const evilUrl = 'https://evil.com/malware';

      onNewWindow(mockEvent, evilUrl);

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockShell.openExternal).not.toHaveBeenCalled();
    });

    it('should handle certificate errors', () => {
      const onCertError = mockWebContents.on.mock.calls.find(
        ([event]) => event === 'certificate-error',
      )?.[1];

      const mockEvent = { preventDefault: jest.fn() };
      const mockCallback = jest.fn();

      onCertError(mockEvent, 'https://test.com', 'cert-error', {}, mockCallback);

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockCallback).toHaveBeenCalledWith(false);
    });
  });

  describe('cleanup and lifecycle', () => {
    it('should close window on cleanup', () => {
      oauthWindow.createOAuthWindow();
      oauthWindow.close();

      expect(mockWindow.close).toHaveBeenCalled();
    });

    it('should report window state correctly', () => {
      expect(oauthWindow.isOpen()).toBe(false);

      oauthWindow.createOAuthWindow();
      expect(oauthWindow.isOpen()).toBe(true);

      mockWindow.isDestroyed?.mockReturnValue(true);
      expect(oauthWindow.isOpen()).toBe(false);
    });

    it('should handle cleanup of already destroyed window', () => {
      oauthWindow.createOAuthWindow();
      mockWindow.isDestroyed?.mockReturnValue(true);

      // Should not throw error
      expect(() => oauthWindow.close()).not.toThrow();
    });
  });
});
