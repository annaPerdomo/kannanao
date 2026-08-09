'use client';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';

import type { GroupMember } from '@/hooks/useGroup';

import { streakLabel } from './format';

interface StreakCellProps {
  member: GroupMember;
}

export function StreakCell({ member }: StreakCellProps) {
  const t = useTranslations('Group.learnersTable');
  return (
    <Typography sx={{ fontSize: '0.85rem', color: 'text.primary' }}>
      {streakLabel(member, t)}
    </Typography>
  );
}
