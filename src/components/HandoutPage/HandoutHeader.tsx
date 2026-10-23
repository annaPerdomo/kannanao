'use client';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import EditIcon from '@mui/icons-material/Edit';
import EventRepeatIcon from '@mui/icons-material/EventRepeat';
import GridOnIcon from '@mui/icons-material/GridOn';
import PrintIcon from '@mui/icons-material/Print';
import QuizIcon from '@mui/icons-material/Quiz';
import StyleIcon from '@mui/icons-material/Style';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

import { formatDate } from '@/components/Group/dueDate';
import { useGoalLabel } from '@/components/Group/useGoalLabel';
import { ReferenceSheetsDialog } from '@/components/MaterialsBuilder/ReferenceSheetsDialog';
import { openPrintWindow, type PrintableVariant } from '@/lib/lessonPrintable';
import type { LocatedWeek } from '@/lib/lessonUnits';
import type { Flashcard } from '@/types/flashcard';
import type { LessonWeekStatus } from '@/types/lessonUnit';

import { HandoutTitle } from './HandoutTitle';
import { handoutPlanDeck, handoutPrintHtml } from './printHandout';

interface HandoutHeaderProps {
  located: LocatedWeek;
  hrefFor: (deckId: string) => string;
  cards: Flashcard[];
  onRename?: (name: string) => Promise<boolean>;
  onEditSchedule?: () => void;
  onShift?: () => void;
}

const STATUS_KEY: Record<LessonWeekStatus, string> = {
  draft: 'statusDraft',
  upcoming: 'statusUpcoming',
  current: 'statusCurrent',
  past: 'statusPast',
};

export function HandoutHeader({
  located,
  hrefFor,
  cards,
  onRename,
  onEditSchedule,
  onShift,
}: HandoutHeaderProps) {
  const t = useTranslations('Materials.handoutPage');
  const tLib = useTranslations('Materials.library');
  const tPrint = useTranslations('Group.lessonBuilder');
  const locale = useLocale();
  const goalLabel = useGoalLabel();
  const theme = useTheme();
  const { brand, success, warning } = theme.palette;
  const [popupBlocked, setPopupBlocked] = useState(false);
  const [sheetsOpen, setSheetsOpen] = useState(false);
  const { unit, week, previous, next } = located;

  const plan = useMemo(
    () => ({
      decks: [handoutPlanDeck({ deckName: week.deckName, emoji: week.deckEmoji, cards })],
    }),
    [week.deckName, week.deckEmoji, cards],
  );

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

  const isDraft = week.status === 'draft';
  const facts = [
    !isDraft && week.availableOn
      ? tLib('opens', { date: formatDate(week.availableOn, locale) })
      : null,
    !isDraft
      ? week.dueDate
        ? tLib('due', { date: formatDate(week.dueDate, locale) })
        : t('noDueDate')
      : null,
    goal ? t('goal', { goal }) : null,
    !isDraft
      ? week.learnerCount > 0
        ? tLib('finishedCount', { finished: week.finishedCount, learners: week.learnerCount })
        : tLib('waitingForLearners')
      : null,
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
      <HandoutTitle
        name={week.deckName}
        emoji={week.deckEmoji}
        statusLabel={tLib(STATUS_KEY[week.status])}
        statusColor={statusColor}
        onRename={onRename}
      />
      {week.title && week.title !== week.deckName && (
        <Typography sx={{ color: 'text.primary', mt: 0.5 }}>{week.title}</Typography>
      )}
      {facts.length > 0 &&
        (onEditSchedule ? (
          <Button
            onClick={onEditSchedule}
            endIcon={<EditIcon sx={{ fontSize: 14 }} />}
            sx={{
              mt: 0.5,
              ml: -0.5,
              px: 0.5,
              justifyContent: 'flex-start',
              textAlign: 'left',
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.85rem',
              color: 'text.secondary',
            }}
          >
            {facts.join(' · ')}
          </Button>
        ) : (
          <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary', mt: 1 }}>
            {facts.join(' · ')}
          </Typography>
        ))}
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
          startIcon={<GridOnIcon />}
          onClick={() => setSheetsOpen(true)}
          disabled={cards.length === 0}
          sx={{ textTransform: 'none', fontWeight: 700 }}
        >
          {tPrint('referenceSheetsButton')}
        </Button>
        <Button
          startIcon={<StyleIcon />}
          component={Link}
          href={`/deck/${week.deckId}`}
          sx={{ textTransform: 'none', fontWeight: 700 }}
        >
          {t('openDeck')}
        </Button>
        {onShift && (
          <Button
            startIcon={<EventRepeatIcon />}
            onClick={onShift}
            sx={{ textTransform: 'none', fontWeight: 700 }}
          >
            {tLib('moveLater')}
          </Button>
        )}
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
      <ReferenceSheetsDialog open={sheetsOpen} onClose={() => setSheetsOpen(false)} plan={plan} />
    </Paper>
  );
}
