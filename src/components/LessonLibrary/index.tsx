'use client';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

import { SectionCard } from '@/components/Group/SectionCard';
import { Loading } from '@/components/Loading';
import { useDecks } from '@/hooks/useDecks';
import { useGroups } from '@/hooks/useGroups';
import type { LessonLibraryHook } from '@/hooks/useLessonLibrary';
import { handoutPagePath } from '@/lib/lessonUnits';
import type { LessonUnit, LessonUnitWeek } from '@/types/lessonUnit';

import { AddWeekDialog, type AddWeekInput } from './AddWeekDialog';
import { CopyUnitDialog } from './CopyUnitDialog';
import { ShiftDialog } from './ShiftDialog';
import { UnitCard } from './UnitCard';
import { WeekRow } from './WeekRow';

interface LessonLibraryProps {
  groupId: string;
  onBuild: () => void;
  onSwitchGroup?: (groupId: string) => void;
  /** The one `useLessonLibrary(groupId)` instance for this group — owned by the caller. */
  library: LessonLibraryHook;
  hideEmptyState?: boolean;
  /** Fires after a mutation here succeeds, not on failure. */
  onChanged?: () => void;
}

export function LessonLibrary({
  groupId,
  onBuild,
  onSwitchGroup,
  library: libraryHook,
  hideEmptyState,
  onChanged,
}: LessonLibraryProps) {
  const t = useTranslations('Materials.library');
  const router = useRouter();
  const { library, loading, error, saving, refetch, renameUnit, shiftFrom, addWeek, copyUnit } =
    libraryHook;
  const { groups } = useGroups();
  const [addingUnit, setAddingUnit] = useState<LessonUnit | null>(null);
  const { decks } = useDecks(addingUnit != null);
  const groupName = groups.find((g) => g.id === groupId)?.name ?? '';
  const [shiftingUnit, setShiftingUnit] = useState<LessonUnit | null>(null);
  const [shiftingWeek, setShiftingWeek] = useState<LessonUnitWeek | null>(null);
  const [copyingUnit, setCopyingUnit] = useState<LessonUnit | null>(null);
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

  const openWeek = (week: LessonUnitWeek) => router.push(handoutPagePath(groupId, week.deckId));

  const handleShift = async (planId: string, fromDeckId: string, days: number) => {
    const ok = await shiftFrom(planId, fromDeckId, days);
    if (ok) {
      setToast({ message: t('movedToast'), severity: 'success' });
      onChanged?.();
    }
    return ok;
  };

  const handleAddWeek = async (input: AddWeekInput) => {
    if (!addingUnit) return 'error' as const;
    const result = await addWeek(addingUnit.id, input);
    if (result === 'ok') {
      setToast({ message: t('addedToast'), severity: 'success' });
      onChanged?.();
    }
    return result;
  };

  const handleRenameUnit = async (unitId: string, title: string | null) => {
    const ok = await renameUnit(unitId, title);
    setToast(
      ok
        ? { message: t('savedToast'), severity: 'success' }
        : { message: t('saveError'), severity: 'error' },
    );
    if (ok) onChanged?.();
  };

  const handleCopyUnit = async (planId: string, targetGroupId: string, firstDueDate: string) => {
    const result = await copyUnit(planId, targetGroupId, firstDueDate);
    if (result.status === 'ok') onChanged?.();
    return result;
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
    if (hideEmptyState) return null;
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
            groupName={groupName}
            onOpenWeek={openWeek}
            onShiftWeek={(week) => {
              setShiftingUnit(unit);
              setShiftingWeek(week);
            }}
            onRenameUnit={(title) => void handleRenameUnit(unit.id, title)}
            onAddWeek={() => setAddingUnit(unit)}
            onCopyUnit={() => setCopyingUnit(unit)}
            defaultExpanded={unit.id === firstCurrentUnitId}
          />
        ))}

        {library.loose.length > 0 && (
          <SectionCard title={t('otherHandouts')}>
            <Stack spacing={1}>
              {library.loose.map((week) => (
                <WeekRow key={week.deckId} week={week} onOpen={() => openWeek(week)} />
              ))}
            </Stack>
          </SectionCard>
        )}
      </Stack>

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

      <CopyUnitDialog
        open={copyingUnit != null}
        onClose={() => setCopyingUnit(null)}
        unit={copyingUnit}
        groups={groups}
        sourceGroupId={groupId}
        saving={saving}
        onCopy={handleCopyUnit}
        onSwitchGroup={(id) => onSwitchGroup?.(id)}
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
