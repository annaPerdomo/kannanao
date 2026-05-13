import DoneIcon from '@mui/icons-material/Done';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';

import type { DirectMessage } from '@/hooks/useDirectMessages';

import { timeAgo } from './constants';

interface MessageBubbleProps {
  message: DirectMessage;
  isMine: boolean;
  initial: string;
  index: number;
}

export function MessageBubble({ message, isMine, initial, index }: MessageBubbleProps) {
  const { palette } = useTheme();
  const { brand } = palette;

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: isMine ? 'flex-end' : 'flex-start',
        alignItems: 'flex-end',
        gap: 0.75,
        animation: 'msgIn 0.3s ease-out both',
        animationDelay: `${Math.min(index * 0.04, 0.4)}s`,
        '@keyframes msgIn': {
          from: {
            opacity: 0,
            transform: `translateX(${isMine ? '12px' : '-12px'}) scale(0.97)`,
          },
          to: { opacity: 1, transform: 'translateX(0) scale(1)' },
        },
      }}
    >
      {/* Avatar on left for received messages */}
      {!isMine && (
        <Avatar
          sx={{
            width: 26,
            height: 26,
            fontSize: '0.7rem',
            fontWeight: 700,
            bgcolor: alpha(brand[400], 0.25),
            color: brand[700],
            mb: 0.3,
            flexShrink: 0,
          }}
        >
          {initial}
        </Avatar>
      )}

      <Box
        sx={{
          maxWidth: '75%',
          px: 1.5,
          py: 1,
          borderRadius: isMine ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
          bgcolor: isMine ? alpha(brand[400], 0.2) : alpha(brand[100], 0.5),
          border: `1px solid ${isMine ? alpha(brand[400], 0.3) : alpha(brand[200], 0.4)}`,
        }}
      >
        <Typography sx={{ fontSize: '0.88rem', color: 'text.primary', wordBreak: 'break-word' }}>
          {message.message}
        </Typography>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: isMine ? 'flex-end' : 'flex-start',
            gap: 0.3,
            mt: 0.3,
          }}
        >
          <Typography component="span" sx={{ fontSize: '0.6rem', color: 'text.secondary' }}>
            {timeAgo(message.created_at)}
          </Typography>
          {isMine &&
            (message.read_at ? (
              <DoneAllIcon sx={{ fontSize: 14, color: brand[600] }} aria-label="Read" />
            ) : (
              <DoneIcon sx={{ fontSize: 14, color: 'text.disabled' }} aria-label="Sent" />
            ))}
        </Box>
      </Box>

      {/* Avatar on right for sent messages */}
      {isMine && (
        <Avatar
          sx={{
            width: 26,
            height: 26,
            fontSize: '0.7rem',
            fontWeight: 700,
            bgcolor: alpha(brand[600], 0.2),
            color: brand[700],
            mb: 0.3,
            flexShrink: 0,
          }}
        >
          Me
        </Avatar>
      )}
    </Box>
  );
}
