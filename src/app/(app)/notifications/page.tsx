'use client';

import { Box, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';

export default function NotificationsPage() {
  const theme = useTheme();
  const { brand } = theme.palette;

  return (
    <Box
      sx={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 1,
      }}
    >
      <Typography sx={{ fontSize: '3rem' }}>💬</Typography>
      <Typography sx={{ fontWeight: 700, color: brand[600] }}>Select a conversation</Typography>
      <Typography sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>
        Choose a chat from the left to start messaging
      </Typography>
    </Box>
  );
}
