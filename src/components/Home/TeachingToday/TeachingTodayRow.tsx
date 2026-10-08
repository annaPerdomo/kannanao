'use client';
import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo } from 'react';

import { groupAssignments } from '@/components/Group/AssignmentsList/groupAssignments';
import { daysUntilDue } from '@/components/Group/dueDate';
import { deriveAttentionItems } from '@/components/Group/NeedsAttention/deriveAttentionItems';
import { attentionItemText } from '@/components/Group/NeedsAttention/Row';
import { StatPill } from '@/components/Group/WeekStatStrip/StatPill';
import { useAssignments } from '@/hooks/useAssignments';
import { useGroupMembers } from '@/hooks/useGroup';
import type { Group } from '@/hooks/useGroups';
import { handoutPagePath } from '@/lib/lessonUnits';

const THIS_WEEK_DAYS = 7;

interface TeachingTodayRowProps {
  group: Group;
  onAttention?: (groupId: string, hasAttention: boolean | null) => void;
  /** Row stays mounted in compact mode too, so background revalidation can un-collapse the card. */
  compact?: boolean;
}

export function TeachingTodayRow({ group, onAttention, compact = false }: TeachingTodayRowProps) {
  const theme = useTheme();
  const { brand } = theme.palette;
  const t = useTranslations('Home.teachingToday');
  const tAttention = useTranslations('Group.needsAttention');
  const tTime = useTranslations('Group.timeAgo');

  const members = useGroupMembers(group.id);
  const assignments = useAssignments(group.id, true, 'given');

  const loading = members.loading || assignments.loading;
  const error = members.error || assignments.error;

  const items = useMemo(
    () => deriveAttentionItems(members.members, assignments.assignments),
    [members.members, assignments.assignments],
  );

  const top = items[0];

  const thisWeek = useMemo<{
    key: string;
    deckId: string;
    title: string;
    days: number;
  } | null>(() => {
    const batches = groupAssignments(assignments.assignments).filter(
      (b) => b.sample.deck_id && b.deckName && b.dueDate && b.completed < b.total,
    );
    let soonest: { key: string; deckId: string; title: string; days: number } | null = null;
    for (const batch of batches) {
      const days = daysUntilDue(batch.dueDate as string);
      if (days < 0 || days > THIS_WEEK_DAYS) continue;
      if (!soonest || days < soonest.days) {
        soonest = {
          key: batch.key,
          deckId: batch.sample.deck_id as string,
          title: batch.deckName ?? '',
          days,
        };
      }
    }
    // Already in the headline above — skip it to avoid naming the same handout twice.
    if (soonest && top?.kind === 'assignmentDue' && top.batchKey === soonest.key) return null;
    return soonest;
  }, [assignments.assignments, top]);

  const hasAttention = !loading && !error ? items.length > 0 : null;

  useEffect(() => {
    onAttention?.(group.id, hasAttention);
  }, [onAttention, group.id, hasAttention]);

  if (loading) {
    return (
      <Box sx={{ py: 1.25 }}>
        <Skeleton variant="rounded" height={48} sx={{ borderRadius: theme.radii.sm }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ py: 1.25, display: 'flex', alignItems: 'center', gap: 1.5, minHeight: 48 }}>
        <Typography aria-hidden sx={{ fontSize: '1.3rem' }}>
          {group.emoji || '🏫'}
        </Typography>
        <Typography sx={{ fontSize: '0.82rem', color: 'text.secondary' }}>
          {t('rowError', { name: group.name })}
        </Typography>
      </Box>
    );
  }

  if (compact) {
    return (
      <Box
        component={Link}
        href={`/group/${encodeURIComponent(group.id)}`}
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.75,
          minHeight: 48,
          px: 1.5,
          borderRadius: theme.radii.pill,
          border: `1px solid ${alpha(brand[300], 0.4)}`,
          bgcolor: alpha(brand[50], 0.7),
          textDecoration: 'none',
          color: 'text.primary',
          fontWeight: 600,
          fontSize: '0.82rem',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          '&:hover': { transform: 'translateY(-2px)' },
          '&:focus-visible': {
            outline: `2px solid ${brand[500]}`,
            outlineOffset: 2,
          },
        }}
      >
        <span aria-hidden>{group.emoji || '🏫'}</span>
        {group.name}
      </Box>
    );
  }

  const extraCount = items.length - 1;
  const { headline } = top ? attentionItemText(top, tAttention, tTime) : { headline: '' };

  return (
    <Box sx={{ py: 0.75 }}>
      <Box
        component={Link}
        href={`/group/${encodeURIComponent(group.id)}`}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          minHeight: 48,
          borderRadius: theme.radii.sm,
          px: 1,
          mx: -1,
          textDecoration: 'none',
          color: 'inherit',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease',
          '&:hover': {
            transform: 'translateY(-2px)',
            bgcolor: alpha(brand[50], 0.7),
          },
          '&:focus-visible': {
            outline: `2px solid ${brand[500]}`,
            outlineOffset: 2,
          },
        }}
      >
        <Typography aria-hidden sx={{ fontSize: '1.3rem', flexShrink: 0 }}>
          {group.emoji || '🏫'}
        </Typography>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography
            sx={{
              fontWeight: 700,
              fontSize: '0.88rem',
              color: 'text.primary',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {group.name}
          </Typography>
          <Typography
            sx={{
              fontSize: '0.78rem',
              color: 'text.secondary',
              mt: 0.25,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {headline || t('rowQuiet')}
          </Typography>
        </Box>
        {extraCount > 0 && (
          <StatPill>
            <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: brand[700] }}>
              {t('moreCount', { count: extraCount })}
            </Typography>
          </StatPill>
        )}
      </Box>

      {thisWeek && (
        <Box
          component={Link}
          href={handoutPagePath(group.id, thisWeek.deckId)}
          sx={{
            fontSize: '0.76rem',
            color: 'text.secondary',
            mt: 0.5,
            ml: 4.5,
            minHeight: 48,
            display: 'flex',
            alignItems: 'center',
            borderRadius: theme.radii.sm,
            px: 0.5,
            mx: -0.5,
            textDecoration: 'none',
            transition: 'background-color 0.2s ease',
            '&:hover': { bgcolor: alpha(brand[50], 0.6), color: 'text.primary' },
            '&:focus-visible': {
              outline: `2px solid ${brand[500]}`,
              outlineOffset: 2,
            },
          }}
        >
          {t('thisWeek', { title: thisWeek.title })}
        </Box>
      )}
    </Box>
  );
}
