'use client';
import { Box, ToggleButton, ToggleButtonGroup, Tooltip, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { useTranslations } from 'next-intl';

import type { JlptLevel, MainViewMode } from '@/types/flashcard';

import { JLPT_LEVELS, settingsRowSx, toggleGroupSx } from './constants';

interface CardSettingsPanelProps {
  mainViewMode: MainViewMode;
  onMainViewModeChange: (mode: MainViewMode) => void;
  cardType: 'word' | 'phrase';
  onCardTypeChange: (type: 'word' | 'phrase') => void;
  jlptLevel: JlptLevel | undefined;
  onJlptLevelChange: (level: JlptLevel | undefined) => void;
  word: string;
  reading: string;
}

/**
 * The mode toggles preview the card's own text. A phrase card ("はじめまして、
 * よろしくおねがいします") used that whole string as a button label and pushed
 * the row off the side of the dialog, so the preview is clipped — the real
 * value is in the editable field a few rows below.
 */
const PREVIEW_MAX = 8;
const preview = (text: string) =>
  text.length > PREVIEW_MAX ? `${text.slice(0, PREVIEW_MAX)}…` : text;

export function CardSettingsPanel({
  mainViewMode,
  onMainViewModeChange,
  cardType,
  onCardTypeChange,
  jlptLevel,
  onJlptLevelChange,
  word,
  reading,
}: CardSettingsPanelProps) {
  const t = useTranslations('Deck.editCardDialog.settingsPanel');
  const theme = useTheme();
  const { brand } = theme.palette;
  const modeField = preview(mainViewMode === 'kanji' ? word : reading);
  const modeHint =
    mainViewMode === 'romaji'
      ? t('modeHintRomaji')
      : mainViewMode === 'hiragana'
        ? t('modeHintHiragana')
        : t('modeHintKanji');

  const labelSx = {
    fontSize: '0.72rem',
    fontWeight: 800,
    letterSpacing: '0.12em',
    textTransform: 'uppercase' as const,
    color: brand[500],
    lineHeight: 1,
    mb: 0.4,
  };

  const descSx = { fontSize: '0.68rem', color: alpha(brand[700], 0.6) };

  const tgSx = toggleGroupSx(theme);
  const rowSx = settingsRowSx(theme);

  return (
    <>
      {/* View Mode */}
      <Box sx={rowSx}>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={labelSx}>{t('mainViewModeLabel')}</Typography>
          <Typography sx={{ ...descSx, transition: 'opacity 0.15s ease' }}>
            {modeHint}
            {modeField ? (
              <Box component="span" sx={{ ml: 0.5, fontWeight: 700, color: brand[700] }}>
                · {modeField}
              </Box>
            ) : null}
          </Typography>
        </Box>
        <ToggleButtonGroup
          value={mainViewMode}
          exclusive
          size="small"
          onChange={(_, v) => {
            if (v) onMainViewModeChange(v);
          }}
          sx={{
            ...tgSx,
            '& .MuiToggleButton-root': { ...tgSx['& .MuiToggleButton-root'], fontSize: '0.9rem' },
          }}
        >
          <Tooltip title={t('romajiTooltip')} placement="top">
            <ToggleButton value="romaji">{t('romajiOption')}</ToggleButton>
          </Tooltip>
          <Tooltip title={t('hiraganaTooltip')} placement="top">
            <ToggleButton value="hiragana">
              {preview(reading) || t('hiraganaFallback')}
            </ToggleButton>
          </Tooltip>
          <Tooltip title={t('kanjiTooltip')} placement="top">
            <ToggleButton value="kanji">{preview(word) || t('kanjiFallback')}</ToggleButton>
          </Tooltip>
        </ToggleButtonGroup>
      </Box>

      {/* Card Type */}
      <Box sx={rowSx}>
        <Box>
          <Typography sx={labelSx}>{t('cardTypeLabel')}</Typography>
          <Typography sx={descSx}>
            {cardType === 'phrase' ? t('cardTypePhraseDesc') : t('cardTypeWordDesc')}
          </Typography>
        </Box>
        <ToggleButtonGroup
          value={cardType}
          exclusive
          size="small"
          onChange={(_, v) => {
            if (v) onCardTypeChange(v);
          }}
          sx={tgSx}
        >
          <ToggleButton value="word">{t('wordTypeOption')}</ToggleButton>
          <ToggleButton value="phrase">{t('phraseTypeOption')}</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* JLPT Level */}
      <Box sx={rowSx}>
        <Box>
          <Typography sx={labelSx}>{t('jlptLevelLabel')}</Typography>
          <Typography sx={descSx}>
            {jlptLevel ? t('jlptTagged', { level: jlptLevel }) : t('jlptNoLevel')}
          </Typography>
        </Box>
        <ToggleButtonGroup
          value={jlptLevel ?? null}
          exclusive
          size="small"
          onChange={(_, v) => onJlptLevelChange(v ?? undefined)}
          sx={{
            ...tgSx,
            '& .MuiToggleButton-root': {
              ...tgSx['& .MuiToggleButton-root'],
              px: 1.25,
              fontSize: '0.72rem',
            },
          }}
        >
          {JLPT_LEVELS.map((level) => (
            <ToggleButton key={level} value={level}>
              {level}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>
    </>
  );
}
