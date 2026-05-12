'use client';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';

import { StyledDialog } from '@/components/StyledDialog';

interface NotificationPromptProps {
  open: boolean;
  onClose: () => void;
  onEnable: () => Promise<void>;
  loading: boolean;
}

const STORAGE_KEY = 'dm_push_prompted';

/** Check if the user has already been prompted */
export function hasBeenPrompted(): boolean {
  if (typeof window === 'undefined') return true;
  return localStorage.getItem(STORAGE_KEY) === '1';
}

/** Mark the user as having been prompted */
export function markPrompted(): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, '1');
  }
}

export function NotificationPrompt({ open, onClose, onEnable, loading }: NotificationPromptProps) {
  const theme = useTheme();
  const { brand } = theme.palette;

  const handleEnable = async () => {
    try {
      await onEnable();
      markPrompted();
      onClose();
    } catch {
      // Keep dialog open so user can retry
    }
  };

  const handleDismiss = () => {
    markPrompted();
    onClose();
  };

  return (
    <StyledDialog
      open={open}
      onClose={handleDismiss}
      title="Stay in the loop!"
      subtitle="Get notified when you receive a message"
      icon={<NotificationsActiveIcon sx={{ color: brand[600], fontSize: 22 }} />}
      titleId="notification-prompt-title"
      maxWidth="xs"
      actions={
        <Stack direction="row" gap={1}>
          <Button onClick={handleDismiss} disabled={loading}>
            Not now
          </Button>
          <Button
            variant="contained"
            onClick={() => void handleEnable()}
            disabled={loading}
            sx={{ borderRadius: 2 }}
          >
            {loading ? <CircularProgress size={16} sx={{ color: 'white', mr: 1 }} /> : null}
            Enable notifications
          </Button>
        </Stack>
      }
    >
      <Box sx={{ textAlign: 'center', py: 1 }}>
        <Typography sx={{ fontSize: '2.5rem', mb: 1 }}>🔔</Typography>
        <Typography sx={{ color: 'text.primary', fontSize: '0.9rem' }}>
          Turn on notifications so you never miss a message.
        </Typography>
      </Box>
    </StyledDialog>
  );
}
