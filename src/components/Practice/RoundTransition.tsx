'use client';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ReplayIcon from '@mui/icons-material/Replay';
import { Box, Button, Chip, LinearProgress, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';

interface RoundTransitionProps {
  batchIndex: number;
  totalBatches: number;
  isRetryRound: boolean;
  wrongCount: number;
  totalInRound: number;
  /** Whether the next round will be a retry (vs advancing to new batch). */
  willRetry: boolean;
  onContinue: () => void;
  onExit: () => void;
}

export function RoundTransition({
  batchIndex,
  totalBatches,
  isRetryRound,
  wrongCount,
  totalInRound,
  willRetry,
  onContinue,
  onExit,
}: RoundTransitionProps) {
  const theme = useTheme();
  const { brand } = theme.palette;
  const correctCount = totalInRound - wrongCount;
  const pct = totalInRound > 0 ? correctCount / totalInRound : 0;

  return (
    <Box
      sx={{
        textAlign: 'center',
        py: 6,
        animation: 'roundSlideIn 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        '@keyframes roundSlideIn': {
          from: { transform: 'scale(0.8) translateY(20px)', opacity: 0 },
          to: { transform: 'scale(1) translateY(0)', opacity: 1 },
        },
      }}
    >
      {/* Emoji */}
      <Box
        sx={{
          fontSize: 64,
          lineHeight: 1,
          mb: 2,
          userSelect: 'none',
          display: 'inline-block',
          animation: 'spinIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.1s both',
          '@keyframes spinIn': {
            from: { transform: 'scale(0) rotate(-180deg)', opacity: 0 },
            to: { transform: 'scale(1) rotate(0deg)', opacity: 1 },
          },
        }}
      >
        {pct === 1 ? '🌟' : pct >= 0.7 ? '✨' : '💪'}
      </Box>

      {/* Heading */}
      <Typography variant="h4" sx={{ mb: 1, fontWeight: 700 }}>
        {isRetryRound
          ? pct === 1
            ? 'All reviewed!'
            : 'Almost there!'
          : `Round ${batchIndex + 1} done!`}
      </Typography>

      {/* Score */}
      <Typography color="text.secondary" sx={{ mb: 1 }}>
        {correctCount} / {totalInRound} correct
      </Typography>

      {/* Progress bar */}
      <Box sx={{ maxWidth: 280, mx: 'auto', mb: 2 }}>
        <LinearProgress
          variant="determinate"
          value={pct * 100}
          sx={{
            height: 8,
            borderRadius: 4,
            bgcolor: alpha(brand[300], 0.12),
            '& .MuiLinearProgress-bar': {
              bgcolor: pct === 1 ? 'success.main' : pct >= 0.7 ? 'primary.main' : 'warning.main',
              borderRadius: 4,
            },
          }}
        />
      </Box>

      {/* Batch progress chip */}
      {totalBatches > 1 && (
        <Box sx={{ mb: 2 }}>
          <Chip
            label={`Batch ${batchIndex + 1} of ${totalBatches}`}
            size="small"
            variant="outlined"
          />
        </Box>
      )}

      {/* Retry message */}
      {willRetry && wrongCount > 0 && (
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 1,
            px: 2.5,
            py: 1,
            borderRadius: 3,
            bgcolor: alpha(theme.palette.warning.main, 0.1),
            border: `1px solid ${alpha(theme.palette.warning.main, 0.3)}`,
            mb: 3,
            mt: 1,
          }}
        >
          <ReplayIcon sx={{ fontSize: '1.2rem', color: 'warning.main' }} />
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {wrongCount} {wrongCount === 1 ? 'card' : 'cards'} to review
          </Typography>
        </Box>
      )}

      {/* Not retrying but still has wrong — retries exhausted */}
      {!willRetry && wrongCount > 0 && (
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 1,
            px: 2.5,
            py: 1,
            borderRadius: 3,
            bgcolor: alpha(brand[300], 0.08),
            border: `1px solid ${alpha(brand[300], 0.2)}`,
            mb: 3,
            mt: 1,
          }}
        >
          <Typography variant="body2" color="text.secondary">
            Moving on to new cards
          </Typography>
        </Box>
      )}

      {/* Continue button */}
      <Box sx={{ mt: willRetry || wrongCount > 0 ? 0 : 3 }}>
        <Button
          variant="contained"
          size="large"
          onClick={onContinue}
          startIcon={willRetry ? <ReplayIcon /> : <ArrowForwardIcon />}
        >
          {willRetry ? `Review ${wrongCount} ${wrongCount === 1 ? 'card' : 'cards'}` : `Next batch`}
        </Button>
      </Box>

      <Box sx={{ mt: 2 }}>
        <Button size="small" color="inherit" onClick={onExit} sx={{ opacity: 0.5 }}>
          Quit &amp; Save Progress
        </Button>
      </Box>
    </Box>
  );
}
