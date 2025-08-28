# Electron-Vite Configuration Patterns for TypeScript + React

## Overview

Electron-Vite is a build tool that leverages Vite for modern Electron development with TypeScript and React support.

## Core Configuration Structure

### Basic electron.vite.config.ts

```typescript
import { resolve } from 'path';
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        external: ['better-sqlite3', 'keytar'],
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src'),
        '@shared': resolve('src/shared'),
      },
    },
    plugins: [react()],
    build: {
      rollupOptions: {
        input: {
          main: resolve('src/renderer/index.html'),
        },
      },
    },
  },
});
```

## Project Structure Pattern

```
src/
├── main/
│   ├── index.ts          # Main process entry
│   ├── window.ts         # Window management
│   └── ipc.ts           # IPC handlers
├── preload/
│   └── index.ts         # Preload script
├── renderer/
│   ├── src/
│   │   ├── main.tsx     # React entry
│   │   ├── App.tsx      # Root component
│   │   └── components/  # React components
│   └── index.html       # HTML template
└── shared/
    └── types/           # Shared types
```

## TypeScript Configuration

### Main Process (src/main/tsconfig.json)

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "composite": true,
    "types": ["electron"]
  },
  "include": ["**/*"],
  "exclude": ["node_modules"]
}
```

### Renderer Process (src/renderer/tsconfig.json)

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "composite": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "types": ["react", "react-dom"],
    "jsx": "react-jsx"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

## Development Scripts

```json
{
  "scripts": {
    "dev": "electron-vite dev",
    "build": "electron-vite build",
    "preview": "electron-vite preview",
    "build:win": "npm run build && electron-builder --win",
    "build:mac": "npm run build && electron-builder --mac",
    "build:linux": "npm run build && electron-builder --linux"
  }
}
```

## Security Best Practices

### Preload Script Pattern

```typescript
// src/preload/index.ts
import { contextBridge, ipcRenderer } from 'electron';

const api = {
  // Secure IPC communication
  invoke: (channel: string, ...args: any[]) => ipcRenderer.invoke(channel, ...args),
  on: (channel: string, callback: Function) => {
    ipcRenderer.on(channel, (_, ...args) => callback(...args));
  },
};

contextBridge.exposeInMainWorld('electronAPI', api);
```

### CSP Configuration

```html
<!-- src/renderer/index.html -->
<meta
  http-equiv="Content-Security-Policy"
  content="default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';"
/>
```

## Hot Reloading Configuration

### Main Process Hot Reload

```typescript
// src/main/index.ts
if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
  mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
} else {
  mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
}
```

## Common Gotchas

1. **Native Dependencies**: Use `externalizeDepsPlugin()` for native modules
2. **Path Resolution**: Configure aliases consistently across main/renderer
3. **Type Safety**: Use shared types between processes
4. **Security**: Always use preload scripts for IPC communication
5. **Building**: External dependencies need special handling in build config
