'use client';
import { Box, Button, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';

import { Loading } from '@/components/Loading';
import { CelebrationScreen, pickPraise } from '@/components/Practice/CelebrationScreen';
import { type Assignment, useAssignments } from '@/hooks/useAssignments';
import { LAYOUT } from '@/theme';

/**
 * The goal leg posts its completion in the background, so a very fast tap can
 * read the assignment a beat before the server has written it. One delayed
 * re-read turns that race into a correct celebration instead of a wrong miss.
 */
const RECHECK_DELAY_MS = 900;

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
  const { assignments, refetch } = useAssignments();
  const [settled, setSettled] = useState(false);
  const praiseSeed = useMemo(() => Math.floor(Math.random() * 1000), []);

  const assignment: Assignment | undefined = assignments.find((a) => a.id === assignmentId);
  const completed = !!assignment?.completed_at;

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    void refetch().then(() => {
      if (cancelled) return;
      timer = setTimeout(() => {
        if (cancelled) return;
        void refetch().then(() => !cancelled && setSettled(true));
      }, RECHECK_DELAY_MS);
    });
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [refetch]);

  // A "done" first read needs no re-check; only a near miss pays for one.
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
