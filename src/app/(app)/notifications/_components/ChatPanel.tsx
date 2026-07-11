'use client';

import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CloseIcon from '@mui/icons-material/Close';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import SendIcon from '@mui/icons-material/Send';
import {
  Alert,
  Avatar,
  Box,
  Button,
  CircularProgress,
  IconButton,
  Skeleton,
  TextField,
  Typography,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { groupByDate } from '@/components/Group/MessageThread/constants';
import { MessageBubble } from '@/components/Group/MessageThread/MessageBubble';
import { TypingBubble } from '@/components/Group/MessageThread/TypingBubble';
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
  const {
    messages,
    sendMessage,
    markAllAsRead,
    toggleReaction,
    loading,
    hasMore,
    loadingOlder,
    loadOlder,
  } = useDirectMessages(recipientId);
  const {
    messages: globalMessages,
    refetch: refetchGlobal,
    setActiveConversation,
  } = useDirectMessagesCtx();

  // Tell the global provider which chat is on screen so incoming messages from
  // this person don't bump the nav badge / app icon badge while being read.
  useEffect(() => {
    setActiveConversation(recipientId);
    return () => setActiveConversation(null);
  }, [recipientId, setActiveConversation]);

  // While this thread loads, show whatever the global provider already has for
  // this conversation — switching chats from the list paints instantly instead
  // of waiting a network round trip.
  const seededMessages = useMemo(
    () =>
      loading
        ? globalMessages.filter(
            (m) => m.sender_id === recipientId || m.recipient_id === recipientId,
          )
        : null,
    [loading, globalMessages, recipientId],
  );
  const displayMessages = loading && seededMessages?.length ? seededMessages : messages;

  const tick = useTick();
  const { isRecipientTyping, sendTyping } = useTypingIndicator(recipientId);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
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

  // Restores the viewport after older messages are prepended: position is
  // captured before the fetch and re-applied against the new scrollHeight.
  const pendingPrependRef = useRef<{ height: number; top: number } | null>(null);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    pinnedRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    // Near the top — pull the next page of history (endless scroll-back)
    if (el.scrollTop < 80 && hasMore && !loadingOlder && !loading && !pendingPrependRef.current) {
      pendingPrependRef.current = { height: el.scrollHeight, top: el.scrollTop };
      void loadOlder().then((added) => {
        // Nothing rendered means no restore effect will consume the marker
        if (!added) pendingPrependRef.current = null;
      });
    }
  }, [hasMore, loadingOlder, loading, loadOlder]);

  // Jump to the newest message when the thread loads or a new message arrives,
  // unless the user has scrolled up to read history.
  const latestMsgId = displayMessages[0]?.id;
  const oldestMsgId = displayMessages[displayMessages.length - 1]?.id;
  useLayoutEffect(() => {
    if (!latestMsgId) return;
    if (pinnedRef.current) scrollToBottom();
  }, [latestMsgId, scrollToBottom]);

  // After a page of history renders, put the viewport back where it was so
  // the prepended messages don't yank the visible thread downward.
  useLayoutEffect(() => {
    const pending = pendingPrependRef.current;
    const el = scrollRef.current;
    if (!pending || !el) return;
    pendingPrependRef.current = null;
    el.scrollTop = pending.top + (el.scrollHeight - pending.height);
  }, [oldestMsgId]);

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
    pendingPrependRef.current = null;
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
    setSendError(null);
    clearImage();
  }, [recipientId, clearImage]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    e.target.value = '';
  };

  const handleSend = async () => {
    const message = text.trim();
    if ((!message && !imageFile) || sending) return;
    setSending(true);
    setSendError(null);
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
    } catch (err) {
      // Keep the draft text/image so the user can retry
      setSendError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  // The chrome (header, input bar) always renders immediately — only the
  // message area waits for data. Swapping a full-screen spinner for the whole
  // panel was a large layout shift on every open.
  const showSkeleton = loading && displayMessages.length === 0;
  const sorted = [...displayMessages].reverse();
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
          {loadingOlder && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
              <CircularProgress size={20} sx={{ color: brand[400] }} />
            </Box>
          )}
          {showSkeleton ? (
            <Box
              sx={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
                gap: 1.5,
              }}
            >
              {[
                { w: '55%', h: 44, mine: false },
                { w: '40%', h: 36, mine: true },
                { w: '60%', h: 64, mine: false },
                { w: '45%', h: 36, mine: true },
                { w: '50%', h: 44, mine: false },
              ].map((s, i) => (
                <Skeleton
                  key={i}
                  variant="rounded"
                  width={s.w}
                  height={s.h}
                  sx={{
                    alignSelf: s.mine ? 'flex-end' : 'flex-start',
                    borderRadius: 4,
                    bgcolor: alpha(brand[200], 0.35),
                  }}
                />
              ))}
            </Box>
          ) : sorted.length === 0 ? (
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

        {/* Send failure — keep the draft and let the user retry */}
        {sendError && (
          <Box sx={{ px: 2, pt: 1 }}>
            <Alert
              severity="error"
              onClose={() => setSendError(null)}
              sx={{ borderRadius: 2.5, fontSize: '0.8rem', py: 0.25 }}
            >
              {sendError}
            </Alert>
          </Box>
        )}

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
