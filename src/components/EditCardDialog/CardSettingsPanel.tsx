'use client';
import { Box, Typography, Tooltip, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import type { JlptLevel } from '@/types/flashcard';
import { JLPT_LEVELS, toggleGroupSx, settingsRowSx } from './constants';

interface CardSettingsPanelProps {
  mainViewMode: 'hiragana' | 'kanji';
  onMainViewModeChange: (mode: 'hiragana' | 'kanji') => void;
  cardType: 'word' | 'phrase';
  onCardTypeChange: (type: 'word' | 'phrase') => void;
  jlptLevel: JlptLevel | undefined;
  onJlptLevelChange: (level: JlptLevel | undefined) => void;
  word: string;
  reading: string;
}

export function CardSettingsPanel({
  mainViewMode, onMainViewModeChange, cardType, onCardTypeChange,
  jlptLevel, onJlptLevelChange, word, reading,
}: CardSettingsPanelProps) {
  const theme = useTheme();
  const { brand } = theme.palette;
  const modeField = mainViewMode === 'hiragana' ? reading : word;
  const modeHint = mainViewMode === 'hiragana'
    ? 'The hiragana reading will be the card title'
    : 'The kanji reading will be the card title';

  const labelSx = {
    fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.12em',
    textTransform: 'uppercase' as const, color: brand[500],
    lineHeight: 1, mb: 0.4,
  };

  const descSx = { fontSize: '0.68rem', color: alpha(brand[700], 0.6) };

  const tgSx = toggleGroupSx(theme);
  const rowSx = settingsRowSx(theme);

  return (
    <>
      {/* View Mode */}
      <Box sx={rowSx}>
        <Box>
          <Typography sx={labelSx}>Main View Mode</Typography>
          <Typography sx={{ ...descSx, transition: 'opacity 0.15s ease' }}>
            {modeHint}
            {modeField ? <Box component="span" sx={{ ml: 0.5, fontWeight: 700, color: brand[700] }}>· {modeField}</Box> : null}
          </Typography>
        </Box>
        <ToggleButtonGroup
          value={mainViewMode} exclusive size="small"
          onChange={(_, v) => { if (v) onMainViewModeChange(v); }}
          sx={{ ...tgSx, '& .MuiToggleButton-root': { ...tgSx['& .MuiToggleButton-root'], fontSize: '0.9rem' } }}
        >
          <Tooltip title="Display hiragana as the primary text" placement="top">
            <ToggleButton value="hiragana">{reading || 'ひ'}</ToggleButton>
          </Tooltip>
          <Tooltip title="Display kanji as the primary text" placement="top">
            <ToggleButton value="kanji">{word || '漢'}</ToggleButton>
          </Tooltip>
        </ToggleButtonGroup>
      </Box>

      {/* Card Type */}
      <Box sx={rowSx}>
        <Box>
          <Typography sx={labelSx}>Card Type</Typography>
          <Typography sx={descSx}>
            {cardType === 'phrase' ? 'Multi-word expression or sentence' : 'Single vocabulary word'}
          </Typography>
        </Box>
        <ToggleButtonGroup value={cardType} exclusive size="small" onChange={(_, v) => { if (v) onCardTypeChange(v); }} sx={tgSx}>
          <ToggleButton value="word">単語</ToggleButton>
          <ToggleButton value="phrase">フレーズ</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* JLPT Level */}
      <Box sx={rowSx}>
        <Box>
          <Typography sx={labelSx}>JLPT Level</Typography>
          <Typography sx={descSx}>
            {jlptLevel ? `Tagged as ${jlptLevel}` : 'No level assigned'}
          </Typography>
        </Box>
        <ToggleButtonGroup
          value={jlptLevel ?? null} exclusive size="small"
          onChange={(_, v) => onJlptLevelChange(v ?? undefined)}
          sx={{ ...tgSx, '& .MuiToggleButton-root': { ...tgSx['& .MuiToggleButton-root'], px: 1.25, fontSize: '0.72rem' } }}
        >
          {JLPT_LEVELS.map((level) => (
            <ToggleButton key={level} value={level}>{level}</ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>
    </>
  );
}
