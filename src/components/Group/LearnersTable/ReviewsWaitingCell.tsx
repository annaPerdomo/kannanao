'use client';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';

import type { GroupMember } from '@/hooks/useGroup';

import { REVIEW_BACKLOG_THRESHOLD } from '../reviewBacklog';
import { reviewsWaitingLabel } from './format';

interface ReviewsWaitingCellProps {
  member: GroupMember;
}

export function ReviewsWaitingCell({ member }: ReviewsWaitingCellProps) {
  const t = useTranslations('Group.learnersTable');
  const waiting = member.reviewsWaiting;
  const behind = waiting !== null && waiting >= REVIEW_BACKLOG_THRESHOLD;

  return (
    <Typography
      sx={{
        fontSize: '0.85rem',
        color: waiting ? 'text.primary' : 'text.secondary',
        fontWeight: behind ? 700 : 400,
      }}
    >
      {reviewsWaitingLabel(member, t)}
    </Typography>
  );
}
