'use client';
import AssignmentIcon from '@mui/icons-material/Assignment';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import CircularProgress from '@mui/material/CircularProgress';
import FormControlLabel from '@mui/material/FormControlLabel';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import { alpha, useTheme } from '@mui/material/styles';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback, useRef, useState } from 'react';

import { EmojiPickerPopover } from '@/components/EmojiPickerPopover';
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
  QuizScoresPanel,
  ReteachPanel,
} from '@/components/Group';
import { Loading } from '@/components/Loading';
import { PageHeader } from '@/components/PageHeader';
import { useAuth } from '@/contexts/AuthContext';
import { useAssignments } from '@/hooks/useAssignments';
import { useDecks } from '@/hooks/useDecks';
import { useEncouragements } from '@/hooks/useEncouragements';
import { useGroupFeed, useGroupMembers } from '@/hooks/useGroup';
import { useGroupLeaderboard } from '@/hooks/useGroupLeaderboard';
import { useGroups } from '@/hooks/useGroups';
import type { InviteCode } from '@/hooks/useInvites';
import { useInvites } from '@/hooks/useInvites';
import { LAYOUT } from '@/theme';

export default function GroupDashboardPage() {
  const t = useTranslations('Group.groupPage');
  const tc = useTranslations('Common');
  const theme = useTheme();
  const { brand } = theme.palette;
  const router = useRouter();
  const params = useParams<{ groupId: string }>();
  const groupId = params?.groupId ?? '';
  const { isMemberAccount, displayName, user, loading: authLoading } = useAuth();

  const { members, loading, error } = useGroupMembers(groupId);
  const { leaderboard, loading: lbLoading } = useGroupLeaderboard(groupId);
  const { feed, loading: feedLoading } = useGroupFeed(groupId);
  const { decks } = useDecks();
  const { assignments, createAssignment, updateAssignment, deleteAssignment } = useAssignments(
    groupId,
    true,
    'given',
  );
  const { sendEncouragement } = useEncouragements();
  const { invites, createInvite, revokeInvite } = useInvites(groupId);
  const { groups, updateGroup } = useGroups();
  const group = groups.find((g) => g.id === groupId);

  const [assignOpen, setAssignOpen] = useState(false);
  const [createInviteOpen, setCreateInviteOpen] = useState(false);
  const [qrInvite, setQrInvite] = useState<InviteCode | null>(null);

  // Inline editing state (same pattern as DeckHeader)
  const [editing, setEditing] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [nameVal, setNameVal] = useState('');
  const [emojiAnchor, setEmojiAnchor] = useState<HTMLElement | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const startEdit = useCallback(() => {
    setNameVal(group?.name ?? '');
    setEditing(true);
    setTimeout(() => nameInputRef.current?.focus(), 0);
  }, [group]);

  const cancelEdit = useCallback(() => setEditing(false), []);

  const commitEdit = useCallback(async () => {
    const trimmedName = nameVal.trim();
    if (!trimmedName || trimmedName === group?.name) {
      setEditing(false);
      return;
    }
    setRenaming(true);
    try {
      await updateGroup(groupId, { name: trimmedName });
    } finally {
      setRenaming(false);
      setEditing(false);
    }
  }, [nameVal, group, updateGroup, groupId]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') void commitEdit();
      if (e.key === 'Escape') cancelEdit();
    },
    [commitEdit, cancelEdit],
  );

  const handleSendEncouragement = useCallback(
    async (memberId: string, message: string, emoji?: string) => {
      return sendEncouragement(memberId, message, emoji);
    },
    [sendEncouragement],
  );

  // Redirect members away
  if (!authLoading && isMemberAccount) {
    router.push('/');
    return null;
  }

  if (loading || authLoading) {
    return (
      <Box sx={{ maxWidth: LAYOUT.contentMaxWidth, mx: 'auto', px: LAYOUT.pagePx, py: 6 }}>
        <Loading message={t('loadingDashboard')} />
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
        {editing ? (
          <PageHeader onBack={() => router.push('/group')} title="" compact mb={3}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
              <TextField
                inputRef={nameInputRef}
                value={nameVal}
                onChange={(e) => setNameVal(e.target.value)}
                onKeyDown={handleKeyDown}
                size="small"
                autoComplete="off"
                disabled={renaming}
                placeholder={t('groupNamePlaceholder')}
                sx={{
                  flexGrow: 1,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '9px',
                    fontSize: '1.25rem',
                    fontWeight: 700,
                    color: brand[800],
                    bgcolor: alpha('#FFFFFF', 0.6),
                    '& fieldset': { borderColor: alpha(brand[400], 0.5) },
                    '&:hover fieldset': { borderColor: brand[400] },
                    '&.Mui-focused fieldset': { borderColor: brand[500] },
                  },
                }}
              />
              {renaming ? (
                <CircularProgress size={18} sx={{ color: 'primary.main', flexShrink: 0 }} />
              ) : (
                <>
                  <Tooltip title={t('saveTooltip')}>
                    <IconButton
                      size="small"
                      aria-label={tc('save')}
                      onClick={commitEdit}
                      sx={{
                        width: 30,
                        height: 30,
                        borderRadius: '8px',
                        bgcolor: alpha('#FFFFFF', 0.6),
                        border: `1.5px solid ${alpha(brand[400], 0.4)}`,
                        color: brand[700],
                        '&:hover': { bgcolor: alpha('#FFFFFF', 0.8), borderColor: brand[400] },
                      }}
                    >
                      <CheckIcon sx={{ fontSize: 15 }} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={t('cancelTooltip')}>
                    <IconButton
                      size="small"
                      aria-label={tc('cancel')}
                      onClick={cancelEdit}
                      sx={{
                        width: 30,
                        height: 30,
                        borderRadius: '8px',
                        color: 'text.secondary',
                        border: `1.5px solid ${alpha(brand[300], 0.3)}`,
                        bgcolor: alpha('#FFFFFF', 0.4),
                        '&:hover': { bgcolor: alpha('#FFFFFF', 0.7) },
                      }}
                    >
                      <CloseIcon sx={{ fontSize: 15 }} />
                    </IconButton>
                  </Tooltip>
                </>
              )}
            </Box>
          </PageHeader>
        ) : (
          <>
            <PageHeader
              onBack={() => router.push('/group')}
              title={
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                  <Tooltip title={group?.emoji ? t('changeEmoji') : t('addEmoji')}>
                    <ButtonBase
                      aria-label={group?.emoji ? t('changeGroupEmoji') : t('addGroupEmoji')}
                      onClick={(e) => setEmojiAnchor(e.currentTarget)}
                      sx={{
                        fontSize: { xs: '1.5rem', sm: '1.75rem' },
                        lineHeight: 1,
                        borderRadius: '10px',
                        p: 0.5,
                        alignSelf: 'center',
                        flexShrink: 0,
                        transition: 'transform 0.15s',
                        '&:hover': { transform: 'scale(1.15)', bgcolor: alpha('#FFFFFF', 0.5) },
                      }}
                    >
                      {group?.emoji || '👥'}
                    </ButtonBase>
                  </Tooltip>
                  <Box sx={{ minWidth: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      <Typography
                        variant="h4"
                        sx={{ fontWeight: 800, color: brand[800], lineHeight: 1.1, minWidth: 0 }}
                      >
                        {group?.name ?? t('defaultTitle')}
                      </Typography>
                      <Tooltip title={t('renameGroup')}>
                        <IconButton
                          size="small"
                          aria-label={t('renameGroup')}
                          onClick={startEdit}
                          sx={{
                            width: 26,
                            height: 26,
                            borderRadius: '7px',
                            flexShrink: 0,
                            color: alpha(brand[700], 0.45),
                            '&:hover': { bgcolor: alpha('#FFFFFF', 0.5), color: brand[700] },
                          }}
                        >
                          <EditIcon sx={{ fontSize: 13 }} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                    <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.25 }}>
                      {t('memberCountInGroup', { count: members.length })}
                    </Typography>
                  </Box>
                </Box>
              }
              compact
              mb={3}
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
                    {t('inviteButton')}
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
                      {t('assignDeckButton')}
                    </Button>
                  )}
                </Stack>
              }
            />

            <EmojiPickerPopover
              anchorEl={emojiAnchor}
              onClose={() => setEmojiAnchor(null)}
              onSelect={(emoji) => updateGroup(groupId, { emoji })}
              onRemove={group?.emoji ? () => updateGroup(groupId, { emoji: '' }) : undefined}
            />
          </>
        )}
      </Box>

      {/* Overview stat cards */}
      <GroupOverview members={members} />

      {/* Members */}
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
        {t('membersHeading')}
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
            {t('noMembersTitle')}
          </Typography>
          <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
            {t('noMembersBody')}
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={1.5}>
          {members.map((member) => (
            <Grid size={{ xs: 12, sm: 6 }} key={member.id}>
              <MemberCard
                member={member}
                onClick={(id) => router.push(`/group/${groupId}/members/${id}`)}
              />
            </Grid>
          ))}
        </Grid>
      )}

      {/* Leaderboard */}
      <Box sx={{ mt: 4 }}>
        <Box
          sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}
        >
          <Typography
            sx={{
              fontWeight: 800,
              fontSize: '0.85rem',
              color: brand[700],
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            {t('weeklyLeaderboard')}
          </Typography>
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={group?.show_leaderboard !== false}
                onChange={(e) => updateGroup(groupId, { show_leaderboard: e.target.checked })}
                sx={{
                  '& .MuiSwitch-switchBase.Mui-checked': { color: brand[600] },
                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                    bgcolor: brand[400],
                  },
                }}
              />
            }
            label={
              <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                {group?.show_leaderboard !== false ? t('visible') : t('hidden')}
              </Typography>
            }
            labelPlacement="start"
            sx={{ mr: 0 }}
          />
        </Box>
        {group?.show_leaderboard !== false ? (
          lbLoading ? (
            <Loading message={t('loadingLeaderboard')} />
          ) : (
            <LeaderboardWidget entries={leaderboard} />
          )
        ) : (
          <Paper
            elevation={0}
            sx={{
              p: 3,
              textAlign: 'center',
              border: `1.5px dashed ${alpha(brand[300], 0.4)}`,
              borderRadius: 3,
              bgcolor: alpha(brand[50], 0.6),
            }}
          >
            <EmojiEventsIcon sx={{ fontSize: 32, color: alpha(brand[400], 0.5), mb: 0.5 }} />
            <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
              {t('leaderboardHiddenBody')}
            </Typography>
          </Paper>
        )}
      </Box>

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
            {t('inviteCodesHeading')}
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
            {t('encouragementHeading')}
          </Typography>
          <GroupEncouragementForm members={members} onSend={handleSendEncouragement} />
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
          {t('assignmentsHeading')}
        </Typography>
        <AssignmentsList
          assignments={assignments}
          onEdit={updateAssignment}
          onDelete={deleteAssignment}
        />
      </Box>

      {/* Quiz scores — graded checkpoints per member, with CSV export */}
      {members.length > 0 && (
        <QuizScoresPanel decks={decks.filter((d) => !d.isShared)} groupId={groupId} />
      )}

      {/* What to reteach — class-level tricky words */}
      {members.length > 0 && <ReteachPanel decks={decks.filter((d) => !d.isShared)} />}

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
          {t('recentActivityHeading')}
        </Typography>
        {feedLoading ? <Loading message={t('loadingActivity')} /> : <ActivityFeed items={feed} />}
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
