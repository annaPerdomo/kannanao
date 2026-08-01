'use client';
import { Box, Switch, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { useTranslations } from 'next-intl';

interface ReadingSwitchProps {
  unlocked: boolean;
  /** Cards in the deck that Reading could ask; 0 disables the switch. */
  cardCount: number;
  onToggle: (enabled: boolean) => void;
}

/**
 * Owner-only unlock for the 📖 Reading tile. Learners never see this row — for
 * them the tile is simply absent until their educator turns it on.
 */
export function ReadingSwitch({ unlocked, cardCount, onToggle }: ReadingSwitchProps) {
  const t = useTranslations('Deck.practiceHero');
  const { brand } = useTheme().palette;
  const noKanji = cardCount === 0;

  return (
    <Box
      sx={{
        mt: 2,
        px: 2,
        py: 1.25,
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        borderRadius: (theme) => theme.radii.md,
        border: '1.5px solid',
        borderColor: alpha(brand[300], 0.4),
        bgcolor: alpha(brand[100], 0.35),
      }}
    >
      <Typography sx={{ fontSize: '1.4rem', lineHeight: 1 }} aria-hidden>
        📖
      </Typography>
      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <Typography sx={{ fontSize: '0.85rem', fontWeight: 800, color: 'text.primary' }}>
          {t('readingSwitchTitle')}
        </Typography>
        <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>
          {noKanji
            ? t('readingSwitchNoKanji')
            : unlocked
              ? t('readingSwitchOn', { count: cardCount })
              : t('readingSwitchOff')}
        </Typography>
      </Box>
      <Switch
        size="small"
        checked={unlocked}
        disabled={noKanji}
        onChange={(e) => onToggle(e.target.checked)}
        inputProps={{ 'aria-label': t('readingSwitchAria') }}
        sx={{
          '& .MuiSwitch-switchBase.Mui-checked': { color: brand[600] },
          '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: brand[400] },
        }}
      />
    </Box>
  );
}
