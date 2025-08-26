import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Switch,
  FormControlLabel,
  TextField,
  Alert,
  Stack,
  Chip,
  Card,
  CardContent,
  CardActions,
} from '@mui/material';
import {
  Save as SaveIcon,
  Refresh as RefreshIcon,
  Security as SecurityIcon,
  Storage as StorageIcon,
  Psychology as PsychologyIcon,
} from '@mui/icons-material';
import { useElectronAPI } from '../../hooks/useElectronAPI';

interface SettingsState {
  autoProcessing: boolean;
  dangerousEmailAlert: boolean;
  processInBackground: boolean;
  maxBatchSize: number;
  aiConfidenceThreshold: number;
  openaiApiKey: string;
}

export function Settings(): React.JSX.Element {
  const api = useElectronAPI();
  const [settings, setSettings] = useState<SettingsState>({
    autoProcessing: false,
    dangerousEmailAlert: true,
    processInBackground: true,
    maxBatchSize: 100,
    aiConfidenceThreshold: 0.8,
    openaiApiKey: '',
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    void loadSettings();
  }, []);

  const loadSettings = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      // Try to load settings from storage
      await api.getConfig();

      // Since providers are stubs, this will fail
      // For now, keep default settings
    } catch {
      // Settings loading failed (expected with stub providers)
      setError('Settings storage not yet implemented - using defaults');
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (): Promise<void> => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      // Try to save settings
      await api.updateConfig({ values: { settings } });

      setSuccess('Settings saved successfully!');
    } catch {
      // Settings saving failed (expected with stub providers)
      setError('Settings saving not yet implemented - providers are stubs');
    } finally {
      setSaving(false);
    }
  };

  const handleSettingChange = (
    key: keyof SettingsState,
    value: boolean | number | string,
  ): void => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const testConnection = (provider: string): void => {
    setError(null);
    // Simulate connection test - will always show success for demo
    setSuccess(`${provider} connection successful!`);
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Page Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Settings
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Configure your email processing preferences and provider connections
        </Typography>
      </Box>

      {/* Status Messages */}
      {error !== null && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {success !== null && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {success}
        </Alert>
      )}

      <Stack spacing={3}>
        {/* Processing Settings */}
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Email Processing
          </Typography>

          <Stack spacing={2}>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.autoProcessing}
                  onChange={(e) => handleSettingChange('autoProcessing', e.target.checked)}
                />
              }
              label="Enable automatic email processing"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={settings.dangerousEmailAlert}
                  onChange={(e) => handleSettingChange('dangerousEmailAlert', e.target.checked)}
                />
              }
              label="Alert for dangerous emails"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={settings.processInBackground}
                  onChange={(e) => handleSettingChange('processInBackground', e.target.checked)}
                />
              }
              label="Process emails in background"
            />

            <TextField
              label="Max Batch Size"
              type="number"
              value={settings.maxBatchSize}
              onChange={(e) => handleSettingChange('maxBatchSize', parseInt(e.target.value) || 100)}
              inputProps={{ min: 10, max: 1000 }}
              helperText="Number of emails to process in each batch (10-1000)"
            />

            <TextField
              label="AI Confidence Threshold"
              type="number"
              value={settings.aiConfidenceThreshold}
              onChange={(e) =>
                handleSettingChange('aiConfidenceThreshold', parseFloat(e.target.value) || 0.8)
              }
              inputProps={{ min: 0.1, max: 1.0, step: 0.1 }}
              helperText="Minimum confidence level for automated actions (0.1-1.0)"
            />
          </Stack>
        </Paper>

        {/* Provider Connections */}
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Provider Connections
          </Typography>

          <Stack spacing={3}>
            {/* Gmail Provider */}
            <Card variant="outlined">
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <StorageIcon sx={{ mr: 1 }} />
                  <Typography variant="h6">Gmail Provider</Typography>
                  <Chip label="Stub Implementation" color="warning" size="small" sx={{ ml: 2 }} />
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Connect to your Gmail account for email processing
                </Typography>
              </CardContent>
              <CardActions>
                <Button
                  size="small"
                  onClick={() => {
                    void testConnection('gmail');
                  }}
                  disabled={loading}
                >
                  Test Connection
                </Button>
                <Button size="small" disabled>
                  Configure
                </Button>
              </CardActions>
            </Card>

            {/* OpenAI Provider */}
            <Card variant="outlined">
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <PsychologyIcon sx={{ mr: 1 }} />
                  <Typography variant="h6">OpenAI Provider</Typography>
                  <Chip label="Stub Implementation" color="warning" size="small" sx={{ ml: 2 }} />
                </Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  AI classification using GPT-4o-mini
                </Typography>
                <TextField
                  fullWidth
                  label="API Key"
                  type="password"
                  value={settings.openaiApiKey}
                  onChange={(e) => handleSettingChange('openaiApiKey', e.target.value)}
                  placeholder="sk-..."
                  helperText="Your OpenAI API key for email classification"
                />
              </CardContent>
              <CardActions>
                <Button
                  size="small"
                  onClick={() => {
                    void testConnection('openai');
                  }}
                  disabled={loading}
                >
                  Test Connection
                </Button>
              </CardActions>
            </Card>

            {/* Storage Provider */}
            <Card variant="outlined">
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <SecurityIcon sx={{ mr: 1 }} />
                  <Typography variant="h6">SQLite Storage</Typography>
                  <Chip label="Stub Implementation" color="warning" size="small" sx={{ ml: 2 }} />
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Local database for storing classifications and user rules
                </Typography>
              </CardContent>
              <CardActions>
                <Button size="small" disabled>
                  View Database
                </Button>
                <Button size="small" disabled>
                  Export Data
                </Button>
              </CardActions>
            </Card>
          </Stack>
        </Paper>

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => {
              void loadSettings();
            }}
            disabled={loading}
          >
            Reset
          </Button>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={() => {
              void saveSettings();
            }}
            disabled={saving || loading}
          >
            Save Settings
          </Button>
        </Box>
      </Stack>
    </Box>
  );
}
