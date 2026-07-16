'use client';

import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { Box, Button, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { useTranslations } from 'next-intl';

interface QuestInterstitialProps {
  emoji: string;
  title: string;
  subtitle: string;
  /** When true, use the darker Boss-Round treatment. */
  dark?: boolean;
  onContinue: () => void;
}

/**
 * The short "get ready" screen between quest nodes — most importantly the
 * "Boss Round ⚔️" intro. Same pop-in language as the practice RoundTransition,
 * but forward-only (no retry/batch semantics), so it's its own small component.
 */
export function QuestInterstitial({
  emoji,
  title,
  subtitle,
  dark,
  onContinue,
}: QuestInterstitialProps) {
  const theme = useTheme();
  const { brand, accent } = theme.palette;
  const t = useTranslations('Review.questInterstitial');

  return (
    <Box
      sx={{
        textAlign: 'center',
        py: 6,
        px: 3,
        borderRadius: 4,
        color: dark ? '#fff' : 'text.primary',
        background: dark
          ? `linear-gradient(135deg, ${brand[800]} 0%, ${accent[900]} 100%)`
          : 'transparent',
        boxShadow: dark ? `0 12px 32px ${alpha(brand[900], 0.4)}` : 'none',
        animation: 'questPop 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        '@keyframes questPop': {
          from: { transform: 'scale(0.85) translateY(16px)', opacity: 0 },
          to: { transform: 'scale(1) translateY(0)', opacity: 1 },
        },
      }}
    >
      <Box
        sx={{
          fontSize: 64,
          lineHeight: 1,
          mb: 2,
          animation: 'questSpin 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.1s both',
          '@keyframes questSpin': {
            from: { transform: 'scale(0) rotate(-160deg)', opacity: 0 },
            to: { transform: 'scale(1) rotate(0deg)', opacity: 1 },
          },
        }}
        aria-hidden
      >
        {emoji}
      </Box>
      <Typography variant="h4" sx={{ fontWeight: 900, mb: 1 }}>
        {title}
      </Typography>
      <Typography sx={{ opacity: dark ? 0.9 : 0.8, mb: 3 }}>{subtitle}</Typography>
      <Button
        variant="contained"
        size="large"
        onClick={onContinue}
        endIcon={<ArrowForwardIcon />}
        sx={
          dark
            ? {
                bgcolor: '#fff',
                color: brand[800],
                fontWeight: 800,
                '&:hover': { bgcolor: alpha('#fff', 0.9) },
              }
            : { fontWeight: 800 }
        }
      >
        {dark ? t('letsGo') : t('continue')}
      </Button>
    </Box>
  );
}
