'use client';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import PrintIcon from '@mui/icons-material/Print';
import QuizIcon from '@mui/icons-material/Quiz';
import StyleIcon from '@mui/icons-material/Style';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';

import { formatDate } from '@/components/Group/dueDate';
import { useGoalLabel } from '@/components/Group/useGoalLabel';
import { openPrintWindow, type PrintableVariant } from '@/lib/lessonPrintable';
import type { LocatedWeek } from '@/lib/lessonUnits';
import type { Flashcard } from '@/types/flashcard';
import type { LessonWeekStatus } from '@/types/lessonUnit';

import { handoutPrintHtml } from './printHandout';

interface HandoutHeaderProps {
  located: LocatedWeek;
  hrefFor: (deckId: string) => string;
  cards: Flashcard[];
}

const STATUS_KEY: Record<LessonWeekStatus, string> = {
  upcoming: 'statusUpcoming',
  current: 'statusCurrent',
  past: 'statusPast',
};

export function HandoutHeader({ located, hrefFor, cards }: HandoutHeaderProps) {
  const t = useTranslations('Materials.handoutPage');
  const tLib = useTranslations('Materials.library');
  const tPrint = useTranslations('Group.lessonBuilder');
  const locale = useLocale();
  const goalLabel = useGoalLabel();
  const theme = useTheme();
  const { brand, success, warning } = theme.palette;
  const [popupBlocked, setPopupBlocked] = useState(false);
  const { unit, week, previous, next } = located;

  const statusColor =
    week.status === 'current' ? success.main : week.status === 'past' ? warning.main : brand[600];
  const goal = goalLabel({
    required_accuracy: week.requiredAccuracy,
    required_mode: week.requiredMode,
  });
  const unitTitle = unit
    ? (unit.title ?? tLib('untitledUnit', { date: formatDate(unit.createdAt, locale) }))
    : tLib('otherHandouts');
  const overline =
    unit && week.week != null
      ? `${unitTitle} · ${tLib('weekOfTotal', { current: week.week, total: unit.weeks.length })}`
      : unitTitle;
  const heading =
    week.week != null ? `${tLib('weekLabel', { n: week.week })} — ${week.deckName}` : week.deckName;

  const print = (variant: PrintableVariant) => {
    const html = handoutPrintHtml({
      title: variant === 'study' ? tPrint('printStudyTitle') : tPrint('printQuizTitle'),
      heading,
      locale,
      variant,
      deckName: week.deckName,
      emoji: week.deckEmoji,
      cards,
      labels: {
        name: tPrint('printNameLabel'),
        date: tPrint('printDateLabel'),
        word: tPrint('wordLabel'),
        reading: tPrint('readingLabel'),
        meaning: tPrint('meaningLabel'),
        example: tPrint('printExampleLabel'),
      },
    });
    setPopupBlocked(!openPrintWindow(html));
  };

  const facts = [
    week.availableOn ? tLib('opens', { date: formatDate(week.availableOn, locale) }) : null,
    week.dueDate ? tLib('due', { date: formatDate(week.dueDate, locale) }) : t('noDueDate'),
    goal ? t('goal', { goal }) : null,
    week.learnerCount > 0
      ? tLib('finishedCount', { finished: week.finishedCount, learners: week.learnerCount })
      : tLib('waitingForLearners'),
  ].filter((part): part is string => Boolean(part));

  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 2, sm: 3 },
        borderRadius: theme.radii.lg,
        border: `1px solid ${alpha(brand[300], 0.4)}`,
        background: `linear-gradient(120deg, ${alpha(brand[100], 0.75)}, ${alpha(brand[50], 0.35)} 70%)`,
      }}
    >
      <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: 'text.secondary' }}>
        {overline}
      </Typography>
      <Stack direction="row" sx={{ alignItems: 'center', gap: 1.5, mt: 0.5, flexWrap: 'wrap' }}>
        <Typography
          component="h1"
          sx={{ fontWeight: 800, fontSize: { xs: '1.4rem', sm: '1.7rem' }, color: 'text.primary' }}
        >
          {week.deckEmoji ? `${week.deckEmoji} ` : ''}
          {week.deckName}
        </Typography>
        <Chip
          size="small"
          variant="outlined"
          label={tLib(STATUS_KEY[week.status])}
          sx={{
            color: 'text.primary',
            fontWeight: 700,
            borderColor: alpha(statusColor, 0.4),
            bgcolor: alpha(statusColor, 0.1),
          }}
        />
      </Stack>
      {week.title && week.title !== week.deckName && (
        <Typography sx={{ color: 'text.primary', mt: 0.5 }}>{week.title}</Typography>
      )}
      <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary', mt: 1 }}>
        {facts.join(' · ')}
      </Typography>
      {week.note && (
        <Typography sx={{ fontSize: '0.85rem', color: 'text.primary', mt: 0.5 }}>
          {t('canDo', { note: week.note })}
        </Typography>
      )}

      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 1,
          mt: 2,
        }}
      >
        <Button
          startIcon={<PrintIcon />}
          onClick={() => print('study')}
          disabled={cards.length === 0}
          sx={{ textTransform: 'none', fontWeight: 700 }}
        >
          {tPrint('printStudyButton')}
        </Button>
        <Button
          startIcon={<QuizIcon />}
          onClick={() => print('quiz')}
          disabled={cards.length === 0}
          sx={{ textTransform: 'none', fontWeight: 700 }}
        >
          {tPrint('printQuizButton')}
        </Button>
        <Button
          startIcon={<StyleIcon />}
          component={Link}
          href={`/deck/${week.deckId}`}
          sx={{ textTransform: 'none', fontWeight: 700 }}
        >
          {t('openDeck')}
        </Button>
        <Box sx={{ flex: 1 }} />
        {previous && (
          <Button
            component={Link}
            href={hrefFor(previous.deckId)}
            startIcon={<ChevronLeftIcon />}
            sx={{ textTransform: 'none', fontWeight: 700 }}
          >
            {tLib('weekLabel', { n: previous.week ?? 1 })}
          </Button>
        )}
        {next && (
          <Button
            component={Link}
            href={hrefFor(next.deckId)}
            endIcon={<ChevronRightIcon />}
            sx={{ textTransform: 'none', fontWeight: 700 }}
          >
            {tLib('weekLabel', { n: next.week ?? 1 })}
          </Button>
        )}
      </Box>
      {popupBlocked && (
        <Alert severity="warning" sx={{ mt: 1.5 }}>
          {tPrint('sheetsPopupBlocked')}
        </Alert>
      )}
    </Paper>
  );
}
