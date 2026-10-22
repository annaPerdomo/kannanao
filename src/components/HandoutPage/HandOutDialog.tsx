'use client';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { AssignmentGoalPicker } from '@/components/Group/AssignmentGoalPicker';
import { todayIso } from '@/components/Group/dueDate';
import { StyledDialog } from '@/components/StyledDialog';
import { useGroupMembers } from '@/hooks/useGroup';
import { useLessonEdits } from '@/hooks/useLessonEdits';
import type { GoalMode } from '@/lib/assignmentMastery';
import { kanaSetLabel } from '@/lib/lessonKana';
import { HANDOUT_NOTE_MAX, nextFriday } from '@/lib/lessonUnits';
import type { HandOutLessonResult } from '@/types/lessonUnit';

interface HandOutDialogProps {
  open: boolean;
  onClose: () => void;
  groupId: string;
  deckId: string;
  groupName: string;
  wordCount: number;
  kanaSets: string[];
  onDone: (result: HandOutLessonResult) => void;
}

export function HandOutDialog({
  open,
  onClose,
  groupId,
  deckId,
  groupName,
  wordCount,
  kanaSets,
  onDone,
}: HandOutDialogProps) {
  const t = useTranslations('Materials.handoutPage');
  const tLib = useTranslations('Materials.library');
  const edits = useLessonEdits(groupId);
  const { members } = useGroupMembers(groupId, open);
  const [dueDate, setDueDate] = useState(() => nextFriday(todayIso()));
  const [availableOn, setAvailableOn] = useState(() => todayIso());
  const [withSentences, setWithSentences] = useState(true);
  const [note, setNote] = useState('');
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [mode, setMode] = useState<GoalMode | null>(null);

  const learnerCount = members.length;
  const datesOutOfOrder = Boolean(availableOn && dueDate && availableOn > dueDate);

  const handleSubmit = async () => {
    edits.clearError();
    const result = await edits.handOut({
      deckId,
      dueDate: dueDate || null,
      availableOn: availableOn || null,
      note: note.trim() || null,
      requiredAccuracy: accuracy,
      requiredMode: mode,
      withSentences,
    });
    if (result) onDone(result);
  };

  return (
    <StyledDialog
      open={open}
      onClose={onClose}
      title={t('handOutTitle')}
      subtitle={t('handOutSubtitle', { group: groupName, count: wordCount })}
      icon={<span aria-hidden="true">🎒</span>}
      titleId="hand-out-dialog-title"
      closeDisabled={edits.saving}
      actions={
        <>
          <Button onClick={onClose} disabled={edits.saving} sx={{ textTransform: 'none' }}>
            {t('cancel')}
          </Button>
          <Button
            variant="contained"
            onClick={() => void handleSubmit()}
            disabled={edits.saving || datesOutOfOrder}
            startIcon={edits.saving ? <CircularProgress size={14} color="inherit" /> : undefined}
            sx={{ textTransform: 'none', fontWeight: 700 }}
          >
            {t('handOutConfirm', { count: learnerCount })}
          </Button>
        </>
      }
    >
      <Stack spacing={2}>
        {edits.error && <Alert severity="error">{edits.error}</Alert>}
        <Stack direction="row" spacing={1.5}>
          <TextField
            label={t('availableOnLabel')}
            type="date"
            value={availableOn}
            onChange={(e) => setAvailableOn(e.target.value)}
            size="small"
            fullWidth
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            label={t('dueDateLabel')}
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            size="small"
            fullWidth
            error={datesOutOfOrder}
            slotProps={{ inputLabel: { shrink: true } }}
          />
        </Stack>
        {datesOutOfOrder && (
          <Typography sx={{ fontSize: '0.75rem', color: 'error.main', mt: -1 }}>
            {tLib('datesOutOfOrder')}
          </Typography>
        )}
        <TextField
          label={tLib('fieldNote')}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          size="small"
          fullWidth
          multiline
          minRows={2}
          slotProps={{ htmlInput: { maxLength: HANDOUT_NOTE_MAX } }}
        />
        <AssignmentGoalPicker
          accuracy={accuracy}
          mode={mode}
          onAccuracyChange={setAccuracy}
          onModeChange={setMode}
        />
        <Stack direction="row" sx={{ alignItems: 'flex-start', gap: 1 }}>
          <Switch
            checked={withSentences}
            onChange={(e) => setWithSentences(e.target.checked)}
            slotProps={{ input: { 'aria-label': t('withSentences') } }}
          />
          <Box sx={{ pt: 0.75 }}>
            <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: 'text.primary' }}>
              {t('withSentences')}
            </Typography>
            <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
              {t('withSentencesHint')}
            </Typography>
          </Box>
        </Stack>
        {kanaSets.length > 0 && (
          <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
            {t('soundsIncluded', { list: kanaSets.map(kanaSetLabel).join(' · ') })}
          </Typography>
        )}
      </Stack>
    </StyledDialog>
  );
}
