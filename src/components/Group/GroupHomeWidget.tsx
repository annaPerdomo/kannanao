'use client';

import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import GroupsIcon from '@mui/icons-material/Groups';
import SchoolIcon from '@mui/icons-material/School';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';

import type { GroupMember } from '@/hooks/useGroup';

interface GroupHomeWidgetProps {
  members: GroupMember[];
  onViewDashboard: () => void;
  groupName?: string;
  groupEmoji?: string;
}

function statusColor(lastActive: string | null): string {
  if (!lastActive) return '#9CA3AF';
  const diff = Date.now() - new Date(lastActive).getTime();
  const days = diff / (24 * 60 * 60 * 1000);
  if (days < 1) return '#22C55E';
  if (days < 3) return '#EAB308';
  return '#9CA3AF';
}

export function GroupHomeWidget({
  members,
  onViewDashboard,
  groupName,
  groupEmoji,
}: GroupHomeWidgetProps) {
  const theme = useTheme();
  const { brand } = theme.palette;

  const totalXp = members.reduce((sum, m) => sum + m.totalXp, 0);
  const totalCards = members.reduce((sum, m) => sum + m.totalCardsStudied, 0);
  const now = Date.now();
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
  const activeCount = members.filter(
    (m) => m.lastActive && new Date(m.lastActive).getTime() > sevenDaysAgo,
  ).length;

  return (
    <Paper
      elevation={0}
      onClick={onViewDashboard}
      sx={{
        p: 2.5,
        borderRadius: 3,
        border: `1.5px solid ${alpha(brand[300], 0.35)}`,
        bgcolor: alpha(brand[50], 0.5),
        cursor: 'pointer',
        transition: 'all 0.18s ease',
        '&:hover': {
          boxShadow: `0 4px 20px ${alpha(brand[300], 0.2)}`,
          transform: 'translateY(-2px)',
          borderColor: brand[400],
        },
      }}
    >
      {/* Group name */}
      {groupName && (
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
          {groupEmoji && <Typography sx={{ fontSize: '1.2rem' }}>{groupEmoji}</Typography>}
          <Typography sx={{ fontWeight: 800, fontSize: '0.95rem', color: brand[800] }} noWrap>
            {groupName}
          </Typography>
        </Stack>
      )}

      {/* Stats row */}
      <Stack direction="row" spacing={2.5} sx={{ mb: 2 }}>
        <Stack direction="row" alignItems="center" spacing={0.5}>
          <GroupsIcon sx={{ fontSize: 16, color: brand[500] }} />
          <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: brand[700] }}>
            {members.length}
          </Typography>
          <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>
            member{members.length !== 1 ? 's' : ''}
          </Typography>
        </Stack>
        <Stack direction="row" alignItems="center" spacing={0.5}>
          <EmojiEventsIcon sx={{ fontSize: 16, color: brand[500] }} />
          <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: brand[700] }}>
            {totalXp.toLocaleString()}
          </Typography>
          <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>XP</Typography>
        </Stack>
        <Stack direction="row" alignItems="center" spacing={0.5}>
          <SchoolIcon sx={{ fontSize: 16, color: brand[500] }} />
          <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: brand[700] }}>
            {totalCards.toLocaleString()}
          </Typography>
          <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>cards</Typography>
        </Stack>
      </Stack>

      {/* Member avatars row */}
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
        {members.slice(0, 5).map((m) => (
          <Stack key={m.id} direction="row" alignItems="center" spacing={0.5}>
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                bgcolor: statusColor(m.lastActive),
                flexShrink: 0,
              }}
            />
            <Typography sx={{ fontSize: '0.72rem', fontWeight: 600, color: 'text.primary' }} noWrap>
              {m.displayName || m.username}
            </Typography>
          </Stack>
        ))}
        {members.length > 5 && (
          <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
            +{members.length - 5} more
          </Typography>
        )}
      </Stack>

      {/* Footer */}
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
          {activeCount} active this week
        </Typography>
        <Button
          size="small"
          endIcon={<ArrowForwardIcon sx={{ fontSize: 14 }} />}
          sx={{
            fontSize: '0.72rem',
            color: brand[600],
            textTransform: 'none',
            fontWeight: 700,
            p: 0,
            minWidth: 'auto',
            '&:hover': { bgcolor: 'transparent', color: brand[800] },
          }}
        >
          Dashboard
        </Button>
      </Stack>
    </Paper>
  );
}
