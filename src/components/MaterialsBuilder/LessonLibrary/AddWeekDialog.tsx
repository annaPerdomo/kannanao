'use client';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';
import { type KeyboardEvent, useEffect, useState } from 'react';

import { DeckPicker } from '@/components/Group/DeckPicker';
import { StyledDialog } from '@/components/StyledDialog';
import type { AddWeekResult } from '@/hooks/useLessonLibrary';

type AddWeekChoice = 'review' | 'deck';
export type AddWeekInput = { kind: 'deck'; deckId: string } | { kind: 'review' };

interface AddWeekDialogProps {
  open: boolean;
  onClose: () => void;
  decks: { id: string; name: string; emoji?: string | null }[];
  saving: boolean;
  onAdd: (input: AddWeekInput) => Promise<AddWeekResult>;
}

interface ChoiceTileProps {
  selected: boolean;
  title: string;
  body: string;
  onSelect: () => void;
}

function ChoiceTile({ selected, title, body, onSelect }: ChoiceTileProps) {
  const theme = useTheme();
  const { brand } = theme.palette;

  return (
    <Box
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      onClick={onSelect}
      onKeyDown={(e: KeyboardEvent<HTMLDivElement>) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      sx={{
        p: 1.5,
        borderRadius: theme.radii.md,
        border: `2px solid ${selected ? brand[500] : alpha(brand[300], 0.4)}`,
        bgcolor: selected ? alpha(brand[100], 0.5) : 'background.paper',
        cursor: 'pointer',
      }}
    >
      <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', color: 'text.primary' }}>
        {title}
      </Typography>
      <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary', mt: 0.25 }}>{body}</Typography>
    </Box>
  );
}

export function AddWeekDialog({ open, onClose, decks, saving, onAdd }: AddWeekDialogProps) {
  const t = useTranslations('Materials.library');
  const [choice, setChoice] = useState<AddWeekChoice | null>(null);
  const [deckId, setDeckId] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setChoice(null);
      setDeckId('');
      setError(null);
    }
  }, [open]);

  const confirmDisabled = saving || choice === null || (choice === 'deck' && !deckId);

  const handleAdd = async () => {
    if (!choice) return;
    setError(null);
    const input: AddWeekInput = choice === 'review' ? { kind: 'review' } : { kind: 'deck', deckId };
    const result = await onAdd(input);
    if (result === 'ok') onClose();
    else setError(result === 'already_in_unit' ? t('alreadyInUnit') : t('saveError'));
  };

  return (
    <StyledDialog
      open={open}
      onClose={onClose}
      title={t('addWeekTitle')}
      maxWidth="sm"
      titleId="add-week-title"
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
            onClick={handleAdd}
            disabled={confirmDisabled}
            startIcon={saving ? <CircularProgress size={14} sx={{ color: 'white' }} /> : undefined}
            sx={{ textTransform: 'none', fontWeight: 700 }}
          >
            {t('addButton')}
          </Button>
        </>
      }
    >
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      <Stack spacing={1.5}>
        <ChoiceTile
          selected={choice === 'review'}
          title={t('reviewWeek')}
          body={t('reviewWeekBody')}
          onSelect={() => setChoice('review')}
        />
        <ChoiceTile
          selected={choice === 'deck'}
          title={t('existingDeck')}
          body={t('existingDeckBody')}
          onSelect={() => setChoice('deck')}
        />
        {choice === 'deck' && <DeckPicker decks={decks} value={deckId} onChange={setDeckId} />}
      </Stack>
    </StyledDialog>
  );
}
