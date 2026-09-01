'use client';
import {
  Box,
  Button,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { StyledDialog } from '@/components/StyledDialog';
import type { GroupMember } from '@/hooks/useGroup';
import type { GoalMode } from '@/lib/assignmentMastery';

import { AssignmentGoalPicker } from './AssignmentGoalPicker';
import { KanaSetPicker } from './KanaSetPicker';

interface Deck {
  id: string;
  name: string;
  emoji?: string | null;
  readingPractice?: boolean;
}

interface CreateAssignmentDialogProps {
  open: boolean;
  onClose: () => void;
  members: GroupMember[];
  decks: Deck[];
  /** Pre-selected member IDs (e.g. when opened from member detail) */
  preSelectedMembers?: string[];
  onCreate: (opts: {
    memberIds: string[];
    deckId?: string;
    kanaSet?: string;
    title?: string;
    note?: string;
    dueDate?: string;
    availableOn?: string;
    requiredAccuracy?: number;
    requiredMode?: string;
  }) => Promise<void>;
}

export function CreateAssignmentDialog({
  open,
  onClose,
  members,
  decks,
  preSelectedMembers,
  onCreate,
}: CreateAssignmentDialogProps) {
  const theme = useTheme();
  const t = useTranslations('Group.createAssignment');
  const tc = useTranslations('Common');
  const { brand, accent } = theme.palette;

  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(
    new Set(preSelectedMembers ?? []),
  );
  const [target, setTarget] = useState<'deck' | 'kana'>('deck');
  const [selectedDeck, setSelectedDeck] = useState<string>('');
  const [selectedKana, setSelectedKana] = useState<string>('');
  const [note, setNote] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [availableOn, setAvailableOn] = useState('');
  const [goalAccuracy, setGoalAccuracy] = useState<number | null>(null);
  const [goalMode, setGoalMode] = useState<GoalMode | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isKana = target === 'kana';
  // A Reading goal on a deck that hasn't unlocked Reading could never be met.
  const readingUnavailable: GoalMode[] = decks.find((d) => d.id === selectedDeck)?.readingPractice
    ? []
    : ['reading'];
  // Drop a stale Reading goal when the organizer switches to a locked deck, and
  // any mode goal on switching to kana — the API rejects that combination.
  if (goalMode && (isKana || (goalMode === 'reading' && readingUnavailable.length > 0))) {
    setGoalMode(null);
  }

  const chosen = isKana ? selectedKana : selectedDeck;

  const handleToggleMember = (id: string) => {
    setSelectedMembers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCreate = async () => {
    if (selectedMembers.size === 0 || !chosen) return;
    setSaving(true);
    setError(null);
    try {
      await onCreate({
        memberIds: Array.from(selectedMembers),
        deckId: isKana ? undefined : selectedDeck,
        kanaSet: isKana ? selectedKana : undefined,
        note: note.trim() || undefined,
        dueDate: dueDate || undefined,
        availableOn: availableOn || undefined,
        requiredAccuracy: goalAccuracy ?? undefined,
        requiredMode: goalMode ?? undefined,
      });
      // Reset and close
      setSelectedMembers(new Set(preSelectedMembers ?? []));
      setSelectedDeck('');
      setSelectedKana('');
      setNote('');
      setDueDate('');
      setAvailableOn('');
      setGoalAccuracy(null);
      setGoalMode(null);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('failedToCreate'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <StyledDialog
      open={open}
      onClose={onClose}
      title={t('title')}
      subtitle={t('subtitle')}
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
            onClick={handleCreate}
            disabled={saving || selectedMembers.size === 0 || !chosen}
            startIcon={saving ? <CircularProgress size={14} sx={{ color: 'white' }} /> : undefined}
            sx={{
              textTransform: 'none',
              fontWeight: 700,
              borderRadius: '10px',
              background: `linear-gradient(135deg, ${brand[400]}, ${accent[300]})`,
              '&:hover': { background: `linear-gradient(135deg, ${brand[500]}, ${accent[400]})` },
            }}
          >
            {saving ? t('assigning') : t('assign')}
          </Button>
        </>
      }
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {error && <Typography sx={{ color: 'error.main', fontSize: '0.8rem' }}>{error}</Typography>}

        {/* What to assign: a deck, or a row of kana */}
        <Box>
          <Typography
            sx={{
              fontSize: '0.65rem',
              fontWeight: 800,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: brand[500],
              mb: 1,
            }}
          >
            {t('selectWhat')}
          </Typography>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={target}
            onChange={(_, next: 'deck' | 'kana' | null) => next && setTarget(next)}
            sx={{ mb: 1.5, '& .MuiToggleButton-root': { textTransform: 'none', px: 2 } }}
          >
            <ToggleButton value="deck">{t('targetDeck')}</ToggleButton>
            <ToggleButton value="kana">{t('targetKana')}</ToggleButton>
          </ToggleButtonGroup>

          {isKana ? (
            <KanaSetPicker value={selectedKana} onChange={setSelectedKana} />
          ) : (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
              {decks.map((deck) => (
                <Box
                  key={deck.id}
                  onClick={() => setSelectedDeck(deck.id)}
                  sx={{
                    px: 1.5,
                    py: 0.75,
                    borderRadius: 2,
                    border: `1.5px solid ${selectedDeck === deck.id ? brand[500] : alpha(brand[300], 0.4)}`,
                    bgcolor: selectedDeck === deck.id ? alpha(brand[100], 0.8) : 'transparent',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    '&:hover': { borderColor: brand[400] },
                  }}
                >
                  <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, color: brand[800] }}>
                    {deck.emoji || '📚'} {deck.name}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}
        </Box>

        {/* Member selection */}
        <Box>
          <Typography
            sx={{
              fontSize: '0.65rem',
              fontWeight: 800,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: brand[500],
              mb: 0.5,
            }}
          >
            {t('assignTo')}
          </Typography>
          <Box sx={{ maxHeight: 180, overflow: 'auto' }}>
            {members.map((m) => (
              <FormControlLabel
                key={m.id}
                control={
                  <Checkbox
                    checked={selectedMembers.has(m.id)}
                    onChange={() => handleToggleMember(m.id)}
                    size="small"
                    sx={{ '&.Mui-checked': { color: brand[500] } }}
                  />
                }
                label={
                  <Typography sx={{ fontSize: '0.82rem' }}>
                    {m.displayName || m.username}
                  </Typography>
                }
              />
            ))}
          </Box>
        </Box>

        {/* Note */}
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

        {/* Start date — blank means it shows up right away. */}
        <TextField
          label={t('availableOnLabel')}
          helperText={t('availableOnHelp')}
          type="date"
          value={availableOn}
          onChange={(e) => setAvailableOn(e.target.value)}
          size="small"
          fullWidth
          slotProps={{ inputLabel: { shrink: true } }}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
              background: alpha('#fff', 0.6),
            },
          }}
        />

        {/* Due date */}
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

        {/* Optional mastery goal — collapsed by default */}
        <AssignmentGoalPicker
          accuracy={goalAccuracy}
          mode={goalMode}
          onAccuracyChange={setGoalAccuracy}
          onModeChange={setGoalMode}
          unavailableModes={readingUnavailable}
          hideModes={isKana}
        />
      </Box>
    </StyledDialog>
  );
}
