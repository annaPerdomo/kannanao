'use client';

import { Box, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useTranslations } from 'next-intl';

export default function NotificationsPage() {
  const t = useTranslations('Messages.emptyConversation');
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
      <Typography sx={{ fontWeight: 700, color: brand[600] }}>{t('title')}</Typography>
      <Typography sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>{t('subtitle')}</Typography>
    </Box>
  );
}
