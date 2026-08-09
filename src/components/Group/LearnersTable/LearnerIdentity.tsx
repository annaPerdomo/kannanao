'use client';
import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';

import { UserAvatar } from '@/components/UserAvatar';
import type { GroupMember } from '@/hooks/useGroup';

import { recencyDotColor } from '../memberActivity';

interface LearnerIdentityProps {
  member: GroupMember;
  onSelect: (id: string) => void;
}

/**
 * Name renders as a real link, not just a click target on the row — so a
 * keyboard/screen-reader user has an actual focusable control, not just a
 * row-wide onClick they can't reach.
 */
export function LearnerIdentity({ member, onSelect }: LearnerIdentityProps) {
  const theme = useTheme();
  const name = member.displayName || member.username;

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
      <Box sx={{ position: 'relative', flexShrink: 0 }}>
        <UserAvatar avatar={member.avatar} name={name} size={36} />
        <Box
          sx={{
            position: 'absolute',
            bottom: -1,
            right: -1,
            width: 10,
            height: 10,
            borderRadius: '50%',
            bgcolor: recencyDotColor(member.lastActive),
            border: `2px solid ${theme.palette.background.paper}`,
          }}
        />
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Link
          component="button"
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelect(member.id);
          }}
          underline="hover"
          sx={{
            display: 'block',
            fontWeight: 700,
            fontSize: '0.9rem',
            color: 'text.primary',
            textAlign: 'left',
          }}
        >
          {name}
        </Link>
        <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary' }} noWrap>
          @{member.username}
        </Typography>
      </Box>
    </Box>
  );
}
