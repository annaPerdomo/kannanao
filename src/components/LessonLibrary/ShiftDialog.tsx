'use client';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { formatDate } from '@/components/Group/dueDate';
import { StyledDialog } from '@/components/StyledDialog';
import { shiftDate } from '@/lib/lessonUnits';
import type { LessonUnit, LessonUnitWeek } from '@/types/lessonUnit';

interface ShiftDialogProps {
  open: boolean;
  onClose: () => void;
  unit: LessonUnit | null;
  week: LessonUnitWeek | null;
  saving: boolean;
  onShift: (planId: string, fromDeckId: string, days: number) => Promise<boolean>;
}

const MAX_DAYS = 60;

export function ShiftDialog({ open, onClose, unit, week, saving, onShift }: ShiftDialogProps) {
  const t = useTranslations('Materials.library');
  const locale = useLocale();

  const [amount, setAmount] = useState(7);
  const [direction, setDirection] = useState<'later' | 'earlier'>('later');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!week) return;
    setAmount(7);
    setDirection('later');
    setError(null);
  }, [week]);

  if (!unit || !week) return null;

  const days = direction === 'later' ? amount : -amount;
  const lastWeek = unit.weeks[unit.weeks.length - 1];
  const newDue = shiftDate(week.dueDate, days);
  const newLastDue = lastWeek ? shiftDate(lastWeek.dueDate, days) : null;

  const handleSave = async () => {
    setError(null);
    const ok = await onShift(unit.id, week.deckId, days);
    if (ok) onClose();
    else setError(t('saveError'));
  };

  return (
    <StyledDialog
      open={open}
      onClose={onClose}
      title={t('shiftTitle', { n: week.week ?? 1 })}
      maxWidth="sm"
      titleId="shift-week-title"
      closeDisabled={saving}
      actions={
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
            onClick={handleSave}
            disabled={saving || amount <= 0}
            startIcon={saving ? <CircularProgress size={14} sx={{ color: 'white' }} /> : undefined}
            sx={{ textTransform: 'none', fontWeight: 700 }}
          >
            {t('save')}
          </Button>
        </>
      }
    >
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      <Stack spacing={2}>
        <TextField
          label={t('shiftDays')}
          type="number"
          value={amount}
          onChange={(e) => setAmount(Math.max(1, Math.min(MAX_DAYS, Number(e.target.value) || 0)))}
          size="small"
          fullWidth
          slotProps={{ htmlInput: { min: 1, max: MAX_DAYS } }}
        />
        <ToggleButtonGroup
          value={direction}
          exclusive
          onChange={(_e, value) => value && setDirection(value)}
          size="small"
          fullWidth
        >
          <ToggleButton value="later">{t('shiftLater')}</ToggleButton>
          <ToggleButton value="earlier">{t('shiftEarlier')}</ToggleButton>
        </ToggleButtonGroup>
        {newDue && newLastDue && (
          <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
            {t('shiftPreview', {
              n: week.week ?? 1,
              date: formatDate(newDue, locale),
              end: formatDate(newLastDue, locale),
            })}
          </Typography>
        )}
      </Stack>
    </StyledDialog>
  );
}
