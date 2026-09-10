'use client';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import type { KanaTrack } from '@/lib/kanaCurriculum';
import type { MemberReading, TrackReading } from '@/types/reading';

import { SectionCard } from '../SectionCard';
import { useMemberFormatters } from './helpers';
import { KanaChipGrid } from './KanaChipGrid';

interface ReadingSectionProps {
  reading: MemberReading;
}

function TrackRow({ track, data }: { track: KanaTrack; data: TrackReading }) {
  const theme = useTheme();
  const { brand } = theme.palette;
  const t = useTranslations('Group.memberDetail.reading');
  const [expanded, setExpanded] = useState(false);
  const pct = data.total > 0 ? (data.known / data.total) * 100 : 0;
  const knownLabel = t('knownCount', { known: data.known, total: data.total });

  return (
    <Box>
      <Box
        sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 1 }}
      >
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, minWidth: 0 }}>
          <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: 'text.primary' }}>
            {t(track)}
          </Typography>
          <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
            {t(`stage.${data.stage}`)}
          </Typography>
        </Box>
        <Typography
          sx={{ fontSize: '0.75rem', fontWeight: 600, color: 'text.secondary', flexShrink: 0 }}
        >
          {knownLabel}
        </Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={pct}
        aria-label={knownLabel}
        sx={{
          mt: 0.5,
          height: 8,
          borderRadius: 4,
          bgcolor: alpha(brand[200], 0.5),
          '& .MuiLinearProgress-bar': { borderRadius: 4, bgcolor: brand[400] },
        }}
      />
      <Button
        size="small"
        variant="text"
        onClick={() => setExpanded((v) => !v)}
        sx={{
          mt: 0.5,
          px: 0,
          minWidth: 0,
          textTransform: 'none',
          fontWeight: 700,
          fontSize: '0.75rem',
          color: brand[700],
        }}
      >
        {expanded ? t('hideCharacters') : t('showCharacters')}
      </Button>
      {expanded && <KanaChipGrid characters={data.characters} />}
    </Box>
  );
}

export function ReadingSection({ reading }: ReadingSectionProps) {
  const t = useTranslations('Group.memberDetail.reading');
  const { formatDate } = useMemberFormatters();
  const notStarted = reading.hiragana.seen === 0 && reading.katakana.seen === 0;

  return (
    <SectionCard
      title={t('title')}
      action={
        <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
          {reading.lastPracticedAt
            ? t('lastPracticed', { date: formatDate(reading.lastPracticedAt) })
            : notStarted
              ? t('notStarted')
              : ''}
        </Typography>
      }
    >
      {!notStarted && (
        <Stack spacing={2.5}>
          {reading.hiragana.seen > 0 && <TrackRow track="hiragana" data={reading.hiragana} />}
          {reading.katakana.seen > 0 && <TrackRow track="katakana" data={reading.katakana} />}
        </Stack>
      )}
    </SectionCard>
  );
}
