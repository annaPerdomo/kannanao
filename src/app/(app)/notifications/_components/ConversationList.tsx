'use client';

import AddIcon from '@mui/icons-material/Add';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import ForumRoundedIcon from '@mui/icons-material/ForumRounded';
import SearchIcon from '@mui/icons-material/Search';
import {
  Box,
  Button,
  Chip,
  InputAdornment,
  Paper,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';

import { timeAgoInfo } from '@/components/Group/MessageThread/constants';
import { StyledDialog } from '@/components/StyledDialog';
import { UserAvatar } from '@/components/UserAvatar';
import type { DirectMessage } from '@/hooks/useDirectMessages';
import { parseSticker } from '@/lib/stickers';
import { sb } from '@/lib/supabase';

/* ── Helpers ─────────────────────────────────────────────────────────── */

interface Conversation {
  recipientId: string;
  recipientName: string;
  recipientAvatar: string | null;
  lastMessage: DirectMessage;
  unreadCount: number;
}

function getConversations(
  messages: DirectMessage[],
  userId: string,
  memberFallback: string,
): Conversation[] {
  const map = new Map<string, { msgs: DirectMessage[]; name: string; avatar: string | null }>();
  for (const m of messages) {
    const isFromMe = m.sender_id === userId;
    const otherId = isFromMe ? m.recipient_id : m.sender_id;
    const other = isFromMe ? m.recipient : m.sender;
    const name = other?.display_name || other?.username || memberFallback;
    if (!map.has(otherId)) map.set(otherId, { msgs: [], name, avatar: other?.avatar ?? null });
    map.get(otherId)!.msgs.push(m);
  }
  return Array.from(map.entries()).map(([recipientId, { msgs, name, avatar }]) => ({
    recipientId,
    recipientName: name,
    recipientAvatar: avatar,
    lastMessage: msgs[0],
    unreadCount: msgs.filter((m) => !m.read_at && m.recipient_id === userId).length,
  }));
}

export interface Peer {
  id: string;
  username: string;
  display_name: string | null;
  avatar?: string | null;
  role: string;
}

/* ── Component ───────────────────────────────────────────────────────── */

interface ConversationListProps {
  messages: DirectMessage[];
  userId: string;
  selectedId?: string;
  loading?: boolean;
}

export function ConversationList({
  messages,
  userId,
  selectedId,
  loading = false,
}: ConversationListProps) {
  const t = useTranslations('Messages.conversationList');
  const tThread = useTranslations('Group.messageThread');
  const router = useRouter();
  const theme = useTheme();
  const { brand, accent } = theme.palette;

  /** One-line preview of a conversation's newest message. Media and stickers
   * have no text to show, so they get a labelled stand-in instead. */
  const renderPreview = (m: DirectMessage) => {
    if (m.video_url) return t('videoFallback');
    if (m.image_url) return t('photoFallback');
    const sticker = parseSticker(m.message);
    if (sticker) return t('stickerFallback', { emoji: sticker.emoji });
    return m.message || '';
  };

  const renderTimeAgo = (dateStr: string) => {
    const info = timeAgoInfo(dateStr);
    switch (info.unit) {
      case 'justNow':
        return tThread('justNow');
      case 'minutes':
        return tThread('minutesAgo', { minutes: info.value });
      case 'hours':
        return tThread('hoursAgo', { hours: info.value });
      case 'yesterday':
        return tThread('yesterday');
      case 'days':
        return tThread('daysAgo', { days: info.value });
    }
  };

  const [search, setSearch] = useState('');
  const [newMsgOpen, setNewMsgOpen] = useState(false);
  const [peers, setPeers] = useState<Peer[]>([]);

  const fetchPeers = useCallback(async () => {
    const { data } = await sb.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return;
    try {
      const res = await fetch('/api/group/peers', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setPeers(await res.json());
    } catch {
      /* silent */
    }
  }, []);

  useEffect(() => {
    void fetchPeers();
  }, [fetchPeers]);

  const conversations = getConversations(messages, userId, t('memberFallback'));
  const filtered = search.trim()
    ? conversations.filter((c) => c.recipientName.toLowerCase().includes(search.toLowerCase()))
    : conversations;

  const navigateTo = useCallback(
    (id: string) => {
      router.push(`/notifications/${id}`);
    },
    [router],
  );

  const startNewConversation = (peer: Peer) => {
    setNewMsgOpen(false);
    navigateTo(peer.id);
  };

  return (
    <>
      {/* Header area */}
      <Box sx={{ px: 2, pt: 2, pb: 1, flexShrink: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
          <ForumRoundedIcon sx={{ fontSize: 22, color: brand[500] }} />
          <Typography sx={{ fontWeight: 800, fontSize: '1.2rem', color: brand[700] }}>
            {t('heading')}
          </Typography>
        </Box>

        {/* Search */}
        <TextField
          size="small"
          fullWidth
          placeholder={t('searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 18, color: brand[400] }} />
                </InputAdornment>
              ),
            },
          }}
          sx={{
            mb: 1,
            '& .MuiOutlinedInput-root': {
              borderRadius: 3,
              bgcolor: alpha(brand[50], 0.5),
              fontSize: '0.85rem',
            },
          }}
        />

        {/* New message button */}
        {peers.length > 0 && (
          <Button
            startIcon={<AddIcon />}
            onClick={() => setNewMsgOpen(true)}
            size="small"
            fullWidth
            variant="outlined"
            sx={{
              mb: 1,
              textTransform: 'none',
              fontWeight: 700,
              fontSize: '0.8rem',
              color: brand[700],
              borderColor: alpha(brand[400], 0.5),
              borderRadius: 2.5,
              '&:hover': { bgcolor: alpha(brand[100], 0.5) },
            }}
          >
            {t('newMessageButton')}
          </Button>
        )}
      </Box>

      {/* Scrollable conversation list */}
      <Box sx={{ flex: 1, overflowY: 'auto', px: 2, pb: 2 }}>
        <Stack spacing={1}>
          {loading && messages.length === 0 ? (
            // Skeleton rows sized like real conversation cards so the list
            // doesn't shift when data arrives
            Array.from({ length: 4 }, (_, i) => (
              <Paper
                key={i}
                sx={{
                  p: 1.5,
                  borderRadius: 2.5,
                  border: `1.5px solid ${alpha(brand[300], 0.25)}`,
                  bgcolor: alpha(brand[50], 0.2),
                }}
              >
                <Stack direction="row" alignItems="center" spacing={1.5}>
                  <Skeleton variant="circular" width={46} height={46} />
                  <Box sx={{ flex: 1 }}>
                    <Skeleton variant="text" width="50%" sx={{ fontSize: '0.85rem' }} />
                    <Skeleton variant="text" width="75%" sx={{ fontSize: '0.75rem' }} />
                  </Box>
                </Stack>
              </Paper>
            ))
          ) : filtered.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <ChatBubbleOutlineIcon sx={{ fontSize: '2rem', color: brand[300], mb: 0.5 }} />
              <Typography sx={{ fontWeight: 700, color: brand[600], fontSize: '0.85rem' }}>
                {search ? t('noMatches') : t('noMessagesYet')}
              </Typography>
              <Typography sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>
                {search ? t('tryDifferentSearch') : t('tapNewMessage')}
              </Typography>
            </Box>
          ) : (
            filtered.map((c) => (
              <Paper
                key={c.recipientId}
                onClick={() => navigateTo(c.recipientId)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') navigateTo(c.recipientId);
                }}
                sx={{
                  p: 1.5,
                  borderRadius: 2.5,
                  border: `1.5px solid ${
                    selectedId === c.recipientId
                      ? alpha(brand[500], 0.5)
                      : c.unreadCount > 0
                        ? alpha(brand[400], 0.4)
                        : alpha(brand[300], 0.25)
                  }`,
                  bgcolor:
                    selectedId === c.recipientId
                      ? alpha(brand[200], 0.4)
                      : c.unreadCount > 0
                        ? alpha(brand[100], 0.4)
                        : alpha(brand[50], 0.2),
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  '&:hover': { bgcolor: alpha(brand[100], 0.6) },
                }}
              >
                <Stack direction="row" alignItems="center" spacing={1.5}>
                  <UserAvatar avatar={c.recipientAvatar} name={c.recipientName} size={46} />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                      <Typography
                        sx={{
                          fontWeight: c.unreadCount > 0 ? 800 : 700,
                          fontSize: '0.85rem',
                          color: brand[700],
                        }}
                      >
                        {c.recipientName}
                      </Typography>
                      <Typography sx={{ fontSize: '0.6rem', color: 'text.secondary' }}>
                        {renderTimeAgo(c.lastMessage.created_at)}
                      </Typography>
                    </Stack>
                    <Typography
                      noWrap
                      sx={{
                        fontSize: '0.75rem',
                        color: 'text.secondary',
                        mt: 0.25,
                        fontWeight: c.unreadCount > 0 ? 600 : 400,
                      }}
                    >
                      {c.lastMessage.sender_id === userId ? t('youPrefix') : ''}
                      {renderPreview(c.lastMessage)}
                    </Typography>
                  </Box>
                  {c.unreadCount > 0 && (
                    <Box
                      sx={{
                        minWidth: 20,
                        height: 20,
                        borderRadius: '50%',
                        bgcolor: 'error.main',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      {c.unreadCount}
                    </Box>
                  )}
                </Stack>
              </Paper>
            ))
          )}
        </Stack>
      </Box>

      {/* Peer picker dialog */}
      <StyledDialog
        open={newMsgOpen}
        onClose={() => setNewMsgOpen(false)}
        title={t('newMessageDialogTitle')}
        subtitle={t('newMessageDialogSubtitle')}
        icon={<ChatBubbleOutlineIcon sx={{ color: brand[600], fontSize: 22 }} />}
        maxWidth="xs"
      >
        <Stack spacing={1}>
          {peers.map((p) => (
            <Paper
              key={p.id}
              onClick={() => startNewConversation(p)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') startNewConversation(p);
              }}
              sx={{
                p: 1.5,
                borderRadius: 2.5,
                border: `1.5px solid ${alpha(brand[300], 0.3)}`,
                bgcolor: alpha(brand[50], 0.3),
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                '&:hover': { bgcolor: alpha(brand[100], 0.6) },
              }}
            >
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <UserAvatar avatar={p.avatar} name={p.display_name || p.username} size={44} />
                <Typography
                  sx={{ fontWeight: 700, fontSize: '0.88rem', color: brand[700], flex: 1 }}
                >
                  {p.display_name || p.username}
                </Typography>
                {p.role === 'organizer' && (
                  <Chip
                    label={t('organizerChip')}
                    size="small"
                    sx={{
                      height: 22,
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      bgcolor: alpha(accent[200], 0.5),
                      color: accent[700],
                    }}
                  />
                )}
              </Stack>
            </Paper>
          ))}
        </Stack>
      </StyledDialog>
    </>
  );
}
