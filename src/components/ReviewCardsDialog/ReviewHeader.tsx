'use client';

import CloseIcon from '@mui/icons-material/Close';
import { Box, IconButton, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';

import type { MainViewMode } from '@/types/flashcard';

import { prominentToggleSx } from './styles';

interface ReviewHeaderProps {
  cardCount: number;
  allViewMode: MainViewMode | null;
  onSetAllViewMode: (mode: MainViewMode) => void;
  onClose: () => void;
}

export function ReviewHeader({
  cardCount,
  allViewMode,
  onSetAllViewMode,
  onClose,
}: ReviewHeaderProps) {
  const theme = useTheme();
  const { brand, accent } = theme.palette;

  return (
    <Box
      sx={{
        background: `linear-gradient(135deg, ${alpha(brand[100], 0.5)} 0%, ${alpha(accent[100], 0.5)} 100%)`,
        borderBottom: `1.5px solid ${alpha(brand[300], 0.25)}`,
        px: 3,
        pt: 2.5,
        pb: 2,
        position: 'relative',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          mb: 1.5,
        }}
      >
        <Box>
          <Typography
            sx={{
              fontSize: '1.15rem',
              fontWeight: 900,
              color: brand[800],
              lineHeight: 1.2,
              mb: 0.4,
            }}
          >
            📋 Review Cards
          </Typography>
          <Typography sx={{ fontSize: '0.75rem', color: alpha(brand[700], 0.6), fontWeight: 600 }}>
            {cardCount} card{cardCount !== 1 ? 's' : ''} generated — edit before adding
          </Typography>
        </Box>
        <IconButton
          size="small"
          onClick={onClose}
          aria-label="Close"
          sx={{
            width: 28,
            height: 28,
            color: alpha(brand[700], 0.4),
            '&:hover': { bgcolor: alpha(brand[300], 0.2), color: brand[700] },
          }}
        >
          <CloseIcon sx={{ fontSize: 15 }} />
        </IconButton>
      </Box>

      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 1.25,
          bgcolor: alpha('#fff', 0.75),
          border: `1px solid ${alpha(brand[300], 0.25)}`,
          borderRadius: '10px',
          px: 1.5,
          py: 1.25,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <Typography
            sx={{
              fontSize: '0.72rem',
              fontWeight: 800,
              color: 'text.primary',
              whiteSpace: 'nowrap',
            }}
          >
            Set main view mode for all cards:
          </Typography>
          <ToggleButtonGroup
            value={allViewMode}
            exclusive
            size="small"
            onChange={(_, v) => {
              if (v) onSetAllViewMode(v);
            }}
            sx={prominentToggleSx(theme)}
          >
            <ToggleButton value="romaji">ABC Romaji</ToggleButton>
            <ToggleButton value="hiragana">ひ Hiragana</ToggleButton>
            <ToggleButton value="kanji">漢 Kanji</ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Box>
    </Box>
  );
}
