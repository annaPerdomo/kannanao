'use client';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

import { HandoutDetailDialog } from '@/components/Group/HandoutDetailDialog';
import { SectionCard } from '@/components/Group/SectionCard';
import { Loading } from '@/components/Loading';
import { useDecks } from '@/hooks/useDecks';
import { useGroups } from '@/hooks/useGroups';
import { useLessonLibrary } from '@/hooks/useLessonLibrary';
import { handoutRefFromWeek } from '@/types/handout';
import type { LessonUnit, LessonUnitWeek } from '@/types/lessonUnit';

import { AddWeekDialog, type AddWeekInput } from './AddWeekDialog';
import { EditWeekDialog } from './EditWeekDialog';
import { ShiftDialog } from './ShiftDialog';
import { UnitCard } from './UnitCard';
import { WeekRow } from './WeekRow';

interface LessonLibraryProps {
  groupId: string;
  onBuild: () => void;
}

export function LessonLibrary({ groupId, onBuild }: LessonLibraryProps) {
  const t = useTranslations('Materials.library');
  const {
    library,
    loading,
    error,
    saving,
    refetch,
    editWeek,
    removeWeek,
    renameUnit,
    shiftFrom,
    addWeek,
  } = useLessonLibrary(groupId);
  const { groups } = useGroups();
  const [addingUnit, setAddingUnit] = useState<LessonUnit | null>(null);
  const { decks } = useDecks(addingUnit != null);
  const groupName = groups.find((g) => g.id === groupId)?.name ?? '';
  const [activeWeek, setActiveWeek] = useState<LessonUnitWeek | null>(null);
  const [editingWeek, setEditingWeek] = useState<LessonUnitWeek | null>(null);
  const [shiftingUnit, setShiftingUnit] = useState<LessonUnit | null>(null);
  const [shiftingWeek, setShiftingWeek] = useState<LessonUnitWeek | null>(null);
  const [toast, setToast] = useState<{ message: string; severity: 'success' | 'error' } | null>(
    null,
  );

  const firstCurrentUnitId = useMemo(
    () => library?.units.find((unit) => unit.weeks.some((w) => w.status === 'current'))?.id ?? null,
    [library],
  );

  const usedDeckIds = useMemo(
    () => new Set(library?.units.flatMap((unit) => unit.weeks.map((w) => w.deckId)) ?? []),
    [library],
  );
  const availableDecks = useMemo(
    () => decks.filter((d) => !d.isShared && !usedDeckIds.has(d.id)),
    [decks, usedDeckIds],
  );

  const handleEditSave = async (deckId: string, patch: Parameters<typeof editWeek>[1]) => {
    const ok = await editWeek(deckId, patch);
    if (ok) setToast({ message: t('savedToast'), severity: 'success' });
    return ok;
  };

  const handleRemove = async (deckId: string) => {
    const ok = await removeWeek(deckId);
    if (ok) setToast({ message: t('removedToast'), severity: 'success' });
    return ok;
  };

  const handleShift = async (planId: string, fromDeckId: string, days: number) => {
    const ok = await shiftFrom(planId, fromDeckId, days);
    if (ok) setToast({ message: t('movedToast'), severity: 'success' });
    return ok;
  };

  const handleAddWeek = async (input: AddWeekInput) => {
    if (!addingUnit) return 'error' as const;
    const result = await addWeek(addingUnit.id, input);
    if (result === 'ok') setToast({ message: t('addedToast'), severity: 'success' });
    return result;
  };

  const handleRenameUnit = async (unitId: string, title: string | null) => {
    const ok = await renameUnit(unitId, title);
    setToast(
      ok
        ? { message: t('savedToast'), severity: 'success' }
        : { message: t('saveError'), severity: 'error' },
    );
  };

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
            onEditWeek={setEditingWeek}
            onShiftWeek={(week) => {
              setShiftingUnit(unit);
              setShiftingWeek(week);
            }}
            onRenameUnit={(title) => void handleRenameUnit(unit.id, title)}
            onAddWeek={() => setAddingUnit(unit)}
            defaultExpanded={unit.id === firstCurrentUnitId}
          />
        ))}

        {library.loose.length > 0 && (
          <SectionCard title={t('otherHandouts')}>
            <Stack spacing={1}>
              {library.loose.map((week) => (
                <WeekRow
                  key={week.deckId}
                  week={week}
                  onOpen={() => setActiveWeek(week)}
                  onEdit={() => setEditingWeek(week)}
                />
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

      <EditWeekDialog
        open={editingWeek != null}
        onClose={() => setEditingWeek(null)}
        week={editingWeek}
        groupName={groupName}
        saving={saving}
        onSave={handleEditSave}
        onRemove={handleRemove}
      />

      <ShiftDialog
        open={shiftingWeek != null}
        onClose={() => {
          setShiftingUnit(null);
          setShiftingWeek(null);
        }}
        unit={shiftingUnit}
        week={shiftingWeek}
        saving={saving}
        onShift={handleShift}
      />

      <AddWeekDialog
        open={addingUnit != null}
        onClose={() => setAddingUnit(null)}
        decks={availableDecks}
        saving={saving}
        onAdd={handleAddWeek}
      />

      <Snackbar open={toast != null} autoHideDuration={3000} onClose={() => setToast(null)}>
        <Alert
          severity={toast?.severity ?? 'success'}
          onClose={() => setToast(null)}
          sx={{ width: '100%' }}
        >
          {toast?.message}
        </Alert>
      </Snackbar>
    </>
  );
}
