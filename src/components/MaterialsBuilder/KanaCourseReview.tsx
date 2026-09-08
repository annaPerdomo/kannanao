'use client';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import { alpha, useTheme } from '@mui/material/styles';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';

import type { GroupKanaCoverage } from '@/lib/kanaChartPrintable';
import { KANA_COURSE_READY_FRACTION, type KanaCourseWeek, rowReadFraction } from '@/lib/kanaCourse';
import { getSet, setCharacters } from '@/lib/kanaCurriculum';

import { KanaCoursePrintButtons } from './KanaCoursePrintButtons';

export interface KanaCourseSelection {
  /** Weeks switched off keep their place here; renumbering happens on render. */
  skippedWeeks: number[];
  skippedRows: string[];
}

interface KanaCourseReviewProps {
  weeks: KanaCourseWeek[];
  selection: KanaCourseSelection;
  coverage: GroupKanaCoverage | null;
  applying: boolean;
  onSelectionChange: (selection: KanaCourseSelection) => void;
  onApply: () => void;
  onStartOver: () => void;
}

/** A week with nothing left ticked in it takes no number. */
export function courseWeekNumbers(
  weeks: KanaCourseWeek[],
  selection: KanaCourseSelection,
): (number | null)[] {
  const going = new Set(includedCourseWeeks(weeks, selection).map((week) => week.index));
  let n = 0;
  return weeks.map((week) => (going.has(week.index) ? ++n : null));
}

export function includedCourseWeeks(
  weeks: KanaCourseWeek[],
  selection: KanaCourseSelection,
): KanaCourseWeek[] {
  return weeks
    .filter((week) => !selection.skippedWeeks.includes(week.index))
    .map((week) => ({
      ...week,
      setIds: week.setIds.filter((setId) => !selection.skippedRows.includes(setId)),
    }))
    .filter((week) => week.setIds.length > 0);
}

function readinessLine(
  setId: string,
  coverage: GroupKanaCoverage | null,
  t: (key: string, values?: Record<string, number>) => string,
): string | null {
  if (!coverage) return null;
  const readers = coverage.startedCount ?? coverage.learnerCount;
  if (readers === 0) return null;
  const fraction = rowReadFraction(setId, coverage);
  if (fraction >= KANA_COURSE_READY_FRACTION) return t('rowMostlyRead');
  const count = Math.round(fraction * readers);
  return count === 0 ? t('rowNewToEveryone') : t('rowSomeRead', { count, total: readers });
}

export function KanaCourseReview({
  weeks,
  selection,
  coverage,
  applying,
  onSelectionChange,
  onApply,
  onStartOver,
}: KanaCourseReviewProps) {
  const t = useTranslations('Materials.kanaCourse');
  const theme = useTheme();
  const { brand } = theme.palette;

  const numbers = courseWeekNumbers(weeks, selection);
  const included = includedCourseWeeks(weeks, selection);
  const rowCount = included.reduce((n, week) => n + week.setIds.length, 0);

  const toggleWeek = (index: number, on: boolean) =>
    onSelectionChange({
      ...selection,
      skippedWeeks: on
        ? selection.skippedWeeks.filter((i) => i !== index)
        : [...selection.skippedWeeks, index],
    });

  const toggleRow = (setId: string, on: boolean) =>
    onSelectionChange({
      ...selection,
      skippedRows: on
        ? selection.skippedRows.filter((id) => id !== setId)
        : [...selection.skippedRows, setId],
    });

  return (
    <Stack spacing={2.5}>
      <Box>
        <Typography component="h2" sx={{ fontWeight: 800 }}>
          {t('reviewHeading', { weeks: included.length, rows: rowCount })}
        </Typography>
        <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary', mt: 0.5 }}>
          {t('reviewSubtitle')}
        </Typography>
      </Box>

      {weeks.length === 0 && <Alert severity="info">{t('nothingToTeach')}</Alert>}

      {weeks.map((week, i) => {
        const number = numbers[i];
        const off = number === null;
        return (
          <Paper
            key={week.index}
            elevation={0}
            sx={{
              p: { xs: 1.75, sm: 2.25 },
              borderRadius: theme.radii.lg,
              border: `1px solid ${alpha(brand[300], 0.4)}`,
              opacity: off ? 0.55 : 1,
            }}
          >
            <Stack
              direction="row"
              sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1 }}
            >
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontWeight: 800 }}>
                  {off ? t('weekSkipped') : t('weekTitle', { number })}
                </Typography>
                <Chip size="small" label={week.dueDate} sx={{ mt: 0.5, fontWeight: 700 }} />
              </Box>
              <Switch
                checked={!off}
                onChange={(e) => toggleWeek(week.index, e.target.checked)}
                slotProps={{
                  input: {
                    'aria-label': off
                      ? t('weekSwitchLabelOff', { date: week.dueDate })
                      : t('weekSwitchLabel', { number }),
                  },
                }}
              />
            </Stack>

            <Stack spacing={0.5} sx={{ mt: 1 }}>
              {week.setIds.map((setId) => {
                const on = !selection.skippedRows.includes(setId);
                const readiness = readinessLine(setId, coverage, t);
                return (
                  <Stack
                    key={setId}
                    direction="row"
                    sx={{ alignItems: 'flex-start', gap: 0.5, flexWrap: 'wrap' }}
                  >
                    <Checkbox
                      checked={on}
                      disabled={off}
                      onChange={(e) => toggleRow(setId, e.target.checked)}
                      slotProps={{ input: { 'aria-label': setCharacters(setId) ?? setId } }}
                      sx={{ p: 0.5 }}
                    />
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 700, color: brand[800] }}>
                        {getSet(setId)
                          ?.entries.map((e) => e.kana)
                          .join(' · ')}
                      </Typography>
                      {readiness && (
                        <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>
                          {readiness}
                        </Typography>
                      )}
                    </Box>
                  </Stack>
                );
              })}
            </Stack>

            {!off && (
              <KanaCoursePrintButtons
                setIds={week.setIds.filter((id) => !selection.skippedRows.includes(id))}
              />
            )}
          </Paper>
        );
      })}

      <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
        <Button
          variant="contained"
          size="large"
          onClick={onApply}
          disabled={applying || rowCount === 0}
        >
          {applying ? t('applying') : t('applyButton')}
        </Button>
        <Button onClick={onStartOver} disabled={applying} sx={{ textTransform: 'none' }}>
          {t('startOverButton')}
        </Button>
      </Box>
      <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
        {t('groupWideNotice')}
      </Typography>
    </Stack>
  );
}
