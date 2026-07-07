'use client';

import { alpha, Box, Button, Chip, Container, LinearProgress, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';

interface GameShellProps {
  title: string;
  emoji: string;
  /** 0-based index of the current item */
  current: number;
  total: number;
  onQuit: () => void;
  children: React.ReactNode;
}

/** Shared frame for the review games: header, progress bar, quit link. */
export function GameShell({ title, emoji, current, total, onQuit, children }: GameShellProps) {
  const theme = useTheme();
  const { brand } = theme.palette;

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 3, sm: 4 }, px: { xs: 2, sm: 3 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box component="span" aria-hidden>
            {emoji}
          </Box>
          {title}
        </Typography>
        <Chip label={`${Math.min(current + 1, total)} / ${total}`} />
      </Box>

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
