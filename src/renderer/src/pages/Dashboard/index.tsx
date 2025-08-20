import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Card,
  CardContent,
  LinearProgress,
  Alert,
  Chip,
  Stack,
} from '@mui/material';
import {
  Email as EmailIcon,
  Security as SecurityIcon,
  Analytics as AnalyticsIcon,
  PlayArrow as PlayArrowIcon,
} from '@mui/icons-material';
import { useElectronAPI } from '../../hooks/useElectronAPI';

interface DashboardStats {
  totalEmails: number;
  processedEmails: number;
  dangerousEmails: number;
  cleanedEmails: number;
}

export function Dashboard(): JSX.Element {
  const api = useElectronAPI();
  const [stats, setStats] = useState<DashboardStats>({
    totalEmails: 0,
    processedEmails: 0,
    dangerousEmails: 0,
    cleanedEmails: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      // Try to get basic stats from storage
      // Note: These are stub implementations, so they will return "not implemented" errors
      const configResult = await api.getConfig();

      // For now, show mock data since providers are stubs
      setStats({
        totalEmails: 15420,
        processedEmails: 3240,
        dangerousEmails: 127,
        cleanedEmails: 2890,
      });
    } catch (err) {
      console.warn('Dashboard data loading failed (expected with stub providers):', err);
      setError('Providers not yet implemented - showing demo data');

      // Show demo data even when providers fail
      setStats({
        totalEmails: 15420,
        processedEmails: 3240,
        dangerousEmails: 127,
        cleanedEmails: 2890,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStartProcessing = (): void => {
    console.log('Start email processing clicked');
    // TODO: Implement email processing workflow
    alert('Email processing will be implemented when providers are ready!');
  };

  const progressPercentage =
    stats.totalEmails > 0 ? (stats.processedEmails / stats.totalEmails) * 100 : 0;

  return (
    <Box sx={{ p: 3 }}>
      {/* Page Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Email Triage Dashboard
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          AI-powered email management and security analysis
        </Typography>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="info" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Processing Status */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Processing Status</Typography>
          <Button
            variant="contained"
            startIcon={<PlayArrowIcon />}
            onClick={handleStartProcessing}
            disabled={loading}
          >
            Start Processing
          </Button>
        </Box>

        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Progress: {stats.processedEmails.toLocaleString()} of{' '}
            {stats.totalEmails.toLocaleString()} emails processed
          </Typography>
          <LinearProgress
            variant="determinate"
            value={progressPercentage}
            sx={{ height: 8, borderRadius: 4 }}
          />
        </Box>

        <Typography variant="body2" color="text.secondary">
          {progressPercentage.toFixed(1)}% complete
        </Typography>
      </Paper>

      {/* Stats Cards */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 4 }}>
        <Box sx={{ flex: { xs: '1 0 100%', sm: '1 0 45%', md: '1 0 22%' } }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <EmailIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Total Emails</Typography>
              </Box>
              <Typography variant="h4" color="primary">
                {stats.totalEmails.toLocaleString()}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Discovered in mailbox
              </Typography>
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ flex: { xs: '1 0 100%', sm: '1 0 45%', md: '1 0 22%' } }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <AnalyticsIcon color="info" sx={{ mr: 1 }} />
                <Typography variant="h6">Processed</Typography>
              </Box>
              <Typography variant="h4" color="info.main">
                {stats.processedEmails.toLocaleString()}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                AI-analyzed emails
              </Typography>
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ flex: { xs: '1 0 100%', sm: '1 0 45%', md: '1 0 22%' } }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <SecurityIcon color="error" sx={{ mr: 1 }} />
                <Typography variant="h6">Dangerous</Typography>
              </Box>
              <Typography variant="h4" color="error.main">
                {stats.dangerousEmails.toLocaleString()}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Threats detected
              </Typography>
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ flex: { xs: '1 0 100%', sm: '1 0 45%', md: '1 0 22%' } }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <EmailIcon color="success" sx={{ mr: 1 }} />
                <Typography variant="h6">Cleaned</Typography>
              </Box>
              <Typography variant="h4" color="success.main">
                {stats.cleanedEmails.toLocaleString()}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Successfully processed
              </Typography>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Quick Actions */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Quick Actions
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <Button variant="outlined" disabled>
            Connect Gmail
          </Button>
          <Button variant="outlined" disabled>
            Configure AI Settings
          </Button>
          <Button variant="outlined" disabled>
            View Processing History
          </Button>
          <Button variant="outlined" disabled>
            Export Results
          </Button>
        </Stack>

        <Box sx={{ mt: 2 }}>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Chip label="Gmail Provider: Stub" color="warning" size="small" />
            <Chip label="OpenAI Provider: Stub" color="warning" size="small" />
            <Chip label="SQLite Provider: Stub" color="warning" size="small" />
          </Stack>
        </Box>
      </Paper>
    </Box>
  );
}
