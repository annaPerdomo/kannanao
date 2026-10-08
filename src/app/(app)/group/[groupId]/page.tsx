'use client';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';

import { DataErrorState, StaleDataHint } from '@/components/DataErrorState';
import {
  DEFAULT_TAB,
  GroupDashboardDialogs,
  GroupDashboardHeader,
  type GroupDashboardTab,
  isExpired,
  resolveDashboardTab,
  TabBar,
  TabContent,
  useAssignDialog,
} from '@/components/Group';
import { Loading } from '@/components/Loading';
import { useAuth } from '@/contexts/AuthContext';
import { useAssignments } from '@/hooks/useAssignments';
import { useDecks } from '@/hooks/useDecks';
import { useDifficultWords } from '@/hooks/useDifficultWords';
import { useEncouragements } from '@/hooks/useEncouragements';
import { useGroupFeed, useGroupMembers } from '@/hooks/useGroup';
import { useGroupActivity } from '@/hooks/useGroupActivity';
import { useGroupLeaderboard } from '@/hooks/useGroupLeaderboard';
import { useGroups } from '@/hooks/useGroups';
import { type InviteCode, useInvites } from '@/hooks/useInvites';
import { LESSON_LIBRARY_CACHE_PREFIX, useLessonLibrary } from '@/hooks/useLessonLibrary';
import { invalidateApiCache } from '@/lib/apiCache';
import { LAYOUT } from '@/theme';

/** Two weeks of columns in the daily chart; its last week fills the heatmap. */
const ACTIVITY_DAYS = 14;

export default function GroupDashboardPage() {
  const t = useTranslations('Group.groupPage');
  const router = useRouter();
  const params = useParams<{ groupId: string }>();
  const searchParams = useSearchParams();
  const groupId = params?.groupId ?? '';
  const { isMemberAccount, displayName, user, loading: authLoading } = useAuth();

  const { members, loading, error, errorMessage, stale } = useGroupMembers(groupId);
  const { leaderboard, loading: lbLoading, error: leaderboardError } = useGroupLeaderboard(groupId);
  const { feed, loading: feedLoading, error: feedError } = useGroupFeed(groupId);
  const {
    activity,
    loading: activityLoading,
    errorMessage: activityError,
  } = useGroupActivity(groupId, ACTIVITY_DAYS);
  const { decks } = useDecks();
  const {
    assignments,
    loading: assignmentsLoading,
    errorMessage: assignmentsError,
    createAssignment,
    updateAssignments,
    deleteAssignments,
    refetch: refetchAssignments,
  } = useAssignments(groupId, true, 'given');
  const library = useLessonLibrary(groupId);
  // All decks, matching the Words tab's default filter — the api cache serves
  // both from one request.
  const {
    data: difficultWords,
    loading: difficultWordsLoading,
    errorMessage: difficultWordsError,
  } = useDifficultWords(groupId);
  const { sendEncouragement } = useEncouragements();
  const { invites, createInvite, revokeInvite } = useInvites(groupId);
  const { groups, updateGroup } = useGroups();
  const group = groups.find((g) => g.id === groupId);
  const ownDecks = decks.filter((d) => !d.isShared);

  const assignDialog = useAssignDialog();
  const [createInviteOpen, setCreateInviteOpen] = useState(false);
  const [qrInvite, setQrInvite] = useState<InviteCode | null>(null);

  const tabParam = searchParams?.get('tab') ?? null;
  const tab: GroupDashboardTab = resolveDashboardTab(tabParam);

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

  const handleViewPlan = useCallback(() => handleTabChange('plan'), [handleTabChange]);

  const handleBuild = useCallback(() => {
    router.push(`/materials?group=${groupId}&tab=lessonSet`);
  }, [router, groupId]);

  // The Lesson Library and the assignments list read overlapping handout data
  // from separate caches, so a change on either side has to refresh the other.
  const libraryRefetch = library.refetch;
  const handleCreateAssignment = useCallback(
    async (opts: Parameters<typeof createAssignment>[0]) => {
      const result = await createAssignment(opts);
      invalidateApiCache(LESSON_LIBRARY_CACHE_PREFIX);
      await libraryRefetch();
      return result;
    },
    [createAssignment, libraryRefetch],
  );

  const handleLibraryChanged = useCallback(() => {
    void refetchAssignments();
  }, [refetchAssignments]);

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

  // Not bare `error`: apiCache still holds the last good roster through an outage.
  if (error && members.length === 0) {
    return (
      <Box
        sx={{ maxWidth: LAYOUT.contentMaxWidth, mx: 'auto', px: LAYOUT.pagePx, py: LAYOUT.pagePy }}
      >
        <DataErrorState error={error} />
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
        onOpenMaterials={handleViewPlan}
        activeInviteCount={activeInvites.length}
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errorMessage}
        </Alert>
      )}

      <StaleDataHint show={stale && !error} />

      <TabBar value={tab} onChange={handleTabChange} />

      <TabContent
        tab={tab}
        groupId={groupId}
        library={library}
        members={members}
        activity={activity}
        activityLoading={activityLoading}
        activityError={activityError}
        words={difficultWords?.words}
        wordsLoading={difficultWordsLoading}
        wordsError={difficultWordsError}
        assignments={assignments}
        assignmentsLoading={assignmentsLoading}
        assignmentsError={assignmentsError}
        ownDecks={ownDecks}
        canAssign={members.length > 0}
        onNavigateTab={handleTabChange}
        onViewPlan={handleViewPlan}
        onAssignDeck={(deckId) => assignDialog.openAssign({ deckId })}
        feed={feed}
        feedLoading={feedLoading}
        feedError={feedError}
        leaderboard={leaderboard}
        leaderboardLoading={lbLoading}
        leaderboardError={leaderboardError}
        leaderboardVisible={leaderboardVisible}
        onLeaderboardVisibilityChange={handleLeaderboardVisibilityChange}
        onSelectMember={(id) => router.push(`/group/${groupId}/members/${id}`)}
        onSendEncouragement={handleSendEncouragement}
        onEditAssignments={updateAssignments}
        onDeleteAssignments={deleteAssignments}
        onAssign={() => assignDialog.openAssign()}
        onAssignMissing={assignDialog.assignMissing}
        onBuild={handleBuild}
        onLibraryChanged={handleLibraryChanged}
      />

      <GroupDashboardDialogs
        assignDialog={assignDialog}
        members={members}
        ownDecks={ownDecks}
        onCreateAssignment={handleCreateAssignment}
        createInviteOpen={createInviteOpen}
        onCloseCreateInvite={() => setCreateInviteOpen(false)}
        onCreateInvite={createInvite}
        invites={invites}
        onRevokeInvite={revokeInvite}
        qrInvite={qrInvite}
        onCreatedInvite={(invite) => {
          setCreateInviteOpen(false);
          setQrInvite(invite);
        }}
        onShowQr={(invite) => setQrInvite(invite)}
        onCloseQr={() => setQrInvite(null)}
        organizerName={displayName ?? user?.email?.split('@')[0] ?? ''}
      />
    </Box>
  );
}
