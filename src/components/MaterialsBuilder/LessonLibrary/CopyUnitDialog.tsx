'use client';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useMemo, useRef, useState } from 'react';

import { formatDate, todayIso } from '@/components/Group/dueDate';
import { StyledDialog } from '@/components/StyledDialog';
import type { CopyUnitHookResult } from '@/hooks/useLessonLibrary';
import { rebaseSchedule, shiftDate } from '@/lib/lessonUnits';
import type { LessonUnit } from '@/types/lessonUnit';

import { GroupSelect } from '../GroupSelect';

interface CopyUnitDialogProps {
  open: boolean;
  onClose: () => void;
  unit: LessonUnit | null;
  groups: { id: string; name: string; emoji?: string | null }[];
  sourceGroupId: string;
  saving: boolean;
  onCopy: (planId: string, groupId: string, firstDueDate: string) => Promise<CopyUnitHookResult>;
  onSwitchGroup: (groupId: string) => void;
}

/** Next date on/after tomorrow sharing the source's first-due weekday; always found within a week. */
function defaultFirstDueDate(sourceFirstDue: string | null, today: string): string {
  if (!sourceFirstDue) return shiftDate(today, 7) ?? today;
  const targetDay = new Date(`${sourceFirstDue}T00:00:00Z`).getUTCDay();
  for (let offset = 1; offset <= 7; offset++) {
    const candidate = shiftDate(today, offset);
    if (candidate && new Date(`${candidate}T00:00:00Z`).getUTCDay() === targetDay) {
      return candidate;
    }
  }
  return shiftDate(today, 7) ?? today;
}

export function CopyUnitDialog({
  open,
  onClose,
  unit,
  groups,
  sourceGroupId,
  saving,
  onCopy,
  onSwitchGroup,
}: CopyUnitDialogProps) {
  const t = useTranslations('Materials.library');
  const tCommon = useTranslations('Common');
  const locale = useLocale();
  const otherGroups = useMemo(
    () => groups.filter((g) => g.id !== sourceGroupId),
    [groups, sourceGroupId],
  );
  // A ref, not a dep: a background groups refetch must not retrigger the reset effect below.
  const otherGroupsRef = useRef(otherGroups);
  otherGroupsRef.current = otherGroups;

  const [targetGroupId, setTargetGroupId] = useState('');
  const [firstDueDate, setFirstDueDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ added: number; skipped: string[] } | null>(null);

  // Only on the open→true transition, never on every render while open —
  // a background groups refetch can't wipe a filled-in form or the success view.
  const wasOpenRef = useRef(false);
  useEffect(() => {
    const wasOpen = wasOpenRef.current;
    wasOpenRef.current = open;
    if (!open || wasOpen || !unit) return;
    setTargetGroupId(otherGroupsRef.current[0]?.id ?? '');
    setFirstDueDate(defaultFirstDueDate(unit.weeks[0]?.dueDate ?? null, todayIso()));
    setError(null);
    setResult(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, unit?.id]);

  if (!unit) return null;

  const targetGroup = otherGroups.find((g) => g.id === targetGroupId) ?? null;
  const preview =
    firstDueDate && unit.weeks.length > 0
      ? rebaseSchedule(
          unit.weeks.map((w) => ({ dueDate: w.dueDate, availableOn: w.availableOn })),
          firstDueDate,
        )
      : [];

  const handleCopy = async () => {
    if (!targetGroupId || !firstDueDate) return;
    setError(null);
    const outcome = await onCopy(unit.id, targetGroupId, firstDueDate);
    if (outcome.status === 'ok') setResult({ added: outcome.added, skipped: outcome.skipped });
    else if (outcome.status === 'nothing') setError(t('copyNothing'));
    else setError(t('saveError'));
  };

  return (
    <StyledDialog
      open={open}
      onClose={onClose}
      title={t('copyTitle')}
      maxWidth="sm"
      titleId="copy-unit-title"
      closeDisabled={saving}
      actions={
        result ? (
          <Button onClick={onClose} sx={{ textTransform: 'none', fontWeight: 700 }}>
            {tCommon('done')}
          </Button>
        ) : otherGroups.length > 0 ? (
          <>
            <Button
              onClick={onClose}
              disabled={saving}
              sx={{ textTransform: 'none', color: 'text.secondary' }}
            >
              {t('cancel')}
            </Button>
            <Button
              variant="contained"
              onClick={handleCopy}
              disabled={saving || !targetGroupId || !firstDueDate}
              startIcon={
                saving ? <CircularProgress size={14} sx={{ color: 'white' }} /> : undefined
              }
              sx={{ textTransform: 'none', fontWeight: 700 }}
            >
              {t('copyUnit')}
            </Button>
          </>
        ) : (
          <Button onClick={onClose} sx={{ textTransform: 'none', fontWeight: 700 }}>
            {t('cancel')}
          </Button>
        )
      }
    >
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {result ? (
        <Stack spacing={1}>
          <Alert severity="success">
            {t('copyDone', { added: result.added, group: targetGroup?.name ?? '' })}
          </Alert>
          {result.skipped.length > 0 && (
            <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
              {t('copySkipped', { names: result.skipped.join(', ') })}
            </Typography>
          )}
          <Button
            variant="outlined"
            onClick={() => {
              onSwitchGroup(targetGroupId);
              onClose();
            }}
            sx={{ alignSelf: 'flex-start', textTransform: 'none', fontWeight: 700 }}
          >
            {t('openGroup', { group: targetGroup?.name ?? '' })}
          </Button>
        </Stack>
      ) : otherGroups.length === 0 ? (
        <Typography sx={{ color: 'text.secondary' }}>{t('copyNoOtherGroup')}</Typography>
      ) : (
        <Stack spacing={2}>
          {otherGroups.length === 1 ? (
            <Typography sx={{ fontWeight: 700, color: 'text.primary' }}>
              {t('copyToGroup', { group: otherGroups[0].name })}
            </Typography>
          ) : (
            <Stack spacing={0.5}>
              <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: 'text.secondary' }}>
                {t('copyGroup')}
              </Typography>
              <GroupSelect groups={otherGroups} value={targetGroupId} onChange={setTargetGroupId} />
            </Stack>
          )}
          <TextField
            label={t('copyFirstDue')}
            type="date"
            value={firstDueDate}
            onChange={(e) => setFirstDueDate(e.target.value)}
            size="small"
            fullWidth
            slotProps={{ inputLabel: { shrink: true } }}
          />
          {preview.length > 0 && (
            <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
              {t('copyPreview', {
                n: preview.length,
                first: formatDate(preview[0].dueDate, locale),
                last: formatDate(preview[preview.length - 1].dueDate, locale),
              })}
            </Typography>
          )}
        </Stack>
      )}
    </StyledDialog>
  );
}
