'use client';

import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SendIcon from '@mui/icons-material/Send';
import { Avatar, Box, Button, Chip, IconButton, TextField, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { useCallback, useEffect, useRef, useState } from 'react';

import { groupByDate, QUICK_MESSAGES_MEMBER } from '@/components/Group/MessageThread/constants';
import { MessageBubble } from '@/components/Group/MessageThread/MessageBubble';
import { Loading } from '@/components/Loading';
import { useAuth } from '@/contexts/AuthContext';
import { useDirectMessagesCtx } from '@/contexts/DirectMessagesContext';
import { useDirectMessages } from '@/hooks/useDirectMessages';

interface ChatPanelProps {
  recipientId: string;
  recipientName: string;
  isMemberAccount: boolean;
  onBack: () => void;
}

export function ChatPanel({ recipientId, recipientName, isMemberAccount, onBack }: ChatPanelProps) {
  const theme = useTheme();
  const { brand, accent } = theme.palette;
  const { user } = useAuth();
  const { messages, sendMessage, markAllAsRead, loading } = useDirectMessages(recipientId);
  const { refetch: refetchGlobal } = useDirectMessagesCtx();

  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const initial = recipientName.charAt(0).toUpperCase();

  const hasUnread = messages.some((m) => !m.read_at && m.recipient_id === user?.id);

  // Stable ref for markAllAsRead to avoid effect re-runs (Bug 5 fix)
  const markAllRef = useRef(markAllAsRead);
  markAllRef.current = markAllAsRead;
  const refetchGlobalRef = useRef(refetchGlobal);
  refetchGlobalRef.current = refetchGlobal;

  const markAndSync = useCallback(async () => {
    await markAllRef.current();
    await refetchGlobalRef.current();
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      requestAnimationFrame(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      });
    }
  }, [messages.length]);

  // Mark messages as read when unread messages appear in the open conversation
  useEffect(() => {
    if (hasUnread) {
      void markAndSync().catch(() => {});
    }
  }, [hasUnread, markAndSync]);

  // Reset input when switching conversations
  useEffect(() => {
    setText('');
  }, [recipientId]);

  const handleSend = async (msg?: string) => {
    const message = msg ?? text.trim();
    if (!message || sending) return;
    setSending(true);
    try {
      await sendMessage(recipientId, message);
      setText('');
      // Sync sent message to global context so conversation list updates
      void refetchGlobalRef.current();
    } finally {
      setSending(false);
    }
  };

  if (loading) return <Loading />;

  const sorted = [...messages].reverse();
  const groups = groupByDate(sorted);

  return (
    <>
      {/* Chat header */}
      <Box
        sx={{
          px: 2,
          py: 1.5,
          borderBottom: `1px solid ${alpha(brand[300], 0.3)}`,
          bgcolor: alpha(brand[50], 0.5),
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          flexShrink: 0,
        }}
      >
        <IconButton
          onClick={onBack}
          size="small"
          aria-label="Back to conversations"
          sx={{
            display: { xs: 'inline-flex', sm: 'none' },
            border: `1.5px solid ${alpha(brand[400], 0.4)}`,
            borderRadius: '10px',
            width: 34,
            height: 34,
            color: brand[700],
            bgcolor: alpha('#FFFFFF', 0.5),
            '&:hover': { bgcolor: alpha('#FFFFFF', 0.8) },
          }}
        >
          <ArrowBackIcon sx={{ fontSize: 16 }} />
        </IconButton>
        <Avatar
          sx={{
            width: 36,
            height: 36,
            bgcolor: alpha(brand[400], 0.25),
            color: brand[700],
            fontWeight: 700,
            fontSize: '0.9rem',
          }}
        >
          {initial}
        </Avatar>
        <Typography sx={{ fontWeight: 800, fontSize: '1.05rem', color: brand[700] }}>
          {recipientName}
        </Typography>
      </Box>

      {/* Messages area */}
      <Box
        ref={scrollRef}
        sx={{
          flex: 1,
          overflowY: 'auto',
          px: 2,
          py: 2,
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
        }}
      >
        {sorted.length === 0 ? (
          <Box
            sx={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              textAlign: 'center',
              py: 6,
            }}
          >
            <Typography sx={{ fontSize: '3rem', mb: 1 }}>💌</Typography>
            <Typography sx={{ fontWeight: 700, color: brand[600], fontSize: '1rem', mb: 0.5 }}>
              No messages yet!
            </Typography>
            <Typography sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>
              Say hi to {recipientName} to start chatting
            </Typography>
          </Box>
        ) : (
          groups.map((group) => (
            <Box key={group.label} sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 0.5 }}>
                <Typography
                  sx={{
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    color: brand[600],
                    bgcolor: alpha(brand[100], 0.7),
                    px: 1.5,
                    py: 0.3,
                    borderRadius: 3,
                  }}
                >
                  {group.label}
                </Typography>
              </Box>
              {group.msgs.map((m, i) => (
                <MessageBubble
                  key={m.id}
                  message={m}
                  isMine={m.sender_id === user?.id}
                  initial={m.sender_id === user?.id ? 'Me' : initial}
                  index={i}
                />
              ))}
            </Box>
          ))
        )}
      </Box>

      {/* Quick replies (members) */}
      {isMemberAccount && (
        <Box sx={{ px: 2, pb: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5, flexShrink: 0 }}>
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
                '&:hover': { bgcolor: brand[100] },
              }}
            />
          ))}
        </Box>
      )}

      {/* Input bar */}
      <Box
        sx={{
          px: 2,
          pb: 2,
          pt: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          borderTop: `1px solid ${alpha(brand[200], 0.3)}`,
          flexShrink: 0,
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
              fontSize: isMemberAccount ? '1rem' : '0.88rem',
              minHeight: isMemberAccount ? 48 : 42,
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
            width: isMemberAccount ? 48 : 42,
            height: isMemberAccount ? 48 : 42,
            borderRadius: '50%',
            p: 0,
            flexShrink: 0,
            background: `linear-gradient(135deg, ${brand[400]}, ${accent[300]})`,
            transition: 'transform 0.15s ease',
            '&:hover:not(:disabled)': { transform: 'scale(1.1)' },
          }}
        >
          <SendIcon sx={{ fontSize: 18 }} />
        </Button>
      </Box>
    </>
  );
}
