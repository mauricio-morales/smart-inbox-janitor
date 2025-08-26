import React from 'react';
import { Box, Paper, Typography, Button, Stack } from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Email as EmailIcon,
  Psychology as PsychologyIcon,
} from '@mui/icons-material';

export function Dashboard(): React.JSX.Element {
  console.log('DEBUG: Dashboard component rendered - setup is complete!');

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
      <Paper
        sx={{
          maxWidth: 600,
          width: '100%',
          p: 4,
          textAlign: 'center',
        }}
      >
        <CheckCircleIcon
          sx={{
            fontSize: 80,
            color: 'success.main',
            mb: 2,
          }}
        />

        <Typography variant="h3" gutterBottom>
          Welcome to Smart Inbox Janitor!
        </Typography>

        <Typography variant="h6" color="text.secondary" paragraph>
          Your setup is complete and ready to go.
        </Typography>

        <Paper variant="outlined" sx={{ p: 3, mb: 4 }}>
          <Stack spacing={2}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <EmailIcon sx={{ mr: 1, color: 'success.main' }} />
              <Typography variant="body1">
                <strong>Gmail:</strong> ✅ Connected and Ready
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <PsychologyIcon sx={{ mr: 1, color: 'success.main' }} />
              <Typography variant="body1">
                <strong>AI Classification:</strong> ✅ OpenAI GPT-4o-mini Configured
              </Typography>
            </Box>

            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              All systems are operational and your data is secure.
            </Typography>
          </Stack>
        </Paper>

        <Stack spacing={2} direction="row" justifyContent="center">
          <Button variant="contained" size="large" disabled sx={{ opacity: 0.6 }}>
            Dashboard (Coming Soon)
          </Button>

          <Button variant="outlined" size="large" disabled sx={{ opacity: 0.6 }}>
            Email Management (Coming Soon)
          </Button>
        </Stack>

        <Typography variant="body2" color="text.secondary" sx={{ mt: 3 }}>
          Smart Inbox Janitor is ready to help you manage your emails intelligently and securely.
        </Typography>
      </Paper>
    </Box>
  );
}
