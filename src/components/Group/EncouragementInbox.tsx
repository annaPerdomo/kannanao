'use client';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';

import { StyledDialog } from '@/components/StyledDialog';
import type { Encouragement } from '@/hooks/useEncouragements';

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

interface EncouragementInboxProps {
  open: boolean;
  onClose: () => void;
  encouragements: Encouragement[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
}

export function EncouragementInbox({
  open,
  onClose,
  encouragements,
  onMarkRead,
  onMarkAllRead,
}: EncouragementInboxProps) {
  const theme = useTheme();
  const { brand } = theme.palette;
  const unreadCount = encouragements.filter((e) => !e.read_at).length;

  const handleClose = () => {
    if (unreadCount > 0) onMarkAllRead();
    onClose();
  };

  return (
    <StyledDialog
      open={open}
      onClose={handleClose}
      title="Messages"
      subtitle="Encouragements from your organizer"
      maxWidth="xs"
    >
      {encouragements.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 3 }}>
          <Typography sx={{ fontSize: '2rem', mb: 1 }}>💌</Typography>
          <Typography sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>
            No messages yet!
          </Typography>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {encouragements.map((e) => {
            const from = e.profiles?.display_name || e.profiles?.username || 'Your organizer';
            const isUnread = !e.read_at;
            return (
              <Box
                key={e.id}
                onClick={() => {
                  if (isUnread) onMarkRead(e.id);
                }}
                sx={{
                  p: 1.5,
                  borderRadius: 2.5,
                  border: `1.5px solid ${isUnread ? alpha(brand[400], 0.5) : alpha(brand[300], 0.25)}`,
                  bgcolor: isUnread ? alpha(brand[100], 0.5) : alpha(brand[50], 0.3),
                  transition: 'all 0.2s ease',
                  cursor: isUnread ? 'pointer' : 'default',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <Typography sx={{ fontSize: '1.2rem' }}>{e.emoji}</Typography>
                  <Typography sx={{ fontWeight: 700, fontSize: '0.82rem', color: brand[800], flex: 1 }}>
                    {from}
                  </Typography>
                  <Typography sx={{ fontSize: '0.6rem', color: 'text.secondary' }}>
                    {timeAgo(e.created_at)}
                  </Typography>
                  {isUnread && (
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        bgcolor: brand[500],
                        flexShrink: 0,
                      }}
                    />
                  )}
                </Box>
                <Typography sx={{ fontSize: '0.85rem', color: 'text.primary', pl: 4 }}>
                  {e.message}
                </Typography>
              </Box>
            );
          })}
        </Box>
      )}
    </StyledDialog>
  );
}
