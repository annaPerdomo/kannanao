'use client';
import Box from '@mui/material/Box';
import { alpha, useTheme } from '@mui/material/styles';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useLocale, useTranslations } from 'next-intl';

import { axisCeiling } from './chartScale';

const MIN_PLOT_HEIGHT = 130;
const AXIS_BAND = 18;
const BAR_MAX_WIDTH = 22;

interface DailyActivityChartProps {
  /** ISO dates, oldest → newest. */
  days: string[];
  /** Cards studied per day, aligned to `days`. */
  values: number[];
}

/** Local midnight for an ISO date, so labels never slip a day on the parse. */
function parseDay(iso: string): Date {
  return new Date(`${iso}T00:00:00`);
}

/**
 * Cards studied per day for the whole group. One series, so one hue and no
 * legend: the card title says what is plotted. Values live on hover and focus
 * plus a direct label on the best day — a number over every column goes unread.
 */
export function DailyActivityChart({ days, values }: DailyActivityChartProps) {
  const theme = useTheme();
  const { brand } = theme.palette;
  const locale = useLocale();
  const t = useTranslations('Group.charts');

  const max = Math.max(0, ...values);
  const ceiling = axisCeiling(max);
  const bestIndex = values.indexOf(max);
  const today = days[days.length - 1];

  const weekday = new Intl.DateTimeFormat(locale, { weekday: 'narrow' });
  const fullDate = new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  const gridline = alpha(theme.palette.text.primary, 0.09);

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
    <Box sx={{ display: 'flex', gap: 1, height: '100%', minHeight: MIN_PLOT_HEIGHT + AXIS_BAND }}>
      {/* Y axis — 0 / half / ceiling, the values the columns aren't labelled with.
          Its plot box and the chart's are both flex:1 in the same row, so the
          ticks stay level with the gridlines at any card height. */}
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

          <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '100%' }}>
            {days.map((day, i) => {
              const value = values[i] ?? 0;
              const pct = ceiling > 0 ? (value / ceiling) * 100 : 0;
              const label = t('dailyTooltip', {
                date: fullDate.format(parseDay(day)),
                count: value,
              });
              return (
                <Tooltip key={day} title={label}>
                  <Box
                    tabIndex={0}
                    aria-label={label}
                    sx={{
                      flex: 1,
                      minWidth: 0,
                      height: '100%',
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'flex-end',
                      justifyContent: 'center',
                      borderRadius: theme.radii.sm,
                      '&:hover .bar, &:focus-visible .bar': { bgcolor: brand[600] },
                      '&:focus-visible': { outline: `2px solid ${brand[500]}`, outlineOffset: 2 },
                    }}
                  >
                    {i === bestIndex && value > 0 && (
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
    </Box>
  );
}
