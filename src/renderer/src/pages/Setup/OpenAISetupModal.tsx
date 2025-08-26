/* eslint-disable no-unused-vars */
// TODO: Remove this disable when type declarations are cleaned up
/**
 * OpenAISetupModal component
 *
 * Independent modal component for OpenAI API key setup, extracted from
 * the original onboarding flow for use in provider-specific setup.
 *
 * @module OpenAISetupModal
 */

import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  Alert,
  Stack,
  LinearProgress,
  Chip,
} from '@mui/material';
import {
  Psychology as PsychologyIcon,
  Launch as LaunchIcon,
  CheckCircle as CheckCircleIcon,
  Security as SecurityIcon,
} from '@mui/icons-material';
import { useElectronAPI } from '../../hooks/useElectronAPI';

/**
 * Props for OpenAISetupModal component
 */
interface OpenAISetupModalProps {
  /** Whether the modal is open */
  open: boolean;
  /** Callback when modal should close */
  onClose: () => void;
  /** Callback when OpenAI setup is successful */
  onSuccess: () => void;
}

/**
 * OpenAISetupModal component for independent OpenAI API key setup
 */
export default function OpenAISetupModal({
  open,
  onClose,
  onSuccess,
}: OpenAISetupModalProps): React.ReactElement {
  const api = useElectronAPI();

  // Component state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    keyLastFour?: string;
    organization?: string;
  } | null>(null);
  const [isValidated, setIsValidated] = useState(false);

  /**
   * Reset modal state when closed
   */
  const resetState = useCallback(() => {
    setLoading(false);
    setError(null);
    setApiKey('');
    setValidationResult(null);
    setIsValidated(false);
  }, []);

  /**
   * Handle modal close
   */
  const handleClose = useCallback(() => {
    if (!loading) {
      resetState();
      onClose();
    }
  }, [loading, resetState, onClose]);

  /**
   * Validate OpenAI API key
   */
  const handleValidateKey = async (): Promise<void> => {
    try {
      if (!apiKey.trim()) {
        setError('Please enter your OpenAI API key');
        return;
      }

      if (!apiKey.startsWith('sk-') && !apiKey.startsWith('sk-proj-')) {
        setError('OpenAI API key should start with "sk-" or "sk-proj-"');
        return;
      }

      setLoading(true);
      setError(null);

      console.log('[OpenAISetupModal] Validating API key...');
      const result = await api.validateOpenAIKey(apiKey);

      if (result.apiKeyValid) {
        setValidationResult({
          valid: true,
          keyLastFour: apiKey.slice(-4),
          organization: result.organization,
        });
        setIsValidated(true);
        setError(null);
      } else {
        setError('OpenAI API key validation failed. Please check your key and try again.');
        setValidationResult(null);
        setIsValidated(false);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('[OpenAISetupModal] Validation error:', error);
      setError(`OpenAI validation error: ${message}`);
      setValidationResult(null);
      setIsValidated(false);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Complete setup and notify parent
   */
  const handleComplete = useCallback(() => {
    if (validationResult && validationResult.valid && validationResult.keyLastFour) {
      onSuccess();
      resetState();
    }
  }, [validationResult, onSuccess, resetState]);

  /**
   * Open external URL using Electron shell
   */
  const openExternalUrl = () => {
    const electronAPI = (
      globalThis as typeof globalThis & {
        window?: { electronAPI?: { shell?: { openExternal: (url: string) => void } } };  
      }
    ).window?.electronAPI;
    if (electronAPI?.shell) {
      void electronAPI.shell.openExternal('https://platform.openai.com/api-keys');
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      disableEscapeKeyDown={loading}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <PsychologyIcon color="primary" />
          <Typography variant="h6">Set Up OpenAI Integration</Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        {/* Progress indicator */}
        {loading && <LinearProgress sx={{ mb: 2 }} />}

        {/* Error alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Success validation result */}
        {isValidated && validationResult && (
          <Alert severity="success" sx={{ mb: 2 }}>
            <Box display="flex" alignItems="center" gap={1} mb={1}>
              <CheckCircleIcon />
              <Typography variant="subtitle1">API Key Validated Successfully!</Typography>
            </Box>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              <Chip
                label={`Key ending in ...${validationResult.keyLastFour}`}
                size="small"
                color="success"
                variant="outlined"
              />
              {validationResult.organization && (
                <Chip
                  label={`Organization: ${validationResult.organization}`}
                  size="small"
                  color="info"
                  variant="outlined"
                />
              )}
            </Stack>
          </Alert>
        )}

        {/* Main content */}
        {!isValidated ? (
          <Box>
            <Typography paragraph>
              Smart Inbox Janitor uses OpenAI's GPT-4o-mini for intelligent email classification.
            </Typography>

            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Get your OpenAI API key:
              </Typography>

              <Button
                variant="outlined"
                size="small"
                startIcon={<LaunchIcon />}
                onClick={openExternalUrl}
                sx={{ mb: 2 }}
              >
                Open OpenAI API Keys Page
              </Button>

              <Stack spacing={1} sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  <strong>How to create an API key:</strong>
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  • Sign in to your OpenAI account
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  • Click "Create new secret key"
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  • Give it a name like "Smart Inbox Janitor"
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  • <strong>Set permissions to "Restricted"</strong>
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  • Under permissions, only enable: <strong>"Model capabilities" → Read</strong>
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  • Click "Create secret key" and copy it immediately
                </Typography>
              </Stack>

              <Alert severity="info" sx={{ mb: 3 }}>
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <SecurityIcon />
                  <Typography variant="subtitle2">Security Best Practices</Typography>
                </Box>
                <Typography variant="body2">
                  <strong>Recommended:</strong> Use "Restricted" permissions with only "Model
                  capabilities → Read" enabled. This gives Smart Inbox Janitor the minimum access
                  needed for email classification.
                </Typography>
              </Alert>
            </Box>

            <TextField
              fullWidth
              label="OpenAI API Key"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-... or sk-proj-..."
              helperText="Paste your OpenAI API key here"
              sx={{ mb: 2 }}
              disabled={loading}
            />

            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                Your API key is stored securely and encrypted locally. It will only be used for
                email classification and never shared with third parties.
              </Typography>
            </Alert>

            <Button
              variant="contained"
              onClick={() => void handleValidateKey()}
              disabled={loading || !apiKey.trim()}
              fullWidth
              sx={{ py: 1.5 }}
            >
              {loading ? 'Validating...' : 'Test & Validate API Key'}
            </Button>
          </Box>
        ) : (
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <CheckCircleIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />

            <Typography variant="h6" gutterBottom>
              OpenAI Integration Ready!
            </Typography>

            <Typography variant="body1" color="text.secondary" paragraph>
              Your OpenAI API key has been validated and stored securely. Smart Inbox Janitor can
              now use AI-powered classification for your emails.
            </Typography>

            <Stack spacing={1} sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary">
                <strong>Model:</strong> GPT-4o-mini (cost-optimized for email classification)
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Security:</strong> All data encrypted and stored locally
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Usage:</strong> Only used for email content analysis
              </Typography>
            </Stack>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>

        {isValidated && validationResult && (
          <Button variant="contained" onClick={handleComplete} startIcon={<CheckCircleIcon />}>
            Complete Setup
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
