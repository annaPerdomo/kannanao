'use client';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import Slider from '@mui/material/Slider';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { Loading } from '@/components/Loading';
import { StyledDialog } from '@/components/StyledDialog';
import { pageTextGoal } from '@/lib/lessonAi';
import { CARDS_DEFAULT, CARDS_MAX, CARDS_MIN, GOAL_MIN, JLPT_LEVELS } from '@/lib/lessonPrompts';
import { buildLessonPlan, uploadLessonDocument } from '@/services/api';
import type { JlptLevel } from '@/types/flashcard';
import type { LessonPlanResponse } from '@/types/lessonPlan';

const TEXT_MAX_LENGTH = 4000;
const TOPIC_MAX_LENGTH = 500;

export type AiWordsMode = 'topic' | 'text';

interface AiWordsDialogProps {
  open: boolean;
  mode: AiWordsMode;
  onClose: () => void;
  groupId: string;
  defaultLevel: JlptLevel;
  defaultGoal?: string;
  onResult: (result: LessonPlanResponse) => void;
}

const TITLE_ID = 'ai-words-dialog-title';

export function AiWordsDialog({
  open,
  mode,
  onClose,
  groupId,
  defaultLevel,
  defaultGoal = '',
  onResult,
}: AiWordsDialogProps) {
  const t = useTranslations('Materials.handoutPage.aiWords');
  const [goal, setGoal] = useState('');
  const [cardsPerDeck, setCardsPerDeck] = useState(CARDS_DEFAULT);
  const [level, setLevel] = useState<JlptLevel>(defaultLevel);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setGoal(mode === 'topic' ? defaultGoal : '');
    setCardsPerDeck(CARDS_DEFAULT);
    setLevel(defaultLevel);
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode]);

  const maxLength = mode === 'topic' ? TOPIC_MAX_LENGTH : TEXT_MAX_LENGTH;
  const canSubmit = goal.trim().length >= GOAL_MIN && !working;

  const handleSubmit = async () => {
    setWorking(true);
    setError(null);
    try {
      // The route caps `goal` at GOAL_MAX (500), so a pasted page travels as
      // an attached document instead; the goal stays a short fixed instruction.
      let documents: { path: string; mimeType: string }[] | undefined;
      let finalGoal = goal.trim();
      if (mode === 'text') {
        const path = await uploadLessonDocument(
          new File([goal], 'textbook-page.txt', { type: 'text/plain' }),
        );
        documents = [{ path, mimeType: 'text/plain' }];
        finalGoal = pageTextGoal();
      }
      const result = await buildLessonPlan({
        goal: finalGoal,
        weeks: 1,
        cardsPerDeck,
        level,
        groupId,
        documents,
      });
      onResult(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      setError(/too many requests/i.test(message) ? t('aiBusy') : message || t('aiBusy'));
    } finally {
      setWorking(false);
    }
  };

  return (
    <StyledDialog
      open={open}
      onClose={onClose}
      title={mode === 'topic' ? t('topicTitle') : t('textTitle')}
      titleId={TITLE_ID}
      maxWidth="sm"
      closeDisabled={working}
      actions={
        <Button
          variant="contained"
          disabled={!canSubmit}
          onClick={() => void handleSubmit()}
          sx={{ textTransform: 'none', fontWeight: 700 }}
        >
          {t('generate')}
        </Button>
      }
    >
      {working ? (
        <Loading message={t('aiWorking')} />
      ) : (
        <Stack spacing={2}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            autoFocus
            fullWidth
            multiline
            minRows={mode === 'topic' ? 2 : 5}
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder={mode === 'topic' ? t('topicPlaceholder') : t('textPlaceholder')}
            slotProps={{ htmlInput: { maxLength } }}
          />
          {mode === 'text' && (
            <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary', textAlign: 'right' }}>
              {goal.length} / {TEXT_MAX_LENGTH}
            </Typography>
          )}
          <Box>
            <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: 'text.secondary' }}>
              {t('howMany')}: {cardsPerDeck}
            </Typography>
            <Slider
              value={cardsPerDeck}
              min={CARDS_MIN}
              max={CARDS_MAX}
              step={1}
              onChange={(_, v) => setCardsPerDeck(v as number)}
              aria-label={t('howMany')}
            />
          </Box>
          <TextField
            select
            label={t('levelLabel')}
            value={level}
            onChange={(e) => setLevel(e.target.value as JlptLevel)}
          >
            {JLPT_LEVELS.map((lvl) => (
              <MenuItem key={lvl} value={lvl}>
                {lvl}
              </MenuItem>
            ))}
          </TextField>
          <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
            {t('knownWordsHint')}
          </Typography>
        </Stack>
      )}
    </StyledDialog>
  );
}
