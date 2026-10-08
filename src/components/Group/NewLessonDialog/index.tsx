'use client';
import AutoAwesomeRounded from '@mui/icons-material/AutoAwesomeRounded';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { formatDate } from '@/components/Group/dueDate';
import { StyledDialog } from '@/components/StyledDialog';
import { useLessonEdits } from '@/hooks/useLessonEdits';
import { handoutPagePath } from '@/lib/lessonUnits';
import type { LessonUnit } from '@/types/lessonUnit';

const NEW_UNIT_VALUE = '__new_unit__';
const TITLE_MAX = 200;
const TITLE_ID = 'new-lesson-dialog-title';

export interface NewLessonDialogProps {
  open: boolean;
  onClose: () => void;
  groupId: string;
  units: LessonUnit[];
  defaultUnitId?: string | null;
}

export function NewLessonDialog({
  open,
  onClose,
  groupId,
  units,
  defaultUnitId,
}: NewLessonDialogProps) {
  const t = useTranslations('Group.newLesson');
  const tLib = useTranslations('Materials.library');
  const locale = useLocale();
  const router = useRouter();
  const { saving, error, clearError, createLesson } = useLessonEdits(groupId);

  const [title, setTitle] = useState('');
  const [unitSelection, setUnitSelection] = useState<string | null>(null);
  const [unitTitle, setUnitTitle] = useState('');

  useEffect(() => {
    if (!open) return;
    setTitle('');
    setUnitTitle('');
    setUnitSelection(null);
    clearError();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const effectiveUnit = unitSelection ?? defaultUnitId ?? units[0]?.id ?? NEW_UNIT_VALUE;

  const handleCreate = async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;
    const unit =
      effectiveUnit === NEW_UNIT_VALUE
        ? { title: unitTitle.trim() || null }
        : { planId: effectiveUnit };
    const result = await createLesson({ title: trimmedTitle, unit });
    if (result) {
      onClose();
      router.push(handoutPagePath(groupId, result.deckId));
    }
  };

  return (
    <StyledDialog
      open={open}
      onClose={onClose}
      title={t('title')}
      subtitle={t('subtitle')}
      titleId={TITLE_ID}
      closeDisabled={saving}
      actions={
        <Button variant="contained" disabled={saving || !title.trim()} onClick={handleCreate}>
          {t('create')}
        </Button>
      }
    >
      <Stack spacing={2}>
        {error && <Alert severity="error">{error}</Alert>}

        <TextField
          autoFocus
          fullWidth
          label={t('title')}
          placeholder={t('titlePlaceholder')}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={saving}
          slotProps={{ htmlInput: { maxLength: TITLE_MAX } }}
        />

        <TextField
          select
          fullWidth
          label={t('unitLabel')}
          value={effectiveUnit}
          onChange={(e) => setUnitSelection(e.target.value)}
          disabled={saving}
        >
          <MenuItem value={NEW_UNIT_VALUE}>{t('newUnit')}</MenuItem>
          {units.map((unit) => (
            <MenuItem key={unit.id} value={unit.id}>
              {unit.title ?? tLib('untitledUnit', { date: formatDate(unit.createdAt, locale) })}
            </MenuItem>
          ))}
        </TextField>

        {effectiveUnit === NEW_UNIT_VALUE && (
          <TextField
            fullWidth
            label={t('unitTitleLabel')}
            value={unitTitle}
            onChange={(e) => setUnitTitle(e.target.value)}
            disabled={saving}
          />
        )}

        <Typography
          variant="caption"
          sx={{ color: 'text.secondary', display: 'flex', alignItems: 'flex-start', gap: 0.5 }}
        >
          <AutoAwesomeRounded sx={{ fontSize: 14, mt: 0.1, flexShrink: 0 }} aria-hidden />
          {t('hint')}
        </Typography>
      </Stack>
    </StyledDialog>
  );
}
