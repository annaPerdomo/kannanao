'use client';

import { alpha, Box, Button, Chip, LinearProgress } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useTranslations } from 'next-intl';

import { ComboChip } from '@/components/ComboChip';
import { PageHeader } from '@/components/PageHeader';
import { PracticeStage } from '@/components/PracticeStage';

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
    <PracticeStage>
      {/* howTo is the subtitle: plain-words so the first screen is
          self-explanatory to a kid. Back = quit-and-save (same as the footer
          button), so leaving mid-game never loses progress. */}
      <PageHeader
        compact
        mb={{ xs: 1.5, sm: 2 }}
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
          mb: 2,
          flexShrink: 0,
          height: 8,
          borderRadius: 4,
          bgcolor: alpha(brand[300], 0.12),
          '& .MuiLinearProgress-bar': { bgcolor: 'primary.main', borderRadius: 4 },
        }}
      />

      {/* The board stays narrower than the page frame on purpose: game tiles
          are tap targets and matching pairs shouldn't drift a full 900px apart
          on desktop. No `minHeight: 0` — a board needing more rows than the
          viewport has must push the stage taller, not spill over the quit row. */}
      <Box
        sx={{
          flex: 1,
          width: '100%',
          maxWidth: 600,
          mx: 'auto',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }}
      >
        {children}
      </Box>

      {/* Left, not right: the floating buddy parks in the bottom-right corner
          of the viewport, over the button. */}
      <Box sx={{ mt: 1.5, textAlign: 'left', flexShrink: 0 }}>
        <Button size="small" color="inherit" onClick={onQuit} sx={{ opacity: 0.5 }}>
          {t('quitAndSave')}
        </Button>
      </Box>
    </PracticeStage>
  );
}
