'use client';
import AssignmentIcon from '@mui/icons-material/Assignment';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import {
  ActivityFeed,
  AssignmentsList,
  CreateAssignmentDialog,
  CreateInviteDialog,
  GroupEncouragementForm,
  GroupOverview,
  InviteList,
  InviteQRCode,
  LeaderboardWidget,
  MemberCard,
} from '@/components/Group';
import { Loading } from '@/components/Loading';
import { PageHeader } from '@/components/PageHeader';
import { useAuth } from '@/contexts/AuthContext';
import { useAssignments } from '@/hooks/useAssignments';
import { useDecks } from '@/hooks/useDecks';
import { useEncouragements } from '@/hooks/useEncouragements';
import { useGroupFeed, useGroupMembers } from '@/hooks/useGroup';
import { useGroupLeaderboard } from '@/hooks/useGroupLeaderboard';
import type { InviteCode } from '@/hooks/useInvites';
import { useInvites } from '@/hooks/useInvites';
import { LAYOUT } from '@/theme';

export default function GroupPage() {
  const theme = useTheme();
  const { brand } = theme.palette;
  const router = useRouter();
  const { isMemberAccount, showLeaderboard, displayName, user, loading: authLoading } = useAuth();

  const { members, loading, error } = useGroupMembers();
  const { leaderboard, loading: lbLoading } = useGroupLeaderboard();
  const { feed, loading: feedLoading } = useGroupFeed();
  const { decks } = useDecks();
  const { assignments, createAssignment, updateAssignment, deleteAssignment } = useAssignments();
  const { sendEncouragement } = useEncouragements();
  const { invites, createInvite, revokeInvite } = useInvites();

  const [assignOpen, setAssignOpen] = useState(false);
  const [createInviteOpen, setCreateInviteOpen] = useState(false);
  const [qrInvite, setQrInvite] = useState<InviteCode | null>(null);

  // Redirect members away
  if (!authLoading && isMemberAccount) {
    router.push('/');
    return null;
  }

  if (loading || authLoading) {
    return (
      <Box sx={{ maxWidth: LAYOUT.contentMaxWidth, mx: 'auto', px: LAYOUT.pagePx, py: 6 }}>
        <Loading message="Loading group dashboard..." />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ maxWidth: LAYOUT.contentMaxWidth, mx: 'auto', px: LAYOUT.pagePx, py: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        maxWidth: LAYOUT.contentMaxWidth,
        mx: 'auto',
        px: LAYOUT.pagePx,
        py: { xs: 3, sm: 5 },
      }}
    >
      <Box sx={{ maxWidth: LAYOUT.headerMaxWidth, mx: 'auto' }}>
        <PageHeader
          emoji="👥"
          title="Group Dashboard"
          subtitle={`${members.length} member${members.length !== 1 ? 's' : ''} in your study group`}
          onBack={() => router.push('/')}
          action={
            <Stack direction="row" gap={1}>
              <Button
                variant="outlined"
                size="small"
                startIcon={<QrCode2Icon sx={{ fontSize: 16 }} />}
                onClick={() => setCreateInviteOpen(true)}
                sx={{
                  borderRadius: 2.5,
                  textTransform: 'none',
                  fontWeight: 700,
                  borderColor: alpha(brand[400], 0.5),
                  color: brand[700],
                }}
              >
                Invite
              </Button>
              {members.length > 0 && (
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<AssignmentIcon sx={{ fontSize: 16 }} />}
                  onClick={() => setAssignOpen(true)}
                  sx={{
                    borderRadius: 2.5,
                    textTransform: 'none',
                    fontWeight: 700,
                    borderColor: alpha(brand[400], 0.5),
                    color: brand[700],
                  }}
                >
                  Assign Deck
                </Button>
              )}
            </Stack>
          }
        />
      </Box>

      {/* Overview stat cards */}
      <GroupOverview members={members} />

      {/* Members + Leaderboard side by side */}
      <Grid container spacing={3}>
        {/* Members grid */}
        <Grid size={{ xs: 12, md: showLeaderboard ? 8 : 12 }}>
          <Typography
            sx={{
              fontWeight: 800,
              fontSize: '0.85rem',
              color: brand[700],
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              mb: 1.5,
            }}
          >
            Members
          </Typography>
          {members.length === 0 ? (
            <Paper
              elevation={0}
              sx={{
                p: 4,
                textAlign: 'center',
                border: `1.5px dashed ${alpha(brand[300], 0.4)}`,
                borderRadius: 3,
                bgcolor: alpha(brand[50], 0.6),
              }}
            >
              <Typography sx={{ fontSize: '2.5rem', mb: 1 }}>👋</Typography>
              <Typography sx={{ fontWeight: 700, color: brand[700], mb: 0.5 }}>
                No members yet
              </Typography>
              <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
                Create an invite code to add members to your group.
              </Typography>
            </Paper>
          ) : (
            <Grid container spacing={1.5}>
              {members.map((member) => (
                <Grid size={{ xs: 12, sm: 6 }} key={member.id}>
                  <MemberCard
                    member={member}
                    onClick={(id) => router.push(`/group/members/${id}`)}
                  />
                </Grid>
              ))}
            </Grid>
          )}
        </Grid>

        {/* Leaderboard sidebar */}
        {showLeaderboard && (
          <Grid size={{ xs: 12, md: 4 }}>
            <Typography
              sx={{
                fontWeight: 800,
                fontSize: '0.85rem',
                color: brand[700],
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                mb: 1.5,
              }}
            >
              🏆 Weekly Leaderboard
            </Typography>
            {lbLoading ? (
              <Loading message="Loading leaderboard..." />
            ) : (
              <LeaderboardWidget entries={leaderboard} />
            )}
          </Grid>
        )}
      </Grid>

      {/* Invite Codes */}
      {invites.length > 0 && (
        <Box sx={{ mt: 4 }}>
          <Typography
            sx={{
              fontWeight: 800,
              fontSize: '0.85rem',
              color: brand[700],
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              mb: 1.5,
            }}
          >
            Invite Codes
          </Typography>
          <InviteList
            invites={invites}
            onRevoke={revokeInvite}
            onShowQR={(invite) => setQrInvite(invite)}
          />
        </Box>
      )}

      {/* Group Encouragement */}
      {members.length > 0 && (
        <Box sx={{ mt: 4 }}>
          <Typography
            sx={{
              fontWeight: 800,
              fontSize: '0.85rem',
              color: brand[700],
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              mb: 1.5,
            }}
          >
            💬 Encouragement
          </Typography>
          <GroupEncouragementForm members={members} onSend={sendEncouragement} />
        </Box>
      )}

      {/* Assignments */}
      <Box sx={{ mt: 4 }}>
        <Typography
          sx={{
            fontWeight: 800,
            fontSize: '0.85rem',
            color: brand[700],
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            mb: 1.5,
          }}
        >
          Assignments
        </Typography>
        <AssignmentsList
          assignments={assignments}
          onEdit={updateAssignment}
          onDelete={deleteAssignment}
        />
      </Box>

      {/* Activity Feed */}
      <Box sx={{ mt: 4 }}>
        <Typography
          sx={{
            fontWeight: 800,
            fontSize: '0.85rem',
            color: brand[700],
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            mb: 1.5,
          }}
        >
          Recent Activity
        </Typography>
        {feedLoading ? <Loading message="Loading activity..." /> : <ActivityFeed items={feed} />}
      </Box>

      <CreateAssignmentDialog
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        members={members}
        decks={decks.filter((d) => !d.isShared)}
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
