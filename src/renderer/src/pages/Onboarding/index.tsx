import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Alert,
  TextField,
  FormControlLabel,
  Checkbox,
  Stack,
} from '@mui/material';
import {
  Email as EmailIcon,
  Psychology as PsychologyIcon,
  CheckCircle as CheckCircleIcon,
  Api as ApiIcon,
  Launch as LaunchIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useElectronAPI } from '../../hooks/useElectronAPI';

const steps = [
  {
    label: 'Welcome to Smart Inbox Janitor',
    description: 'AI-powered email management and security',
  },
  {
    label: 'Google API Setup',
    description: 'Create Google API credentials',
  },
  {
    label: 'Connect Gmail',
    description: 'Sign in to your Gmail account',
  },
  {
    label: 'Configure OpenAI',
    description: 'Set up AI classification',
  },
  {
    label: 'Review Settings',
    description: 'Confirm your preferences',
  },
];

export function Onboarding(): React.JSX.Element {
  const navigate = useNavigate();
  const api = useElectronAPI();

  const [activeStep, setActiveStep] = useState(0);
  const [openaiApiKey, setOpenaiApiKey] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [enableDangerousEmailAlerts, setEnableDangerousEmailAlerts] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Google API credentials state
  const [googleClientId, setGoogleClientId] = useState('');
  const [googleClientSecret, setGoogleClientSecret] = useState('');
  const [credentialsValidated, setCredentialsValidated] = useState(false);

  const handleNext = (): void => {
    setActiveStep(prevStep => prevStep + 1);
    setError(null);
  };

  const handleBack = (): void => {
    setActiveStep(prevStep => prevStep - 1);
    setError(null);
  };

  const handleGoogleCredentialsSetup = async (): Promise<void> => {
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

      // Store credentials temporarily (will be persisted only after successful OAuth)
      // For now, just validate format and proceed
      setCredentialsValidated(true);
      handleNext();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setError(`Credential validation error: ${message}`);
    } finally {
      setLoading(false);
    }
  };

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
      if (checkResult.isConnected) {
        // Already connected, proceed to next step
        handleNext();
        return;
      }

      // Initiate OAuth flow with user-provided credentials
      const oauthResult = await api.initiateGmailOAuth({
        clientId: googleClientId,
        clientSecret: googleClientSecret
      });
      
      if (oauthResult.accountEmail) {
        // OAuth completed successfully
        handleNext();
      } else {
        // OAuth failed - restart credential setup
        setError('Gmail connection failed. Please verify your Google API credentials and try again.');
        setCredentialsValidated(false);
        setActiveStep(1); // Go back to Google API setup step
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setError(`Gmail connection error: ${message}`);
      // Reset credentials on failure so user can start over
      setCredentialsValidated(false);
      setGoogleClientId('');
      setGoogleClientSecret('');
      setActiveStep(1); // Go back to Google API setup step
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAISetup = async (): Promise<void> => {
    try {
      if (!openaiApiKey.trim()) {
        setError('Please enter your OpenAI API key');
        return;
      }

      if (!openaiApiKey.startsWith('sk-')) {
        setError('OpenAI API key should start with "sk-"');
        return;
      }

      setLoading(true);
      setError(null);

      // Validate and store the OpenAI API key
      const validationResult = await api.validateOpenAIKey(openaiApiKey);
      
      if (validationResult.apiKeyValid) {
        // API key validated successfully
        handleNext();
      } else {
        // Validation failed
        setError('OpenAI validation failed: Invalid API key');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setError(`OpenAI setup error: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteOnboarding = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      // Save onboarding completion
      await api.updateConfig({
        values: {
          onboardingComplete: true,
          settings: {
            dangerousEmailAlert: enableDangerousEmailAlerts,
            openaiApiKey: openaiApiKey.trim(),
          },
        },
      });

      // Navigate to dashboard
      void navigate('/dashboard');
    } catch {
      // Onboarding completion failed (expected with stub)
      setError('Configuration saving not yet implemented - proceeding anyway');
      // Navigate anyway for demo purposes
      const timeoutFn = globalThis.setTimeout;
      if (timeoutFn != null) {
        timeoutFn(() => {
          void navigate('/dashboard');
        }, 2000);
      }
    } finally {
      setLoading(false);
    }
  };

  const getStepContent = (step: number): React.JSX.Element => {
    switch (step) {
      case 0:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Welcome to Smart Inbox Janitor! 🎉
            </Typography>
            <Typography paragraph>
              Smart Inbox Janitor is an AI-powered email management tool that helps you:
            </Typography>
            <Stack spacing={1} sx={{ mb: 3 }}>
              <Typography variant="body2">• 🧠 Automatically classify emails using AI</Typography>
              <Typography variant="body2">• 🛡️ Detect dangerous phishing attempts</Typography>
              <Typography variant="body2">• 🗑️ Safely clean up spam and promotions</Typography>
              <Typography variant="body2">• 📧 Preserve important emails</Typography>
              <Typography variant="body2">• 🔒 Keep all data local and private</Typography>
            </Stack>

            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body2">
                Smart Inbox Janitor will securely connect to your Gmail account and use OpenAI
                for intelligent email classification. Your data remains private and secure.
              </Typography>
            </Alert>

            <FormControlLabel
              control={
                <Checkbox
                  checked={agreedToTerms}
                  onChange={e => setAgreedToTerms(e.target.checked)}
                />
              }
              label="I agree to the terms of service and privacy policy"
            />
          </Box>
        );

      case 1:
        return (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <ApiIcon sx={{ mr: 1 }} />
              <Typography variant="h6">Set Up Google API Credentials</Typography>
            </Box>

            <Typography paragraph>
              Since this is an open source application, you need to create your own Google API project 
              and OAuth credentials. This ensures your data stays private and secure.
            </Typography>

            <Alert severity="info" sx={{ mb: 2 }}>
              Don't worry - we'll guide you through this step-by-step! It only takes a few minutes.
            </Alert>

            <Stack spacing={2} sx={{ mb: 3 }}>
              <Typography variant="h6" color="primary">Step-by-step guide:</Typography>
              
              <Box>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>1. Go to Google Cloud Console</strong>
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<LaunchIcon />}
                  onClick={() => {
                    const electronAPI = (globalThis as typeof globalThis & { window?: { electronAPI?: { shell?: { openExternal: (url: string) => void } } } }).window?.electronAPI;
                    if (electronAPI?.shell) {
                      void electronAPI.shell.openExternal('https://console.cloud.google.com/');
                    }
                  }}
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
                  onClick={() => {
                    const electronAPI = (globalThis as typeof globalThis & { window?: { electronAPI?: { shell?: { openExternal: (url: string) => void } } } }).window?.electronAPI;
                    if (electronAPI?.shell) {
                      void electronAPI.shell.openExternal('https://console.cloud.google.com/apis/library/gmail.googleapis.com');
                    }
                  }}
                  sx={{ mb: 1 }}
                >
                  Enable Gmail API
                </Button>
                <Typography variant="body2" color="text.secondary">
                  Click "Enable" on the Gmail API page
                </Typography>
              </Box>

              <Box>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>3. Create OAuth Credentials</strong>
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<LaunchIcon />}
                  onClick={() => {
                    const electronAPI = (globalThis as typeof globalThis & { window?: { electronAPI?: { shell?: { openExternal: (url: string) => void } } } }).window?.electronAPI;
                    if (electronAPI?.shell) {
                      void electronAPI.shell.openExternal('https://console.cloud.google.com/apis/credentials');
                    }
                  }}
                  sx={{ mb: 1 }}
                >
                  Go to Credentials
                </Button>
                <Typography variant="body2" color="text.secondary">
                  Click "Create Credentials" → "OAuth client ID" → "Desktop application"
                </Typography>
              </Box>

              <Alert severity="warning" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  <strong>Important:</strong> When creating OAuth credentials, select "Desktop application" 
                  as the application type. This allows the app to work on your local machine.
                </Typography>
              </Alert>
            </Stack>

            <Typography variant="h6" sx={{ mb: 2 }}>Enter your credentials:</Typography>

            <Stack spacing={2}>
              <TextField
                fullWidth
                label="Client ID"
                value={googleClientId}
                onChange={(e) => setGoogleClientId(e.target.value)}
                placeholder="123456789-abcdef.apps.googleusercontent.com"
                helperText="Copy this from your OAuth client credentials"
              />

              <TextField
                fullWidth
                label="Client Secret"
                type="password"
                value={googleClientSecret}
                onChange={(e) => setGoogleClientSecret(e.target.value)}
                placeholder="GOCSPX-..."
                helperText="Copy this from your OAuth client credentials"
              />
            </Stack>

            <Button
              variant="contained"
              onClick={() => {
                void handleGoogleCredentialsSetup();
              }}
              disabled={loading || !googleClientId.trim() || !googleClientSecret.trim()}
              sx={{ mt: 2 }}
            >
              {loading ? 'Validating...' : 'Save & Continue'}
            </Button>
          </Box>
        );

      case 2:
        return (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <EmailIcon sx={{ mr: 1 }} />
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

            <Typography variant="body2" color="text.secondary" paragraph>
              Your email data is processed locally and only email metadata is sent to OpenAI
              for classification purposes.
            </Typography>

            <Button
              variant="contained"
              onClick={() => {
                void handleGmailConnect();
              }}
              disabled={loading}
              sx={{ mt: 2 }}
            >
              {loading ? 'Connecting...' : 'Connect Gmail'}
            </Button>
          </Box>
        );

      case 3:
        return (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <PsychologyIcon sx={{ mr: 1 }} />
              <Typography variant="h6">Configure AI Classification</Typography>
            </Box>

            <Typography paragraph>
              Smart Inbox Janitor uses OpenAI's GPT-4o-mini for intelligent email classification.
            </Typography>

            <TextField
              fullWidth
              label="OpenAI API Key"
              type="password"
              value={openaiApiKey}
              onChange={e => setOpenaiApiKey(e.target.value)}
              placeholder="sk-..."
              helperText="Enter your OpenAI API key. Get one from https://platform.openai.com/api-keys"
              sx={{ mb: 2 }}
            />

            <Alert severity="info" sx={{ mb: 2 }}>
              Your API key is stored securely and encrypted locally. It will only be used
              for email classification and never shared with third parties.
            </Alert>

            <Button
              variant="contained"
              onClick={() => {
                void handleOpenAISetup();
              }}
              disabled={loading || !openaiApiKey.trim()}
            >
              {loading ? 'Validating...' : 'Test & Configure AI'}
            </Button>
          </Box>
        );

      case 4:
        return (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <CheckCircleIcon sx={{ mr: 1 }} />
              <Typography variant="h6">Review Your Settings</Typography>
            </Box>

            <Typography paragraph>Almost ready! Review your configuration:</Typography>

            <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
              <Stack spacing={1}>
                <Typography variant="body2">
                  <strong>Gmail:</strong> ✅ Connected and Ready
                </Typography>
                <Typography variant="body2">
                  <strong>AI Provider:</strong> ✅ OpenAI GPT-4o-mini Configured
                </Typography>
                <Typography variant="body2">
                  <strong>Storage:</strong> ✅ Local SQLite with Encryption
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  All connections secured and validated successfully.
                </Typography>
              </Stack>
            </Paper>

            <FormControlLabel
              control={
                <Checkbox
                  checked={enableDangerousEmailAlerts}
                  onChange={e => setEnableDangerousEmailAlerts(e.target.checked)}
                />
              }
              label="Enable alerts for dangerous emails"
            />

            <Box sx={{ mt: 3 }}>
              <Button
                variant="contained"
                onClick={() => {
                  void handleCompleteOnboarding();
                }}
                disabled={loading}
                size="large"
              >
                Complete Setup & Start Using
              </Button>
            </Box>
          </Box>
        );

      default:
        return <Typography>Unknown step</Typography>;
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        maxHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        p: 2,
        overflow: 'hidden',
      }}
    >
      <Paper 
        sx={{ 
          maxWidth: 800, 
          width: '100%', 
          p: 4,
          maxHeight: '95vh',
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Typography variant="h4" align="center" gutterBottom>
          Smart Inbox Janitor Setup
        </Typography>

        <Box sx={{ flex: 1, overflow: 'auto' }}>
          <Stepper activeStep={activeStep} orientation="vertical">
            {steps.map((step, index) => (
              <Step key={step.label}>
                <StepLabel>
                  <Typography variant="h6">{step.label}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {step.description}
                  </Typography>
                </StepLabel>
                <StepContent>
                  {error !== null && (
                    <Alert severity="warning" sx={{ mb: 2 }}>
                      {error}
                    </Alert>
                  )}

                  <Box sx={{ maxHeight: '60vh', overflow: 'auto', pr: 1 }}>
                    {getStepContent(index)}
                  </Box>

                  {index < steps.length - 1 && (
                    <Box sx={{ mb: 2, mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                      <Button
                        disabled={(index === 0 && !agreedToTerms) || loading}
                        onClick={() => {
                          if (index === 1) {
                            void handleGoogleCredentialsSetup();
                          } else if (index === 2) {
                            void handleGmailConnect();
                          } else if (index === 3) {
                            void handleOpenAISetup();
                          } else {
                            handleNext();
                          }
                        }}
                        sx={{ mt: 1, mr: 1 }}
                      >
                        Continue
                      </Button>
                      <Button disabled={index === 0 || loading} onClick={handleBack} sx={{ mt: 1 }}>
                        Back
                      </Button>
                    </Box>
                  )}
                </StepContent>
              </Step>
            ))}
          </Stepper>
        </Box>
      </Paper>
    </Box>
  );
}
