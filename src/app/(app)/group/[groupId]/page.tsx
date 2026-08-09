'use client';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';

import {
  ActivityTab,
  AssignmentsTab,
  CreateAssignmentDialog,
  CreateInviteDialog,
  GroupDashboardHeader,
  type GroupDashboardTab,
  GroupOverview,
  InviteQRCode,
  isExpired,
  isGroupDashboardTab,
  LearnersTab,
  NeedsAttention,
  OverviewTab,
  TabBar,
  WordsTab,
} from '@/components/Group';
import { Loading } from '@/components/Loading';
import { useAuth } from '@/contexts/AuthContext';
import { useAssignments } from '@/hooks/useAssignments';
import { useDecks } from '@/hooks/useDecks';
import { useEncouragements } from '@/hooks/useEncouragements';
import { useGroupFeed, useGroupMembers } from '@/hooks/useGroup';
import { useGroupActivity } from '@/hooks/useGroupActivity';
import { useGroupLeaderboard } from '@/hooks/useGroupLeaderboard';
import { useGroups } from '@/hooks/useGroups';
import type { InviteCode } from '@/hooks/useInvites';
import { useInvites } from '@/hooks/useInvites';
import { LAYOUT } from '@/theme';

/** Two weeks of columns in the daily chart; its last week fills the heatmap. */
const ACTIVITY_DAYS = 14;
const DEFAULT_TAB: GroupDashboardTab = 'overview';

export default function GroupDashboardPage() {
  const t = useTranslations('Group.groupPage');
  const router = useRouter();
  const params = useParams<{ groupId: string }>();
  const searchParams = useSearchParams();
  const groupId = params?.groupId ?? '';
  const { isMemberAccount, displayName, user, loading: authLoading } = useAuth();

  const { members, loading, error } = useGroupMembers(groupId);
  const { leaderboard, loading: lbLoading } = useGroupLeaderboard(groupId);
  const { feed, loading: feedLoading } = useGroupFeed(groupId);
  const {
    activity,
    loading: activityLoading,
    error: activityError,
  } = useGroupActivity(groupId, ACTIVITY_DAYS);
  const { decks } = useDecks();
  const {
    assignments,
    loading: assignmentsLoading,
    error: assignmentsError,
    createAssignment,
    updateAssignments,
    deleteAssignments,
  } = useAssignments(groupId, true, 'given');
  const { sendEncouragement } = useEncouragements();
  const { invites, createInvite, revokeInvite } = useInvites(groupId);
  const { groups, updateGroup } = useGroups();
  const group = groups.find((g) => g.id === groupId);
  const ownDecks = decks.filter((d) => !d.isShared);

  const [assignOpen, setAssignOpen] = useState(false);
  const [createInviteOpen, setCreateInviteOpen] = useState(false);
  const [qrInvite, setQrInvite] = useState<InviteCode | null>(null);

  const tabParam = searchParams?.get('tab') ?? null;
  const tab: GroupDashboardTab = isGroupDashboardTab(tabParam) ? tabParam : DEFAULT_TAB;

  const handleTabChange = useCallback(
    (next: GroupDashboardTab) => {
      const query = new URLSearchParams(searchParams?.toString());
      if (next === DEFAULT_TAB) {
        query.delete('tab');
      } else {
        query.set('tab', next);
      }
      const qs = query.toString();
      router.replace(`/group/${groupId}${qs ? `?${qs}` : ''}`, { scroll: false });
    },
    [router, groupId, searchParams],
  );

  const handleSendEncouragement = useCallback(
    async (memberId: string, message: string, emoji?: string) => {
      return sendEncouragement(memberId, message, emoji);
    },
    [sendEncouragement],
  );

  const handleRename = useCallback(
    async (name: string) => {
      await updateGroup(groupId, { name });
    },
    [updateGroup, groupId],
  );

  const handleEmojiChange = useCallback(
    (emoji: string) => {
      void updateGroup(groupId, { emoji });
    },
    [updateGroup, groupId],
  );

  const handleLeaderboardVisibilityChange = useCallback(
    (visible: boolean) => {
      void updateGroup(groupId, { show_leaderboard: visible });
    },
    [updateGroup, groupId],
  );

  useEffect(() => {
    if (!authLoading && isMemberAccount) {
      router.push('/');
    }
  }, [authLoading, isMemberAccount, router]);

  if (loading || authLoading || isMemberAccount) {
    return (
      <Box
        sx={{
          maxWidth: LAYOUT.contentMaxWidth,
          mx: 'auto',
          px: LAYOUT.pagePx,
          py: { xs: 3, sm: 6 },
        }}
      >
        <Loading message={t('loadingDashboard')} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box
        sx={{ maxWidth: LAYOUT.contentMaxWidth, mx: 'auto', px: LAYOUT.pagePx, py: LAYOUT.pagePy }}
      >
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  const leaderboardVisible = group?.show_leaderboard !== false;
  const activeInvites = invites.filter((i) => !isExpired(i));

  return (
    <Box
      sx={{
        maxWidth: LAYOUT.contentMaxWidth,
        mx: 'auto',
        px: LAYOUT.pagePx,
        py: { xs: 3, sm: 5 },
      }}
    >
      <GroupDashboardHeader
        group={group}
        memberCount={members.length}
        onBack={() => router.push('/group')}
        onRename={handleRename}
        onEmojiChange={handleEmojiChange}
        onInvite={() => setCreateInviteOpen(true)}
        onOpenMaterials={() => router.push(`/materials?group=${groupId}`)}
        activeInviteCount={activeInvites.length}
      />

      <Box sx={{ mb: { xs: 2.5, sm: 3 } }}>
        <NeedsAttention
          groupId={groupId}
          members={members}
          assignments={assignments}
          assignmentsLoading={assignmentsLoading}
          assignmentsError={assignmentsError}
          onSelectMember={(id) => router.push(`/group/${groupId}/members/${id}`)}
          onViewAssignments={() => handleTabChange('assignments')}
          onViewLearners={() => handleTabChange('learners')}
          onSendEncouragement={handleSendEncouragement}
        />
      </Box>

      <GroupOverview members={members} />

      <TabBar value={tab} onChange={handleTabChange} />

      {tab === 'overview' && (
        <OverviewTab
          activity={activity}
          activityLoading={activityLoading}
          activityError={activityError}
          assignments={assignments}
          onEditAssignments={updateAssignments}
          onDeleteAssignments={deleteAssignments}
          feed={feed}
          feedLoading={feedLoading}
          leaderboard={leaderboard}
          leaderboardLoading={lbLoading}
          leaderboardVisible={leaderboardVisible}
          onLeaderboardVisibilityChange={handleLeaderboardVisibilityChange}
          onNavigateTab={handleTabChange}
        />
      )}

      {tab === 'learners' && (
        <LearnersTab
          members={members}
          onSelectMember={(id) => router.push(`/group/${groupId}/members/${id}`)}
          onSendEncouragement={handleSendEncouragement}
        />
      )}

      {tab === 'assignments' && (
        <AssignmentsTab
          assignments={assignments}
          onEditAssignments={updateAssignments}
          onDeleteAssignments={deleteAssignments}
          canAssign={members.length > 0}
          onAssign={() => setAssignOpen(true)}
          ownDecks={ownDecks}
          groupId={groupId}
          onSendEncouragement={handleSendEncouragement}
        />
      )}

      {tab === 'words' && <WordsTab ownDecks={ownDecks} />}

      {tab === 'activity' && (
        <ActivityTab
          feed={feed}
          feedLoading={feedLoading}
          activity={activity}
          activityLoading={activityLoading}
          activityError={activityError}
        />
      )}

      <CreateAssignmentDialog
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        members={members}
        decks={ownDecks}
        onCreate={createAssignment}
      />

      <CreateInviteDialog
        open={createInviteOpen}
        onClose={() => setCreateInviteOpen(false)}
        onCreate={createInvite}
        onCreated={(invite) => {
          setCreateInviteOpen(false);
          setQrInvite(invite);
        }}
        invites={invites}
        onRevoke={revokeInvite}
        onShowQR={(invite) => setQrInvite(invite)}
      />

      {qrInvite && (
        <InviteQRCode
          open={Boolean(qrInvite)}
          onClose={() => setQrInvite(null)}
          code={qrInvite.code}
          label={qrInvite.label}
          organizerName={displayName ?? user?.email?.split('@')[0] ?? ''}
        />
      )}
    </Box>
  );
}
