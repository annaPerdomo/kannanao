'use client';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useLocale, useTranslations } from 'next-intl';

import { formatDate } from '@/components/Group/dueDate';
import type { LessonUnitWeek, LessonWeekStatus } from '@/types/lessonUnit';

interface WeekRowProps {
  week: LessonUnitWeek;
  onOpen: () => void;
}

const STATUS_KEY: Record<LessonWeekStatus, string> = {
  upcoming: 'statusUpcoming',
  current: 'statusCurrent',
  past: 'statusPast',
};

export function WeekRow({ week, onOpen }: WeekRowProps) {
  const t = useTranslations('Materials.library');
  const locale = useLocale();
  const theme = useTheme();
  const { brand, success, warning } = theme.palette;

  const dateParts = [
    week.availableOn ? t('opens', { date: formatDate(week.availableOn, locale) }) : null,
    week.dueDate ? t('due', { date: formatDate(week.dueDate, locale) }) : null,
  ].filter((part): part is string => Boolean(part));

  const statusColor =
    week.status === 'current' ? success.main : week.status === 'past' ? warning.main : brand[600];

  return (
    <Box
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen();
        }
      }}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        p: 1.25,
        borderRadius: theme.radii.md,
        border: `1px solid ${alpha(brand[300], 0.35)}`,
        cursor: 'pointer',
        '&:hover': { bgcolor: alpha(brand[100], 0.4) },
      }}
    >
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: 'text.primary' }} noWrap>
          {week.week != null ? `${t('weekLabel', { n: week.week })} · ` : ''}
          {week.deckEmoji ? `${week.deckEmoji} ` : ''}
          {week.deckName}
        </Typography>
        {dateParts.length > 0 && (
          <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', mt: 0.25 }} noWrap>
            {dateParts.join(' · ')}
          </Typography>
        )}
      </Box>

      <Chip
        size="small"
        label={t(STATUS_KEY[week.status])}
        sx={{
          color: 'text.primary',
          borderColor: alpha(statusColor, 0.4),
          bgcolor: alpha(statusColor, 0.1),
          fontWeight: 700,
        }}
        variant="outlined"
      />

      <Typography
        sx={{ fontSize: '0.75rem', fontWeight: 600, color: 'text.secondary', flexShrink: 0 }}
      >
        {week.learnerCount === 0
          ? t('waitingForLearners')
          : t('finishedCount', { finished: week.finishedCount, learners: week.learnerCount })}
      </Typography>
    </Box>
  );
}
