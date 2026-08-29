'use client';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';

import type { GroupMember } from '@/hooks/useGroup';
import type { LeaderboardEntry } from '@/hooks/useGroupLeaderboard';
import type { DataError } from '@/lib/dataError';

import { GroupEncouragementForm } from '../GroupEncouragementForm';
import { LeaderboardPanel } from '../LeaderboardPanel';
import { LearnersTable } from '../LearnersTable';
import { daysSinceActive, STALE_DAYS } from '../memberActivity';
import { SectionCard } from '../SectionCard';

interface LearnersTabProps {
  members: GroupMember[];
  leaderboard: LeaderboardEntry[];
  leaderboardLoading: boolean;
  leaderboardError?: DataError | null;
  leaderboardVisible: boolean;
  onLeaderboardVisibilityChange: (visible: boolean) => void;
  onSelectMember: (id: string) => void;
  onSendEncouragement: (memberId: string, message: string, emoji?: string) => Promise<unknown>;
}

export function LearnersTab({
  members,
  leaderboard,
  leaderboardLoading,
  leaderboardError,
  leaderboardVisible,
  onLeaderboardVisibilityChange,
  onSelectMember,
  onSendEncouragement,
}: LearnersTabProps) {
  const t = useTranslations('Group.groupPage');
  const tl = useTranslations('Group.learnersTable');
  const staleCount = members.filter((m) => daysSinceActive(m.lastActive) >= STALE_DAYS).length;

  return (
    <Stack spacing={2.5}>
      {members.length > 0 && (
        <Typography sx={{ fontSize: '0.82rem', color: 'text.secondary' }}>
          {staleCount > 0 ? tl('staleSummary', { count: staleCount }) : tl('allCaughtUp')}
        </Typography>
      )}
      <LearnersTable members={members} onSelectMember={onSelectMember} />
      <LeaderboardPanel
        entries={leaderboard}
        loading={leaderboardLoading}
        error={leaderboardError}
        visible={leaderboardVisible}
        onVisibilityChange={onLeaderboardVisibilityChange}
      />
      <SectionCard title={t('encouragementHeading')}>
        <GroupEncouragementForm members={members} onSend={onSendEncouragement} />
      </SectionCard>
    </Stack>
  );
}
