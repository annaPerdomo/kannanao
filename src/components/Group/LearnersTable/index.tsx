'use client';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

import type { GroupMember } from '@/hooks/useGroup';

import { SectionCard } from '../SectionCard';
import type { SortDirection, SortKey } from './derive';
import { DEFAULT_SORT_DIRECTION, DEFAULT_SORT_KEY, sortLearners } from './derive';
import { DesktopTable } from './DesktopTable';
import { MobileList } from './MobileList';

interface LearnersTableProps {
  members: GroupMember[];
  onSelectMember: (id: string) => void;
}

export function LearnersTable({ members, onSelectMember }: LearnersTableProps) {
  const t = useTranslations('Group.learnersTable');
  const [sortKey, setSortKey] = useState<SortKey>(DEFAULT_SORT_KEY);
  const [direction, setDirection] = useState<SortDirection>(DEFAULT_SORT_DIRECTION);

  const sorted = useMemo(
    () => sortLearners(members, sortKey, direction),
    [members, sortKey, direction],
  );

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setDirection('desc');
    }
  };

  return (
    <SectionCard title={t('heading')}>
      {members.length === 0 ? (
        <Box sx={{ py: 3, textAlign: 'center' }}>
          <Typography sx={{ fontSize: '2rem', mb: 1 }}>👋</Typography>
          <Typography sx={{ fontWeight: 700, color: 'text.primary', mb: 0.5 }}>
            {t('emptyTitle')}
          </Typography>
          <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
            {t('emptyBody')}
          </Typography>
        </Box>
      ) : (
        <>
          <DesktopTable
            members={sorted}
            sortKey={sortKey}
            direction={direction}
            onSort={handleSort}
            onSelect={onSelectMember}
          />
          <MobileList members={sorted} onSelect={onSelectMember} />
        </>
      )}
    </SectionCard>
  );
}
