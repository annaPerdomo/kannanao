import AddReactionOutlinedIcon from '@mui/icons-material/AddReactionOutlined';
import DoneIcon from '@mui/icons-material/Done';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useState } from 'react';

import { EmojiPickerPopover } from '@/components/EmojiPickerPopover';
import type { DirectMessage } from '@/hooks/useDirectMessages';

import { timeAgo } from './constants';

interface MessageBubbleProps {
  message: DirectMessage;
  isMine: boolean;
  initial: string;
  index: number;
  /** Changed periodically by useTick to force timestamp refresh */
  tick?: number;
  userId?: string;
  onReact?: (messageId: string, emoji: string) => void;
}

export function MessageBubble({
  message,
  isMine,
  initial,
  index,
  tick: _tick,
  userId,
  onReact,
}: MessageBubbleProps) {
  const { palette } = useTheme();
  const { brand } = palette;
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const reactions = message.reactions || {};
  const reactionEntries = Object.entries(reactions).filter(([, users]) => users.length > 0);
  const hasReactions = reactionEntries.length > 0;

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

      <Box sx={{ maxWidth: '75%', position: 'relative' }}>
        {/* Bubble */}
        <Box
          sx={{
            px: message.image_url ? 0.5 : 1.5,
            py: message.image_url ? 0.5 : 1,
            borderRadius: isMine ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
            bgcolor: isMine ? alpha(brand[400], 0.2) : alpha(brand[100], 0.5),
            border: `1px solid ${isMine ? alpha(brand[400], 0.3) : alpha(brand[200], 0.4)}`,
            overflow: 'hidden',
            '&:hover .react-btn': { opacity: 1 },
          }}
        >
          {message.image_url && (
            <Box
              component="a"
              href={message.image_url}
              target="_blank"
              rel="noopener noreferrer"
              sx={{ display: 'block', lineHeight: 0 }}
            >
              <Box
                component="img"
                src={message.image_url}
                alt="Shared photo"
                sx={{
                  maxWidth: '100%',
                  maxHeight: 220,
                  borderRadius: message.message ? '12px 12px 4px 4px' : '12px',
                  objectFit: 'cover',
                  display: 'block',
                }}
              />
            </Box>
          )}
          {message.message && (
            <Typography
              sx={{
                // Matches the input box font size so messages don't shrink on send
                fontSize: '1rem',
                color: 'text.primary',
                wordBreak: 'break-word',
                px: message.image_url ? 1 : 0,
                pt: message.image_url ? 0.5 : 0,
              }}
            >
              {message.message}
            </Typography>
          )}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: isMine ? 'flex-end' : 'flex-start',
              gap: 0.3,
              mt: 0.3,
              px: message.image_url ? 1 : 0,
              pb: message.image_url ? 0.3 : 0,
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

          {/* Reaction button — appears on hover */}
          {onReact && (
            <IconButton
              className="react-btn"
              size="small"
              aria-label="Add reaction"
              onClick={(e) => setAnchorEl(e.currentTarget)}
              sx={{
                position: 'absolute',
                top: -4,
                ...(isMine ? { left: -16 } : { right: -16 }),
                width: 24,
                height: 24,
                opacity: { xs: 1, sm: 0 },
                transition: 'opacity 0.15s ease',
                bgcolor: alpha(brand[100], 0.8),
                border: `1px solid ${alpha(brand[300], 0.4)}`,
                color: brand[500],
                '&:hover': { bgcolor: brand[100], color: brand[700] },
              }}
            >
              <AddReactionOutlinedIcon sx={{ fontSize: 14 }} />
            </IconButton>
          )}
        </Box>

        {/* Reactions — in normal flow under the bubble, aligned to its side */}
        {hasReactions && (
          <Box
            sx={{
              display: 'flex',
              justifyContent: isMine ? 'flex-end' : 'flex-start',
              gap: 0.4,
              mt: 0.25,
              px: 0.5,
            }}
          >
            {reactionEntries.map(([emoji, users]) => {
              const iReacted = userId ? users.includes(userId) : false;
              return (
                <Box
                  key={emoji}
                  component="button"
                  onClick={() => onReact?.(message.id, emoji)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e: React.KeyboardEvent) => {
                    if (e.key === 'Enter' || e.key === ' ') onReact?.(message.id, emoji);
                  }}
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 0.3,
                    px: 0.8,
                    py: 0.3,
                    borderRadius: '12px',
                    border: `1.5px solid ${iReacted ? alpha(brand[500], 0.5) : alpha(brand[300], 0.4)}`,
                    bgcolor: iReacted ? alpha(brand[200], 0.85) : alpha('#fff', 0.9),
                    cursor: 'pointer',
                    fontSize: '1rem',
                    lineHeight: 1,
                    transition: 'all 0.12s ease',
                    boxShadow: `0 1px 4px ${alpha(brand[400], 0.25)}`,
                    '&:hover': {
                      bgcolor: alpha(brand[200], 0.8),
                      borderColor: alpha(brand[400], 0.6),
                      transform: 'scale(1.1)',
                    },
                  }}
                >
                  <span>{emoji}</span>
                  {users.length > 1 && (
                    <Typography
                      component="span"
                      sx={{
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        color: iReacted ? brand[700] : brand[500],
                      }}
                    >
                      {users.length}
                    </Typography>
                  )}
                </Box>
              );
            })}
          </Box>
        )}
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

      {/* Emoji picker popover */}
      <EmojiPickerPopover
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        onSelect={(emoji) => onReact?.(message.id, emoji)}
      />
    </Box>
  );
}
