'use client';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

import { SectionCard } from '@/components/Group/SectionCard';
import {
  DEMO_CARDS,
  DEMO_PERSONAS,
  type DemoPersona,
  groupProgressRows,
  simulatePersona,
} from '@/lib/demo';
import { groupWordInsights, type WordProgressRow } from '@/lib/handoutWords';
import type { CardProgress } from '@/lib/supabase';

interface TeacherViewProps {
  now: Date;
  selectedPersona: DemoPersona;
  liveProgress: CardProgress[] | null;
}

function asWordRows(username: string, progress: CardProgress[]): WordProgressRow[] {
  return progress.map((row) => ({
    userId: username,
    cardId: row.cardId,
    correctCount: row.correctCount,
    wrongCount: row.wrongCount,
    lastReviewedAt: row.lastReviewedAt,
    nextReviewAt: row.nextReviewAt,
    intervalDays: row.intervalDays,
    ease: row.ease,
  }));
}

export function TeacherView({ now, selectedPersona, liveProgress }: TeacherViewProps) {
  const t = useTranslations('DemoLab');
  const tDetail = useTranslations('Group.handoutDetail');
  const { warning, success } = useTheme().palette;

  const baseSims = useMemo(
    () => DEMO_PERSONAS.map((persona) => simulatePersona(persona, now)),
    [now],
  );
  const baseRows = useMemo(() => groupProgressRows(baseSims), [baseSims]);
  const baseInsights = useMemo(() => groupWordInsights(DEMO_CARDS, baseRows), [baseRows]);
  const baseByCard = useMemo(
    () => new Map(baseInsights.map((insight) => [insight.card.id, insight])),
    [baseInsights],
  );

  const liveRows = useMemo(() => {
    if (!liveProgress) return baseRows;
    const others = baseRows.filter((row) => row.userId !== selectedPersona.username);
    return [...others, ...asWordRows(selectedPersona.username, liveProgress)];
  }, [baseRows, liveProgress, selectedPersona]);
  const liveInsights = useMemo(() => groupWordInsights(DEMO_CARDS, liveRows), [liveRows]);

  return (
    <SectionCard title={t('teacherHeading')}>
      <Stack spacing={1}>
        {liveInsights.map((insight) => {
          const before = baseByCard.get(insight.card.id);
          const trickyDelta = before ? insight.trickyCount - before.trickyCount : 0;
          return (
            <Stack
              key={insight.card.id}
              direction="row"
              spacing={1}
              alignItems="center"
              justifyContent="space-between"
              sx={{ flexWrap: 'wrap', gap: 0.5 }}
            >
              <Typography sx={{ fontWeight: 700, color: 'text.primary' }}>
                {insight.card.word}
              </Typography>
              <Stack direction="row" spacing={0.5} alignItems="center" sx={{ flexWrap: 'wrap' }}>
                <Chip
                  size="small"
                  label={tDetail('seenOf', {
                    seen: insight.seenCount,
                    learners: DEMO_PERSONAS.length,
                  })}
                  sx={{ color: 'text.primary' }}
                />
                {insight.strongCount > 0 && (
                  <Chip
                    size="small"
                    label={tDetail('strongCount', { count: insight.strongCount })}
                    sx={{ color: 'text.primary' }}
                  />
                )}
                {insight.trickyCount > 0 && (
                  <Chip
                    size="small"
                    label={tDetail('trickyCount', { count: insight.trickyCount })}
                    sx={{ color: 'text.primary', bgcolor: alpha(warning.main, 0.15) }}
                  />
                )}
                {trickyDelta > 0 && (
                  <Stack direction="row" spacing={0.25} alignItems="center">
                    <WarningAmberRoundedIcon
                      aria-hidden
                      fontSize="small"
                      sx={{ color: warning.main }}
                    />
                    <Typography sx={{ fontSize: '0.7rem', color: warning.main, fontWeight: 700 }}>
                      {t('teacherHighlightUp')}
                    </Typography>
                  </Stack>
                )}
                {trickyDelta < 0 && (
                  <Stack direction="row" spacing={0.25} alignItems="center">
                    <CheckCircleRoundedIcon
                      aria-hidden
                      fontSize="small"
                      sx={{ color: success.main }}
                    />
                    <Typography sx={{ fontSize: '0.7rem', color: success.main, fontWeight: 700 }}>
                      {t('teacherHighlightDown')}
                    </Typography>
                  </Stack>
                )}
              </Stack>
            </Stack>
          );
        })}
      </Stack>
    </SectionCard>
  );
}
