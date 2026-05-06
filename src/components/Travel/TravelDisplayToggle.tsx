'use client';

import { Box, ToggleButton, ToggleButtonGroup, Tooltip, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';

import { useTravelDisplay } from '@/contexts/TravelDisplayContext';
import type { TravelDisplayMode } from '@/types/travel';

const OPTIONS: Array<{ value: TravelDisplayMode; label: string; tooltip: string }> = [
  { value: 'romaji', label: 'Romaji', tooltip: 'Romaji pronunciation highlighted' },
  { value: 'hiragana', label: 'ひらがな', tooltip: 'Reading guides above kanji + romaji below' },
  { value: 'kanji', label: '漢字', tooltip: 'Japanese characters only, romaji below' },
];

const MODE_HINTS: Record<TravelDisplayMode, string> = {
  hiragana: 'Reading guides above kanji + romaji below',
  romaji: 'Romaji pronunciation highlighted',
  kanji: 'Japanese characters with romaji below',
};

interface TravelDisplayToggleProps {
  /** Optional label — defaults to "Show Japanese as:" */
  label?: string;
}

export function TravelDisplayToggle({ label = 'Show Japanese as:' }: TravelDisplayToggleProps) {
  const { palette } = useTheme();
  const { brand, accent } = palette;
  const { mode, setMode } = useTravelDisplay();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.75 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ fontWeight: 600, fontSize: '0.78rem' }}
        >
          {label}
        </Typography>
        <ToggleButtonGroup
          value={mode}
          exclusive
          onChange={(_, v) => {
            if (v) setMode(v as TravelDisplayMode);
          }}
          size="small"
          sx={{
            '& .MuiToggleButton-root': {
              px: 1.5,
              py: 0.375,
              fontWeight: 700,
              fontSize: '0.75rem',
              border: `1.5px solid ${alpha(brand[300], 0.5)}`,
              color: 'text.secondary',
              '&.Mui-selected': {
                background: `linear-gradient(90deg, ${alpha(brand[100], 0.8)}, ${alpha(accent[100], 0.8)})`,
                color: brand[700],
                borderColor: alpha(brand[300], 0.7),
              },
            },
          }}
        >
          {OPTIONS.map((opt) => (
            <Tooltip key={opt.value} title={opt.tooltip} arrow>
              <ToggleButton value={opt.value}>{opt.label}</ToggleButton>
            </Tooltip>
          ))}
        </ToggleButtonGroup>
      </Box>
      <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.68rem' }}>
        {MODE_HINTS[mode]}
      </Typography>
    </Box>
  );
}
