'use client';
import { Alert, Box, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import type { MainViewMode } from '@/types/flashcard';

interface CardViewModeRowProps {
  /** The mode every card shares, or null when the deck is a mix of modes. */
  value: MainViewMode | null;
  cardCount: number;
  onChange: (mode: MainViewMode) => Promise<void>;
}

/**
 * Sets the front of every card in the deck at once. Per-card overrides still
 * live in the card editor; this is the "make them all match" shortcut.
 */
export function CardViewModeRow({ value, cardCount, onChange }: CardViewModeRowProps) {
  const t = useTranslations('Deck.settingsDialog');
  const tMode = useTranslations('Study.mainViewModeToggle');
  const { brand } = useTheme().palette;
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [failed, setFailed] = useState(false);
  const empty = cardCount === 0;

  const handleChange = async (mode: MainViewMode) => {
    setSaving(true);
    setFailed(false);
    setSaved(false);
    try {
      await onChange(mode);
      setSaved(true);
    } catch {
      setFailed(true);
    } finally {
      setSaving(false);
    }
  };

  const modeName = (mode: MainViewMode) => tMode(mode);
  const status = empty
    ? t('viewModeEmpty')
    : saving
      ? t('viewModeSaving')
      : value === null
        ? t('viewModeMixed')
        : t('viewModeAll', { count: cardCount, mode: modeName(value) });

  return (
    <Box
      sx={{
        p: 2,
        borderRadius: 3,
        bgcolor: alpha(brand[100], 0.6),
        border: `1.5px solid ${alpha(brand[300], 0.5)}`,
        opacity: empty ? 0.65 : 1,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
        <Typography
          sx={{ fontSize: '1.4rem', lineHeight: 1, fontWeight: 800, color: brand[500] }}
          aria-hidden
        >
          あ
        </Typography>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', color: 'text.primary' }}>
            {t('viewModeTitle')}
          </Typography>
          <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', mt: 0.25 }}>
            {status}
          </Typography>
        </Box>
      </Box>

      <ToggleButtonGroup
        value={value}
        exclusive
        fullWidth
        size="small"
        disabled={empty || saving}
        aria-label={t('viewModeAria')}
        onChange={(_, v) => {
          if (v) void handleChange(v);
        }}
        sx={{
          '& .MuiToggleButton-root': {
            py: 0.75,
            bgcolor: 'background.paper',
            fontWeight: 700,
            fontSize: '0.85rem',
            lineHeight: 1.2,
            whiteSpace: 'nowrap',
            textTransform: 'none',
            border: `1.5px solid ${alpha(brand[300], 0.5)}`,
            color: 'text.secondary',
            '&.Mui-selected': {
              bgcolor: alpha(brand[200], 0.55),
              color: 'text.primary',
              borderColor: alpha(brand[400], 0.9),
              '&:hover': { bgcolor: alpha(brand[200], 0.7) },
            },
          },
        }}
      >
        <ToggleButton value="romaji">{tMode('romaji')}</ToggleButton>
        <ToggleButton value="hiragana">{tMode('hiragana')}</ToggleButton>
        <ToggleButton value="kanji">{tMode('kanji')}</ToggleButton>
      </ToggleButtonGroup>

      {failed && (
        <Alert severity="error" sx={{ mt: 1.5, fontSize: '0.78rem', py: 0 }}>
          {t('viewModeError')}
        </Alert>
      )}
      {saved && !failed && !saving && (
        <Alert severity="success" sx={{ mt: 1.5, fontSize: '0.78rem', py: 0 }}>
          {t('viewModeSaved')}
        </Alert>
      )}
    </Box>
  );
}
