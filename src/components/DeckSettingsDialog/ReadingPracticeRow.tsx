'use client';
import { Box, Switch, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { useTranslations } from 'next-intl';

interface ReadingPracticeRowProps {
  unlocked: boolean;
  /** Cards in the deck that Reading could ask; 0 disables the switch. */
  cardCount: number;
  onToggle: (enabled: boolean) => void;
}

/**
 * Unlocks the 📖 Reading tile for this deck. Learners never see this row — for
 * them the tile is simply absent until their educator turns it on.
 */
export function ReadingPracticeRow({ unlocked, cardCount, onToggle }: ReadingPracticeRowProps) {
  const t = useTranslations('Deck.settingsDialog');
  const { brand } = useTheme().palette;
  const noKanji = cardCount === 0;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        p: 2,
        borderRadius: 3,
        bgcolor: unlocked ? alpha(brand[100], 0.6) : alpha(brand[100], 0.3),
        border: `1.5px solid ${alpha(brand[300], unlocked ? 0.5 : 0.3)}`,
        opacity: noKanji ? 0.65 : 1,
        transition: 'all 0.2s ease',
      }}
    >
      <Typography sx={{ fontSize: '1.4rem', lineHeight: 1 }} aria-hidden>
        📖
      </Typography>
      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', color: 'text.primary' }}>
          {t('readingTitle')}
        </Typography>
        <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', mt: 0.25 }}>
          {noKanji
            ? t('readingNoKanji')
            : unlocked
              ? t('readingOn', { count: cardCount })
              : t('readingOff')}
        </Typography>
      </Box>
      <Switch
        checked={unlocked}
        disabled={noKanji}
        onChange={(e) => onToggle(e.target.checked)}
        slotProps={{ input: { 'aria-label': t('readingAria') } }}
        sx={{
          '& .MuiSwitch-switchBase.Mui-checked': { color: brand[500] },
          '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: brand[400] },
        }}
      />
    </Box>
  );
}
