/* eslint-disable no-unused-vars */
// TODO: Remove this disable when type declarations are cleaned up
/**
 * GmailSetupModal component
 *
 * Independent modal component for Gmail OAuth setup, extracted from
 * the original onboarding flow for use in provider-specific setup.
 *
 * @module GmailSetupModal
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
  Stepper,
  Step,
  StepLabel,
  StepContent,
  LinearProgress,
} from '@mui/material';
import {
  Email as EmailIcon,
  Api as ApiIcon,
  Launch as LaunchIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { useElectronAPI } from '../../hooks/useElectronAPI';

/**
 * Props for GmailSetupModal component
 */
interface GmailSetupModalProps {
  /** Whether the modal is open */
  open: boolean;
  /** Callback when modal should close */
  onClose: () => void;
  /** Callback when Gmail setup is successful */
  onSuccess: () => void;
}

/**
 * GmailSetupModal component for independent Gmail OAuth setup
 */
export default function GmailSetupModal({
  open,
  onClose,
  onSuccess,
}: GmailSetupModalProps): React.ReactElement {
  const api = useElectronAPI();

  // Component state
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Google API credentials
  const [googleClientId, setGoogleClientId] = useState('');
  const [googleClientSecret, setGoogleClientSecret] = useState('');
  const [credentialsValidated, setCredentialsValidated] = useState(false);

  // Connected account info
  const [connectedAccount, setConnectedAccount] = useState<string | null>(null);

  /**
   * Reset modal state when closed
   */
  const resetState = useCallback(() => {
    setActiveStep(0);
    setLoading(false);
    setError(null);
    setGoogleClientId('');
    setGoogleClientSecret('');
    setCredentialsValidated(false);
    setConnectedAccount(null);
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
   * Validate and save Google API credentials
   */
  const handleCredentialsSetup = async (): Promise<void> => {
    try {
      if (!googleClientId.trim() || !googleClientSecret.trim()) {
        setError('Please enter both Client ID and Client Secret');
        return;
      }

      if (!googleClientId.includes('.apps.googleusercontent.com')) {
        setError('Client ID should end with .apps.googleusercontent.com');
        return;
      }

      setLoading(true);
      setError(null);

      // Validate format and proceed (actual validation happens during OAuth)
      setCredentialsValidated(true);
      setActiveStep(1);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setError(`Credential validation error: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Initiate Gmail OAuth flow
   */
  const handleGmailConnect = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      if (!credentialsValidated || !googleClientId || !googleClientSecret) {
        setError('Google API credentials not configured');
        return;
      }

      // Check if already connected
      const checkResult = await api.checkGmailConnection();
      if (checkResult.isSignedIn && checkResult.accountEmail) {
        setConnectedAccount(checkResult.accountEmail);
        setActiveStep(2);
        return;
      }

      // Initiate OAuth flow with user-provided credentials
      const oauthResult = await api.initiateGmailOAuth({
        clientId: googleClientId,
        clientSecret: googleClientSecret,
      });

      if (oauthResult.accountEmail) {
        setConnectedAccount(oauthResult.accountEmail);
        setActiveStep(2);
      } else {
        setError(
          'Gmail connection failed. Please verify your Google API credentials and try again.',
        );
        setCredentialsValidated(false);
        setActiveStep(0);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setError(`Gmail connection error: ${message}`);
      setCredentialsValidated(false);
      setGoogleClientId('');
      setGoogleClientSecret('');
      setActiveStep(0);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Complete setup and notify parent
   */
  const handleComplete = useCallback(() => {
    if (connectedAccount) {
      onSuccess();
      resetState();
    }
  }, [connectedAccount, onSuccess, resetState]);

  /**
   * Open external URL using Electron shell
   */
  const openExternalUrl = (url: string) => {
    const electronAPI = (
      globalThis as typeof globalThis & {
        window?: { electronAPI?: { shell?: { openExternal: (url: string) => void } } };
      }
    ).window?.electronAPI;
    if (electronAPI?.shell) {
      void electronAPI.shell.openExternal(url);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      disableEscapeKeyDown={loading}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <EmailIcon color="primary" />
          <Typography variant="h6">Set Up Gmail Connection</Typography>
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

        {/* Setup stepper */}
        <Stepper activeStep={activeStep} orientation="vertical">
          {/* Step 0: Google API Credentials */}
          <Step>
            <StepLabel>Configure Google API Credentials</StepLabel>
            <StepContent>
              <Typography paragraph>
                Since this is an open source application, you need to create your own Google API
                project and OAuth credentials. This ensures your data stays private and secure.
              </Typography>

              <Alert severity="info" sx={{ mb: 2 }}>
                Don't worry - we'll guide you through this step-by-step! It only takes a few
                minutes.
              </Alert>

              <Stack spacing={2} sx={{ mb: 3 }}>
                <Box>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>1. Go to Google Cloud Console</strong>
                  </Typography>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<LaunchIcon />}
                    onClick={() => openExternalUrl('https://console.cloud.google.com/')}
                    sx={{ mb: 1 }}
                  >
                    Open Google Cloud Console
                  </Button>
                  <Typography variant="body2" color="text.secondary">
                    Create a new project or select an existing one
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>2. Enable Gmail API</strong>
                  </Typography>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<LaunchIcon />}
                    onClick={() =>
                      openExternalUrl(
                        'https://console.cloud.google.com/apis/library/gmail.googleapis.com',
                      )
                    }
                    sx={{ mb: 1 }}
                  >
                    Enable Gmail API
                  </Button>
                </Box>

                <Box>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>3. Configure OAuth Consent Screen</strong>
                  </Typography>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<LaunchIcon />}
                    onClick={() =>
                      openExternalUrl('https://console.cloud.google.com/auth/overview')
                    }
                    sx={{ mb: 1 }}
                  >
                    Go to OAuth Consent Screen
                  </Button>
                </Box>

                <Box>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>4. Add Test Users (Critical!)</strong>
                  </Typography>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<LaunchIcon />}
                    onClick={() =>
                      openExternalUrl('https://console.cloud.google.com/auth/audience')
                    }
                    sx={{ mb: 1 }}
                  >
                    Add Test Users
                  </Button>
                  <Alert severity="warning" sx={{ mt: 1 }}>
                    <Typography variant="body2">
                      <strong>Important:</strong> You must add your Gmail address as a test user or
                      you'll get "access_denied" errors during authentication.
                    </Typography>
                  </Alert>
                </Box>

                <Box>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>5. Create OAuth Credentials</strong>
                  </Typography>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<LaunchIcon />}
                    onClick={() =>
                      openExternalUrl('https://console.cloud.google.com/apis/credentials')
                    }
                    sx={{ mb: 1 }}
                  >
                    Go to Credentials
                  </Button>
                  <Typography variant="body2" color="text.secondary">
                    • Click "Create Credentials" → "OAuth client ID"
                    <br />
                    • Select "Desktop application"
                    <br />• Copy the Client ID and Client Secret
                  </Typography>
                </Box>
              </Stack>

              <Typography variant="h6" sx={{ mb: 2 }}>
                Enter your credentials:
              </Typography>

              <Stack spacing={2} sx={{ mb: 2 }}>
                <TextField
                  fullWidth
                  label="Client ID"
                  value={googleClientId}
                  onChange={(e) => setGoogleClientId(e.target.value)}
                  placeholder="123456789-abcdef.apps.googleusercontent.com"
                  helperText="Copy this from your OAuth client credentials"
                  disabled={loading}
                />

                <TextField
                  fullWidth
                  label="Client Secret"
                  type="password"
                  value={googleClientSecret}
                  onChange={(e) => setGoogleClientSecret(e.target.value)}
                  placeholder="GOCSPX-..."
                  helperText="Copy this from your OAuth client credentials"
                  disabled={loading}
                />
              </Stack>

              <Button
                variant="contained"
                onClick={() => void handleCredentialsSetup()}
                disabled={loading || !googleClientId.trim() || !googleClientSecret.trim()}
              >
                {loading ? 'Validating...' : 'Save & Continue'}
              </Button>
            </StepContent>
          </Step>

          {/* Step 1: Connect Gmail */}
          <Step>
            <StepLabel>Connect Gmail Account</StepLabel>
            <StepContent>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <ApiIcon />
                <Typography variant="h6">Connect Your Gmail Account</Typography>
              </Box>

              <Typography paragraph>
                Smart Inbox Janitor needs access to your Gmail account to analyze and organize your
                emails safely and securely.
              </Typography>

              <Alert severity="info" sx={{ mb: 2 }}>
                You'll sign in with your existing Gmail credentials through a secure OAuth flow.
                Your login information is never stored or shared.
              </Alert>

              <Button
                variant="contained"
                onClick={() => void handleGmailConnect()}
                disabled={loading}
                startIcon={<EmailIcon />}
              >
                {loading ? 'Connecting...' : 'Connect Gmail'}
              </Button>
            </StepContent>
          </Step>

          {/* Step 2: Verification */}
          <Step>
            <StepLabel>Verify Connection</StepLabel>
            <StepContent>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <CheckCircleIcon color="success" />
                <Typography variant="h6" color="success.main">
                  Gmail Connected Successfully!
                </Typography>
              </Box>

              {connectedAccount && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  <Typography>
                    <strong>Connected Account:</strong> {connectedAccount}
                  </Typography>
                </Alert>
              )}

              <Typography paragraph>
                Your Gmail account is now connected and ready to use. You can start organizing your
                emails with AI-powered classification.
              </Typography>
            </StepContent>
          </Step>
        </Stepper>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>

        {activeStep === 2 && connectedAccount && (
          <Button variant="contained" onClick={handleComplete} startIcon={<CheckCircleIcon />}>
            Complete Setup
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
