'use client';
import Box from '@mui/material/Box';
import { alpha, useTheme } from '@mui/material/styles';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useLocale, useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

import { axisCeiling, dailyAccuracy, lineSegments } from './chartScale';

const MIN_PLOT_HEIGHT = 130;
const AXIS_BAND = 18;
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
 * Cards studied as bars against the left axis, accuracy as a line against a
 * right 0–100% axis. Values live on hover and focus plus a direct label on
 * the best day and whichever column is active — a number over every column
 * goes unread, and touch users need it without a hover state.
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

  const weekday = new Intl.DateTimeFormat(locale, { weekday: 'narrow' });
  const fullDate = new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  const gridline = alpha(theme.palette.text.primary, 0.09);
  const lineColor = accent[600];

  if (max === 0) {
    return (
      <Box sx={{ py: 5, textAlign: 'center' }}>
        <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
          {t('dailyEmpty')}
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.75, mb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ width: 10, height: 10, borderRadius: '2px', bgcolor: brand[400] }} />
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

      <Box sx={{ display: 'flex', gap: 1, height: '100%', minHeight: MIN_PLOT_HEIGHT + AXIS_BAND }}>
        <Box sx={{ width: 34, flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ position: 'relative', flex: 1 }}>
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
          <Box sx={{ height: AXIS_BAND }} />
        </Box>

        <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ position: 'relative', flex: 1, minHeight: MIN_PLOT_HEIGHT }}>
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
              aria-hidden
              sx={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
              }}
            >
              {segments.map((segment, i) => (
                <g key={i}>
                  {segment.length > 1 && (
                    <polyline
                      points={segment.map((p) => `${p.x},${p.y}`).join(' ')}
                      fill="none"
                      stroke={lineColor}
                      strokeWidth={1.5}
                      vectorEffect="non-scaling-stroke"
                    />
                  )}
                  {segment.map((p, j) => (
                    <circle key={j} cx={p.x} cy={p.y} r={2} fill={lineColor} />
                  ))}
                </g>
              ))}
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '100%' }}>
              {days.map((day, i) => {
                const value = values[i] ?? 0;
                const pct = ceiling > 0 ? (value / ceiling) * 100 : 0;
                const dayAccuracy = accuracy[i];
                const label =
                  dayAccuracy === null
                    ? t('dailyTooltip', { date: fullDate.format(parseDay(day)), count: value })
                    : t('dailyTooltipWithAccuracy', {
                        date: fullDate.format(parseDay(day)),
                        count: value,
                        pct: dayAccuracy,
                      });
                const showLabel = i === (activeIndex ?? bestIndex);
                const labelTopPct = Math.max(pct, dayAccuracy ?? 0);
                return (
                  <Tooltip key={day} title={label}>
                    <Box
                      role="button"
                      tabIndex={0}
                      aria-label={label}
                      onFocus={() => setActiveIndex(i)}
                      onBlur={() => setActiveIndex((current) => (current === i ? null : current))}
                      onMouseEnter={() => setActiveIndex(i)}
                      onMouseLeave={() =>
                        setActiveIndex((current) => (current === i ? null : current))
                      }
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
                        height: '100%',
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'flex-end',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        borderRadius: theme.radii.sm,
                        '&:hover .bar, &:focus-visible .bar': { bgcolor: brand[600] },
                        '&:focus-visible': { outline: `2px solid ${brand[500]}`, outlineOffset: 2 },
                      }}
                    >
                      {showLabel && value > 0 && (
                        <Typography
                          sx={{
                            position: 'absolute',
                            bottom: `calc(${labelTopPct}% + 4px)`,
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            color: 'text.primary',
                            whiteSpace: 'nowrap',
                            textAlign: 'center',
                          }}
                        >
                          {value.toLocaleString(locale)}
                          {dayAccuracy !== null && (
                            <Box component="span" sx={{ color: lineColor, ml: 0.5 }}>
                              {dayAccuracy}%
                            </Box>
                          )}
                        </Typography>
                      )}
                      <Box
                        className="bar"
                        sx={{
                          width: '100%',
                          maxWidth: BAR_MAX_WIDTH,
                          height: `${pct}%`,
                          minHeight: value > 0 ? 3 : 0,
                          bgcolor: brand[400],
                          borderRadius: '4px 4px 0 0',
                          transition: 'background-color 0.15s ease',
                        }}
                      />
                    </Box>
                  </Tooltip>
                );
              })}
            </Box>
          </Box>

          <Box sx={{ display: 'flex', gap: '3px', height: AXIS_BAND, alignItems: 'flex-end' }}>
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

        <Box sx={{ width: 34, flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ position: 'relative', flex: 1 }}>
            {[100, 50, 0].map((tick, i) => (
              <Typography
                key={tick}
                sx={{
                  position: 'absolute',
                  top: `${i * 50}%`,
                  left: 0,
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
          <Box sx={{ height: AXIS_BAND }} />
        </Box>
      </Box>
    </Box>
  );
}
