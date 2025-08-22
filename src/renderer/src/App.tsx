import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';
import { Dashboard } from './pages/Dashboard';
import { Settings } from './pages/Settings';
import { Onboarding } from './pages/Onboarding';
import { Layout } from './components/Layout';

// App-level state interface
interface AppState {
  isInitialized: boolean;
  isOnboardingComplete: boolean;
  loading: boolean;
  error: string | null;
}

function App(): React.JSX.Element {
  const [appState, setAppState] = useState<AppState>({
    isInitialized: false,
    isOnboardingComplete: false,
    loading: true,
    error: null,
  });

  // Initialize the application
  useEffect(() => {
    const initializeApp = async (): Promise<void> => {
      try {
        // Check if Electron API is available
        if (typeof globalThis === 'undefined' || !('window' in globalThis) || (globalThis as typeof globalThis & { window: { electronAPI?: unknown } }).window.electronAPI == null) {
          throw new Error('Electron API not available');
        }

        const windowObj = (globalThis as typeof globalThis & { window: { electronAPI: { storage: { getConfig(): Promise<{ success: boolean; data?: { onboardingComplete?: boolean } }> } } } }).window;
        // Get app configuration to check onboarding status
        const configResult = await windowObj.electronAPI.storage.getConfig();

        let onboardingComplete = false;
        if (configResult.success) {
          // Check if basic configuration is complete
          onboardingComplete = Boolean(configResult.data?.values?.onboardingComplete);
        }

        setAppState({
          isInitialized: true,
          isOnboardingComplete: onboardingComplete,
          loading: false,
          error: null,
        });
      } catch (error) {
        // Handle initialization errors (providers are stubs, so this is expected)
        setAppState({
          isInitialized: false,
          isOnboardingComplete: false,
          loading: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    };

    void initializeApp();
  }, []);

  // Show loading state during initialization
  if (appState.loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        height="100vh"
        flexDirection="column"
        gap={2}
      >
        <CircularProgress size={60} />
        <Typography variant="h6" color="textSecondary">
          Initializing Smart Inbox Janitor...
        </Typography>
      </Box>
    );
  }

  // Show error state if initialization failed
  if (appState.error !== null) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        height="100vh"
        flexDirection="column"
        gap={2}
        p={3}
      >
        <Typography variant="h5" color="error">
          Initialization Error
        </Typography>
        <Typography variant="body1" color="textSecondary" textAlign="center">
          {appState.error}
        </Typography>
        <Typography variant="body2" color="textSecondary" textAlign="center">
          Please restart the application or contact support if the problem persists.
        </Typography>
      </Box>
    );
  }

  return (
    <Router>
      <Routes>
        {/* Onboarding flow - redirect if not completed */}
        {!appState.isOnboardingComplete && (
          <>
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="*" element={<Navigate to="/onboarding" replace />} />
          </>
        )}

        {/* Main application routes - only available after onboarding */}
        {appState.isOnboardingComplete && (
          <>
            <Route
              path="/"
              element={
                <Layout>
                  <Dashboard />
                </Layout>
              }
            />
            <Route
              path="/dashboard"
              element={
                <Layout>
                  <Dashboard />
                </Layout>
              }
            />
            <Route
              path="/settings"
              element={
                <Layout>
                  <Settings />
                </Layout>
              }
            />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </>
        )}
      </Routes>
    </Router>
  );
}

export default App;
