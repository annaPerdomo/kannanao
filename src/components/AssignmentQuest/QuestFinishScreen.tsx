'use client';
import { Alert, Box, Button, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';

import { Loading } from '@/components/Loading';
import { CelebrationScreen, pickPraise } from '@/components/Practice/CelebrationScreen';
import { type Assignment, useAssignments } from '@/hooks/useAssignments';
import { onAssignmentComplete, peekAssignmentComplete } from '@/lib/assignmentSignal';
import { LAYOUT } from '@/theme';

/** Only reached when the write never lands at all — offline, or no token. */
const MAX_WAIT_MS = 6000;
/** A completion this recent belongs to the leg that was just played. */
const RECENT_MS = 5000;

interface QuestFinishScreenProps {
  assignmentId: string;
  onRetry: () => void;
  onDone: () => void;
}

/**
 * The end of the quest. The verdict is the server's — the assignment row is
 * re-read rather than mastery re-derived here — so this screen can't celebrate
 * something the teacher's dashboard won't show as done.
 */
export function QuestFinishScreen({ assignmentId, onRetry, onDone }: QuestFinishScreenProps) {
  const t = useTranslations('AssignmentQuest');
  const { assignments, loading, error, refetch } = useAssignments(undefined, true, 'mine');
  const [settled, setSettled] = useState(false);
  const praiseSeed = useMemo(() => Math.floor(Math.random() * 1000), []);

  const assignment: Assignment | undefined = assignments.find((a) => a.id === assignmentId);
  const completed = !!assignment?.completed_at;

  // The goal leg's completion POST is several roundtrips behind the tap that
  // opens this screen, so the verdict waits for that write to report in.
  // Reading now would race it and call a passed goal a near miss.
  useEffect(() => {
    let cancelled = false;
    let done = false;
    const settle = () => {
      if (done) return;
      done = true;
      void refetch().then(() => !cancelled && setSettled(true));
    };

    // It is fired as the *previous* screen renders, so on a fast connection it
    // can land before the learner taps through to this one.
    const recent = peekAssignmentComplete();
    if (recent && recent.completed > 0 && Date.now() - recent.at < RECENT_MS) {
      settle();
      return () => {
        cancelled = true;
      };
    }

    const unsubscribe = onAssignmentComplete(settle);
    const timer = setTimeout(settle, MAX_WAIT_MS);
    return () => {
      cancelled = true;
      unsubscribe();
      clearTimeout(timer);
    };
  }, [refetch]);

  if (!settled && !completed) {
    return (
      <Box sx={{ maxWidth: LAYOUT.narrowMaxWidth, mx: 'auto', px: LAYOUT.pagePx, py: 6 }}>
        <Loading message={t('checking')} />
      </Box>
    );
  }

  if (completed) {
    return (
      <CelebrationScreen
        heading={pickPraise(1, praiseSeed).jp}
        headingEn={t('completeHeading')}
        subheading={t('completeSubheading')}
        mode="study"
        exitLabel={t('backHome')}
        onExit={onDone}
      />
    );
  }

  // An unreadable list is a network problem, not a missed goal — falling
  // through to "so close" hands the learner a verdict nobody reached.
  if (error) {
    return (
      <Box sx={{ maxWidth: LAYOUT.narrowMaxWidth, mx: 'auto', px: LAYOUT.pagePx, py: 6 }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          {t('checkFailed')}
        </Alert>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
          <Button
            variant="contained"
            size="large"
            disabled={loading}
            onClick={() => void refetch()}
            sx={{ px: 5 }}
          >
            {t('checkAgain')}
          </Button>
          <Button onClick={onDone}>{t('backHome')}</Button>
        </Box>
      </Box>
    );
  }

  const best = assignment?.progress_accuracy ?? null;
  const goal = assignment?.required_accuracy ?? null;

  return (
    <Box
      sx={{
        maxWidth: LAYOUT.narrowMaxWidth,
        mx: 'auto',
        px: LAYOUT.pagePx,
        py: 6,
        textAlign: 'center',
      }}
    >
      <Typography sx={{ fontSize: '3.5rem', lineHeight: 1, mb: 1 }} aria-hidden>
        💪
      </Typography>
      <Typography variant="h5" sx={{ fontWeight: 800, mb: 1, color: 'text.primary' }}>
        {t('soCloseHeading')}
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3, maxWidth: 420, mx: 'auto' }}>
        {best != null && goal != null ? t('bestSoFar', { best, goal }) : t('tryOneMoreTime')}
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
        <Button variant="contained" size="large" onClick={onRetry} sx={{ px: 5 }}>
          {t('tryAgain')}
        </Button>
        <Button onClick={onDone}>{t('backHome')}</Button>
      </Box>
    </Box>
  );
}
