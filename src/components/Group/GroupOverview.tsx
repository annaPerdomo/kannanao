'use client';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import GroupsIcon from '@mui/icons-material/Groups';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import SchoolIcon from '@mui/icons-material/School';
import Box from '@mui/material/Box';

import { StatCard } from '@/components/Stats/StatCard';
import type { GroupMember } from '@/hooks/useGroup';

interface GroupOverviewProps {
  members: GroupMember[];
}

export function GroupOverview({ members }: GroupOverviewProps) {
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
        label="Members"
        value={members.length}
        sub={`${activeLearners} active this week`}
      />
      <StatCard
        icon={<EmojiEventsIcon sx={{ fontSize: 18 }} />}
        label="Total Group XP"
        value={totalXp.toLocaleString()}
      />
      <StatCard
        icon={<LocalFireDepartmentIcon sx={{ fontSize: 18 }} />}
        label="Best Streak"
        value={`${longestStreak}d`}
        sub="Longest active streak"
      />
      <StatCard
        icon={<SchoolIcon sx={{ fontSize: 18 }} />}
        label="Cards Studied"
        value={weeklyCards.toLocaleString()}
        sub="All time across group"
      />
    </Box>
  );
}
