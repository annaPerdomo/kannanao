'use client';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import LinearProgress from '@mui/material/LinearProgress';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';

import { UserAvatar } from '@/components/UserAvatar';
import type { GroupMember } from '@/hooks/useGroup';
import { xpProgressInLevel } from '@/hooks/useProgress';

import { recencyDotColor } from './memberActivity';

export function timeAgo(dateStr: string | null, t: ReturnType<typeof useTranslations>): string {
  if (!dateStr) return t('never');
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return t('justNow');
  if (mins < 60) return t('minutesAgo', { mins });
  const hours = Math.floor(mins / 60);
  if (hours < 24) return t('hoursAgo', { hours });
  const days = Math.floor(hours / 24);
  if (days === 1) return t('yesterday');
  return t('daysAgo', { days });
}

interface MemberCardProps {
  member: GroupMember;
  onClick: (id: string) => void;
}

/** Stacked, not one wide row: this sits in a third-of-the-screen column. */
export function MemberCard({ member, onClick }: MemberCardProps) {
  const theme = useTheme();
  const { brand } = theme.palette;
  const t = useTranslations('Group.memberCard');
  const { current, needed } = xpProgressInLevel(member.totalXp);
  const pct = Math.round((current / needed) * 100);
  const status = recencyDotColor(member.lastActive);
  const name = member.displayName || member.username;

  return (
    <ButtonBase
      onClick={() => onClick(member.id)}
      sx={{
        width: '100%',
        display: 'block',
        textAlign: 'left',
        px: 1.25,
        py: 1.25,
        borderRadius: theme.radii.md,
        transition: 'background-color 0.15s ease',
        '&:hover': { bgcolor: alpha(brand[100], 0.5) },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
        {/* Status dot rides the avatar's corner so the row reads as one identity */}
        <Box sx={{ position: 'relative', flexShrink: 0 }}>
          <UserAvatar avatar={member.avatar} name={name} size={40} />
          <Box
            sx={{
              position: 'absolute',
              bottom: -1,
              right: -1,
              width: 11,
              height: 11,
              borderRadius: '50%',
              bgcolor: status,
              border: `2px solid ${theme.palette.background.paper}`,
            }}
          />
        </Box>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
            <Typography
              sx={{ flex: 1, fontWeight: 700, fontSize: '0.95rem', color: 'text.primary' }}
              noWrap
            >
              {name}
            </Typography>
            {member.streakDays > 0 && (
              <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, flexShrink: 0 }}>
                🔥 {member.streakDays}
              </Typography>
            )}
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
            <Typography sx={{ flex: 1, fontSize: '0.78rem', color: 'text.secondary' }} noWrap>
              @{member.username} · {t('cardsStudied', { count: member.totalCardsStudied })}
            </Typography>
            <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', flexShrink: 0 }}>
              {timeAgo(member.lastActive, t)}
            </Typography>
          </Box>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.75, pl: '52px' }}>
        <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: brand[700], flexShrink: 0 }}>
          {t('level', { level: member.level })}
        </Typography>
        <LinearProgress
          variant="determinate"
          value={pct}
          sx={{
            flex: 1,
            height: 7,
            borderRadius: 4,
            bgcolor: alpha(brand[200], 0.55),
            '& .MuiLinearProgress-bar': { borderRadius: 4, bgcolor: brand[400] },
          }}
        />
        <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary', flexShrink: 0 }}>
          {t('xpProgress', { current, needed })}
        </Typography>
      </Box>
    </ButtonBase>
  );
}
