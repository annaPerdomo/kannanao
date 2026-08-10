'use client';
import Box from '@mui/material/Box';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useLocale } from 'next-intl';
import { useMemo } from 'react';

import {
  axisY,
  DOT_LABEL_GAP,
  labelPlacement,
  lineSegments,
  PLOT_FILL,
  PLOT_HEIGHT,
} from './chartScale';

/** Must match the flex gap of the bar slots so the weekday band and hit overlay stay aligned. */
export const SLOT_GAP = '3px';
/** The gridlines, and the ticks both gutters label. */
export const TICKS = [100, 50, 0];
const BAR_MAX_WIDTH = 22;

interface DailyActivityPlotProps {
  days: string[];
  values: number[];
  /** Percent correct per day, null on a day nobody studied. */
  accuracy: Array<number | null>;
  /** Top of the count axis. */
  ceiling: number;
  activeIndex: number | null;
  barLabelIndex: number;
  /** Column whose dot carries a percent label, null when no day has an accuracy. */
  accuracyLabelIndex: number | null;
}

/**
 * Everything inside the axes: bars, the accuracy line and its dots, gridlines,
 * and one direct label per series. The frame around it lives in the chart.
 *
 * The accuracy dots are HTML, not SVG children: the line's svg is stretched
 * (`preserveAspectRatio="none"`), which smears any circle drawn inside it. The
 * polyline survives via `vectorEffect`; markers can't.
 */
export function DailyActivityPlot({
  days,
  values,
  accuracy,
  ceiling,
  activeIndex,
  barLabelIndex,
  accuracyLabelIndex,
}: DailyActivityPlotProps) {
  const theme = useTheme();
  const locale = useLocale();
  const { brand, accent } = theme.palette;

  const gridline = alpha(theme.palette.text.primary, 0.09);
  const lineColor = accent[600];
  const barColor = brand[500];
  const surface = theme.palette.background.paper;

  const segments = useMemo(() => lineSegments(accuracy), [accuracy]);
  const points = useMemo(() => segments.flat(), [segments]);

  const barValue = values[barLabelIndex] ?? 0;
  const labelledAccuracy = accuracyLabelIndex === null ? null : accuracy[accuracyLabelIndex];
  const { barLabelBottom, accuracyBelow } = labelPlacement(
    ceiling > 0 ? (barValue / ceiling) * 100 : 0,
    barValue > 0 && accuracyLabelIndex === barLabelIndex ? labelledAccuracy : null,
  );

  const slotCenter = (i: number) => ((i + 0.5) / days.length) * 100;

  return (
    <Box aria-hidden sx={{ flex: 1, minWidth: 0, position: 'relative', height: PLOT_HEIGHT }}>
      {TICKS.map((pct) => (
        <Box
          key={pct}
          sx={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: `${axisY(pct)}%`,
            borderTop: `1px solid ${gridline}`,
          }}
        />
      ))}

      <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: SLOT_GAP, height: '100%' }}>
        {days.map((day, i) => {
          const value = values[i] ?? 0;
          const pct = ceiling > 0 ? (value / ceiling) * 100 * PLOT_FILL : 0;
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
                    bottom: `${barLabelBottom}px`,
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
                points={segment.map((p) => `${p.x},${axisY(100 - p.y)}`).join(' ')}
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
            top: `${axisY(100 - p.y)}%`,
            transform: 'translate(-50%, -50%)',
            width: 8,
            height: 8,
            borderRadius: '50%',
            bgcolor: lineColor,
            boxShadow: `0 0 0 2px ${surface}`,
          }}
        />
      ))}

      {accuracyLabelIndex !== null && labelledAccuracy !== null && (
        <Typography
          sx={{
            position: 'absolute',
            left: `${slotCenter(accuracyLabelIndex)}%`,
            ...(accuracyBelow
              ? { top: `calc(${axisY(labelledAccuracy)}% + ${DOT_LABEL_GAP}px)` }
              : { bottom: `calc(${100 - axisY(labelledAccuracy)}% + ${DOT_LABEL_GAP}px)` }),
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
          {labelledAccuracy}%
        </Typography>
      )}
    </Box>
  );
}
