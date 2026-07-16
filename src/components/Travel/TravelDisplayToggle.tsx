'use client';

import { Box, ToggleButton, ToggleButtonGroup, Tooltip, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { useTranslations } from 'next-intl';

import { useTravelDisplay } from '@/contexts/TravelDisplayContext';
import type { TravelDisplayMode } from '@/types/travel';

interface TravelDisplayToggleProps {
  /** Optional label — defaults to the translated "Show Japanese as:" */
  label?: string;
}

export function TravelDisplayToggle({ label }: TravelDisplayToggleProps) {
  const t = useTranslations('Travel.displayToggle');
  const { palette } = useTheme();
  const { brand, accent } = palette;
  const { mode, setMode } = useTravelDisplay();

  const OPTIONS: Array<{ value: TravelDisplayMode; label: string; tooltip: string }> = [
    { value: 'romaji', label: t('options.romaji.label'), tooltip: t('options.romaji.tooltip') },
    {
      value: 'hiragana',
      label: t('options.hiragana.label'),
      tooltip: t('options.hiragana.tooltip'),
    },
    { value: 'kanji', label: t('options.kanji.label'), tooltip: t('options.kanji.tooltip') },
  ];

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ fontWeight: 600, fontSize: '0.78rem' }}
      >
        {label ?? t('label')}
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
  );
}
