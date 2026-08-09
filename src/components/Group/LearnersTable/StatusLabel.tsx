'use client';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';

import type { GroupMember } from '@/hooks/useGroup';

import { learnerStatus } from './derive';

interface StatusLabelProps {
  member: GroupMember;
}

export function StatusLabel({ member }: StatusLabelProps) {
  const t = useTranslations('Group.learnersTable');
  const status = learnerStatus(member.lastActive);

  const label =
    status.kind === 'activeToday'
      ? t('activeToday')
      : status.kind === 'activeRecently'
        ? t('activeDaysAgo', { days: status.days })
        : status.kind === 'inactive'
          ? t('inactiveDays', { days: status.days })
          : t('neverStarted');

  const color =
    status.kind === 'activeToday'
      ? 'success.main'
      : status.kind === 'inactive'
        ? 'warning.main'
        : 'text.secondary';

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
      {status.kind === 'activeToday' && (
        <Box
          sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'success.main', flexShrink: 0 }}
        />
      )}
      <Typography sx={{ fontSize: '0.85rem', fontWeight: 600, color }} noWrap>
        {label}
      </Typography>
    </Box>
  );
}
