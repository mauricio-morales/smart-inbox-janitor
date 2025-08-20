import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';

// Create Material-UI theme
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
  components: {
    // Customize Material-UI components for Electron
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          // Prevent text selection in Electron
          userSelect: 'none',
          // Disable scrollbars when not needed
          overflow: 'hidden',
        },
        // Allow text selection in specific components
        'input, textarea, [contenteditable]': {
          userSelect: 'text',
        },
      },
    },
  },
});

// Create React Query client with sensible defaults for Electron
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Reduce network requests since we're using IPC
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      retry: (failureCount, error) => {
        // Don't retry on authentication errors
        if (error && typeof error === 'object' && 'code' in error) {
          const errorCode = (error as any).code;
          if (errorCode === 'AUTHENTICATION_ERROR' || errorCode === 'AUTHORIZATION_ERROR') {
            return false;
          }
        }
        return failureCount < 3;
      },
    },
    mutations: {
      retry: false, // Don't retry mutations by default
    },
  },
});

// Initialize React application
const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);

root.render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </ThemeProvider>
  </React.StrictMode>
);

// Hot Module Replacement for development
if (import.meta.hot) {
  import.meta.hot.accept();
}
