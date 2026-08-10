'use client';
import Box from '@mui/material/Box';
import { useTheme } from '@mui/material/styles';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useLocale, useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

import { axisCeiling, axisY, dailyAccuracy } from './chartScale';
import { DailyActivityPlot, SLOT_GAP, TICKS } from './DailyActivityPlot';

const AXIS_BAND = 18;
const GUTTER = 36;

interface DailyActivityChartProps {
  /** ISO dates, oldest → newest. */
  days: string[];
  /** Cards studied per day, aligned to `days`. */
  values: number[];
  /** Cards answered correctly per day, aligned to `days`. */
  correct: number[];
}

/** Local midnight for an ISO date, so labels never slip a day on the parse. */
function parseDay(iso: string): Date {
  return new Date(`${iso}T00:00:00`);
}

/**
 * Cards studied as bars and accuracy as a line in one plot, on two axes —
 * counts on the left, percent on the right.
 *
 * Two scales sharing pixels means bar height and dot height are not comparable
 * to each other, only each series against its own axis — hence a label on every
 * axis and a direct label on every series, so nothing implies that a crossing
 * means something.
 */
export function DailyActivityChart({ days, values, correct }: DailyActivityChartProps) {
  const theme = useTheme();
  const { brand, accent } = theme.palette;
  const locale = useLocale();
  const t = useTranslations('Group.charts');
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const max = Math.max(0, ...values);
  const ceiling = axisCeiling(max);
  const bestIndex = values.indexOf(max);
  const today = days[days.length - 1];

  const accuracy = useMemo(() => dailyAccuracy(values, correct), [values, correct]);

  const weekday = new Intl.DateTimeFormat(locale, { weekday: 'narrow' });
  const fullDate = new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  const barLabelIndex = activeIndex ?? bestIndex;
  // Label the newest day that has an accuracy, and follow the hovered column
  // only when that column has one.
  const accuracyLabelIndex = useMemo(() => {
    if (activeIndex !== null) return accuracy[activeIndex] !== null ? activeIndex : null;
    for (let i = accuracy.length - 1; i >= 0; i--) if (accuracy[i] !== null) return i;
    return null;
  }, [activeIndex, accuracy]);

  if (max === 0) {
    return (
      <Box sx={{ py: 5, textAlign: 'center' }}>
        <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
          {t('dailyEmpty')}
        </Typography>
      </Box>
    );
  }

  const tickSx = {
    position: 'absolute' as const,
    transform: 'translateY(-50%)',
    fontSize: '0.68rem',
    fontVariantNumeric: 'tabular-nums',
    color: 'text.secondary',
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.75, mb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ width: 10, height: 10, borderRadius: '2px', bgcolor: brand[500] }} />
          <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
            {t('legendCards')}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ width: 10, height: 2, borderRadius: '1px', bgcolor: accent[600] }} />
          <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
            {t('legendAccuracy')}
          </Typography>
        </Box>
      </Box>

      <Box sx={{ position: 'relative' }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Box sx={{ width: GUTTER, flexShrink: 0, position: 'relative' }}>
            {TICKS.map((pct) => (
              <Typography key={pct} sx={{ ...tickSx, top: `${axisY(pct)}%`, right: 0 }}>
                {((ceiling * pct) / 100).toLocaleString(locale)}
              </Typography>
            ))}
          </Box>

          <DailyActivityPlot
            days={days}
            values={values}
            accuracy={accuracy}
            ceiling={ceiling}
            activeIndex={activeIndex}
            barLabelIndex={barLabelIndex}
            accuracyLabelIndex={accuracyLabelIndex}
          />

          <Box sx={{ width: GUTTER, flexShrink: 0, position: 'relative' }}>
            {TICKS.map((pct) => (
              <Typography key={pct} sx={{ ...tickSx, top: `${axisY(pct)}%`, left: 0 }}>
                {pct}%
              </Typography>
            ))}
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 1, height: AXIS_BAND, alignItems: 'flex-end' }}>
          <Box sx={{ width: GUTTER, flexShrink: 0 }} />
          <Box sx={{ flex: 1, minWidth: 0, display: 'flex', gap: SLOT_GAP }}>
            {days.map((day) => (
              <Typography
                key={day}
                sx={{
                  flex: 1,
                  minWidth: 0,
                  textAlign: 'center',
                  fontSize: '0.68rem',
                  color: day === today ? 'text.primary' : 'text.secondary',
                  fontWeight: day === today ? 700 : 400,
                }}
              >
                {weekday.format(parseDay(day))}
              </Typography>
            ))}
          </Box>
          <Box sx={{ width: GUTTER, flexShrink: 0 }} />
        </Box>

        {/* One hit column per day, spanning the plot */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            bottom: AXIS_BAND,
            left: `calc(${GUTTER}px + ${theme.spacing(1)})`,
            right: `calc(${GUTTER}px + ${theme.spacing(1)})`,
            display: 'flex',
            gap: SLOT_GAP,
          }}
        >
          {days.map((day, i) => {
            const value = values[i] ?? 0;
            const dayAccuracy = accuracy[i];
            const label =
              dayAccuracy === null
                ? t('dailyTooltip', { date: fullDate.format(parseDay(day)), count: value })
                : t('dailyTooltipWithAccuracy', {
                    date: fullDate.format(parseDay(day)),
                    count: value,
                    pct: dayAccuracy,
                  });
            return (
              <Tooltip key={day} title={label}>
                <Box
                  role="button"
                  tabIndex={0}
                  aria-label={label}
                  onFocus={() => setActiveIndex(i)}
                  onBlur={() => setActiveIndex((current) => (current === i ? null : current))}
                  onMouseEnter={() => setActiveIndex(i)}
                  onMouseLeave={() => setActiveIndex((current) => (current === i ? null : current))}
                  onClick={() => setActiveIndex((current) => (current === i ? null : i))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setActiveIndex((current) => (current === i ? null : i));
                    }
                  }}
                  sx={{
                    flex: 1,
                    minWidth: 0,
                    cursor: 'pointer',
                    borderRadius: theme.radii.sm,
                    '&:focus-visible': { outline: `2px solid ${brand[500]}`, outlineOffset: 2 },
                  }}
                />
              </Tooltip>
            );
          })}
        </Box>
      </Box>
    </Box>
  );
}
