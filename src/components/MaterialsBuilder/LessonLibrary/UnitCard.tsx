'use client';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Collapse from '@mui/material/Collapse';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';

import { formatDate } from '@/components/Group/dueDate';
import { currentWeekSummary } from '@/lib/lessonUnits';
import type { LessonUnit, LessonUnitWeek } from '@/types/lessonUnit';

import { WeekRow } from './WeekRow';

interface UnitCardProps {
  unit: LessonUnit;
  onOpenWeek: (week: LessonUnitWeek) => void;
  defaultExpanded?: boolean;
}

export function UnitCard({ unit, onOpenWeek, defaultExpanded = false }: UnitCardProps) {
  const t = useTranslations('Materials.library');
  const locale = useLocale();
  const theme = useTheme();
  const { brand } = theme.palette;
  const [expanded, setExpanded] = useState(defaultExpanded);

  const { current, total, lastFinished } = currentWeekSummary(unit);
  const summary = [
    current != null
      ? t('weekOfTotal', { current, total })
      : total > 0
        ? t('allWeeksDone', { total })
        : null,
    lastFinished ? t('lastWeekFinished', lastFinished) : null,
  ]
    .filter((part): part is string => Boolean(part))
    .join(' · ');

  const title = unit.title ?? t('untitledUnit', { date: formatDate(unit.createdAt, locale) });

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: theme.radii.lg,
        border: `1px solid ${alpha(brand[300], 0.4)}`,
        bgcolor: 'background.paper',
        overflow: 'hidden',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: { xs: 1.5, sm: 2 } }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
            <Typography
              component="h3"
              sx={{ fontWeight: 800, fontSize: '0.95rem', color: 'text.primary' }}
              noWrap
            >
              {title}
            </Typography>
            {unit.level && (
              <Chip
                size="small"
                label={unit.level}
                sx={{ fontWeight: 700, bgcolor: alpha(brand[300], 0.25), color: brand[800] }}
              />
            )}
          </Stack>
          {summary && (
            <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary', mt: 0.25 }}>
              {summary}
            </Typography>
          )}
        </Box>
        <IconButton
          aria-label={expanded ? t('hideWeeks') : t('showWeeks')}
          aria-expanded={expanded}
          onClick={() => setExpanded((v) => !v)}
          sx={{
            transform: expanded ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.15s ease',
          }}
        >
          <ExpandMoreIcon />
        </IconButton>
      </Box>

      <Collapse in={expanded}>
        <Stack spacing={1} sx={{ p: { xs: 1.5, sm: 2 }, pt: 0 }}>
          {unit.weeks.map((week) => (
            <WeekRow key={week.deckId} week={week} onOpen={() => onOpenWeek(week)} />
          ))}
        </Stack>
      </Collapse>
    </Paper>
  );
}
