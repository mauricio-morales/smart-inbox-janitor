import type { ElectronAPI } from '../../../preload/index';

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }

  // Browser globals that are available in Electron renderer
  const window: Window & typeof globalThis;
  const document: Document;
  const setTimeout: (callback: () => void, ms: number) => number;
  const alert: (message: string) => void;
  
  // Node.js types for Electron main process compatibility
  namespace NodeJS {
    interface Timeout {
      ref(): this;
      unref(): this;
    }
  }

  // Vite HMR types
  interface ImportMeta {
    readonly hot?: {
      readonly data: Record<string, unknown>;
      accept(): void;
      accept(cb: (mod: unknown) => void): void;
      accept(dep: string, cb: (mod: unknown) => void): void;
      accept(deps: readonly string[], cb: (mods: unknown[]) => void): void;
      prune(cb: () => void): void;
      dispose(cb: () => void): void;
      decline(): void;
      invalidate(): void;
    };
  }
}

export {};