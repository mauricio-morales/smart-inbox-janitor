import React, { useState, useCallback } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Box, Typography } from '@mui/material';
import { Dashboard } from './pages/Dashboard';
import { Settings } from './pages/Settings';
import { Onboarding } from './pages/Onboarding';
import { Layout } from './components/Layout';
import StartupStateMachine from './components/StartupStateMachine';

// App-level state interface (simplified)
interface AppState {
  showDashboard: boolean;
  initializationError: string | null;
}

function App(): React.JSX.Element {
  const [appState, setAppState] = useState<AppState>({
    showDashboard: false,
    initializationError: null,
  });

  /**
   * Handle dashboard ready callback from StartupStateMachine
   * This replaces the complex useEffect logic with a simple callback
   */
  const handleDashboardReady = useCallback(() => {
    console.log('[App] Dashboard ready callback received from StartupStateMachine');
    setAppState({
      showDashboard: true,
      initializationError: null,
    });
  }, []);

  // Show initialization error if any
  if (appState.initializationError !== null) {
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
          {appState.initializationError}
        </Typography>
        <Typography variant="body2" color="textSecondary" textAlign="center">
          Please restart the application or contact support if the problem persists.
        </Typography>
      </Box>
    );
  }

  // If dashboard is not ready, show StartupStateMachine
  if (!appState.showDashboard) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 2,
        }}
      >
        <Box
          sx={{
            maxWidth: 900,
            width: '100%',
            backgroundColor: 'white',
            borderRadius: 2,
            boxShadow: 3,
            p: 3,
          }}
        >
          <StartupStateMachine onDashboardReady={handleDashboardReady} />
        </Box>
      </Box>
    );
  }

  // Dashboard is ready - show main application with routing
  return (
    <Router>
      <Routes>
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
        {/* Keep onboarding route accessible for manual navigation if needed */}
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
