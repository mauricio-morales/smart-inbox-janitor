/* eslint-disable no-unused-vars */
// TODO: Remove this disable when interface parameters are properly utilized
/**
 * ProviderSetupCard component
 *
 * Reusable card component for displaying individual provider status
 * and setup actions during startup flow.
 *
 * @module ProviderSetupCard
 */

import React from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Chip,
  Box,
  CircularProgress,
} from '@mui/material';
import {
  Email as GmailIcon,
  Psychology as OpenAIIcon,
  Storage as StorageIcon,
  CheckCircle as ConnectedIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Refresh as CheckingIcon,
} from '@mui/icons-material';
import type { ProviderStatus } from '../machines/startupMachine';

/**
 * Props for ProviderSetupCard component
 */
interface ProviderSetupCardProps {
  /** Provider status information */
  provider: ProviderStatus;
  /** Callback when setup button is clicked */
  onSetupClick: () => void;
  /** Callback when dismiss button is clicked */
  onDismiss: () => void;
}

/**
 * Get provider-specific icon
 */
const getProviderIcon = (providerId: ProviderStatus['id']): React.ReactElement => {
  switch (providerId) {
    case 'gmail':
      return <GmailIcon />;
    case 'openai':
      return <OpenAIIcon />;
    case 'storage':
      return <StorageIcon />;
    default:
      return <StorageIcon />;
  }
};

/**
 * Get provider display name
 */
const getProviderName = (providerId: ProviderStatus['id']): string => {
  switch (providerId) {
    case 'gmail':
      return 'Gmail';
    case 'openai':
      return 'OpenAI';
    case 'storage':
      return 'Storage';
    default:
      return 'Unknown Provider';
  }
};

/**
 * Get status icon and color
 */
const getStatusConfig = (status: ProviderStatus['status']) => {
  switch (status) {
    case 'connected':
      return {
        icon: <ConnectedIcon sx={{ color: 'success.main' }} />,
        color: 'success',
        label: 'Connected',
      };
    case 'error':
      return {
        icon: <ErrorIcon sx={{ color: 'error.main' }} />,
        color: 'error',
        label: 'Error',
      };
    case 'disconnected':
      return {
        icon: <WarningIcon sx={{ color: 'warning.main' }} />,
        color: 'warning',
        label: 'Disconnected',
      };
    case 'checking':
      return {
        icon: <CircularProgress size={20} />,
        color: 'info',
        label: 'Checking...',
      };
    default:
      return {
        icon: <CheckingIcon sx={{ color: 'info.main' }} />,
        color: 'info',
        label: 'Unknown',
      };
  }
};

/**
 * Get setup button text based on setup type
 */
const getSetupButtonText = (setupType: ProviderStatus['setupType']): string => {
  switch (setupType) {
    case 'initial_setup':
      return 'Set Up Now';
    case 'token_refresh':
      return 'Reconnect';
    case 'full_reconfiguration':
      return 'Reconfigure';
    default:
      return 'Setup';
  }
};

/**
 * ProviderSetupCard component for showing individual provider status
 */
export default function ProviderSetupCard({
  provider,
  onSetupClick,
  onDismiss,
}: ProviderSetupCardProps): React.ReactElement {
  const providerName = getProviderName(provider.id);
  const providerIcon = getProviderIcon(provider.id);
  const statusConfig = getStatusConfig(provider.status);
  const setupButtonText = getSetupButtonText(provider.setupType);

  const handleSetupClick = () => {
    onSetupClick();
  };

  return (
    <Card
      sx={{
        minWidth: 280,
        maxWidth: 320,
        height: 'fit-content',
        transition: 'box-shadow 0.2s ease-in-out',
        '&:hover': {
          boxShadow: (theme) => theme.shadows[4],
        },
      }}
      elevation={2}
    >
      <CardContent>
        {/* Header with provider icon and name */}
        <Box display="flex" alignItems="center" gap={2} mb={2}>
          <Box sx={{ color: 'primary.main', fontSize: '2rem' }}>{providerIcon}</Box>
          <Box>
            <Typography variant="h6" component="div">
              {providerName}
            </Typography>
            <Box display="flex" alignItems="center" gap={1} mt={0.5}>
              {statusConfig.icon}
              <Chip
                label={statusConfig.label}
                size="small"
                color={statusConfig.color as any}
                variant={provider.status === 'connected' ? 'filled' : 'outlined'}
              />
            </Box>
          </Box>
        </Box>

        {/* Status message */}
        {provider.message && (
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            {provider.message}
          </Typography>
        )}

        {/* Last checked timestamp */}
        <Typography variant="caption" color="textSecondary">
          Last checked: {provider.lastChecked.toLocaleTimeString()}
        </Typography>
      </CardContent>

      {/* Action buttons */}
      <CardActions sx={{ justifyContent: 'space-between', pt: 0 }}>
        {provider.requiresSetup ? (
          <>
            <Button
              size="small"
              variant="contained"
              color="primary"
              onClick={handleSetupClick}
              disabled={provider.status === 'checking'}
            >
              {setupButtonText}
            </Button>
            {provider.setupType !== 'initial_setup' && (
              <Button size="small" variant="text" color="secondary" onClick={onDismiss}>
                Dismiss
              </Button>
            )}
          </>
        ) : (
          <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'center' }}>
            <Chip label="Ready" size="small" color="success" icon={<ConnectedIcon />} />
          </Box>
        )}
      </CardActions>
    </Card>
  );
}
