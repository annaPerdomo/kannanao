'use client';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { AssignmentGoalPicker } from '@/components/Group/AssignmentGoalPicker';
import { StyledDialog } from '@/components/StyledDialog';
import { type GoalMode, isGoalMode } from '@/lib/assignmentMastery';
import type { HandoutPatch, LessonUnitWeek } from '@/types/lessonUnit';

interface EditWeekDialogProps {
  open: boolean;
  onClose: () => void;
  week: LessonUnitWeek | null;
  groupName: string;
  saving: boolean;
  onSave: (deckId: string, patch: HandoutPatch) => Promise<boolean>;
  onRemove: (deckId: string) => Promise<boolean>;
}

export function EditWeekDialog({
  open,
  onClose,
  week,
  groupName,
  saving,
  onSave,
  onRemove,
}: EditWeekDialogProps) {
  const t = useTranslations('Materials.library');

  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [availableOn, setAvailableOn] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [mode, setMode] = useState<GoalMode | null>(null);
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!week) return;
    setTitle(week.title ?? '');
    setNote(week.note ?? '');
    setAvailableOn(week.availableOn ?? '');
    setDueDate(week.dueDate ?? '');
    setAccuracy(week.requiredAccuracy);
    setMode(isGoalMode(week.requiredMode) ? week.requiredMode : null);
    setConfirmingRemove(false);
    setError(null);
  }, [week]);

  if (!week) return null;

  const datesOutOfOrder = Boolean(availableOn && dueDate && availableOn > dueDate);

  const handleSave = async () => {
    setError(null);
    const ok = await onSave(week.deckId, {
      title: title.trim() || null,
      note: note.trim() || null,
      availableOn: availableOn || null,
      dueDate: dueDate || null,
      requiredAccuracy: accuracy,
      requiredMode: mode,
    });
    if (ok) onClose();
    else setError(t('saveError'));
  };

  const handleRemove = async () => {
    setError(null);
    const ok = await onRemove(week.deckId);
    if (ok) onClose();
    else setError(t('saveError'));
  };

  return (
    <StyledDialog
      open={open}
      onClose={onClose}
      title={t('editWeek', { n: week.week ?? 1 })}
      subtitle={t('editWeekSubtitle', { group: groupName })}
      maxWidth="sm"
      titleId="edit-week-title"
      closeDisabled={saving}
      actions={
        confirmingRemove ? (
          <>
            <Button
              onClick={() => setConfirmingRemove(false)}
              disabled={saving}
              sx={{ textTransform: 'none', color: 'text.secondary' }}
            >
              {t('cancel')}
            </Button>
            <Button
              variant="contained"
              color="error"
              onClick={handleRemove}
              disabled={saving}
              startIcon={
                saving ? <CircularProgress size={14} sx={{ color: 'white' }} /> : undefined
              }
              sx={{ textTransform: 'none', fontWeight: 700 }}
            >
              {t('removeButton')}
            </Button>
          </>
        ) : (
          <>
            <Button
              onClick={() => setConfirmingRemove(true)}
              disabled={saving}
              sx={{ textTransform: 'none', color: 'error.main' }}
            >
              {t('removeWeek')}
            </Button>
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={saving || datesOutOfOrder}
              startIcon={
                saving ? <CircularProgress size={14} sx={{ color: 'white' }} /> : undefined
              }
              sx={{ textTransform: 'none', fontWeight: 700 }}
            >
              {t('save')}
            </Button>
          </>
        )
      }
    >
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {confirmingRemove ? (
        <Typography sx={{ color: 'text.primary', fontSize: '0.9rem' }}>
          {t('removeConfirm', { n: week.week ?? 1 })}
        </Typography>
      ) : (
        <Stack spacing={2}>
          <TextField
            label={t('fieldTitle')}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            size="small"
            fullWidth
            slotProps={{ htmlInput: { maxLength: 200 } }}
          />
          <TextField
            label={t('fieldNote')}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            size="small"
            fullWidth
            multiline
            rows={2}
            slotProps={{ htmlInput: { maxLength: 500 } }}
          />
          <TextField
            label={t('fieldOpens')}
            type="date"
            value={availableOn}
            onChange={(e) => setAvailableOn(e.target.value)}
            size="small"
            fullWidth
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            label={t('fieldDue')}
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            size="small"
            fullWidth
            error={datesOutOfOrder}
            helperText={datesOutOfOrder ? t('datesOutOfOrder') : undefined}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <AssignmentGoalPicker
            accuracy={accuracy}
            mode={mode}
            onAccuracyChange={setAccuracy}
            onModeChange={setMode}
          />
        </Stack>
      )}
    </StyledDialog>
  );
}
