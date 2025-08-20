# Electron + React Architecture Patterns

## Modern Electron Architecture (2024/2025)

### Process Separation
- **Main Process**: Node.js backend, system APIs, window management
- **Renderer Process**: Chromium frontend, React application
- **Preload Scripts**: Secure bridge between main and renderer

## Main Process Patterns

### Window Management (src/main/window.ts)
```typescript
import { BrowserWindow, shell } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'

export function createMainWindow(): BrowserWindow {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      nodeIntegration: false,
      contextIsolation: true
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return mainWindow
}
```

### IPC Communication (src/main/ipc.ts)
```typescript
import { ipcMain } from 'electron'
import type { EmailProvider, StorageProvider } from '@shared/types'

export function setupIPC(
  emailProvider: EmailProvider,
  storageProvider: StorageProvider
) {
  // Email operations
  ipcMain.handle('email:list', async (_, options) => {
    return await emailProvider.list(options)
  })

  ipcMain.handle('email:get', async (_, emailId) => {
    return await emailProvider.get(emailId)
  })

  ipcMain.handle('email:batchModify', async (_, request) => {
    return await emailProvider.batchModify(request)
  })

  // Storage operations
  ipcMain.handle('storage:getUserRules', async () => {
    return await storageProvider.getUserRules()
  })

  ipcMain.handle('storage:updateUserRules', async (_, rules) => {
    return await storageProvider.updateUserRules(rules)
  })

  // Configuration
  ipcMain.handle('config:get', async () => {
    return await storageProvider.getConfig()
  })
}
```

## Preload Script Patterns

### Secure API Bridge (src/preload/index.ts)
```typescript
import { contextBridge, ipcRenderer } from 'electron'
import type { 
  EmailProvider, 
  StorageProvider, 
  ListOptions,
  BatchModifyRequest,
  UserRules 
} from '@shared/types'

// Define the API interface
export interface ElectronAPI {
  email: {
    list: (options?: ListOptions) => Promise<ReturnType<EmailProvider['list']>>
    get: (emailId: string) => Promise<ReturnType<EmailProvider['get']>>
    batchModify: (request: BatchModifyRequest) => Promise<ReturnType<EmailProvider['batchModify']>>
  }
  storage: {
    getUserRules: () => Promise<ReturnType<StorageProvider['getUserRules']>>
    updateUserRules: (rules: UserRules) => Promise<ReturnType<StorageProvider['updateUserRules']>>
  }
  config: {
    get: () => Promise<any>
  }
}

const api: ElectronAPI = {
  email: {
    list: (options) => ipcRenderer.invoke('email:list', options),
    get: (emailId) => ipcRenderer.invoke('email:get', emailId),
    batchModify: (request) => ipcRenderer.invoke('email:batchModify', request)
  },
  storage: {
    getUserRules: () => ipcRenderer.invoke('storage:getUserRules'),
    updateUserRules: (rules) => ipcRenderer.invoke('storage:updateUserRules', rules)
  },
  config: {
    get: () => ipcRenderer.invoke('config:get')
  }
}

contextBridge.exposeInMainWorld('electronAPI', api)

// Type declarations for renderer
declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
```

## React Renderer Patterns

### React Entry Point (src/renderer/src/main.tsx)
```typescript
import React from 'react'
import ReactDOM from 'react-dom/client'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import App from './App'

const theme = createTheme({
  palette: {
    mode: 'light',
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </React.StrictMode>
)
```

### Main App Component (src/renderer/src/App.tsx)
```typescript
import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { EmailProvider } from './contexts/EmailContext'
import { Dashboard } from './pages/Dashboard'
import { Settings } from './pages/Settings'
import { Onboarding } from './pages/Onboarding'

const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <EmailProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/onboarding" element={<Onboarding />} />
          </Routes>
        </Router>
      </EmailProvider>
    </QueryClientProvider>
  )
}

export default App
```

### React Hook for Electron API (src/renderer/src/hooks/useElectronAPI.ts)
```typescript
import { useCallback } from 'react'
import type { ElectronAPI } from '../../../preload'

export function useElectronAPI() {
  const api = window.electronAPI

  const listEmails = useCallback(async (options?: any) => {
    const result = await api.email.list(options)
    if (result.success) {
      return result.data
    }
    throw new Error(result.error?.message || 'Failed to list emails')
  }, [api])

  const getEmail = useCallback(async (emailId: string) => {
    const result = await api.email.get(emailId)
    if (result.success) {
      return result.data
    }
    throw new Error(result.error?.message || 'Failed to get email')
  }, [api])

  const getUserRules = useCallback(async () => {
    const result = await api.storage.getUserRules()
    if (result.success) {
      return result.data
    }
    throw new Error(result.error?.message || 'Failed to get user rules')
  }, [api])

  return {
    listEmails,
    getEmail,
    getUserRules,
    // ... other methods
  }
}
```

## State Management Patterns

### React Query Integration
```typescript
// src/renderer/src/hooks/useEmailQueries.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useElectronAPI } from './useElectronAPI'

export function useEmailQueries() {
  const api = useElectronAPI()
  const queryClient = useQueryClient()

  const emailsQuery = useQuery({
    queryKey: ['emails'],
    queryFn: () => api.listEmails(),
    staleTime: 30000, // 30 seconds
  })

  const batchModifyMutation = useMutation({
    mutationFn: api.batchModify,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emails'] })
    },
  })

  return {
    emails: emailsQuery.data,
    isLoading: emailsQuery.isLoading,
    error: emailsQuery.error,
    batchModify: batchModifyMutation.mutate,
    isBatchModifying: batchModifyMutation.isPending,
  }
}
```

## Security Best Practices

### Content Security Policy
```html
<!-- src/renderer/index.html -->
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'unsafe-inline';
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com;
  img-src 'self' data: https:;
  connect-src 'self' https://api.openai.com;
">
```

### Secure Configuration
```typescript
// src/main/security.ts
export const secureDefaults = {
  webSecurity: true,
  nodeIntegration: false,
  nodeIntegrationInWorker: false,
  nodeIntegrationInSubFrames: false,
  contextIsolation: true,
  enableRemoteModule: false,
  sandbox: false, // Set to true if no Node.js APIs needed
}
```

## Performance Optimization

### Code Splitting
```typescript
// src/renderer/src/pages/Dashboard.tsx
import { lazy, Suspense } from 'react'

const EmailDetail = lazy(() => import('../components/EmailDetail'))

export function Dashboard() {
  return (
    <div>
      <Suspense fallback={<div>Loading...</div>}>
        <EmailDetail />
      </Suspense>
    </div>
  )
}
```

### Memory Management
```typescript
// src/renderer/src/hooks/useCleanup.ts
import { useEffect } from 'react'

export function useCleanup(cleanup: () => void) {
  useEffect(() => {
    return cleanup
  }, [cleanup])
}
```

## Common Gotchas

1. **IPC Type Safety**: Always type IPC channels and return values
2. **Context Isolation**: Never disable context isolation in production
3. **Memory Leaks**: Clean up listeners and subscriptions properly
4. **Security**: Validate all data from renderer before processing in main
5. **Hot Reload**: Use conditional loading for development vs production
6. **Path Resolution**: Use consistent path resolution across processes