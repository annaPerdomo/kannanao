'use client';
import AddIcon from '@mui/icons-material/Add';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import { useTheme } from '@mui/material/styles';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';

import {
  ActivityFeed,
  AssignmentsList,
  CreateAssignmentDialog,
  CreateInviteDialog,
  DailyActivityChart,
  GroupDashboardHeader,
  GroupEncouragementForm,
  GroupOverview,
  InviteQRCode,
  isExpired,
  LeaderboardPanel,
  MembersPanel,
  QuizScoresPanel,
  ReteachPanel,
  SectionCard,
  ShowMoreButton,
  StudyHeatmap,
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

const ASSIGNMENTS_SHOWN = 5;
const LEADERBOARD_SHOWN = 10;
const FEED_SHOWN = 6;

/** Two weeks of columns in the daily chart; its last week fills the heatmap. */
const ACTIVITY_DAYS = 14;
const HEATMAP_DAYS = 7;

export default function GroupDashboardPage() {
  const t = useTranslations('Group.groupPage');
  const tc = useTranslations('Group.charts');
  const theme = useTheme();
  const { brand } = theme.palette;
  const router = useRouter();
  const params = useParams<{ groupId: string }>();
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
  const { assignments, createAssignment, updateAssignments, deleteAssignments } = useAssignments(
    groupId,
    true,
    'given',
  );
  const { sendEncouragement } = useEncouragements();
  const { invites, createInvite, revokeInvite } = useInvites(groupId);
  const { groups, updateGroup } = useGroups();
  const group = groups.find((g) => g.id === groupId);
  const ownDecks = decks.filter((d) => !d.isShared);

  const [assignOpen, setAssignOpen] = useState(false);
  const [createInviteOpen, setCreateInviteOpen] = useState(false);
  const [qrInvite, setQrInvite] = useState<InviteCode | null>(null);
  const [allFeed, setAllFeed] = useState(false);

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

  // Redirect members away
  if (!authLoading && isMemberAccount) {
    router.push('/');
    return null;
  }

  if (loading || authLoading) {
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
  const visibleFeed = allFeed ? feed : feed.slice(0, FEED_SHOWN);
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
        onAssign={members.length > 0 ? () => setAssignOpen(true) : undefined}
        activeInviteCount={activeInvites.length}
      />

      <GroupOverview members={members} />

      <Grid container spacing={2.5} alignItems="stretch">
        <Grid size={{ xs: 12, lg: 8 }}>
          <SectionCard title={tc('dailyHeading')}>
            {activityError ? (
              <Alert severity="error">{activityError}</Alert>
            ) : activityLoading && !activity ? (
              <Loading message={tc('loading')} />
            ) : (
              <DailyActivityChart
                days={activity?.days ?? []}
                values={activity?.totals.cards ?? []}
              />
            )}
          </SectionCard>
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }}>
          <SectionCard title={tc('heatmapHeading')}>
            {activityError ? (
              <Alert severity="error">{activityError}</Alert>
            ) : activityLoading && !activity ? (
              <Loading message={tc('loading')} />
            ) : (
              <StudyHeatmap
                days={(activity?.days ?? []).slice(-HEATMAP_DAYS)}
                members={activity?.members ?? []}
                offset={Math.max(0, (activity?.days.length ?? 0) - HEATMAP_DAYS)}
              />
            )}
          </SectionCard>
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }}>
          <MembersPanel
            members={members}
            onSelect={(id) => router.push(`/group/${groupId}/members/${id}`)}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 6, lg: 4 }}>
          <LeaderboardPanel
            entries={leaderboard}
            loading={lbLoading}
            visible={leaderboardVisible}
            onVisibilityChange={(show) => updateGroup(groupId, { show_leaderboard: show })}
            maxVisible={LEADERBOARD_SHOWN}
          />
        </Grid>

        {members.length > 0 && ownDecks.length > 0 && (
          <Grid size={{ xs: 12, md: 6, lg: 4 }}>
            <QuizScoresPanel decks={ownDecks} groupId={groupId} />
          </Grid>
        )}

        {members.length > 0 && ownDecks.length > 0 && (
          <Grid size={{ xs: 12, md: 6, lg: 4 }}>
            <ReteachPanel decks={ownDecks} />
          </Grid>
        )}

        <Grid size={{ xs: 12, md: 6, lg: 4 }}>
          <SectionCard
            title={t('assignmentsHeading')}
            action={
              members.length > 0 && (
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  <Button
                    size="small"
                    startIcon={<AutoAwesomeIcon sx={{ fontSize: 16 }} />}
                    onClick={() => router.push(`/group/${groupId}/build`)}
                    sx={{
                      textTransform: 'none',
                      fontWeight: 700,
                      color: brand[700],
                      borderRadius: theme.radii.sm,
                    }}
                  >
                    {t('buildLessonButton')}
                  </Button>
                  <Button
                    size="small"
                    startIcon={<AddIcon sx={{ fontSize: 16 }} />}
                    onClick={() => setAssignOpen(true)}
                    sx={{
                      textTransform: 'none',
                      fontWeight: 700,
                      color: brand[700],
                      borderRadius: theme.radii.sm,
                    }}
                  >
                    {t('newButton')}
                  </Button>
                </Box>
              )
            }
          >
            <AssignmentsList
              assignments={assignments}
              onEditBatch={updateAssignments}
              onDeleteBatch={deleteAssignments}
              maxVisible={ASSIGNMENTS_SHOWN}
            />
          </SectionCard>
        </Grid>

        {members.length > 0 && (
          <Grid size={{ xs: 12, md: 6, lg: 4 }}>
            <SectionCard title={t('encouragementHeading')}>
              <GroupEncouragementForm members={members} onSend={handleSendEncouragement} />
            </SectionCard>
          </Grid>
        )}

        <Grid size={12}>
          <SectionCard title={t('recentActivityHeading')}>
            {feedLoading ? (
              <Loading message={t('loadingActivity')} />
            ) : (
              <>
                <ActivityFeed items={visibleFeed} />
                {feed.length > FEED_SHOWN && (
                  <ShowMoreButton
                    expanded={allFeed}
                    total={feed.length}
                    onClick={() => setAllFeed((v) => !v)}
                  />
                )}
              </>
            )}
          </SectionCard>
        </Grid>
      </Grid>

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
