/**
 * StartupStateMachine React component
 *
 * This component manages the startup flow using XState machine,
 * replacing boolean flag navigation to prevent infinite loops.
 *
 * @module StartupStateMachine
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useMachine } from '@xstate/react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { startupMachine } from '../machines/startupMachine';
import { fromPromise } from 'xstate';
import { createStartupOrchestrator } from '../services/StartupOrchestrator';
import { useElectronAPI } from '../hooks/useElectronAPI';
import ProviderSetupCard from './ProviderSetupCard';
import OpenAISetupModal from '../pages/Setup/OpenAISetupModal';
import GmailSetupModal from '../pages/Setup/GmailSetupModal';

/**
 * Props for StartupStateMachine component
 */
interface StartupStateMachineProps {
  /** Callback when dashboard is ready to be shown */
  onDashboardReady: () => void;
}

/**
 * StartupStateMachine component for managing application startup flow
 */
export default function StartupStateMachine({
  onDashboardReady,
}: StartupStateMachineProps): React.ReactElement {
  const electronAPI = useElectronAPI();

  // Modal state
  const [openAIModalOpen, setOpenAIModalOpen] = useState(false);
  const [gmailModalOpen, setGmailModalOpen] = useState(false);

  // Create orchestrator instance (memoized to prevent recreation)
  const orchestrator = useMemo(() => createStartupOrchestrator(electronAPI), [electronAPI]);

  // Initialize XState machine with implementations for v5
  const machineWithImplementations = useMemo(
    () =>
      startupMachine.provide({
        actors: {
          providerCheckService: fromPromise(async () => {
            console.log('[StartupStateMachine] Starting provider health checks...');
            return await orchestrator.checkAllProviders();
          }),
        },
        // Note: isAppUsable guard is now defined directly in the machine
      }),
    [orchestrator],
  );

  const [state, send] = useMachine(machineWithImplementations);

  // Notify parent when dashboard is ready
  useEffect(() => {
    if (state.matches('dashboard_ready')) {
      console.log('[StartupStateMachine] Dashboard ready, notifying parent');
      onDashboardReady();
    }
  }, [state.value, onDashboardReady]);

  // Handle provider setup initiation - opens appropriate modal
  const handleProviderSetupClick = (providerId: string) => {
    console.log(`[StartupStateMachine] Opening setup modal for provider: ${providerId}`);
    
    switch (providerId) {
      case 'openai':
        setOpenAIModalOpen(true);
        break;
      case 'gmail':
        setGmailModalOpen(true);
        break;
      default:
        console.warn(`[StartupStateMachine] No setup modal for provider: ${providerId}`);
        // For providers without modals, trigger re-check immediately
        send({ type: 'PROVIDER_SETUP_COMPLETE', providerId });
        break;
    }
  };

  // Handle successful provider setup completion from modals
  const handleProviderSetupSuccess = (providerId: string) => {
    console.log(
      `[StartupStateMachine] Provider ${providerId} setup completed successfully, rechecking providers...`,
    );
    // Close any open modals
    setOpenAIModalOpen(false);
    setGmailModalOpen(false);
    // Trigger provider re-check
    send({ type: 'PROVIDER_SETUP_COMPLETE', providerId });
  };

  // Handle retry provider checks
  const handleRetryProviderCheck = () => {
    console.log('[StartupStateMachine] Retrying provider checks...');
    send({ type: 'RETRY_PROVIDER_CHECK' });
  };


  // Loading state during provider checks
  if (state.matches('initializing') || state.matches('checking_providers')) {
    return (
      <>
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          minHeight="400px"
          gap={3}
        >
          <CircularProgress size={48} />
          <Typography variant="h6" color="textSecondary">
            {state.matches('initializing')
              ? 'Initializing Smart Inbox Janitor...'
              : 'Checking provider connections...'}
          </Typography>
          <Typography variant="body2" color="textSecondary" align="center">
            This should take less than 5 seconds
          </Typography>
        </Box>

        {/* Setup Modals */}
        <OpenAISetupModal
          open={openAIModalOpen}
          onClose={() => setOpenAIModalOpen(false)}
          onSuccess={() => handleProviderSetupSuccess('openai')}
        />

        <GmailSetupModal
          open={gmailModalOpen}
          onClose={() => setGmailModalOpen(false)}
          onSuccess={() => handleProviderSetupSuccess('gmail')}
        />
      </>
    );
  }

  // Setup required state - show provider cards
  if (state.matches('setup_required')) {
    const providersNeedingSetup = state.context.providers.filter((p) => p.requiresSetup);
    const providersWorking = state.context.providers.filter(
      (p) => !p.requiresSetup && p.status === 'connected',
    );

    return (
      <>
        <Box sx={{ maxWidth: 800, margin: '0 auto', padding: 3 }}>
          <Typography variant="h4" gutterBottom align="center">
            Welcome to Smart Inbox Janitor
          </Typography>

          <Typography variant="body1" color="textSecondary" align="center" sx={{ mb: 4 }}>
            Some providers need to be set up before you can use all features. You can still use the
            app with partial functionality.
          </Typography>

          {providersWorking.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" color="success.main" gutterBottom>
                Connected Providers
              </Typography>
              <Box display="flex" flexWrap="wrap" gap={2}>
                {providersWorking.map((provider) => (
                  <ProviderSetupCard
                    key={provider.id}
                    provider={provider}
                    onSetupClick={() => {}} // No setup needed for connected providers
                    onDismiss={() => {}} // No dismiss needed for connected providers
                  />
                ))}
              </Box>
            </Box>
          )}

          {providersNeedingSetup.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" color="warning.main" gutterBottom>
                Providers Needing Setup
              </Typography>
              <Box display="flex" flexWrap="wrap" gap={2}>
                {providersNeedingSetup.map((provider) => (
                  <ProviderSetupCard
                    key={provider.id}
                    provider={provider}
                    onSetupClick={() => handleProviderSetupClick(provider.id)}
                    onDismiss={() => {}} // Could implement dismissal logic here
                  />
                ))}
              </Box>
            </Box>
          )}

          <Box display="flex" justifyContent="center" gap={2} sx={{ mt: 4 }}>
            <button
              onClick={handleRetryProviderCheck}
              style={{
                padding: '12px 24px',
                backgroundColor: '#1976d2',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '500',
              }}
            >
              Retry Connection Checks
            </button>
          </Box>
        </Box>

        {/* Setup Modals */}
        <OpenAISetupModal
          open={openAIModalOpen}
          onClose={() => setOpenAIModalOpen(false)}
          onSuccess={() => handleProviderSetupSuccess('openai')}
        />

        <GmailSetupModal
          open={gmailModalOpen}
          onClose={() => setGmailModalOpen(false)}
          onSuccess={() => handleProviderSetupSuccess('gmail')}
        />
      </>
    );
  }

  // Timeout state
  if (state.matches('setup_timeout')) {
    return (
      <>
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          minHeight="400px"
          gap={3}
        >
          <Typography variant="h5" color="error">
            Connection Timeout
          </Typography>
          <Typography variant="body1" color="textSecondary" align="center">
            {state.context.error || 'Provider health checks took too long to complete.'}
          </Typography>
          <button
            onClick={handleRetryProviderCheck}
            style={{
              padding: '12px 24px',
              backgroundColor: '#1976d2',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '500',
            }}
          >
            Try Again
          </button>
        </Box>

        {/* Setup Modals */}
        <OpenAISetupModal
          open={openAIModalOpen}
          onClose={() => setOpenAIModalOpen(false)}
          onSuccess={() => handleProviderSetupSuccess('openai')}
        />

        <GmailSetupModal
          open={gmailModalOpen}
          onClose={() => setGmailModalOpen(false)}
          onSuccess={() => handleProviderSetupSuccess('gmail')}
        />
      </>
    );
  }

  // Dashboard ready state - parent handles this
  if (state.matches('dashboard_ready')) {
    return (
      <>
        <Box display="flex" alignItems="center" justifyContent="center" minHeight="400px">
          <Typography variant="h6" color="textSecondary">
            Loading dashboard...
          </Typography>
        </Box>

        {/* Setup Modals */}
        <OpenAISetupModal
          open={openAIModalOpen}
          onClose={() => setOpenAIModalOpen(false)}
          onSuccess={() => handleProviderSetupSuccess('openai')}
        />

        <GmailSetupModal
          open={gmailModalOpen}
          onClose={() => setGmailModalOpen(false)}
          onSuccess={() => handleProviderSetupSuccess('gmail')}
        />
      </>
    );
  }

  // Fallback (shouldn't reach here)
  return (
    <>
      <Box display="flex" alignItems="center" justifyContent="center" minHeight="400px">
        <Typography variant="h6" color="textSecondary">
          Unknown startup state: {String(state.value)}
        </Typography>
      </Box>

      {/* Setup Modals */}
      <OpenAISetupModal
        open={openAIModalOpen}
        onClose={() => setOpenAIModalOpen(false)}
        onSuccess={() => handleProviderSetupSuccess('openai')}
      />

      <GmailSetupModal
        open={gmailModalOpen}
        onClose={() => setGmailModalOpen(false)}
        onSuccess={() => handleProviderSetupSuccess('gmail')}
      />
    </>
  );
}
