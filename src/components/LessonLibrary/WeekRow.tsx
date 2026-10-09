'use client';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';

import { formatDate } from '@/components/Group/dueDate';
import type { LessonUnitWeek, LessonWeekStatus } from '@/types/lessonUnit';

import { WeekKanaChips } from './WeekKanaChips';

interface WeekRowProps {
  week: LessonUnitWeek;
  onOpen: () => void;
  onShift?: () => void;
}

const STATUS_KEY: Record<LessonWeekStatus, string> = {
  draft: 'statusDraft',
  upcoming: 'statusUpcoming',
  current: 'statusCurrent',
  past: 'statusPast',
};

export function WeekRow({ week, onOpen, onShift }: WeekRowProps) {
  const t = useTranslations('Materials.library');
  const locale = useLocale();
  const theme = useTheme();
  const { brand, success, warning } = theme.palette;
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);

  const isDraft = week.status === 'draft';
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
        {isDraft ? (
          <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', mt: 0.25 }} noWrap>
            {t('draftHint')}
          </Typography>
        ) : (
          dateParts.length > 0 && (
            <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', mt: 0.25 }} noWrap>
              {dateParts.join(' · ')}
            </Typography>
          )
        )}
        {week.wordCount > 0 && (
          <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', mt: 0.25 }} noWrap>
            {t('words.count', { count: week.wordCount })}
          </Typography>
        )}
        <WeekKanaChips kanaSets={week.kanaSets} />
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

      {onShift && (
        <>
          <IconButton
            aria-label={t('weekMenu', { n: week.week ?? 1 })}
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              setMenuAnchor(e.currentTarget);
            }}
          >
            <MoreVertIcon sx={{ fontSize: 16 }} />
          </IconButton>
          <Menu
            anchorEl={menuAnchor}
            open={Boolean(menuAnchor)}
            onClose={() => setMenuAnchor(null)}
          >
            <MenuItem
              onClick={(e) => {
                e.stopPropagation();
                setMenuAnchor(null);
                onShift();
              }}
            >
              {t('moveLater')}
            </MenuItem>
          </Menu>
        </>
      )}

      <ChevronRightIcon sx={{ fontSize: 20, color: 'text.secondary', flexShrink: 0 }} />
    </Box>
  );
}
