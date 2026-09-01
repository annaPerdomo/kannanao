'use client';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import { alpha, useTheme } from '@mui/material/styles';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { StyledDialog } from '@/components/StyledDialog';
import type { Assignment } from '@/hooks/useAssignments';
import { setCharacters } from '@/lib/kanaCurriculum';

interface EditAssignmentDialogProps {
  open: boolean;
  onClose: () => void;
  assignment: Assignment | null;
  onSave: (
    id: string,
    updates: { note?: string | null; dueDate?: string | null; availableOn?: string | null },
  ) => Promise<void>;
  /** How many members share this assignment — the edit applies to all of them. */
  memberCount?: number;
}

export function EditAssignmentDialog({
  open,
  onClose,
  assignment,
  onSave,
  memberCount = 1,
}: EditAssignmentDialogProps) {
  const theme = useTheme();
  const t = useTranslations('Group.editAssignment');
  const tc = useTranslations('Common');
  const { brand, accent } = theme.palette;

  const [note, setNote] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [availableOn, setAvailableOn] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (assignment) {
      setNote(assignment.note ?? '');
      setDueDate(assignment.due_date ?? '');
      setAvailableOn(assignment.available_on ?? '');
      setError(null);
    }
  }, [assignment]);

  const handleSave = async () => {
    if (!assignment) return;
    setSaving(true);
    setError(null);
    try {
      await onSave(assignment.id, {
        // null, not undefined: JSON.stringify drops undefined keys, so clearing
        // a note would never reach the server.
        note: note.trim() || null,
        dueDate: dueDate || null,
        availableOn: availableOn || null,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('failedToUpdate'));
    } finally {
      setSaving(false);
    }
  };

  if (!assignment) return null;

  const deck = assignment.decks;
  const member = assignment.profiles;
  const kanaRow = assignment.kana_set ? setCharacters(assignment.kana_set) : null;
  const targetEmoji = kanaRow ? '🌸' : deck?.emoji || '📚';
  const targetName = kanaRow || deck?.name || t('deckFallback');

  return (
    <StyledDialog
      open={open}
      onClose={onClose}
      title={t('title')}
      subtitle={
        memberCount > 1
          ? t('subtitleBatch', {
              emoji: targetEmoji,
              deckName: targetName,
              count: memberCount,
            })
          : t('subtitle', {
              emoji: targetEmoji,
              deckName: targetName,
              memberName: member?.display_name || member?.username || t('memberFallback'),
            })
      }
      maxWidth="sm"
      actions={
        <>
          <Button
            onClick={onClose}
            disabled={saving}
            sx={{ textTransform: 'none', color: 'text.secondary' }}
          >
            {tc('cancel')}
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving}
            startIcon={saving ? <CircularProgress size={14} sx={{ color: 'white' }} /> : undefined}
            sx={{
              textTransform: 'none',
              fontWeight: 700,
              borderRadius: '10px',
              background: `linear-gradient(135deg, ${brand[400]}, ${accent[300]})`,
              '&:hover': { background: `linear-gradient(135deg, ${brand[500]}, ${accent[400]})` },
            }}
          >
            {saving ? t('saving') : tc('save')}
          </Button>
        </>
      }
    >
      <Stack spacing={2}>
        {error && <Typography sx={{ color: 'error.main', fontSize: '0.8rem' }}>{error}</Typography>}

        <TextField
          label={t('noteLabel')}
          placeholder={t('notePlaceholder')}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          size="small"
          fullWidth
          multiline
          rows={2}
          slotProps={{ htmlInput: { maxLength: 500 } }}
        />

        <TextField
          label={t('availableOnLabel')}
          helperText={t('availableOnHelp')}
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
          slotProps={{ inputLabel: { shrink: true } }}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
              background: alpha('#fff', 0.6),
              '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: brand[400] },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: brand[500] },
            },
          }}
        />
      </Stack>
    </StyledDialog>
  );
}
