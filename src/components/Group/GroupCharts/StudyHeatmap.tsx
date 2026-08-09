'use client';
import Box from '@mui/material/Box';
import { alpha, useTheme } from '@mui/material/styles';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';

import { toHoursMinutes } from '@/components/Group/activityWeek';
import type { GroupActivityMember } from '@/hooks/useGroupActivity';

import { ShowMoreButton } from '../ShowMoreButton';
import { heatLevel, heatThresholds } from './chartScale';

const ROWS_SHOWN = 10;
const CELL = 22;
const GAP = 3;
/** Fixed rather than flexible: at 14 columns a `1fr` name column gets squeezed
 * to nothing on narrow screens, so the grid scrolls horizontally instead. */
const NAME_COL = 96;

interface StudyHeatmapProps {
  /** ISO dates, oldest → newest — pass the window you want shown. */
  days: string[];
  members: GroupActivityMember[];
  /** Index in each member's `daily` array that `days[0]` corresponds to. */
  offset: number;
  /** Group-wide seconds studied in the last 7 days, for the side callout. */
  studySecsThisWeek: number;
}

function parseDay(iso: string): Date {
  return new Date(`${iso}T00:00:00`);
}

function sum(values: number[]): number {
  return values.reduce((total, v) => total + v, 0);
}

/**
 * Magnitude on a grid, so one hue stepped light→dark with a labeled legend, and
 * an empty day gets the neutral track rather than the palest tint.
 */
export function StudyHeatmap({ days, members, offset, studySecsThisWeek }: StudyHeatmapProps) {
  const theme = useTheme();
  const { brand } = theme.palette;
  const locale = useLocale();
  const t = useTranslations('Group.charts');
  const [expanded, setExpanded] = useState(false);
  const { hours, minutes } = toHoursMinutes(studySecsThisWeek);

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
  const LEGEND = [
    { level: 0, label: t('legendNoStudy') },
    { level: 1, label: t('legendLight') },
    { level: 2, label: t('legendMedium') },
    { level: 4, label: t('legendHeavy') },
  ];

  const windowFor = (m: GroupActivityMember) => m.daily.slice(offset, offset + days.length);
  const thresholds = heatThresholds(members.flatMap(windowFor));
  // Quietest week first: in a group of thirty, the rows worth acting on are the
  // empty ones, and they must not be the ones hidden behind "show all".
  const ranked = [...members].sort(
    (a, b) => sum(windowFor(a)) - sum(windowFor(b)) || a.name.localeCompare(b.name),
  );
  const visible = expanded ? ranked : ranked.slice(0, ROWS_SHOWN);

  const timeStudiedBlock = (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 0.5,
        px: 2,
        py: { xs: 2, lg: 0 },
        minWidth: { lg: 160 },
      }}
    >
      <Typography sx={{ fontSize: '2rem', lineHeight: 1 }} aria-hidden>
        🌱
      </Typography>
      <Typography
        sx={{ fontSize: '1.5rem', fontWeight: 800, color: 'text.primary', lineHeight: 1.1 }}
      >
        {t('duration', { h: hours, m: minutes })}
      </Typography>
      <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary', textAlign: 'center' }}>
        {t('timeStudiedThisWeek')}
      </Typography>
    </Box>
  );

  if (members.length === 0) {
    return (
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', lg: 'row' } }}>
        <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary', flex: 1 }}>
          {t('heatmapEmpty')}
        </Typography>
        {timeStudiedBlock}
      </Box>
    );
  }

  const columns = `${NAME_COL}px repeat(${days.length}, ${CELL}px)`;
  const gridMinWidth = NAME_COL + days.length * (CELL + GAP);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', lg: 'row' },
        alignItems: { lg: 'center' },
        gap: 2,
      }}
    >
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ overflowX: 'auto', pb: 0.5 }}>
          <Box sx={{ minWidth: gridMinWidth }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: columns, gap: `${GAP}px`, mb: 0.5 }}>
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
                  display: 'grid',
                  gridTemplateColumns: columns,
                  gap: `${GAP}px`,
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
                          '&:focus-visible': {
                            outline: `2px solid ${brand[500]}`,
                            outlineOffset: 2,
                          },
                        }}
                      />
                    </Tooltip>
                  );
                })}
              </Box>
            ))}
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1.25, mt: 1.5 }}>
          {LEGEND.map(({ level, label }) => (
            <Box key={level} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box sx={{ width: 12, height: 12, borderRadius: '3px', bgcolor: RAMP[level] }} />
              <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>{label}</Typography>
            </Box>
          ))}
        </Box>

        {members.length > ROWS_SHOWN && (
          <ShowMoreButton
            expanded={expanded}
            total={members.length}
            onClick={() => setExpanded((v) => !v)}
          />
        )}
      </Box>

      <Box
        sx={{
          borderTop: { xs: `1px solid ${alpha(brand[300], 0.3)}`, lg: 'none' },
          borderLeft: { lg: `1px solid ${alpha(brand[300], 0.3)}` },
        }}
      >
        {timeStudiedBlock}
      </Box>
    </Box>
  );
}
