'use client';

import { alpha, Box, Button, Chip, Container, LinearProgress, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';

import { ComboChip } from '@/components/ComboChip';

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
}: GameShellProps) {
  const theme = useTheme();
  const { brand } = theme.palette;

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 3, sm: 4 }, px: { xs: 2, sm: 3 } }}>
      <Box
        sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.75 }}
      >
        <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box component="span" aria-hidden>
            {emoji}
          </Box>
          {title}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ComboChip count={comboCount} />
          <Chip label={`${Math.min(current + 1, total)} / ${total}`} />
        </Box>
      </Box>

      {/* Plain-words how-to so the first screen is self-explanatory to a kid. */}
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
        {howTo}
      </Typography>

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

      {children}

      <Box sx={{ mt: 3, textAlign: 'right' }}>
        <Button size="small" color="inherit" onClick={onQuit} sx={{ opacity: 0.5 }}>
          Quit &amp; Save Progress
        </Button>
      </Box>
    </Container>
  );
}
