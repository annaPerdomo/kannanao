'use client';
import Box from '@mui/material/Box';
import { alpha, useTheme } from '@mui/material/styles';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useLocale, useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

import { axisCeiling, dailyAccuracy, lineSegments } from './chartScale';

const BAR_PANEL_MIN_HEIGHT = 150;
const ACCURACY_PANEL_HEIGHT = 64;
const PANEL_GAP = 20;
const AXIS_BAND = 18;
const GUTTER = 34;
/** Must match the flex gap of the bar slots so the hit overlay stays aligned. */
const SLOT_GAP = '3px';
const BAR_MAX_WIDTH = 22;

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
 * Two stacked panels sharing one x-axis: cards studied as bars, accuracy as a
 * line on its own 0–100% strip below. Deliberately not one plot with two
 * y-axes — sharing pixels lets a 100%-accuracy dot on a one-card day tower
 * over a 40-card bar, inventing a comparison the data doesn't contain.
 *
 * The accuracy dots are HTML, not SVG children: the line's svg is stretched
 * (`preserveAspectRatio="none"`), which smears any circle drawn inside it. The
 * polyline survives via `vectorEffect`; markers can't.
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
  const segments = useMemo(() => lineSegments(accuracy), [accuracy]);
  const points = useMemo(() => segments.flat(), [segments]);

  const weekday = new Intl.DateTimeFormat(locale, { weekday: 'narrow' });
  const fullDate = new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  const gridline = alpha(theme.palette.text.primary, 0.09);
  const lineColor = accent[600];
  const barColor = brand[500];
  const surface = theme.palette.background.paper;

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

  const slotCenter = (i: number) => ((i + 0.5) / days.length) * 100;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.75, mb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ width: 10, height: 10, borderRadius: '2px', bgcolor: barColor }} />
          <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
            {t('legendCards')}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ width: 10, height: 2, borderRadius: '1px', bgcolor: lineColor }} />
          <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
            {t('legendAccuracy')}
          </Typography>
        </Box>
      </Box>

      <Box sx={{ position: 'relative' }}>
        {/* Cards panel */}
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Box sx={{ width: GUTTER, flexShrink: 0, position: 'relative' }}>
            {[ceiling, ceiling / 2, 0].map((tick, i) => (
              <Typography
                key={tick}
                sx={{
                  position: 'absolute',
                  top: `${i * 50}%`,
                  right: 0,
                  transform: 'translateY(-50%)',
                  fontSize: '0.68rem',
                  fontVariantNumeric: 'tabular-nums',
                  color: 'text.secondary',
                }}
              >
                {tick.toLocaleString(locale)}
              </Typography>
            ))}
          </Box>

          <Box
            aria-hidden
            sx={{ flex: 1, minWidth: 0, position: 'relative', minHeight: BAR_PANEL_MIN_HEIGHT }}
          >
            {[0, 50, 100].map((pct) => (
              <Box
                key={pct}
                sx={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: `${pct}%`,
                  borderTop: `1px solid ${gridline}`,
                }}
              />
            ))}
            <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: SLOT_GAP, height: '100%' }}>
              {days.map((day, i) => {
                const value = values[i] ?? 0;
                const pct = ceiling > 0 ? (value / ceiling) * 100 : 0;
                return (
                  <Box
                    key={day}
                    sx={{
                      flex: 1,
                      minWidth: 0,
                      height: '100%',
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'flex-end',
                      justifyContent: 'center',
                    }}
                  >
                    {i === barLabelIndex && value > 0 && (
                      <Typography
                        sx={{
                          position: 'absolute',
                          bottom: `calc(${pct}% + 4px)`,
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          color: 'text.primary',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {value.toLocaleString(locale)}
                      </Typography>
                    )}
                    <Box
                      sx={{
                        width: '100%',
                        maxWidth: BAR_MAX_WIDTH,
                        height: `${pct}%`,
                        minHeight: value > 0 ? 3 : 0,
                        bgcolor: i === activeIndex ? brand[700] : barColor,
                        borderRadius: '4px 4px 0 0',
                        transition: 'background-color 0.15s ease',
                      }}
                    />
                  </Box>
                );
              })}
            </Box>
          </Box>
        </Box>

        <Box sx={{ height: PANEL_GAP }} />

        {/* Accuracy panel */}
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Box sx={{ width: GUTTER, flexShrink: 0, position: 'relative' }}>
            {[100, 0].map((tick, i) => (
              <Typography
                key={tick}
                sx={{
                  position: 'absolute',
                  top: `${i * 100}%`,
                  right: 0,
                  transform: 'translateY(-50%)',
                  fontSize: '0.68rem',
                  fontVariantNumeric: 'tabular-nums',
                  color: 'text.secondary',
                }}
              >
                {tick}%
              </Typography>
            ))}
          </Box>

          <Box
            aria-hidden
            sx={{ flex: 1, minWidth: 0, position: 'relative', height: ACCURACY_PANEL_HEIGHT }}
          >
            {[0, 50, 100].map((pct) => (
              <Box
                key={pct}
                sx={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: `${pct}%`,
                  borderTop: `1px solid ${gridline}`,
                }}
              />
            ))}

            <Box
              component="svg"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
            >
              {segments.map(
                (segment, i) =>
                  segment.length > 1 && (
                    <polyline
                      key={i}
                      points={segment.map((p) => `${p.x},${p.y}`).join(' ')}
                      fill="none"
                      stroke={lineColor}
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      vectorEffect="non-scaling-stroke"
                    />
                  ),
              )}
            </Box>

            {points.map((p) => (
              <Box
                key={p.x}
                sx={{
                  position: 'absolute',
                  left: `${p.x}%`,
                  top: `${p.y}%`,
                  transform: 'translate(-50%, -50%)',
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  bgcolor: lineColor,
                  boxShadow: `0 0 0 2px ${surface}`,
                }}
              />
            ))}

            {accuracyLabelIndex !== null && accuracy[accuracyLabelIndex] !== null && (
              <Typography
                sx={{
                  position: 'absolute',
                  left: `${slotCenter(accuracyLabelIndex)}%`,
                  // Above the dot when it sits low, below when it sits high —
                  // never outside the strip.
                  ...(accuracy[accuracyLabelIndex]! >= 50
                    ? { top: `calc(${100 - accuracy[accuracyLabelIndex]!}% + 7px)` }
                    : { bottom: `calc(${accuracy[accuracyLabelIndex]!}% + 7px)` }),
                  transform:
                    accuracyLabelIndex === 0
                      ? 'none'
                      : accuracyLabelIndex === days.length - 1
                        ? 'translateX(-100%)'
                        : 'translateX(-50%)',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  color: 'text.primary',
                  whiteSpace: 'nowrap',
                }}
              >
                {accuracy[accuracyLabelIndex]}%
              </Typography>
            )}
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
        </Box>

        {/* One hit column per day, spanning both panels */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            bottom: AXIS_BAND,
            left: `calc(${GUTTER}px + ${theme.spacing(1)})`,
            right: 0,
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
