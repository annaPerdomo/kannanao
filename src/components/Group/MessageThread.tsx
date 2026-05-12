'use client';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import SendIcon from '@mui/icons-material/Send';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import { alpha, useTheme } from '@mui/material/styles';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useEffect, useRef, useState } from 'react';

import { StyledDialog } from '@/components/StyledDialog';
import type { DirectMessage } from '@/hooks/useDirectMessages';

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

const QUICK_MESSAGES_MEMBER = [
  'I finished studying!',
  'Can I have a new deck?',
  'Good morning! ☀️',
  'I need help!',
  'Thank you! 💕',
];

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

  // Scroll to bottom when messages change
  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [open, messages.length]);

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

  // Show messages oldest-first for chat view
  const sorted = [...messages].reverse();

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
      {/* Message list */}
      <Box
        ref={scrollRef}
        sx={{
          flex: 1,
          overflowY: 'auto',
          px: 2,
          py: 1.5,
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
          minHeight: 200,
          maxHeight: 350,
        }}
      >
        {sorted.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography sx={{ fontSize: '2rem', mb: 1 }}>💬</Typography>
            <Typography sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>
              No messages yet — say hi!
            </Typography>
          </Box>
        ) : (
          sorted.map((m) => {
            const isMine = m.sender_id === currentUserId;
            return (
              <Box
                key={m.id}
                sx={{
                  display: 'flex',
                  justifyContent: isMine ? 'flex-end' : 'flex-start',
                }}
              >
                <Box
                  sx={{
                    maxWidth: '80%',
                    px: 1.5,
                    py: 1,
                    borderRadius: 2.5,
                    bgcolor: isMine ? alpha(brand[400], 0.2) : alpha(brand[100], 0.5),
                    border: `1px solid ${isMine ? alpha(brand[400], 0.3) : alpha(brand[200], 0.4)}`,
                  }}
                >
                  <Typography
                    sx={{ fontSize: '0.88rem', color: 'text.primary', wordBreak: 'break-word' }}
                  >
                    {m.message}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: '0.6rem',
                      color: 'text.secondary',
                      mt: 0.3,
                      textAlign: isMine ? 'right' : 'left',
                    }}
                  >
                    {timeAgo(m.created_at)}
                  </Typography>
                </Box>
              </Box>
            );
          })
        )}
      </Box>

      {/* Quick replies for member (kid-friendly) */}
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
          {QUICK_MESSAGES_MEMBER.map((qm) => (
            <Button
              key={qm}
              size="small"
              variant="outlined"
              onClick={() => void handleSend(qm)}
              disabled={sending}
              sx={{
                borderRadius: 5,
                textTransform: 'none',
                fontSize: '0.72rem',
                fontWeight: 600,
                py: 0.5,
                px: 1.2,
                borderColor: alpha(brand[300], 0.5),
                color: brand[700],
                minHeight: 36,
                '&:hover': { bgcolor: brand[50] },
              }}
            >
              {qm}
            </Button>
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
            minWidth: 'auto',
            px: 1.5,
            borderRadius: 2,
            minHeight: isMember ? 48 : 40,
            background: `linear-gradient(135deg, ${brand[400]}, ${accent[300]})`,
          }}
        >
          {sending ? (
            <CircularProgress size={18} sx={{ color: 'white' }} />
          ) : (
            <SendIcon sx={{ fontSize: 18 }} />
          )}
        </Button>
      </Box>

      {sent && (
        <Typography
          sx={{ px: 2, pb: 1, fontSize: '0.72rem', color: 'success.main', fontWeight: 600 }}
        >
          Message sent!
        </Typography>
      )}
    </StyledDialog>
  );
}
