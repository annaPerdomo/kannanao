'use client';
import Box from '@mui/material/Box';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';

import { getSet } from '@/lib/kanaCurriculum';

interface KanaSetListProps {
  kanaSet: string;
}

export function KanaSetList({ kanaSet }: KanaSetListProps) {
  const t = useTranslations('Group.handoutDetail');
  const tContextual = useTranslations('KanaJourney.contextual');
  const theme = useTheme();
  const { brand } = theme.palette;
  const set = getSet(kanaSet);

  if (!set) return <Typography sx={{ fontSize: '0.85rem' }}>{t('unknownKanaSet')}</Typography>;

  return (
    <>
      <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', mb: 1 }}>
        {t('charactersCount', { count: set.entries.length })}
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {set.entries.map((entry) => (
          <Box
            key={entry.kana}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              px: 1.25,
              py: 0.75,
              borderRadius: theme.radii.md,
              border: `1px solid ${alpha(brand[300], 0.4)}`,
              bgcolor: alpha(brand[50], 0.6),
              minWidth: 48,
            }}
          >
            <Typography sx={{ fontWeight: 700, fontSize: '1.1rem', color: 'text.primary' }}>
              {entry.kana}
            </Typography>
            <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
              {entry.romaji || (entry.labelKey ? tContextual(entry.labelKey) : null)}
            </Typography>
          </Box>
        ))}
      </Box>
    </>
  );
}
