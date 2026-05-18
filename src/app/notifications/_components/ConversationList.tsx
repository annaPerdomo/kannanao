'use client';

import AddIcon from '@mui/icons-material/Add';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import ForumRoundedIcon from '@mui/icons-material/ForumRounded';
import SearchIcon from '@mui/icons-material/Search';
import {
  Avatar,
  Box,
  Button,
  Chip,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { timeAgo } from '@/components/Group/MessageThread/constants';
import { StyledDialog } from '@/components/StyledDialog';
import type { DirectMessage } from '@/hooks/useDirectMessages';
import { sb } from '@/lib/supabase';

/* ── Helpers ─────────────────────────────────────────────────────────── */

interface Conversation {
  recipientId: string;
  recipientName: string;
  lastMessage: DirectMessage;
  unreadCount: number;
}

function getConversations(messages: DirectMessage[], userId: string): Conversation[] {
  const map = new Map<string, { msgs: DirectMessage[]; name: string }>();
  for (const m of messages) {
    const isFromMe = m.sender_id === userId;
    const otherId = isFromMe ? m.recipient_id : m.sender_id;
    const other = isFromMe ? m.recipient : m.sender;
    const name = other?.display_name || other?.username || 'Member';
    if (!map.has(otherId)) map.set(otherId, { msgs: [], name });
    map.get(otherId)!.msgs.push(m);
  }
  return Array.from(map.entries()).map(([recipientId, { msgs, name }]) => ({
    recipientId,
    recipientName: name,
    lastMessage: msgs[0],
    unreadCount: msgs.filter((m) => !m.read_at && m.recipient_id === userId).length,
  }));
}

export interface Peer {
  id: string;
  username: string;
  display_name: string | null;
  role: string;
}

/* ── Component ───────────────────────────────────────────────────────── */

interface ConversationListProps {
  messages: DirectMessage[];
  userId: string;
  selectedId?: string;
}

export function ConversationList({ messages, userId, selectedId }: ConversationListProps) {
  const router = useRouter();
  const theme = useTheme();
  const { brand, accent } = theme.palette;

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

  const conversations = getConversations(messages, userId);
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
            Messages
          </Typography>
        </Box>

        {/* Search */}
        <TextField
          size="small"
          fullWidth
          placeholder="Search chats..."
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
            New message
          </Button>
        )}
      </Box>

      {/* Scrollable conversation list */}
      <Box sx={{ flex: 1, overflowY: 'auto', px: 2, pb: 2 }}>
        <Stack spacing={1}>
          {filtered.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <ChatBubbleOutlineIcon sx={{ fontSize: '2rem', color: brand[300], mb: 0.5 }} />
              <Typography sx={{ fontWeight: 700, color: brand[600], fontSize: '0.85rem' }}>
                {search ? 'No matches' : 'No messages yet'}
              </Typography>
              <Typography sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>
                {search ? 'Try a different search' : 'Tap "New message" to start chatting!'}
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
                  <Avatar
                    sx={{
                      width: 38,
                      height: 38,
                      bgcolor: alpha(brand[400], 0.25),
                      color: brand[700],
                      fontWeight: 700,
                      fontSize: '0.85rem',
                    }}
                  >
                    {c.recipientName.charAt(0).toUpperCase()}
                  </Avatar>
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
                        {timeAgo(c.lastMessage.created_at)}
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
                      {c.lastMessage.sender_id === userId ? 'You: ' : ''}
                      {c.lastMessage.message || (c.lastMessage.image_url ? '📷 Photo' : '')}
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
        title="New message"
        subtitle="Choose someone to chat with"
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
                <Avatar
                  sx={{
                    width: 36,
                    height: 36,
                    bgcolor: alpha(brand[400], 0.25),
                    color: brand[700],
                    fontWeight: 700,
                    fontSize: '0.85rem',
                  }}
                >
                  {(p.display_name || p.username).charAt(0).toUpperCase()}
                </Avatar>
                <Typography
                  sx={{ fontWeight: 700, fontSize: '0.88rem', color: brand[700], flex: 1 }}
                >
                  {p.display_name || p.username}
                </Typography>
                {p.role === 'organizer' && (
                  <Chip
                    label="Organizer"
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
