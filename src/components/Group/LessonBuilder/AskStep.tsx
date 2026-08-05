'use client';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { useTranslations } from 'next-intl';

import type { GroupMember } from '@/hooks/useGroup';
import type { LessonDocument } from '@/types/lessonPlan';

import { CARDS_PER_DECK_CHOICES, GOAL_MAX_LENGTH, WEEK_CHOICES } from './constants';
import { DocumentUpload } from './DocumentUpload';

interface AskStepProps {
  members: GroupMember[];
  goal: string;
  memberId: string;
  weeks: number;
  cardsPerDeck: number;
  document: LessonDocument | null;
  onGoalChange: (goal: string) => void;
  onMemberChange: (memberId: string) => void;
  onWeeksChange: (weeks: number) => void;
  onCardsPerDeckChange: (cards: number) => void;
  onDocumentChange: (document: LessonDocument | null) => void;
  onSubmit: () => void;
}

export function AskStep({
  members,
  goal,
  memberId,
  weeks,
  cardsPerDeck,
  document,
  onGoalChange,
  onMemberChange,
  onWeeksChange,
  onCardsPerDeckChange,
  onDocumentChange,
  onSubmit,
}: AskStepProps) {
  const t = useTranslations('Group.lessonBuilder');
  const ready = goal.trim().length > 0 && !!memberId;

  return (
    <Stack spacing={2.5}>
      <TextField
        label={t('goalLabel')}
        placeholder={t('goalPlaceholder')}
        value={goal}
        onChange={(e) => onGoalChange(e.target.value.slice(0, GOAL_MAX_LENGTH))}
        multiline
        minRows={3}
        fullWidth
      />

      <DocumentUpload document={document} onChange={onDocumentChange} />

      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' } }}>
        <TextField
          select
          label={t('learnerLabel')}
          value={memberId}
          onChange={(e) => onMemberChange(e.target.value)}
        >
          {members.map((m) => (
            <MenuItem key={m.id} value={m.id}>
              {m.displayName || m.username}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          select
          label={t('weeksLabel')}
          value={weeks}
          onChange={(e) => onWeeksChange(Number(e.target.value))}
        >
          {WEEK_CHOICES.map((w) => (
            <MenuItem key={w} value={w}>
              {t('weeksOption', { count: w })}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          select
          label={t('cardsPerDeckLabel')}
          value={cardsPerDeck}
          onChange={(e) => onCardsPerDeckChange(Number(e.target.value))}
        >
          {CARDS_PER_DECK_CHOICES.map((c) => (
            <MenuItem key={c} value={c}>
              {t('cardsOption', { count: c })}
            </MenuItem>
          ))}
        </TextField>
      </Box>

      <Box>
        <Button variant="contained" size="large" disabled={!ready} onClick={onSubmit}>
          {t('buildButton')}
        </Button>
      </Box>
    </Stack>
  );
}
