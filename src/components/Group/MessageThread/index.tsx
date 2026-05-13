'use client';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import SendIcon from '@mui/icons-material/Send';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import { alpha, useTheme } from '@mui/material/styles';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useEffect, useRef, useState } from 'react';

import { StyledDialog } from '@/components/StyledDialog';
import type { DirectMessage } from '@/hooks/useDirectMessages';

import { groupByDate, QUICK_MESSAGES_MEMBER } from './constants';
import { MessageBubble } from './MessageBubble';
import { TypingDots } from './TypingDots';

/* ── Sparkle decorations ─────────────────────────────────────────────────── */

// Ombre: accent at top → brand at bottom so the hue visibly shifts
const SPARKLES: {
  top: string;
  left: string;
  size: number;
  opacity: number;
  palette: 'accent' | 'brand';
  shade: number;
}[] = [
  { top: '5%', left: '6%', size: 18, opacity: 0.35, palette: 'accent', shade: 300 },
  { top: '14%', left: '85%', size: 14, opacity: 0.3, palette: 'accent', shade: 400 },
  { top: '30%', left: '93%', size: 20, opacity: 0.3, palette: 'accent', shade: 500 },
  { top: '44%', left: '48%', size: 11, opacity: 0.22, palette: 'brand', shade: 300 },
  { top: '50%', left: '3%', size: 16, opacity: 0.28, palette: 'brand', shade: 400 },
  { top: '65%', left: '90%', size: 13, opacity: 0.3, palette: 'brand', shade: 500 },
  { top: '78%', left: '10%', size: 17, opacity: 0.32, palette: 'brand', shade: 600 },
  { top: '88%', left: '80%', size: 14, opacity: 0.3, palette: 'brand', shade: 700 },
];

function Sparkle({
  top,
  left,
  size,
  opacity,
  color,
}: {
  top: string;
  left: string;
  size: number;
  opacity: number;
  color: string;
}) {
  const r = size / 2;
  return (
    <Box
      component="svg"
      viewBox={`0 0 ${size} ${size}`}
      sx={{
        position: 'absolute',
        top,
        left,
        width: size,
        height: size,
        pointerEvents: 'none',
        opacity,
      }}
    >
      <path
        d={`M${r} 0 L${r * 1.18} ${r * 0.7} L${size} ${r} L${r * 1.18} ${r * 1.3} L${r} ${size} L${r * 0.82} ${r * 1.3} L0 ${r} L${r * 0.82} ${r * 0.7}Z`}
        fill={color}
      />
    </Box>
  );
}

interface MessageThreadProps {
  open: boolean;
  onClose: () => void;
  messages: DirectMessage[];
  onSend: (recipientId: string, message: string) => Promise<unknown>;
  onMarkAllRead: () => void;
  recipientId: string;
  recipientName: string;
  currentUserId: string;
  isMember: boolean;
}

export function MessageThread({
  open,
  onClose,
  messages,
  onSend,
  onMarkAllRead,
  recipientId,
  recipientName,
  currentUserId,
  isMember,
}: MessageThreadProps) {
  const theme = useTheme();
  const { brand, accent } = theme.palette;
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const recipientInitial = recipientName.charAt(0).toUpperCase();

  // Scroll to bottom when dialog opens or messages change
  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [open, messages.length]);

  // Mark incoming messages as read when dialog opens
  useEffect(() => {
    if (open) onMarkAllRead();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Clean up sent timer on unmount
  useEffect(() => () => clearTimeout(sentTimerRef.current), []);

  const handleClose = () => {
    onMarkAllRead();
    onClose();
  };

  const handleSend = async (msg?: string) => {
    const message = msg ?? text.trim();
    if (!message || sending) return;
    setSending(true);
    try {
      await onSend(recipientId, message);
      setText('');
      setSent(true);
      clearTimeout(sentTimerRef.current);
      sentTimerRef.current = setTimeout(() => setSent(false), 2000);
    } catch {
      // error handled by parent
    } finally {
      setSending(false);
    }
  };

  // Oldest-first, then group by date
  const sorted = [...messages].reverse();
  const groups = groupByDate(sorted);

  return (
    <StyledDialog
      open={open}
      onClose={handleClose}
      title="Messages"
      subtitle={`Chat with ${recipientName}`}
      icon={<ChatBubbleOutlineIcon sx={{ color: brand[600], fontSize: 22 }} />}
      titleId="message-thread-title"
      maxWidth="xs"
      contentSx={{ p: 0, display: 'flex', flexDirection: 'column' }}
    >
      {/* Message list with sparkle overlay */}
      <Box sx={{ position: 'relative', minHeight: 200, maxHeight: 350, overflow: 'hidden' }}>
        {/* Non-scrolling sparkle layer */}
        <Box sx={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1 }}>
          {SPARKLES.map((s, i) => {
            const scale = (s.palette === 'accent' ? accent : brand) as Record<number, string>;
            return <Sparkle key={i} color={scale[s.shade]} {...s} />;
          })}
        </Box>

        <Box
          ref={scrollRef}
          sx={{
            position: 'relative',
            zIndex: 0,
            height: '100%',
            maxHeight: 350,
            overflowY: 'auto',
            px: 2,
            py: 1.5,
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
          }}
        >
          {sorted.length === 0 ? (
            <Box
              sx={{
                textAlign: 'center',
                py: 5,
                animation: 'floatIn 0.5s ease-out',
                '@keyframes floatIn': {
                  from: { opacity: 0, transform: 'translateY(10px)' },
                  to: { opacity: 1, transform: 'translateY(0)' },
                },
              }}
            >
              <Typography sx={{ fontSize: '3rem', mb: 1, lineHeight: 1 }}>💌</Typography>
              <Typography sx={{ fontWeight: 700, color: brand[600], fontSize: '0.95rem', mb: 0.5 }}>
                No messages yet!
              </Typography>
              <Typography sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>
                Say hi to {recipientName} to start chatting
              </Typography>
            </Box>
          ) : (
            groups.map((group) => (
              <Box key={group.label} sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {/* Date separator */}
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 0.5 }}>
                  <Typography
                    sx={{
                      fontSize: '0.65rem',
                      fontWeight: 600,
                      color: brand[600],
                      bgcolor: alpha(brand[100], 0.7),
                      px: 1.5,
                      py: 0.3,
                      borderRadius: 3,
                      letterSpacing: 0.3,
                    }}
                  >
                    {group.label}
                  </Typography>
                </Box>
                {group.msgs.map((m, i) => (
                  <MessageBubble
                    key={m.id}
                    message={m}
                    isMine={m.sender_id === currentUserId}
                    initial={m.sender_id === currentUserId ? '!' : recipientInitial}
                    index={i}
                  />
                ))}
              </Box>
            ))
          )}
        </Box>
      </Box>

      {/* Quick replies for member (kid-friendly sticker style) */}
      {isMember && (
        <Box
          sx={{
            px: 2,
            pb: 1,
            display: 'flex',
            flexWrap: 'wrap',
            gap: 0.5,
          }}
        >
          {QUICK_MESSAGES_MEMBER.map(({ emoji, text: qm }) => (
            <Chip
              key={qm}
              label={`${emoji} ${qm}`}
              size="small"
              variant="outlined"
              onClick={() => void handleSend(qm)}
              disabled={sending}
              sx={{
                borderRadius: '14px',
                fontWeight: 600,
                fontSize: '0.72rem',
                height: 32,
                borderColor: alpha(brand[300], 0.5),
                color: brand[700],
                bgcolor: alpha(brand[50], 0.5),
                transition: 'all 0.15s ease',
                '&:hover': {
                  bgcolor: brand[100],
                  transform: 'scale(1.04)',
                  borderColor: brand[300],
                },
              }}
            />
          ))}
        </Box>
      )}

      {/* Input area */}
      <Box
        sx={{
          px: 2,
          pb: 2,
          pt: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          borderTop: `1px solid ${alpha(brand[200], 0.3)}`,
        }}
      >
        <TextField
          size="small"
          fullWidth
          placeholder="Type a message..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void handleSend();
            }
          }}
          disabled={sending}
          slotProps={{ htmlInput: { maxLength: 500 } }}
          sx={{
            '& .MuiInputBase-root': {
              fontSize: isMember ? '1rem' : '0.88rem',
              minHeight: isMember ? 48 : 40,
            },
          }}
        />
        <Button
          variant="contained"
          onClick={() => void handleSend()}
          disabled={sending || !text.trim()}
          aria-label="Send message"
          sx={{
            minWidth: 0,
            width: isMember ? 48 : 42,
            height: isMember ? 48 : 42,
            borderRadius: '50%',
            p: 0,
            flexShrink: 0,
            background: `linear-gradient(135deg, ${brand[400]}, ${accent[300]})`,
            transition: 'transform 0.15s ease',
            '&:hover:not(:disabled)': { transform: 'scale(1.1)' },
          }}
        >
          {sending ? <TypingDots /> : <SendIcon sx={{ fontSize: 18 }} />}
        </Button>
      </Box>

      {sent && (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            pb: 1.5,
            animation: 'fadeInUp 0.3s ease-out',
            '@keyframes fadeInUp': {
              from: { opacity: 0, transform: 'translateY(6px)' },
              to: { opacity: 1, transform: 'translateY(0)' },
            },
          }}
        >
          <Typography
            sx={{
              fontSize: '0.75rem',
              fontWeight: 600,
              color: brand[600],
              bgcolor: alpha(brand[100], 0.6),
              px: 1.5,
              py: 0.4,
              borderRadius: 3,
            }}
          >
            Sent! 💌
          </Typography>
        </Box>
      )}
    </StyledDialog>
  );
}
