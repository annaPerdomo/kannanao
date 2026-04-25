'use client';
import StyleIcon from '@mui/icons-material/Style';
import { Box, Button, Chip, Stack, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';

import type { PracticeMode } from '@/types/app';

interface BatchPickerProps {
  totalCards: number;
  mode: PracticeMode;
  onSelect: (batchSize: number) => void;
  onBack: () => void;
}

interface BatchOption {
  size: number;
  label: string;
  desc: string;
  recommended?: boolean;
}

function getOptions(totalCards: number, mode: PracticeMode): BatchOption[] {
  // Match mode caps at 10 (20 tiles on screen gets crowded)
  const maxBatch = mode === 'match' ? 10 : 20;
  const options: BatchOption[] = [];

  if (totalCards > 5) options.push({ size: 5, label: '5 cards', desc: 'Quick review' });
  if (totalCards > 10)
    options.push({ size: 10, label: '10 cards', desc: 'Recommended', recommended: true });
  if (maxBatch >= 20 && totalCards > 20)
    options.push({ size: 20, label: '20 cards', desc: 'Challenge' });

  options.push({ size: totalCards, label: `All ${totalCards} cards`, desc: 'Full deck' });

  return options;
}

export function BatchPicker({ totalCards, mode, onSelect, onBack }: BatchPickerProps) {
  const theme = useTheme();
  const { brand, surfaces } = theme.palette;

  const options = getOptions(totalCards, mode);

  return (
    <Box sx={{ textAlign: 'center', py: 4 }}>
      <Box
        sx={{
          fontSize: 48,
          lineHeight: 1,
          mb: 2,
          animation: 'popIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
          '@keyframes popIn': {
            from: { transform: 'scale(0)', opacity: 0 },
            to: { transform: 'scale(1)', opacity: 1 },
          },
        }}
      >
        <StyleIcon sx={{ fontSize: 48, color: 'primary.main' }} />
      </Box>

      <Typography variant="h5" sx={{ mb: 0.5, fontWeight: 700 }}>
        How many cards?
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        This deck has {totalCards} cards. Pick a batch size to practice.
      </Typography>

      <Stack spacing={1.5} sx={{ maxWidth: 340, mx: 'auto' }}>
        {options.map((opt) => (
          <Button
            key={opt.size}
            variant={opt.recommended ? 'contained' : 'outlined'}
            size="large"
            onClick={() => onSelect(opt.size)}
            sx={{
              justifyContent: 'space-between',
              px: 3,
              py: 1.5,
              borderRadius: 2.5,
              textTransform: 'none',
              fontSize: '1rem',
              ...(opt.recommended
                ? {}
                : {
                    borderColor: alpha(brand[300], 0.4),
                    bgcolor: surfaces.input,
                    '&:hover': {
                      borderColor: brand[500],
                      bgcolor: alpha(brand[300], 0.12),
                    },
                  }),
            }}
          >
            <span>{opt.label}</span>
            <Chip
              label={opt.desc}
              size="small"
              variant="outlined"
              sx={{
                pointerEvents: 'none',
                borderColor: opt.recommended ? 'rgba(255,255,255,0.5)' : alpha(brand[300], 0.3),
                color: opt.recommended ? 'inherit' : 'text.secondary',
                fontSize: '0.75rem',
              }}
            />
          </Button>
        ))}
      </Stack>

      <Typography
        variant="caption"
        color="text.disabled"
        sx={{ display: 'block', mt: 2.5, maxWidth: 300, mx: 'auto' }}
      >
        Wrong answers come back for review so you master every card
      </Typography>

      <Button onClick={onBack} sx={{ mt: 2 }} color="inherit" size="small">
        Back
      </Button>
    </Box>
  );
}
