'use client';
import Box from '@mui/material/Box';
import LinearProgress from '@mui/material/LinearProgress';
import Paper from '@mui/material/Paper';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';

import type { GroupMember } from '@/hooks/useGroup';
import { xpProgressInLevel } from '@/hooks/useProgress';

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  return `${days}d ago`;
}

function statusColor(lastActive: string | null): string {
  if (!lastActive) return '#9CA3AF';
  const diff = Date.now() - new Date(lastActive).getTime();
  const days = diff / (24 * 60 * 60 * 1000);
  if (days < 1) return '#22C55E'; // green — studied today
  if (days < 3) return '#EAB308'; // yellow — recent
  return '#9CA3AF'; // gray — inactive
}

interface MemberCardProps {
  member: GroupMember;
  onClick: (id: string) => void;
}

export function MemberCard({ member, onClick }: MemberCardProps) {
  const theme = useTheme();
  const { brand } = theme.palette;
  const { current, needed } = xpProgressInLevel(member.totalXp);
  const pct = Math.round((current / needed) * 100);
  const status = statusColor(member.lastActive);

  return (
    <Paper
      elevation={0}
      onClick={() => onClick(member.id)}
      sx={{
        p: 2,
        border: `1.5px solid ${alpha(brand[300], 0.35)}`,
        borderRadius: 3,
        cursor: 'pointer',
        transition: 'all 0.18s ease',
        bgcolor: alpha(brand[50], 0.5),
        '&:hover': {
          boxShadow: `0 4px 20px ${alpha(brand[300], 0.2)}`,
          transform: 'translateY(-2px)',
          borderColor: brand[400],
        },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
        <Box
          sx={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            bgcolor: status,
            flexShrink: 0,
            boxShadow: `0 0 6px ${alpha(status, 0.5)}`,
          }}
        />
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography
            sx={{ fontWeight: 800, fontSize: '0.9rem', color: brand[800], lineHeight: 1.2 }}
            noWrap
          >
            {member.displayName || member.username}
          </Typography>
          <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
            @{member.username}
          </Typography>
        </Box>
        {member.streakDays > 0 && (
          <Typography sx={{ fontSize: '0.8rem', fontWeight: 700 }}>
            🔥 {member.streakDays}
          </Typography>
        )}
      </Box>

      {/* Level bar */}
      <Box sx={{ mb: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.3 }}>
          <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, color: brand[600] }}>
            Level {member.level}
          </Typography>
          <Typography sx={{ fontSize: '0.65rem', color: 'text.secondary' }}>
            {current}/{needed} XP
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={pct}
          sx={{
            height: 6,
            borderRadius: 3,
            bgcolor: alpha(brand[200], 0.5),
            '& .MuiLinearProgress-bar': {
              borderRadius: 3,
              bgcolor: brand[400],
            },
          }}
        />
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography sx={{ fontSize: '0.68rem', color: 'text.secondary' }}>
          {member.totalCardsStudied.toLocaleString()} cards studied
        </Typography>
        <Typography sx={{ fontSize: '0.65rem', color: 'text.secondary', fontStyle: 'italic' }}>
          {timeAgo(member.lastActive)}
        </Typography>
      </Box>
    </Paper>
  );
}
