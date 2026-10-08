'use client';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { AssignmentGoalPicker } from '@/components/Group/AssignmentGoalPicker';
import { SectionCard } from '@/components/Group/SectionCard';
import { type GoalMode, isGoalMode } from '@/lib/assignmentMastery';
import type { HandoutPatch, LessonUnitWeek } from '@/types/lessonUnit';

interface HandoutSettingsProps {
  week: LessonUnitWeek;
  groupName: string;
  saving: boolean;
  onSave: (patch: HandoutPatch) => Promise<boolean>;
  onRemove: () => Promise<boolean>;
  onShift?: () => void;
}

interface Draft {
  title: string;
  note: string;
  availableOn: string;
  dueDate: string;
  accuracy: number | null;
  mode: GoalMode | null;
}

function draftFrom(week: LessonUnitWeek): Draft {
  return {
    title: week.title ?? '',
    note: week.note ?? '',
    availableOn: week.availableOn ?? '',
    dueDate: week.dueDate ?? '',
    accuracy: week.requiredAccuracy,
    mode: isGoalMode(week.requiredMode) ? week.requiredMode : null,
  };
}

function sameDraft(a: Draft, b: Draft): boolean {
  return (
    a.title.trim() === b.title.trim() &&
    a.note.trim() === b.note.trim() &&
    a.availableOn === b.availableOn &&
    a.dueDate === b.dueDate &&
    a.accuracy === b.accuracy &&
    a.mode === b.mode
  );
}

export function HandoutSettings({
  week,
  groupName,
  saving,
  onSave,
  onRemove,
  onShift,
}: HandoutSettingsProps) {
  const t = useTranslations('Materials.library');
  const tPage = useTranslations('Materials.handoutPage');
  const [draft, setDraft] = useState<Draft>(() => draftFrom(week));
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saved = draftFrom(week);
  const dirty = !sameDraft(draft, saved);
  const datesOutOfOrder = Boolean(
    draft.availableOn && draft.dueDate && draft.availableOn > draft.dueDate,
  );
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    setError(null);
    const ok = await onSave({
      title: draft.title.trim() || null,
      note: draft.note.trim() || null,
      availableOn: draft.availableOn || null,
      dueDate: draft.dueDate || null,
      requiredAccuracy: draft.accuracy,
      requiredMode: draft.mode,
    });
    if (!ok) setError(t('saveError'));
  };

  const handleRemove = async () => {
    setError(null);
    const ok = await onRemove();
    if (!ok) setError(t('saveError'));
  };

  return (
    <SectionCard title={tPage('settingsTitle')}>
      <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary', mb: 2 }}>
        {t('editWeekSubtitle', { group: groupName })}
      </Typography>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {confirmingRemove ? (
        <Stack spacing={2}>
          <Typography sx={{ color: 'text.primary', fontSize: '0.9rem' }}>
            {week.week != null ? t('removeConfirm', { n: week.week }) : tPage('removeLooseConfirm')}
          </Typography>
          <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
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
              startIcon={saving ? <CircularProgress size={14} color="inherit" /> : undefined}
              sx={{ textTransform: 'none', fontWeight: 700 }}
            >
              {t('removeButton')}
            </Button>
          </Stack>
        </Stack>
      ) : (
        <Stack spacing={2}>
          <TextField
            label={t('fieldTitle')}
            value={draft.title}
            onChange={(e) => set('title', e.target.value)}
            size="small"
            fullWidth
            slotProps={{ htmlInput: { maxLength: 200 } }}
          />
          <TextField
            label={t('fieldNote')}
            value={draft.note}
            onChange={(e) => set('note', e.target.value)}
            size="small"
            fullWidth
            multiline
            minRows={2}
            slotProps={{ htmlInput: { maxLength: 500 } }}
          />
          <Stack direction="row" spacing={1.5}>
            <TextField
              label={t('fieldOpens')}
              type="date"
              value={draft.availableOn}
              onChange={(e) => set('availableOn', e.target.value)}
              size="small"
              fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              label={t('fieldDue')}
              type="date"
              value={draft.dueDate}
              onChange={(e) => set('dueDate', e.target.value)}
              size="small"
              fullWidth
              error={datesOutOfOrder}
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Stack>
          {datesOutOfOrder && (
            <Typography sx={{ fontSize: '0.75rem', color: 'error.main', mt: -1 }}>
              {t('datesOutOfOrder')}
            </Typography>
          )}
          {onShift && (
            <Button
              onClick={onShift}
              disabled={saving}
              sx={{ alignSelf: 'flex-start', textTransform: 'none', fontWeight: 700, px: 0 }}
            >
              {t('moveLater')}
            </Button>
          )}
          <AssignmentGoalPicker
            accuracy={draft.accuracy}
            mode={draft.mode}
            onAccuracyChange={(v) => set('accuracy', v)}
            onModeChange={(v) => set('mode', v)}
          />
          <Stack direction="row" spacing={1} sx={{ justifyContent: 'space-between', pt: 1 }}>
            <Button
              onClick={() => setConfirmingRemove(true)}
              disabled={saving}
              sx={{ textTransform: 'none', color: 'error.main' }}
            >
              {week.week != null ? t('removeWeek') : tPage('removeLoose')}
            </Button>
            <Stack direction="row" spacing={1}>
              {dirty && (
                <Button
                  onClick={() => setDraft(saved)}
                  disabled={saving}
                  sx={{ textTransform: 'none', color: 'text.secondary' }}
                >
                  {tPage('discardChanges')}
                </Button>
              )}
              <Button
                variant="contained"
                onClick={handleSave}
                disabled={saving || !dirty || datesOutOfOrder}
                startIcon={saving ? <CircularProgress size={14} color="inherit" /> : undefined}
                sx={{ textTransform: 'none', fontWeight: 700 }}
              >
                {t('save')}
              </Button>
            </Stack>
          </Stack>
        </Stack>
      )}
    </SectionCard>
  );
}
