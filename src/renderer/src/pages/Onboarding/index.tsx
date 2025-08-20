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
  Chip,
} from '@mui/material';
import {
  Email as EmailIcon,
  Psychology as PsychologyIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useElectronAPI } from '../../hooks/useElectronAPI';

const steps = [
  {
    label: 'Welcome to Smart Inbox Janitor',
    description: 'AI-powered email management and security',
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

  const handleNext = (): void => {
    setActiveStep(prevStep => prevStep + 1);
    setError(null);
  };

  const handleBack = (): void => {
    setActiveStep(prevStep => prevStep - 1);
    setError(null);
  };

  const handleGmailConnect = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      // Try to connect to Gmail
      await api.listEmails({ maxResults: 1 });

      // This will fail with stub implementation
      handleNext();
    } catch (err) {
      console.warn('Gmail connection failed (expected with stub):', err);
      setError('Gmail provider not yet implemented - continuing with demo');
      // Allow progression even with error for demo purposes
      setTimeout(() => {
        handleNext();
        setError(null);
      }, 2000);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAISetup = async (): Promise<void> => {
    if (!openaiApiKey.trim()) {
      setError('Please enter your OpenAI API key');
      return;
    }

    if (!openaiApiKey.startsWith('sk-')) {
      setError('OpenAI API key should start with "sk-"');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Try to test OpenAI connection
      await api.checkLLMHealth();

      // This will fail with stub implementation
      handleNext();
    } catch (err) {
      console.warn('OpenAI setup failed (expected with stub):', err);
      setError('OpenAI provider not yet implemented - continuing with demo');
      // Allow progression even with error for demo purposes
      setTimeout(() => {
        handleNext();
        setError(null);
      }, 2000);
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
        onboardingComplete: true,
        settings: {
          dangerousEmailAlert: enableDangerousEmailAlerts,
          openaiApiKey: openaiApiKey.trim(),
        },
      });

      // Navigate to dashboard
      navigate('/dashboard');
    } catch (err) {
      console.warn('Onboarding completion failed (expected with stub):', err);
      setError('Configuration saving not yet implemented - proceeding anyway');
      // Navigate anyway for demo purposes
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
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
                This is a development version with stub providers. Full functionality will be
                available once the provider implementations are complete.
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
              <EmailIcon sx={{ mr: 1 }} />
              <Typography variant="h6">Connect Your Gmail Account</Typography>
              <Chip label="Stub Implementation" color="warning" size="small" sx={{ ml: 2 }} />
            </Box>

            <Typography paragraph>
              Smart Inbox Janitor needs access to your Gmail account to analyze and organize your
              emails.
            </Typography>

            <Alert severity="info" sx={{ mb: 2 }}>
              In the full version, you'll sign in with your existing Gmail credentials through a
              secure OAuth flow.
            </Alert>

            <Typography variant="body2" color="text.secondary" paragraph>
              Your email data is processed locally and never sent to external servers except for AI
              classification.
            </Typography>

            <Button
              variant="contained"
              onClick={handleGmailConnect}
              disabled={loading}
              sx={{ mt: 2 }}
            >
              Connect Gmail (Demo)
            </Button>
          </Box>
        );

      case 2:
        return (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <PsychologyIcon sx={{ mr: 1 }} />
              <Typography variant="h6">Configure AI Classification</Typography>
              <Chip label="Stub Implementation" color="warning" size="small" sx={{ ml: 2 }} />
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
              In the full version, we'll guide you through getting an API key with step-by-step
              instructions.
            </Alert>

            <Button
              variant="contained"
              onClick={handleOpenAISetup}
              disabled={loading || !openaiApiKey.trim()}
            >
              Test & Configure AI (Demo)
            </Button>
          </Box>
        );

      case 3:
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
                  <strong>Gmail:</strong> Connected (Demo)
                </Typography>
                <Typography variant="body2">
                  <strong>AI Provider:</strong> OpenAI GPT-4o-mini (Demo)
                </Typography>
                <Typography variant="body2">
                  <strong>Storage:</strong> Local SQLite (Demo)
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
                onClick={handleCompleteOnboarding}
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
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
      }}
    >
      <Paper sx={{ maxWidth: 800, width: '100%', p: 4 }}>
        <Typography variant="h4" align="center" gutterBottom>
          Smart Inbox Janitor Setup
        </Typography>

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

                {getStepContent(index)}

                {index < steps.length - 1 && (
                  <Box sx={{ mb: 2, mt: 2 }}>
                    <Button
                      disabled={(index === 0 && !agreedToTerms) || loading}
                      onClick={
                        index === 1
                          ? handleGmailConnect
                          : index === 2
                            ? handleOpenAISetup
                            : handleNext
                      }
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
      </Paper>
    </Box>
  );
}
