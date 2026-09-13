'use client';

import Box from '@mui/material/Box';
import { alpha, useTheme } from '@mui/material/styles';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';

import type { JlptLevel, MainViewMode } from '@/types/flashcard';

import { compactToggleSx } from './styles';

const JLPT_LEVELS: (JlptLevel | 'none')[] = ['N5', 'N4', 'N3', 'N2', 'N1', 'none'];

interface CardExtrasPatch {
  mainViewMode?: MainViewMode;
  cardType?: 'word' | 'phrase';
  jlptLevel?: JlptLevel;
}

interface CardExtrasProps {
  mainViewMode: MainViewMode;
  cardType: 'word' | 'phrase';
  jlptLevel?: JlptLevel;
  onChange: (patch: CardExtrasPatch) => void;
}

export function CardExtras({ mainViewMode, cardType, jlptLevel, onChange }: CardExtrasProps) {
  const t = useTranslations('Deck.reviewCardsDialog.cardRow');
  const theme = useTheme();
  const { brand } = theme.palette;
  const toggleSx = compactToggleSx(theme);
  const labelSx = {
    fontSize: '0.58rem',
    fontWeight: 700,
    color: alpha(brand[700], 0.6),
    whiteSpace: 'nowrap',
  } as const;

  return (
    <Box
      sx={{
        display: 'flex',
        gap: 1,
        alignItems: 'center',
        flexWrap: 'wrap',
        bgcolor: alpha(brand[300], 0.05),
        border: `1px solid ${alpha(brand[300], 0.18)}`,
        borderRadius: '10px',
        px: 1.25,
        py: 0.75,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <Typography sx={labelSx}>{t('displayLabel')}</Typography>
        <ToggleButtonGroup
          value={mainViewMode}
          exclusive
          size="small"
          onChange={(_, v) => {
            if (v) onChange({ mainViewMode: v });
          }}
          sx={toggleSx}
        >
          <ToggleButton value="romaji">{t('romajiOption')}</ToggleButton>
          <ToggleButton value="hiragana">{t('hiraganaFallback')}</ToggleButton>
          <ToggleButton value="kanji">{t('kanjiFallback')}</ToggleButton>
        </ToggleButtonGroup>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <Typography sx={labelSx}>{t('typeLabel')}</Typography>
        <ToggleButtonGroup
          value={cardType}
          exclusive
          size="small"
          onChange={(_, v) => {
            if (v) onChange({ cardType: v });
          }}
          sx={toggleSx}
        >
          <ToggleButton value="word">{t('wordOption')}</ToggleButton>
          <ToggleButton value="phrase">{t('phraseOption')}</ToggleButton>
        </ToggleButtonGroup>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <Typography sx={labelSx}>{t('jlptLabel')}</Typography>
        <ToggleButtonGroup
          value={jlptLevel ?? 'none'}
          exclusive
          size="small"
          onChange={(_, v) => {
            if (v) onChange({ jlptLevel: v === 'none' ? undefined : v });
          }}
          sx={toggleSx}
        >
          {JLPT_LEVELS.map((lvl) => (
            <ToggleButton key={lvl} value={lvl}>
              {lvl === 'none' ? t('noneOption') : lvl}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>
    </Box>
  );
}
