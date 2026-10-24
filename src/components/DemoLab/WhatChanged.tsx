'use client';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

import { SectionCard } from '@/components/Group/SectionCard';
import {
  DEMO_CARDS,
  type DemoCardChange,
  describeNext,
  diffPlans,
  droppedLegs,
  explainPlan,
  type whatIf,
} from '@/lib/demo';
import { WRONG_REVIEW_DELAY_MIN } from '@/lib/srs';

import { TodayPlan } from './TodayPlan';

interface WhatChangedProps {
  result: ReturnType<typeof whatIf>;
  misses: string[];
  now: Date;
  onStartOver: () => void;
}

export function WhatChanged({ result, misses, now, onStartOver }: WhatChangedProps) {
  const t = useTranslations('DemoLab');
  const tStrength = useTranslations('Group.handoutDetail.strength');
  const cardsById = useMemo(() => new Map(DEMO_CARDS.map((card) => [card.id, card])), []);
  const missSet = useMemo(() => new Set(misses), [misses]);

  const tomorrowReasons = explainPlan(result.tomorrow, result.progress);
  const tomorrowDropped = droppedLegs(result.tomorrow);
  const diff = diffPlans(result.today.plan, result.tomorrow.plan);

  const lineFor = (change: DemoCardChange) => {
    const card = cardsById.get(change.cardId);
    if (!card) return null;
    const wasWrong = missSet.has(change.cardId);
    const { unit, value } = describeNext(change, now);
    const time = t(`time.${unit}`, { value });
    const strength = tStrength(change.strengthAfter);
    const key = wasWrong ? 'changeLineWrong' : 'changeLineRight';
    return (
      <Typography key={change.cardId} sx={{ fontSize: '0.85rem', color: 'text.primary' }}>
        {t(key, { word: card.word, time, strength })}
        {wasWrong && ` ${t('missedNote', { n: WRONG_REVIEW_DELAY_MIN })}`}
      </Typography>
    );
  };

  return (
    <SectionCard title={t('changedHeading')}>
      <Stack spacing={0.75} sx={{ mb: 2 }}>
        {result.changes.map(lineFor)}
      </Stack>
      <Divider sx={{ mb: 2 }} />
      <TodayPlan
        title={t('tomorrowHeading')}
        legs={tomorrowReasons}
        dropped={tomorrowDropped}
        addedModes={diff.added}
        removedModes={diff.removed}
      />
      <Button onClick={onStartOver} sx={{ mt: 2, textTransform: 'none', fontWeight: 700 }}>
        {t('startOver')}
      </Button>
    </SectionCard>
  );
}
