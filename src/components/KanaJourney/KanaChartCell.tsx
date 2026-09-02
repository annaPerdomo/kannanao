'use client';
import { Box, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useTranslations } from 'next-intl';

import type { KanaEntry } from '@/lib/kanaCurriculum';
import type { KanaStrengthState } from '@/lib/kanaProficiency';

import { CELL_WIDTH, stateTint } from './constants';

interface KanaChartCellProps {
  entry: KanaEntry | null;
  state: KanaStrengthState;
  onPlay: (kana: string) => void;
}

export function KanaChartCell({ entry, state, onPlay }: KanaChartCellProps) {
  const t = useTranslations('KanaJourney.journey');
  const theme = useTheme();

  if (!entry) {
    return <Box aria-hidden sx={{ width: CELL_WIDTH, minHeight: { xs: 52, sm: 60 } }} />;
  }

  const play = () => onPlay(entry.kana);

  return (
    <Box
      role="button"
      tabIndex={0}
      aria-label={t('cellLabel', {
        kana: entry.kana,
        romaji: entry.romaji,
        state: t(`state.${state}`),
      })}
      onClick={play}
      onKeyDown={(e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          play();
        }
      }}
      sx={{
        width: CELL_WIDTH,
        minHeight: { xs: 52, sm: 60 },
        borderRadius: 2,
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'text.primary',
        transition: 'transform 0.15s ease',
        '&:hover': { transform: 'translateY(-2px)' },
        ...stateTint(theme, state),
      }}
    >
      <Typography
        aria-hidden
        component="span"
        sx={{
          fontFamily: (th) => th.fonts.jp,
          fontSize: { xs: '1.3rem', sm: '1.5rem' },
          lineHeight: 1.1,
          fontWeight: 600,
        }}
      >
        {entry.kana}
      </Typography>
      <Typography
        aria-hidden
        component="span"
        sx={{ fontSize: { xs: '0.6rem', sm: '0.66rem' }, color: 'text.secondary' }}
      >
        {entry.romaji}
      </Typography>
    </Box>
  );
}
