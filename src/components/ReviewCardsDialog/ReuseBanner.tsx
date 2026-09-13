'use client';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';

interface ReuseBannerProps {
  reusedCount: number;
  showingFresh: boolean;
  onSwapVersions: () => void;
}

export function ReuseBanner({ reusedCount, showingFresh, onSwapVersions }: ReuseBannerProps) {
  const t = useTranslations('Deck.reviewCardsDialog.reuse');
  const { brand, accent } = useTheme().palette;

  if (reusedCount === 0) return null;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        flexWrap: 'wrap',
        px: 2.5,
        py: 1.25,
        bgcolor: alpha(accent[100], 0.5),
        borderBottom: `1px solid ${alpha(accent[300], 0.35)}`,
      }}
    >
      <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: 'text.primary' }}>
        {showingFresh
          ? t('bannerFresh', { count: reusedCount })
          : t('banner', { count: reusedCount })}
      </Typography>
      <Button
        size="small"
        onClick={onSwapVersions}
        sx={{
          minWidth: 0,
          px: 0.75,
          fontSize: '0.68rem',
          fontWeight: 800,
          textTransform: 'none',
          color: brand[700],
        }}
      >
        {showingFresh ? t('useSavedInstead') : t('useNewInstead')}
      </Button>
    </Box>
  );
}
