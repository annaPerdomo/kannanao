'use client';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

import { HandoutDetailDialog } from '@/components/Group/HandoutDetailDialog';
import { SectionCard } from '@/components/Group/SectionCard';
import { Loading } from '@/components/Loading';
import { useLessonLibrary } from '@/hooks/useLessonLibrary';
import { handoutRefFromWeek } from '@/types/handout';
import type { LessonUnitWeek } from '@/types/lessonUnit';

import { UnitCard } from './UnitCard';
import { WeekRow } from './WeekRow';

interface LessonLibraryProps {
  groupId: string;
  onBuild: () => void;
}

export function LessonLibrary({ groupId, onBuild }: LessonLibraryProps) {
  const t = useTranslations('Materials.library');
  const { library, loading, error, refetch } = useLessonLibrary(groupId);
  const [activeWeek, setActiveWeek] = useState<LessonUnitWeek | null>(null);

  const firstCurrentUnitId = useMemo(
    () => library?.units.find((unit) => unit.weeks.some((w) => w.status === 'current'))?.id ?? null,
    [library],
  );

  if (loading && !library) return <Loading />;

  if (error) {
    return (
      <Stack spacing={2} sx={{ alignItems: 'flex-start' }}>
        <Alert severity="error">{error}</Alert>
        <Button variant="contained" onClick={() => void refetch()}>
          {t('retry')}
        </Button>
      </Stack>
    );
  }

  if (!library) return null;

  if (library.units.length === 0 && library.loose.length === 0) {
    return (
      <Stack spacing={1.5} sx={{ alignItems: 'flex-start', py: 2 }}>
        <Typography sx={{ fontWeight: 800, fontSize: '1rem', color: 'text.primary' }}>
          {t('emptyTitle')}
        </Typography>
        <Typography sx={{ color: 'text.secondary' }}>{t('emptyBody')}</Typography>
        <Button variant="contained" onClick={onBuild}>
          {t('buildButton')}
        </Button>
      </Stack>
    );
  }

  return (
    <>
      <Stack spacing={2}>
        {library.units.map((unit) => (
          <UnitCard
            key={unit.id}
            unit={unit}
            onOpenWeek={setActiveWeek}
            defaultExpanded={unit.id === firstCurrentUnitId}
          />
        ))}

        {library.loose.length > 0 && (
          <SectionCard title={t('otherHandouts')}>
            <Stack spacing={1}>
              {library.loose.map((week) => (
                <WeekRow key={week.deckId} week={week} onOpen={() => setActiveWeek(week)} />
              ))}
            </Stack>
          </SectionCard>
        )}
      </Stack>

      <HandoutDetailDialog
        open={activeWeek != null}
        onClose={() => setActiveWeek(null)}
        handout={activeWeek ? handoutRefFromWeek(activeWeek) : null}
      />
    </>
  );
}
