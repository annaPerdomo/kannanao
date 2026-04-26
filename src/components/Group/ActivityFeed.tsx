'use client';
import Box from '@mui/material/Box';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';

import type { FeedItem } from '@/hooks/useGroup';

function timeAgo(dateStr: string): string {
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

interface ActivityFeedProps {
  items: FeedItem[];
}

export function ActivityFeed({ items }: ActivityFeedProps) {
  const theme = useTheme();
  const { brand } = theme.palette;

  if (items.length === 0) {
    return (
      <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary', fontStyle: 'italic' }}>
        No recent activity yet.
      </Typography>
    );
  }

  return (
    <Box
      sx={{
        borderLeft: `3px solid ${alpha(brand[300], 0.4)}`,
        pl: 2,
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
      }}
    >
      {items.map((item, i) => (
        <Box
          key={`${item.memberId}-${item.timestamp}-${i}`}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            py: 0.5,
          }}
        >
          <Typography sx={{ fontSize: '1rem', flexShrink: 0 }}>{item.emoji}</Typography>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontSize: '0.78rem', color: brand[800] }}>
              <Box component="span" sx={{ fontWeight: 700 }}>
                {item.memberName}
              </Box>{' '}
              {item.description}
            </Typography>
          </Box>
          <Typography
            sx={{ fontSize: '0.63rem', color: 'text.secondary', flexShrink: 0, whiteSpace: 'nowrap' }}
          >
            {timeAgo(item.timestamp)}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}
