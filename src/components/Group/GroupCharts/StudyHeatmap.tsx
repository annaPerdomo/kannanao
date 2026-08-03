'use client';
import Box from '@mui/material/Box';
import { alpha, useTheme } from '@mui/material/styles';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';

import type { GroupActivityMember } from '@/hooks/useGroupActivity';

import { ShowMoreButton } from '../ShowMoreButton';
import { heatLevel, heatThresholds } from './chartScale';

const ROWS_SHOWN = 10;
const CELL = 22;

interface StudyHeatmapProps {
  /** ISO dates, oldest → newest — pass the window you want shown. */
  days: string[];
  members: GroupActivityMember[];
  /** Index in each member's `daily` array that `days[0]` corresponds to. */
  offset: number;
}

function parseDay(iso: string): Date {
  return new Date(`${iso}T00:00:00`);
}

function sum(values: number[]): number {
  return values.reduce((total, v) => total + v, 0);
}

/**
 * Members × days grid of cards studied — the "is everyone keeping up?" view.
 * Magnitude on a grid, so one hue stepped light→dark with a scale legend, and
 * an empty day gets the neutral track rather than the palest tint.
 */
export function StudyHeatmap({ days, members, offset }: StudyHeatmapProps) {
  const theme = useTheme();
  const { brand } = theme.palette;
  const locale = useLocale();
  const t = useTranslations('Group.charts');
  const [expanded, setExpanded] = useState(false);

  const weekday = new Intl.DateTimeFormat(locale, { weekday: 'narrow' });
  const fullDate = new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  const RAMP = [
    alpha(theme.palette.text.primary, 0.07),
    brand[100],
    brand[300],
    brand[500],
    brand[700],
  ];

  const windowFor = (m: GroupActivityMember) => m.daily.slice(offset, offset + days.length);
  const thresholds = heatThresholds(members.flatMap(windowFor));
  // Quietest week first: in a group of thirty, the rows worth acting on are the
  // empty ones, and they must not be the ones hidden behind "show all".
  const ranked = [...members].sort(
    (a, b) => sum(windowFor(a)) - sum(windowFor(b)) || a.name.localeCompare(b.name),
  );
  const visible = expanded ? ranked : ranked.slice(0, ROWS_SHOWN);

  if (members.length === 0) {
    return (
      <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
        {t('heatmapEmpty')}
      </Typography>
    );
  }

  const columns = `minmax(0, 1fr) repeat(${days.length}, ${CELL}px)`;
  // Names and their week stay paired: without a cap the grid spreads across a
  // full-width card and the reader tracks a name across empty space.
  const gridWidth = { maxWidth: 150 + days.length * (CELL + 3), mx: 'auto' };

  return (
    <Box>
      <Box
        sx={{ ...gridWidth, display: 'grid', gridTemplateColumns: columns, gap: '3px', mb: 0.5 }}
      >
        <Box />
        {days.map((day) => (
          <Typography
            key={day}
            sx={{ fontSize: '0.68rem', color: 'text.secondary', textAlign: 'center' }}
          >
            {weekday.format(parseDay(day))}
          </Typography>
        ))}
      </Box>

      {visible.map((member) => (
        <Box
          key={member.id}
          sx={{
            ...gridWidth,
            display: 'grid',
            gridTemplateColumns: columns,
            gap: '3px',
            alignItems: 'center',
            mb: '3px',
          }}
        >
          <Typography sx={{ fontSize: '0.82rem', color: 'text.primary', pr: 1 }} noWrap>
            {member.name}
          </Typography>
          {windowFor(member).map((value, i) => {
            const label = t('heatmapTooltip', {
              name: member.name,
              date: fullDate.format(parseDay(days[i])),
              count: value,
            });
            return (
              <Tooltip key={days[i]} title={label}>
                <Box
                  tabIndex={0}
                  aria-label={label}
                  sx={{
                    width: CELL,
                    height: CELL,
                    borderRadius: '6px',
                    bgcolor: RAMP[heatLevel(value, thresholds)],
                    transition: 'transform 0.12s ease',
                    '&:hover, &:focus-visible': { transform: 'scale(1.12)' },
                    '&:focus-visible': { outline: `2px solid ${brand[500]}`, outlineOffset: 2 },
                  }}
                />
              </Tooltip>
            );
          })}
        </Box>
      ))}

      <Box
        sx={{
          ...gridWidth,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: 0.5,
          mt: 1.5,
        }}
      >
        <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
          {t('legendLess')}
        </Typography>
        {RAMP.map((color, i) => (
          <Box key={i} sx={{ width: 12, height: 12, borderRadius: '3px', bgcolor: color }} />
        ))}
        <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
          {t('legendMore')}
        </Typography>
      </Box>

      {members.length > ROWS_SHOWN && (
        <ShowMoreButton
          expanded={expanded}
          total={members.length}
          onClick={() => setExpanded((v) => !v)}
        />
      )}
    </Box>
  );
}
