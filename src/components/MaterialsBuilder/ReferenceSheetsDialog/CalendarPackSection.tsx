'use client';
import PrintIcon from '@mui/icons-material/Print';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';

import { buildCalendarPackHtml, type CalendarTopic, packKanji } from '@/lib/calendarPackPrintable';
import { fetchKanjiStrokes } from '@/lib/kanjiStrokes';
import { escapeHtml, openBlankPrintWindow, writePrintWindow } from '@/lib/lessonPrintable';

interface CalendarPackSectionProps {
  locale: string;
  onPopupBlocked: (blocked: boolean) => void;
}

const PACK_KEYS = [
  'learnHeading',
  'learnHint',
  'monthsHeading',
  'weekdaysHeading',
  'trickyNote',
  'traceHeading',
  'traceHint',
  'kanjiHeading',
  'kanjiHint',
  'judgeHeading',
  'judgeHint',
  'judgeRight',
  'gapHeading',
  'gapHint',
  'matchHeading',
  'matchHint',
  'orderHeading',
  'orderHint',
  'myCalendarHeading',
  'myCalendarHint',
  'aboutHeading',
  'aboutHint',
  'kanjiWriteHeading',
  'kanjiWriteHint',
  'writeHeading',
  'writeHint',
  'numbersHeading',
  'numbersHint',
  'nextHeading',
  'nextHint',
] as const;

function loadingPageHtml(text: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"></head><body><p>${escapeHtml(text)}</p></body></html>`;
}

function names(locale: string, kind: 'month' | 'weekday'): string {
  const format = new Intl.DateTimeFormat(locale, { [kind]: 'long', timeZone: 'UTC' });
  // 2023-01-01 was a Sunday, so day offsets walk the week Sunday-first.
  return Array.from({ length: kind === 'month' ? 12 : 7 }, (_, i) =>
    format.format(new Date(Date.UTC(2023, kind === 'month' ? i : 0, kind === 'month' ? 1 : 1 + i))),
  ).join('|');
}

export function CalendarPackSection({ locale, onPopupBlocked }: CalendarPackSectionProps) {
  const t = useTranslations('Group.lessonBuilder');

  const [learn, setLearn] = useState(true);
  const [practice, setPractice] = useState(true);
  const [answerKey, setAnswerKey] = useState(true);
  const [kanaYou, setKanaYou] = useState(true);
  const [loading, setLoading] = useState<CalendarTopic | null>(null);
  const [error, setError] = useState(false);

  const printPack = useCallback(
    (topic: CalendarTopic) => {
      const win = openBlankPrintWindow();
      if (!win) {
        onPopupBlocked(true);
        return;
      }
      onPopupBlocked(false);
      setError(false);
      setLoading(topic);

      void (async () => {
        try {
          writePrintWindow(win, loadingPageHtml(t('sheetsKanjiLoading')));
          const strokes = learn ? await fetchKanjiStrokes(packKanji(topic)) : new Map();
          if (win.closed) return;

          const pack = Object.fromEntries(
            PACK_KEYS.map((key) => [key, t(`calendarPack.${key}`)]),
          ) as Record<(typeof PACK_KEYS)[number], string>;

          writePrintWindow(
            win,
            buildCalendarPackHtml({
              locale,
              seed: Date.now(),
              strokes,
              today: new Date(),
              options: { topic, learn, practice, answerKey, kanaYou },
              labels: {
                ...pack,
                title: t('sheetsCalendarTitle'),
                name: t('printNameLabel'),
                date: t('printDateLabel'),
                answerKey: t('worksheetAnswerKey'),
                credit: t('sheetsKanjiCredit'),
                monthNames: names(locale, 'month').split('|'),
                weekdayNames: names(locale, 'weekday').split('|'),
                weekdayPictures: t.raw('calendarPack.pictures') as string[],
                aboutGlossesDays: t.raw('calendarPack.aboutGlossesDays') as string[],
                aboutGlossesMonths: t.raw('calendarPack.aboutGlossesMonths') as string[],
              },
            }),
          );
        } catch {
          win.close();
          setError(true);
        } finally {
          setLoading(null);
        }
      })();
    },
    [answerKey, kanaYou, learn, locale, onPopupBlocked, practice, t],
  );

  const toggles = [
    { label: t('sheetsCalendarLearn'), checked: learn, set: setLearn },
    { label: t('sheetsCalendarTest'), checked: practice, set: setPractice },
    { label: t('sheetsCalendarAnswerKey'), checked: answerKey, set: setAnswerKey },
    { label: t('sheetsCalendarKanaYou'), checked: kanaYou, set: setKanaYou },
  ];

  return (
    <Stack spacing={1}>
      <Typography sx={{ fontWeight: 700, fontSize: '0.9rem' }}>
        {t('sheetsCalendarTitle')}
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {t('sheetsCalendarHint')}
      </Typography>
      {error && <Alert severity="error">{t('sheetsCalendarError')}</Alert>}
      <Stack>
        {toggles.map((toggle) => (
          <FormControlLabel
            key={toggle.label}
            control={
              <Checkbox
                size="small"
                checked={toggle.checked}
                onChange={(e) => toggle.set(e.target.checked)}
              />
            }
            label={toggle.label}
          />
        ))}
      </Stack>
      {(['months', 'days'] as const).map((topic) => (
        <Button
          key={topic}
          variant="outlined"
          startIcon={<PrintIcon sx={{ fontSize: 18 }} />}
          onClick={() => printPack(topic)}
          disabled={loading !== null || (!learn && !practice)}
        >
          {loading === topic
            ? t('sheetsKanjiLoading')
            : t(topic === 'months' ? 'sheetsCalendarMonthsButton' : 'sheetsCalendarDaysButton')}
        </Button>
      ))}
    </Stack>
  );
}
