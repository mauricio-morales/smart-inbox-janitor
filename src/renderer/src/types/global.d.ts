import type { ElectronAPI } from '../../../preload/index';

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }

  // Browser globals that are available in Electron renderer
  const window: Window;
  const document: Document;
  const setTimeout: (callback: () => void, ms: number) => NodeJS.Timeout;
  const alert: (message: string) => void;
}

export {};