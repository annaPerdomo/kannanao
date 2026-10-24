'use client';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

import { Loading } from '@/components/Loading';
import { DEMO_PERSONAS, droppedLegs, explainPlan, simulatePersona, whatIf } from '@/lib/demo';

import { PersonaPicker } from './PersonaPicker';
import { TeacherView } from './TeacherView';
import { TodayPlan } from './TodayPlan';
import { WhatChanged } from './WhatChanged';
import { type WordMark, WordMarks } from './WordMarks';

export interface DemoLabProps {
  now: Date | null;
}

const DEFAULT_PERSONA_KEY = 'maya';

interface Outcome {
  result: ReturnType<typeof whatIf>;
  misses: string[];
}

export function DemoLab({ now }: DemoLabProps) {
  const t = useTranslations('DemoLab');
  const [personaKey, setPersonaKey] = useState(DEFAULT_PERSONA_KEY);
  const [marks, setMarks] = useState<Record<string, WordMark>>({});
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  const persona = DEMO_PERSONAS.find((p) => p.key === personaKey) ?? DEMO_PERSONAS[0];
  const sim = useMemo(() => (now ? simulatePersona(persona, now) : null), [persona, now]);

  if (!now || !sim) return <Loading message={t('loading')} />;

  const todayReasons = explainPlan(sim.today, sim.progress);
  const todayDropped = droppedLegs(sim.today);

  const handlePersonaChange = (key: string) => {
    setPersonaKey(key);
    setMarks({});
    setOutcome(null);
  };

  const handleWordMark = (cardId: string, mark: WordMark) => {
    setMarks((prev) => ({ ...prev, [cardId]: mark }));
  };

  const handleFinish = () => {
    const misses = Object.entries(marks)
      .filter(([, mark]) => mark === 'wrong')
      .map(([cardId]) => cardId);
    setOutcome({ result: whatIf(sim.progress, misses, now, { personaKey }), misses });
  };

  const handleStartOver = () => {
    setMarks({});
    setOutcome(null);
  };

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 3, sm: 4 } }}>
      <Stack spacing={3}>
        <Stack spacing={1}>
          <Typography component="h1" variant="h4" sx={{ fontWeight: 800, color: 'text.primary' }}>
            {t('title')}
          </Typography>
          <Typography sx={{ color: 'text.secondary' }}>{t('subtitle')}</Typography>
        </Stack>

        <PersonaPicker selected={personaKey} onSelect={handlePersonaChange} />

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems="flex-start">
          <Stack spacing={3} sx={{ flex: 1, width: '100%', minWidth: 0 }}>
            <TodayPlan title={t('todayHeading')} legs={todayReasons} dropped={todayDropped} />
            <WordMarks
              sim={sim}
              marks={marks}
              onMark={handleWordMark}
              onFinish={handleFinish}
              finished={outcome != null}
            />
            {outcome && (
              <WhatChanged
                result={outcome.result}
                misses={outcome.misses}
                now={now}
                onStartOver={handleStartOver}
              />
            )}
          </Stack>
          <Stack spacing={3} sx={{ flex: 1, width: '100%', minWidth: 0 }}>
            <TeacherView
              now={now}
              selectedPersona={persona}
              liveProgress={outcome?.result.progress ?? null}
            />
          </Stack>
        </Stack>
      </Stack>
    </Container>
  );
}
