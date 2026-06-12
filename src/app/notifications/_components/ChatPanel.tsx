'use client';

import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CloseIcon from '@mui/icons-material/Close';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import SendIcon from '@mui/icons-material/Send';
import { Avatar, Box, Button, Chip, IconButton, TextField, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

import { groupByDate, QUICK_MESSAGES_MEMBER } from '@/components/Group/MessageThread/constants';
import { MessageBubble } from '@/components/Group/MessageThread/MessageBubble';
import { TypingBubble } from '@/components/Group/MessageThread/TypingBubble';
import { Loading } from '@/components/Loading';
import { useAuth } from '@/contexts/AuthContext';
import { useDirectMessagesCtx } from '@/contexts/DirectMessagesContext';
import { useDirectMessages } from '@/hooks/useDirectMessages';
import { useTick } from '@/hooks/useTick';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';
import { sb } from '@/lib/supabase';

import { SendingIndicator, sendPulse } from './SendingIndicator';

interface ChatPanelProps {
  recipientId: string;
  recipientName: string;
  isMemberAccount: boolean;
}

export function ChatPanel({ recipientId, recipientName, isMemberAccount }: ChatPanelProps) {
  const router = useRouter();
  const theme = useTheme();
  const { brand, accent } = theme.palette;
  const { user } = useAuth();
  const { messages, sendMessage, markAllAsRead, toggleReaction, loading } =
    useDirectMessages(recipientId);
  const { refetch: refetchGlobal } = useDirectMessagesCtx();

  const tick = useTick();
  const { isRecipientTyping, sendTyping } = useTypingIndicator(recipientId);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Whether the view should stay glued to the newest message. True until the
  // user deliberately scrolls up; restored when they scroll back down or send.
  const pinnedRef = useRef(true);
  // Finger on the list — never programmatically move the scroll mid-gesture
  const touchingRef = useRef(false);
  // Messages that existed when the thread was opened render without the
  // slide-in animation; only genuinely new arrivals animate.
  const openedAtRef = useRef<number>(Date.now());

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

  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    pinnedRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  }, []);

  // Jump to the newest message when the thread loads or a new message arrives,
  // unless the user has scrolled up to read history.
  const latestMsgId = messages[0]?.id;
  useLayoutEffect(() => {
    if (loading || !latestMsgId) return;
    if (pinnedRef.current) scrollToBottom();
  }, [loading, latestMsgId, scrollToBottom]);

  // Stay pinned while content shifts after the initial scroll (the on-screen
  // keyboard resizing the viewport, the typing indicator appearing) — but
  // never while the user's finger is on the list.
  useEffect(() => {
    if (loading) return;
    const scrollEl = scrollRef.current;
    const contentEl = contentRef.current;
    if (!scrollEl || !contentEl || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => {
      if (pinnedRef.current && !touchingRef.current) scrollToBottom();
    });
    ro.observe(scrollEl);
    ro.observe(contentEl);
    return () => ro.disconnect();
  }, [loading, scrollToBottom]);

  // Re-pin and re-stamp the open time when switching conversations — anything
  // created before this moment is history and renders without animation.
  useEffect(() => {
    pinnedRef.current = true;
    openedAtRef.current = Date.now();
  }, [recipientId]);

  // Mark messages as read when unread messages appear in the open conversation
  useEffect(() => {
    if (hasUnread) {
      void markAndSync().catch(() => {});
    }
  }, [hasUnread, markAndSync]);

  const clearImage = useCallback(() => {
    setImagePreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setImageFile(null);
  }, []);

  // Reset input when switching conversations
  useEffect(() => {
    setText('');
    clearImage();
  }, [recipientId, clearImage]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    e.target.value = '';
  };

  const handleSend = async (msg?: string) => {
    const message = msg ?? text.trim();
    if ((!message && !imageFile) || sending) return;
    setSending(true);
    try {
      let imageUrl: string | undefined;
      if (imageFile) {
        const buf = await imageFile.arrayBuffer();
        const base64 = btoa(new Uint8Array(buf).reduce((s, b) => s + String.fromCharCode(b), ''));
        const { data: sess } = await sb.auth.getSession();
        const token = sess.session?.access_token;
        const res = await fetch('/api/messages/upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ base64, mimeType: imageFile.type }),
        });
        if (!res.ok) throw new Error('Image upload failed');
        const { url } = await res.json();
        imageUrl = url;
      }
      await sendMessage(recipientId, message, imageUrl);
      setText('');
      clearImage();
      // Sending always returns the view to the newest message
      pinnedRef.current = true;
      scrollToBottom();
      // Sync sent message to global context so conversation list updates
      void refetchGlobalRef.current().catch(() => {});
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
          onClick={() => router.push('/notifications')}
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
        onScroll={handleScroll}
        onTouchStart={() => {
          touchingRef.current = true;
        }}
        onTouchEnd={() => {
          touchingRef.current = false;
        }}
        onTouchCancel={() => {
          touchingRef.current = false;
        }}
        sx={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          px: 2,
          py: 2,
          // Manual pinning owns the scroll position — don't let the browser's
          // scroll anchoring fight it when content changes
          overflowAnchor: 'none',
        }}
      >
        <Box
          ref={contentRef}
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
            minHeight: '100%',
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
                    tick={tick}
                    userId={user?.id}
                    onReact={toggleReaction}
                    animate={new Date(m.created_at).getTime() > openedAtRef.current}
                  />
                ))}
              </Box>
            ))
          )}
          {isRecipientTyping && <TypingBubble initial={initial} />}
        </Box>
      </Box>

      {/* Footer area — quick replies, image preview, input bar */}
      <Box
        sx={{
          flexShrink: 0,
          bgcolor: alpha(brand[50], 0.6),
          borderTop: `1px solid ${alpha(brand[200], 0.4)}`,
          backdropFilter: 'blur(8px)',
        }}
      >
        {/* Quick replies (members) */}
        {isMemberAccount && (
          <Box
            sx={{
              px: 2,
              pt: 1,
              pb: 0.5,
              display: 'flex',
              gap: 0.5,
              overflowX: 'auto',
              WebkitOverflowScrolling: 'touch',
              scrollbarWidth: 'none',
              '&::-webkit-scrollbar': { display: 'none' },
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
                  flexShrink: 0,
                  borderColor: alpha(brand[300], 0.5),
                  color: brand[700],
                  bgcolor: alpha(brand[50], 0.5),
                  '&:hover': { bgcolor: brand[100] },
                }}
              />
            ))}
          </Box>
        )}

        {/* Image preview */}
        {imagePreview && (
          <Box sx={{ px: 2, pt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              sx={{
                position: 'relative',
                width: 64,
                height: 64,
                borderRadius: 2,
                overflow: 'hidden',
                border: `1.5px solid ${alpha(brand[300], 0.5)}`,
                flexShrink: 0,
              }}
            >
              <Box
                component="img"
                src={imagePreview}
                alt="Selected"
                sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <IconButton
                size="small"
                onClick={clearImage}
                aria-label="Remove image"
                sx={{
                  position: 'absolute',
                  top: 2,
                  right: 2,
                  width: 18,
                  height: 18,
                  bgcolor: alpha('#000', 0.5),
                  color: '#fff',
                  '&:hover': { bgcolor: alpha('#000', 0.7) },
                }}
              >
                <CloseIcon sx={{ fontSize: 12 }} />
              </IconButton>
            </Box>
            <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
              {imageFile?.name}
            </Typography>
          </Box>
        )}

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleImageSelect}
          style={{ display: 'none' }}
        />

        {/* Sending indicator */}
        {sending && (
          <SendingIndicator
            brandColor={brand[400]}
            accentColor={accent[300]}
            brandTextColor={brand[500]}
          />
        )}

        {/* Input bar */}
        <Box
          sx={{
            px: 2,
            pb: { xs: 1.5, sm: 1.5 },
            pt: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <IconButton
            onClick={() => fileInputRef.current?.click()}
            disabled={sending}
            aria-label="Attach photo"
            size="small"
            sx={{
              color: brand[500],
              flexShrink: 0,
              '&:hover': { color: brand[700], bgcolor: alpha(brand[100], 0.5) },
            }}
          >
            <PhotoCameraIcon sx={{ fontSize: isMemberAccount ? 24 : 20 }} />
          </IconButton>
          <TextField
            size="small"
            fullWidth
            placeholder="Type a message..."
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              if (e.target.value.trim()) sendTyping();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void handleSend();
              }
            }}
            disabled={sending}
            slotProps={{ htmlInput: { maxLength: 500 } }}
            sx={{
              // Identical to the message-bubble text (the theme defaults
              // TextField input to 0.9rem / weight 600, which reads bigger)
              '& .MuiInputBase-root': {
                fontSize: '1rem',
                fontWeight: 500,
                lineHeight: 1.45,
                minHeight: isMemberAccount ? 48 : 42,
              },
            }}
          />
          <Button
            variant="contained"
            onClick={() => void handleSend()}
            disabled={sending || (!text.trim() && !imageFile)}
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
              ...(sending && {
                animation: `${sendPulse} 1s ease-in-out infinite`,
                '&.Mui-disabled': {
                  background: `linear-gradient(135deg, ${brand[400]}, ${accent[300]})`,
                  color: '#fff',
                },
              }),
            }}
          >
            <SendIcon sx={{ fontSize: 18 }} />
          </Button>
        </Box>
      </Box>
      {/* end footer */}
    </>
  );
}
