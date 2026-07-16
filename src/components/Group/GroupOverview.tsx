'use client';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import GroupsIcon from '@mui/icons-material/Groups';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import SchoolIcon from '@mui/icons-material/School';
import Box from '@mui/material/Box';
import { useTranslations } from 'next-intl';

import { StatCard } from '@/components/Stats/StatCard';
import type { GroupMember } from '@/hooks/useGroup';

interface GroupOverviewProps {
  members: GroupMember[];
}

export function GroupOverview({ members }: GroupOverviewProps) {
  const t = useTranslations('Group.overview');
  const totalXp = members.reduce((sum, m) => sum + m.totalXp, 0);
  const now = Date.now();
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
  const activeLearners = members.filter(
    (m) => m.lastActive && new Date(m.lastActive).getTime() > sevenDaysAgo,
  ).length;
  const longestStreak = Math.max(0, ...members.map((m) => m.streakDays));
  const weeklyCards = members.reduce((sum, m) => sum + m.totalCardsStudied, 0);

  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
      <StatCard
        icon={<GroupsIcon sx={{ fontSize: 18 }} />}
        label={t('membersLabel')}
        value={members.length}
        sub={t('activeThisWeek', { count: activeLearners })}
      />
      <StatCard
        icon={<EmojiEventsIcon sx={{ fontSize: 18 }} />}
        label={t('totalGroupXpLabel')}
        value={totalXp.toLocaleString()}
      />
      <StatCard
        icon={<LocalFireDepartmentIcon sx={{ fontSize: 18 }} />}
        label={t('bestStreakLabel')}
        value={`${longestStreak}d`}
        sub={t('longestStreakSub')}
      />
      <StatCard
        icon={<SchoolIcon sx={{ fontSize: 18 }} />}
        label={t('cardsStudiedLabel')}
        value={weeklyCards.toLocaleString()}
        sub={t('allTimeAcrossGroupSub')}
      />
    </Box>
  );
}
