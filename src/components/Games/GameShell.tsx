'use client';

import { alpha, Box, Button, Chip, LinearProgress } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useTranslations } from 'next-intl';

import { ComboChip } from '@/components/ComboChip';
import { PageHeader } from '@/components/PageHeader';
import { LAYOUT } from '@/theme';

interface GameShellProps {
  title: string;
  emoji: string;
  /** One-line "how to play" in plain words — visible on every screen. */
  howTo: string;
  /** 0-based index of the current item */
  current: number;
  total: number;
  /** Current combo run length (from useGameSession) — chip shows from 2+. */
  comboCount?: number;
  onQuit: () => void;
  children: React.ReactNode;
  /** Quest step map (Warm-up/Word Match/Boss Round/Chest), rendered between the header and the progress bar. */
  questMap?: React.ReactNode;
}

/** Shared frame for the review games: header, how-to line, progress, quit. */
export function GameShell({
  title,
  emoji,
  howTo,
  current,
  total,
  comboCount = 0,
  onQuit,
  children,
  questMap,
}: GameShellProps) {
  const theme = useTheme();
  const { brand } = theme.palette;
  const t = useTranslations('Games.shell');

  return (
    <Box
      sx={{ maxWidth: LAYOUT.narrowMaxWidth, mx: 'auto', px: LAYOUT.pagePx, py: { xs: 3, sm: 4 } }}
    >
      {/* howTo is the subtitle: plain-words so the first screen is
          self-explanatory to a kid. Back = quit-and-save (same as the footer
          button), so leaving mid-game never loses progress. */}
      <PageHeader
        compact
        mb={2}
        onBack={onQuit}
        icon={
          <Box component="span" aria-hidden sx={{ fontSize: { xs: '1.4rem', sm: '1.6rem' } }}>
            {emoji}
          </Box>
        }
        title={title}
        subtitle={howTo}
        endContent={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ComboChip count={comboCount} />
            <Chip label={t('progress', { current: Math.min(current + 1, total), total })} />
          </Box>
        }
      />

      {questMap}

      <LinearProgress
        variant="determinate"
        value={(current / total) * 100}
        sx={{
          mb: 3,
          height: 8,
          borderRadius: 4,
          bgcolor: alpha(brand[300], 0.12),
          '& .MuiLinearProgress-bar': { bgcolor: 'primary.main', borderRadius: 4 },
        }}
      />

      {/* The board stays narrower than the page frame on purpose: game tiles
          are tap targets and matching pairs shouldn't drift a full 900px
          apart on desktop. */}
      <Box sx={{ maxWidth: 600, mx: 'auto' }}>
        {children}

        <Box sx={{ mt: 3, textAlign: 'right' }}>
          <Button size="small" color="inherit" onClick={onQuit} sx={{ opacity: 0.5 }}>
            {t('quitAndSave')}
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
