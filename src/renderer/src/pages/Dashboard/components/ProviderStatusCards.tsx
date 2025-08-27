/**
 * ProviderStatusCards component
 *
 * Dashboard component showing provider status cards for real-time
 * monitoring and management of provider connections.
 *
 * @module ProviderStatusCards
 */

import React, { useState, useCallback } from 'react';
import { Box, Typography, Grid, Button, Stack, Alert, Fade, Collapse } from '@mui/material';
import {
  Refresh as RefreshIcon,
  Visibility as ShowIcon,
  VisibilityOff as HideIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import type { ProviderStatus } from '../../../machines/startupMachine';
import ProviderSetupCard from '../../../components/ProviderSetupCard';
import GmailSetupModal from '../../Setup/GmailSetupModal';
import OpenAISetupModal from '../../Setup/OpenAISetupModal';

/**
 * Props for ProviderStatusCards component
 */
interface ProviderStatusCardsProps {
  /** Array of provider statuses */
  providers: ProviderStatus[];
  /** Callback when a provider needs refreshing */
  onRefreshProvider?: (providerId: string) => void;
  /** Callback when all providers should be refreshed */
  onRefreshAll?: () => void;
  /** Whether the component is currently loading */
  loading?: boolean;
}

/**
 * ProviderStatusCards component for dashboard provider monitoring
 */
export default function ProviderStatusCards({
  providers,
  onRefreshProvider,
  onRefreshAll,
  loading = false,
}: ProviderStatusCardsProps): React.ReactElement {
  // Modal state
  const [gmailModalOpen, setGmailModalOpen] = useState(false);
  const [openaiModalOpen, setOpenaiModalOpen] = useState(false);

  // Display preferences
  const [showConnectedProviders, setShowConnectedProviders] = useState(true);
  const [showDisconnectedProviders, setShowDisconnectedProviders] = useState(true);

  // Filter providers based on display preferences
  const connectedProviders = providers.filter((p) => p.status === 'connected');
  const disconnectedProviders = providers.filter((p) => p.status !== 'connected');

  /**
   * Handle provider setup card click
   */
  const handleProviderSetup = useCallback((providerId: string) => {
    switch (providerId) {
      case 'gmail':
        setGmailModalOpen(true);
        break;
      case 'openai':
        setOpenaiModalOpen(true);
        break;
      case 'storage':
        // Storage setup might require different handling
        console.log('[ProviderStatusCards] Storage setup requested');
        break;
      default:
        console.warn(`[ProviderStatusCards] Unknown provider setup: ${providerId}`);
    }
  }, []);

  /**
   * Handle successful provider setup
   */
  const handleGmailSuccess = useCallback(
    (accountEmail: string) => {
      console.log(`[ProviderStatusCards] Gmail setup successful: ${accountEmail}`);
      setGmailModalOpen(false);
      onRefreshProvider?.('gmail');
    },
    [onRefreshProvider],
  );

  const handleOpenAISuccess = useCallback(
    (keyLastFour: string) => {
      console.log(`[ProviderStatusCards] OpenAI setup successful: ...${keyLastFour}`);
      setOpenaiModalOpen(false);
      onRefreshProvider?.('openai');
    },
    [onRefreshProvider],
  );

  /**
   * Handle provider dismissal (for non-critical providers)
   */
  const handleProviderDismiss = useCallback((providerId: string) => {
    console.log(`[ProviderStatusCards] Provider ${providerId} dismissed`);
    // Could implement dismissal logic here (hide card, mark as dismissed, etc.)
  }, []);

  // No providers to show
  if (providers.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="h6" color="text.secondary" gutterBottom>
          No Provider Information Available
        </Typography>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={onRefreshAll}
          disabled={loading}
        >
          Check Providers
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header with controls */}
      <Box sx={{ mb: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h5">Provider Status</Typography>

          <Stack direction="row" spacing={1}>
            <Button
              size="small"
              startIcon={<RefreshIcon />}
              onClick={onRefreshAll}
              disabled={loading}
            >
              Refresh All
            </Button>
            <Button
              size="small"
              startIcon={<SettingsIcon />}
              variant="outlined"
              onClick={() => {
                /* Could open provider settings */
              }}
            >
              Settings
            </Button>
          </Stack>
        </Box>

        {/* Display toggles */}
        <Stack direction="row" spacing={2}>
          <Button
            size="small"
            variant={showConnectedProviders ? 'contained' : 'outlined'}
            startIcon={showConnectedProviders ? <HideIcon /> : <ShowIcon />}
            onClick={() => setShowConnectedProviders(!showConnectedProviders)}
            color="success"
          >
            Connected ({connectedProviders.length})
          </Button>

          <Button
            size="small"
            variant={showDisconnectedProviders ? 'contained' : 'outlined'}
            startIcon={showDisconnectedProviders ? <HideIcon /> : <ShowIcon />}
            onClick={() => setShowDisconnectedProviders(!showDisconnectedProviders)}
            color="warning"
          >
            Need Attention ({disconnectedProviders.length})
          </Button>
        </Stack>
      </Box>

      {/* Connected providers section */}
      <Collapse in={showConnectedProviders && connectedProviders.length > 0}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" color="success.main" gutterBottom>
            Connected Providers
          </Typography>

          <Grid container spacing={2}>
            {connectedProviders.map((provider) => (
              <Grid key={provider.id} size={{ xs: 12, sm: 6, md: 4 }}>
                <Fade in timeout={300}>
                  <div>
                    <ProviderSetupCard
                      provider={provider}
                      onSetupClick={() => handleProviderSetup(provider.id)}
                      onDismiss={() => handleProviderDismiss(provider.id)}
                    />
                  </div>
                </Fade>
              </Grid>
            ))}
          </Grid>
        </Box>
      </Collapse>

      {/* Providers needing attention section */}
      <Collapse in={showDisconnectedProviders && disconnectedProviders.length > 0}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" color="warning.main" gutterBottom>
            Providers Needing Attention
          </Typography>

          {/* Alert for critical providers */}
          {disconnectedProviders.some((p) => p.id === 'storage') && (
            <Alert severity="error" sx={{ mb: 2 }}>
              <Typography variant="body2">
                <strong>Storage provider is disconnected.</strong> This may affect app
                functionality. Please resolve storage issues to ensure data persistence.
              </Typography>
            </Alert>
          )}

          <Grid container spacing={2}>
            {disconnectedProviders.map((provider) => (
              <Grid key={provider.id} size={{ xs: 12, sm: 6, md: 4 }}>
                <Fade in timeout={300}>
                  <div>
                    <ProviderSetupCard
                      provider={provider}
                      onSetupClick={() => handleProviderSetup(provider.id)}
                      onDismiss={() => handleProviderDismiss(provider.id)}
                    />
                  </div>
                </Fade>
              </Grid>
            ))}
          </Grid>
        </Box>
      </Collapse>

      {/* Empty state when all sections are hidden */}
      {!showConnectedProviders && !showDisconnectedProviders && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="body1" color="text.secondary">
            Provider status cards are hidden. Use the toggle buttons above to show them.
          </Typography>
        </Box>
      )}

      {/* No providers in visible categories */}
      {showConnectedProviders &&
        showDisconnectedProviders &&
        connectedProviders.length === 0 &&
        disconnectedProviders.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body1" color="text.secondary" gutterBottom>
              All providers are in an unknown state.
            </Typography>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={onRefreshAll}
              disabled={loading}
            >
              Refresh Status
            </Button>
          </Box>
        )}

      {/* Setup modals */}
      <GmailSetupModal
        open={gmailModalOpen}
        onClose={() => setGmailModalOpen(false)}
        onSuccess={() => handleGmailSuccess('')}
      />

      <OpenAISetupModal
        open={openaiModalOpen}
        onClose={() => setOpenaiModalOpen(false)}
        onSuccess={() => handleOpenAISuccess('')}
      />
    </Box>
  );
}
