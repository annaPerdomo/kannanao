'use client';
import Box from '@mui/material/Box';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';

import { stateTint } from '@/components/KanaJourney/constants';
import type { KanaStars, KanaStrengthState } from '@/lib/kanaProficiency';

interface KanaChipGridProps {
  characters: { kana: string; stars: KanaStars; state: KanaStrengthState }[];
}

const LEGEND_STATES: KanaStrengthState[] = ['solid', 'learning', 'rusty', 'new'];

export function KanaChipGrid({ characters }: KanaChipGridProps) {
  const theme = useTheme();
  const t = useTranslations('Group.memberDetail.reading');

  return (
    <Box sx={{ mt: 1 }}>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
        {characters.map((c) => (
          <Box
            key={c.kana}
            role="img"
            title={t('chipAria', { kana: c.kana, stars: c.stars })}
            aria-label={t('chipAria', { kana: c.kana, stars: c.stars })}
            sx={{
              width: 34,
              height: 34,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 1.5,
              fontSize: '0.9rem',
              fontWeight: 700,
              color: 'text.primary',
              ...stateTint(theme, c.state),
            }}
          >
            {c.kana}
          </Box>
        ))}
      </Box>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mt: 1 }}>
        {LEGEND_STATES.map((state) => (
          <Box key={state} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box
              aria-hidden
              sx={{ width: 12, height: 12, borderRadius: 0.5, ...stateTint(theme, state) }}
            />
            <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
              {t(`state.${state}`)}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
