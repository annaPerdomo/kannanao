'use client';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import CheckIcon from '@mui/icons-material/Check';
import DragIndicatorRoundedIcon from '@mui/icons-material/DragIndicatorRounded';
import StorefrontIcon from '@mui/icons-material/Storefront';
import TuneIcon from '@mui/icons-material/Tune';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import GlobalStyles from '@mui/material/GlobalStyles';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import LinearProgress from '@mui/material/LinearProgress';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useRef, useState } from 'react';
import type { Layout as RGLLayout } from 'react-grid-layout';
import { GridLayout } from 'react-grid-layout';

import { CustomizeHomeDialog } from '@/components/CustomizeHomeDialog';
import { DeckCard } from '@/components/DeckCard';
import {
  AssignmentCard,
  GroupHomeWidget,
  LeaderboardWidget,
  MessageThread,
} from '@/components/Group';
import { Loading } from '@/components/Loading';
import { PageHeader } from '@/components/PageHeader';
import { ShareEmbedDialog } from '@/components/ShareEmbedDialog';
import { TodoList } from '@/components/TodoList';
import { useAuth } from '@/contexts/AuthContext';
import { useDirectMessagesCtx } from '@/contexts/DirectMessagesContext';
import { useProgressCtx } from '@/contexts/ProgressContext';
import { useShopCtx } from '@/contexts/ShopContext';
import { useAssignments } from '@/hooks/useAssignments';
import { useDecks } from '@/hooks/useDecks';
import { useGroupMembers } from '@/hooks/useGroup';
import { useGroupLeaderboard } from '@/hooks/useGroupLeaderboard';
import { useGroups } from '@/hooks/useGroups';
import { useOhanashikais } from '@/hooks/useOhanashikais';
import { xpProgressInLevel } from '@/hooks/useProgress';
import { SHOP_ITEMS } from '@/hooks/useShop';
import { LAYOUT } from '@/theme';
import type { SectionKey } from '@/types/homeSections';
import {
  getSectionsForRole,
  resolveGridLayout,
  resolveSectionOrder,
  SECTION_META,
} from '@/types/homeSections';

function getGreeting(name: string): { text: string; emoji: string } {
  const h = new Date().getHours();
  if (h < 12) return { text: `Good morning, ${name}!`, emoji: '🌸' };
  if (h < 17) return { text: `Hey there, ${name}!`, emoji: '☀️' };
  return { text: `Good evening, ${name}!`, emoji: '🌙' };
}

function WelcomeBanner({
  username,
  level,
  streak,
  totalXp,
  spendableXp,
  ownedItemKeys,
  onShopClick,
}: {
  username: string;
  level: number;
  streak: number;
  totalXp: number;
  spendableXp: number;
  ownedItemKeys: string[];
  onShopClick: () => void;
}) {
  const { text, emoji } = getGreeting(username);
  const { current, needed } = xpProgressInLevel(totalXp);
  const pct = Math.round((current / needed) * 100);
  const theme = useTheme();
  const { brand, accent } = theme.palette;

  const nextItem =
    SHOP_ITEMS.filter((i) => i.price > 0 && !ownedItemKeys.includes(i.key)).sort(
      (a, b) => a.price - b.price,
    )[0] ?? null;
  const xpNeeded = nextItem ? Math.max(0, nextItem.price - spendableXp) : 0;

  return (
    <PageHeader
      emoji={emoji}
      title={text}
      gradientTitle
      mb={1.5}
      endContent={
        <Box
          role="button"
          onClick={onShopClick}
          sx={{
            minWidth: { sm: 220 },
            width: { xs: '100%', sm: 260 },
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            '& *': { pointerEvents: 'none' },
            '&:hover': { opacity: 0.85 },
            '@keyframes shimmer': {
              '0%': { backgroundPosition: '-200% 0' },
              '100%': { backgroundPosition: '200% 0' },
            },
          }}
        >
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.5}>
            <Typography variant="caption" sx={{ fontWeight: 700, color: brand[700] }}>
              XP Progress
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 700, color: brand[600] }}>
              {current} / {needed}
            </Typography>
          </Stack>
          <LinearProgress
            variant="determinate"
            value={pct}
            sx={{
              height: 12,
              borderRadius: 6,
              bgcolor: alpha(brand[200], 0.5),
              '& .MuiLinearProgress-bar': {
                borderRadius: 6,
                background: `linear-gradient(90deg, ${brand[400]}, ${accent[400]}, ${brand[300]}, ${accent[400]}, ${brand[400]})`,
                backgroundSize: '200% 100%',
                animation: 'shimmer 3s ease-in-out infinite',
                transition: 'width 0.6s ease',
              },
            }}
          />
          <Typography
            variant="caption"
            sx={{ color: brand[600], fontWeight: 600, mt: 0.5, display: 'block' }}
          >
            {needed - current} XP to level {level + 1} 🚀
          </Typography>

          <Box sx={{ mt: 1, pt: 1, borderTop: `1px solid ${alpha(brand[300], 0.25)}` }}>
            <Stack direction="row" alignItems="center" spacing={0.5} mb={nextItem ? 0.5 : 0}>
              <AutoAwesomeIcon sx={{ fontSize: '0.85rem', color: accent[500] }} />
              <Typography variant="caption" sx={{ fontWeight: 800, color: accent[600] }}>
                {spendableXp.toLocaleString()} XP to spend
              </Typography>
              <StorefrontIcon sx={{ fontSize: '0.85rem', color: brand[500], ml: 'auto' }} />
            </Stack>
            {nextItem && xpNeeded > 0 && (
              <Typography
                variant="caption"
                sx={{ color: brand[500], fontWeight: 600, fontSize: '0.7rem', display: 'block' }}
              >
                {nextItem.emoji} {nextItem.name} — {xpNeeded.toLocaleString()} more XP!
              </Typography>
            )}
          </Box>
        </Box>
      }
    >
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        <Chip
          label={`✨ Level ${level}`}
          size="small"
          sx={{
            fontWeight: 800,
            bgcolor: alpha(brand[100], 0.9),
            color: brand[700],
            border: `1.5px solid ${alpha(brand[400], 0.4)}`,
          }}
        />
        {streak > 0 && (
          <Chip
            label={`🔥 ${streak} day streak`}
            size="small"
            sx={{
              fontWeight: 800,
              bgcolor: 'rgba(251,191,36,0.15)',
              color: '#B45309',
              border: '1.5px solid rgba(251,191,36,0.35)',
            }}
          />
        )}
      </Stack>
    </PageHeader>
  );
}

function DashboardSection({
  id,
  editMode,
  onToggle,
  title,
  titleAction,
  children,
}: {
  id: string;
  editMode: boolean;
  onToggle: () => void;
  title?: React.ReactNode;
  titleAction?: React.ReactNode;
  children: React.ReactNode;
}) {
  const meta = SECTION_META[id as SectionKey];

  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        ...(editMode && {
          borderRadius: 1,
          border: (t: { palette: { brand: Record<number, string> } }) =>
            `2px solid ${alpha(t.palette.brand[400], 0.5)}`,
          bgcolor: (t: { palette: { brand: Record<number, string> } }) =>
            alpha(t.palette.brand[100], 0.45),
          p: 1,
        }),
      }}
    >
      {(editMode || title) && (
        <Stack
          className={editMode ? 'rgl-drag-handle' : undefined}
          direction="row"
          alignItems="center"
          sx={{
            flexShrink: 0,
            mb: 1,
            ...(editMode && {
              cursor: 'grab',
              '&:active': { cursor: 'grabbing' },
            }),
          }}
        >
          {editMode && (
            <DragIndicatorRoundedIcon
              sx={{
                fontSize: '1.1rem',
                color: (t) => t.palette.brand[600],
                mr: 0.5,
                flexShrink: 0,
              }}
            />
          )}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            {title ?? (
              <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 800 }} noWrap>
                {meta.emoji} {meta.label}
              </Typography>
            )}
          </Box>
          {editMode ? (
            <IconButton
              className="rgl-no-drag"
              aria-label={`Hide ${meta.label}`}
              onClick={onToggle}
              size="small"
              sx={{
                p: 0.5,
                ml: 0.5,
                flexShrink: 0,
                color: (t) => t.palette.brand[600],
                '&:hover': {
                  color: (t) => t.palette.brand[700],
                  bgcolor: (t) => alpha(t.palette.brand[300], 0.2),
                },
              }}
            >
              <VisibilityOffIcon sx={{ fontSize: '0.9rem' }} />
            </IconButton>
          ) : (
            titleAction
          )}
        </Stack>
      )}
      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          pt: 2,
          pb: 2,
          px: 0.5,
          mx: -0.5,
          pointerEvents: editMode ? 'none' : 'auto',
          // Themed scrollbar
          scrollbarWidth: 'thin',
          scrollbarColor: (t) => `${alpha(t.palette.brand[300], 0.5)} transparent`,
          '&::-webkit-scrollbar': { width: 6 },
          '&::-webkit-scrollbar-track': {
            bgcolor: 'transparent',
            borderRadius: 3,
          },
          '&::-webkit-scrollbar-thumb': {
            bgcolor: (t) => alpha(t.palette.brand[300], 0.45),
            borderRadius: 3,
            '&:hover': {
              bgcolor: (t) => alpha(t.palette.brand[400], 0.7),
            },
          },
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

export default function Home() {
  const {
    user,
    displayName,
    homeSections,
    updateHomeSections,
    isMemberAccount,
    organizerId,
    groupShowLeaderboard,
  } = useAuth();
  const { decks, deleteDeck, pinDeck, setDeckPublic, updateDeckEmoji, loading } = useDecks(
    homeSections.decks,
  );
  const { progress, spendableXp, addBonusXp } = useProgressCtx();
  const {
    messages: dmMessages,
    unreadCount: dmUnreadCount,
    sendMessage,
    markAllAsRead: markAllDmRead,
  } = useDirectMessagesCtx();
  const { ohanashikais } = useOhanashikais(homeSections.speeches);
  const { purchases } = useShopCtx();
  const { assignments } = useAssignments(undefined, homeSections.assignments);
  const { groups } = useGroups(homeSections.groups);
  const { members: groupMembers } = useGroupMembers(undefined, homeSections.groups);
  const { leaderboard } = useGroupLeaderboard(undefined, homeSections.leaderboard);
  const router = useRouter();
  const ownedItemKeys = purchases.map((p) => p.item_key);

  const pendingAssignments = assignments.filter((a) => !a.completed_at);
  const [shareDeckId, setShareDeckId] = useState<string | null>(null);
  const [shareDeckName, setShareDeckName] = useState('');
  const [homeChatOpen, setHomeChatOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [customizeOpen, setCustomizeOpen] = useState(false);

  // Chat partner for member's home widget
  const homeChatPartner = (() => {
    if (!isMemberAccount) return null;
    const fromOrg = dmMessages.find((m) => m.sender_id !== user?.id);
    const toOrg = dmMessages.find((m) => m.sender_id === user?.id);
    return {
      id: organizerId ?? '',
      name:
        fromOrg?.sender?.display_name ||
        fromOrg?.sender?.username ||
        toOrg?.recipient?.display_name ||
        toOrg?.recipient?.username ||
        'Your organizer',
    };
  })();

  const username = displayName ?? user?.email?.split('@')[0] ?? 'there';
  const isOwner = (deck: { ownerId: string }) => deck.ownerId === user?.id;

  const pinnedDecks = decks.filter((d) => d.pinned);
  const pinnedSpeeches = ohanashikais.filter((o) => o.pinned);

  // ── Section order + drag ──
  const sectionOrder = useMemo(
    () => resolveSectionOrder(homeSections, isMemberAccount, groupShowLeaderboard),
    [homeSections, isMemberAccount, groupShowLeaderboard],
  );
  const roleKeys = useMemo(
    () => getSectionsForRole(isMemberAccount, groupShowLeaderboard),
    [isMemberAccount, groupShowLeaderboard],
  );
  const hiddenKeys = useMemo(
    () => [...roleKeys].filter((k) => !homeSections[k]),
    [roleKeys, homeSections],
  );

  // ── Grid layout (drag + resize) ──
  const isMobile = useMediaQuery('(max-width:899px)', { noSsr: true });
  const [gridWidth, setGridWidth] = useState(900);
  const roRef = useRef<ResizeObserver | null>(null);
  const gridRef = useCallback((node: HTMLDivElement | null) => {
    if (roRef.current) {
      roRef.current.disconnect();
      roRef.current = null;
    }
    if (!node) return;
    const w = node.clientWidth;
    if (w > 0) setGridWidth(w);
    roRef.current = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const cw = entry.contentRect.width;
        if (cw > 0) setGridWidth(cw);
      }
    });
    roRef.current.observe(node);
  }, []);

  const gridLayout = useMemo(() => {
    const full = resolveGridLayout(homeSections, isMemberAccount);
    const visible = new Set(sectionOrder);
    return full
      .filter((item) => visible.has(item.i as SectionKey))
      .map((item) => ({ ...item, minW: 3, minH: 3 }));
  }, [homeSections, isMemberAccount, sectionOrder]);

  const handleLayoutSave = useCallback(
    (layout: RGLLayout) => {
      const updatedItems = layout.map((l) => ({
        i: l.i,
        x: l.x,
        y: l.y,
        w: l.w,
        h: l.h,
      }));
      // Preserve layout items for hidden sections
      const visibleIds = new Set(layout.map((l) => l.i));
      const hiddenItems = (homeSections.gridLayout ?? []).filter((item) => !visibleIds.has(item.i));
      void updateHomeSections({
        ...homeSections,
        gridLayout: [...updatedItems, ...hiddenItems],
      });
    },
    [homeSections, updateHomeSections],
  );

  const handleResetLayout = useCallback(() => {
    void updateHomeSections({
      ...homeSections,
      gridLayout: undefined,
      sectionOrder: undefined,
      sectionWidths: undefined,
    });
  }, [homeSections, updateHomeSections]);

  const handleToggleSection = useCallback(
    (key: SectionKey) => {
      void updateHomeSections({ ...homeSections, [key]: !homeSections[key] });
    },
    [homeSections, updateHomeSections],
  );

  const sectionTitle = (key: SectionKey): React.ReactNode | undefined => {
    // TodoList renders its own header internally
    if (key === 'todo') return undefined;
    const meta = SECTION_META[key];
    return (
      <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 800 }} noWrap>
        {meta.emoji} {meta.label}
      </Typography>
    );
  };

  const sectionTitleAction = (key: SectionKey): React.ReactNode | undefined => {
    const navMap: Partial<Record<SectionKey, { label: string; href: string }>> = {
      groups: { label: 'All groups', href: '/group' },
      decks: { label: 'All decks', href: '/decks' },
      speeches: { label: 'All speeches', href: '/ohanashikai' },
    };
    const nav = navMap[key];
    if (!nav) return undefined;
    return (
      <Button
        size="small"
        variant="text"
        onClick={() => router.push(nav.href)}
        sx={{ fontSize: '0.75rem', color: 'text.secondary', flexShrink: 0, whiteSpace: 'nowrap' }}
      >
        {nav.label} →
      </Button>
    );
  };

  /** Returns section content — visibility/role filtering is handled by the grid layout */
  const renderSectionContent = (key: SectionKey): React.ReactNode => {
    switch (key) {
      case 'todo':
        return <TodoList onXpEarned={addBonusXp} />;

      case 'groups':
        return (
          <>
            {groups.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                Create a group to get started
              </Typography>
            ) : (
              <Stack spacing={1.5}>
                {(groups.filter((g) => g.pinned).length > 0
                  ? groups.filter((g) => g.pinned)
                  : groups.slice(0, 1)
                ).map((group) => (
                  <GroupHomeWidget
                    key={group.id}
                    members={groupMembers.filter(() => true)}
                    groupName={group.name}
                    groupEmoji={group.emoji ?? undefined}
                    onViewDashboard={() => router.push(`/group/${group.id}`)}
                  />
                ))}
              </Stack>
            )}
          </>
        );

      case 'leaderboard':
        return (
          <>
            {leaderboard.length > 1 ? (
              <LeaderboardWidget entries={leaderboard} compact />
            ) : (
              <Typography variant="body2" color="text.secondary">
                Check back when more people join!
              </Typography>
            )}
          </>
        );

      case 'assignments':
        return (
          <>
            {pendingAssignments.length > 0 ? (
              <Stack spacing={1}>
                {pendingAssignments.map((a) => (
                  <AssignmentCard
                    key={a.id}
                    assignment={a}
                    onStudy={(deckId) => router.push(`/deck/${deckId}`)}
                  />
                ))}
              </Stack>
            ) : (
              <Typography variant="body2" color="text.secondary">
                All caught up!
              </Typography>
            )}
          </>
        );

      case 'messages':
        return (
          <>
            {homeChatPartner ? (
              <Paper
                onClick={() => setHomeChatOpen(true)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') setHomeChatOpen(true);
                }}
                elevation={0}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  p: 2.5,
                  borderRadius: 3,
                  border: (t) =>
                    `1.5px solid ${alpha(t.palette.brand[dmUnreadCount > 0 ? 400 : 300], dmUnreadCount > 0 ? 0.6 : 0.35)}`,
                  bgcolor: (t) => alpha(t.palette.brand[dmUnreadCount > 0 ? 100 : 50], 0.5),
                  cursor: 'pointer',
                  transition: 'all 0.18s ease',
                  '&:hover': {
                    bgcolor: (t) => alpha(t.palette.brand[100], 0.8),
                    borderColor: (t) => alpha(t.palette.brand[400], 0.55),
                  },
                }}
              >
                <ChatBubbleOutlineIcon
                  sx={{ fontSize: '1.8rem', color: (t) => t.palette.brand[500] }}
                />
                <Box sx={{ flex: 1 }}>
                  <Typography sx={{ fontWeight: 700, color: 'text.primary', fontSize: '0.95rem' }}>
                    {dmUnreadCount > 0
                      ? `${dmUnreadCount} new message${dmUnreadCount > 1 ? 's' : ''}!`
                      : 'Send a message'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Tap to chat with {homeChatPartner.name}
                  </Typography>
                </Box>
              </Paper>
            ) : (
              <Typography variant="body2" color="text.secondary">
                No messages yet
              </Typography>
            )}
          </>
        );

      case 'decks':
        return (
          <>
            {pinnedDecks.length === 0 ? (
              <Box
                onClick={() => router.push('/decks')}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  p: 2,
                  borderRadius: 3,
                  border: (t) => `1.5px dashed ${alpha(t.palette.brand[300], 0.4)}`,
                  bgcolor: (t) => alpha(t.palette.brand[50], 0.7),
                  cursor: 'pointer',
                  transition: 'all 0.18s ease',
                  '&:hover': {
                    bgcolor: (t) => alpha(t.palette.brand[100], 0.9),
                    borderColor: (t) => alpha(t.palette.brand[400], 0.55),
                  },
                }}
              >
                <Typography sx={{ fontSize: '1.8rem', flexShrink: 0 }}>📌</Typography>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                    {decks.length === 0 ? 'Create your first deck!' : 'Pin a deck to see it here'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {decks.length === 0
                      ? 'Head to Decks to start building flashcards ✨'
                      : 'Tap the pin icon on any deck ✨'}
                  </Typography>
                </Box>
              </Box>
            ) : (
              <Grid container spacing={1.5}>
                {pinnedDecks.map((deck) => {
                  const owned = isOwner(deck);
                  return (
                    <Grid size={{ xs: 6, sm: 4 }} key={deck.id}>
                      <DeckCard
                        deck={deck}
                        onOpen={(id) => router.push(`/deck/${id}?from=home`)}
                        onDelete={owned ? deleteDeck : () => {}}
                        onShare={
                          owned
                            ? (id) => {
                                setShareDeckId(id);
                                setShareDeckName(deck.name);
                              }
                            : undefined
                        }
                        onPin={pinDeck}
                        onEmojiChange={owned ? updateDeckEmoji : undefined}
                        isOwner={owned}
                      />
                    </Grid>
                  );
                })}
              </Grid>
            )}
          </>
        );

      case 'speeches':
        return (
          <>
            {pinnedSpeeches.length === 0 ? (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  p: 2,
                  borderRadius: 3,
                  border: (t) => `1.5px dashed ${alpha(t.palette.brand[300], 0.4)}`,
                  bgcolor: (t) => alpha(t.palette.brand[50], 0.7),
                  cursor: 'pointer',
                  transition: 'all 0.18s ease',
                  '&:hover': {
                    bgcolor: (t) => alpha(t.palette.brand[100], 0.9),
                    borderColor: (t) => alpha(t.palette.brand[400], 0.55),
                  },
                }}
                onClick={() => router.push('/ohanashikai')}
              >
                <Typography sx={{ fontSize: '1.8rem', flexShrink: 0 }}>🌸</Typography>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                    {ohanashikais.length === 0
                      ? 'Practice your お話し会 speech!'
                      : 'Pin a speech to see it here'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {ohanashikais.length === 0
                      ? 'Add your lines and start memorizing ✨'
                      : 'Tap the pin icon on any speech ✨'}
                  </Typography>
                </Box>
              </Box>
            ) : (
              <Stack spacing={1}>
                {pinnedSpeeches.map((item, i) => {
                  const cardEmojis = ['🌸', '✨', '🌟', '💫', '🎀'];
                  return (
                    <Box
                      key={item.id}
                      onClick={() => router.push(`/ohanashikai/${item.id}?from=home`)}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                        p: 1.5,
                        borderRadius: 3,
                        bgcolor: 'background.paper',
                        border: (t) => `1.5px solid ${alpha(t.palette.brand[300], 0.3)}`,
                        boxShadow: (t) => `0 2px 10px ${alpha(t.palette.brand[300], 0.1)}`,
                        transition: 'all 0.18s ease',
                        cursor: 'pointer',
                        '&:hover': {
                          boxShadow: (t) => `0 5px 20px ${alpha(t.palette.brand[300], 0.2)}`,
                          transform: 'translateY(-1px)',
                        },
                      }}
                    >
                      <Typography sx={{ fontSize: '1.2rem', flexShrink: 0 }}>
                        {cardEmojis[i % cardEmojis.length]}
                      </Typography>
                      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: 700, color: 'text.primary', lineHeight: 1.2 }}
                          noWrap
                        >
                          {item.title}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ fontSize: '0.65rem' }}
                        >
                          {item.lineCount} line{item.lineCount !== 1 ? 's' : ''}
                        </Typography>
                      </Box>
                    </Box>
                  );
                })}
              </Stack>
            )}
          </>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <Box sx={{ maxWidth: 1600, mx: 'auto', px: { xs: 0.5, sm: 1, lg: 1 }, py: 6 }}>
        <Loading message="Loading your dashboard…" />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        maxWidth: 1600,
        mx: 'auto',
        px: { xs: 0.5, sm: 1, lg: 1 },
        py: { xs: 3, sm: 5 },
      }}
    >
      {/* Welcome banner */}
      {progress && (
        <Box sx={{ maxWidth: LAYOUT.headerMaxWidth, mx: 'auto' }}>
          <WelcomeBanner
            username={username}
            level={progress.level}
            streak={progress.streak_days}
            totalXp={progress.total_xp}
            spendableXp={spendableXp}
            ownedItemKeys={ownedItemKeys}
            onShopClick={() => router.push('/shop')}
          />
        </Box>
      )}

      {/* ── Dashboard grid ── */}
      <GlobalStyles
        styles={{
          // Ensure grid container is the positioning context for items
          '.react-grid-layout': {
            position: 'relative !important',
          },
          '.rgl-edit-mode .react-grid-item > .react-resizable-handle': {
            display: 'block !important',
            opacity: '1 !important',
            width: '24px !important',
            height: '24px !important',
          },
          '.rgl-edit-mode .react-grid-item > .react-resizable-handle::after': {
            content: '""',
            position: 'absolute',
            right: 3,
            bottom: 3,
            width: '10px !important',
            height: '10px !important',
            borderRight: '3px solid var(--rgl-handle-color) !important',
            borderBottom: '3px solid var(--rgl-handle-color) !important',
          },
          '.rgl-edit-mode .react-grid-item.react-grid-placeholder': {
            background: 'var(--rgl-placeholder-bg) !important',
            borderRadius: '12px !important',
          },
        }}
      />
      <Stack direction="row" justifyContent="flex-end" spacing={1} sx={{ pt: 0, pb: 2 }}>
        {editMode && (
          <Button
            size="small"
            variant="outlined"
            startIcon={<AddCircleOutlineIcon />}
            onClick={() => setCustomizeOpen(true)}
            sx={{
              fontSize: '0.8rem',
              fontWeight: 700,
              textTransform: 'none',
              borderRadius: 2,
              pt: 1,
              borderColor: (t) => alpha(t.palette.brand[400], 0.5),
              color: (t) => t.palette.brand[600],
              '&:hover': {
                bgcolor: (t) => alpha(t.palette.brand[100], 0.5),
                borderColor: (t) => t.palette.brand[500],
              },
            }}
          >
            Add section
          </Button>
        )}
        <Button
          size="small"
          variant={editMode ? 'contained' : 'text'}
          startIcon={editMode ? <CheckIcon /> : <TuneIcon />}
          onClick={() => setEditMode((v) => !v)}
          sx={{
            fontSize: '0.8rem',
            fontWeight: 700,
            textTransform: 'none',
            borderRadius: 2,
            pt: 1,
            ...(editMode
              ? {
                  bgcolor: (t) => t.palette.brand[600],
                  color: '#fff',
                  '&:hover': { bgcolor: (t) => t.palette.brand[700] },
                }
              : {
                  color: (t) => t.palette.brand[600],
                  '&:hover': { bgcolor: (t) => alpha(t.palette.brand[100], 0.5) },
                }),
          }}
        >
          {editMode ? 'Done' : 'Edit layout'}
        </Button>
      </Stack>
      <Box
        ref={gridRef}
        className={editMode ? 'rgl-edit-mode' : undefined}
        sx={{
          '--rgl-handle-color': (t) => t.palette.brand[400],
          '--rgl-placeholder-bg': (t) => alpha(t.palette.brand[300], 0.3),
        }}
      >
        {isMobile ? (
          <Stack spacing={3}>
            {sectionOrder.map((key) => (
              <DashboardSection
                key={key}
                id={key}
                editMode={editMode}
                onToggle={() => handleToggleSection(key)}
                title={sectionTitle(key)}
                titleAction={sectionTitleAction(key)}
              >
                {renderSectionContent(key)}
              </DashboardSection>
            ))}
          </Stack>
        ) : (
          <GridLayout
            width={gridWidth}
            layout={gridLayout}
            style={{ position: 'relative' }}
            gridConfig={{
              cols: 12,
              rowHeight: 30,
              margin: [35, 16] as const,
              containerPadding: [0, 0] as const,
            }}
            dragConfig={{
              enabled: editMode,
              handle: '.rgl-drag-handle',
              cancel: '.rgl-no-drag',
            }}
            resizeConfig={{
              enabled: editMode,
              handles: ['se'] as const,
              handleComponent: (_axis, ref) => (
                <span
                  ref={ref as React.Ref<HTMLSpanElement>}
                  className="react-resizable-handle react-resizable-handle-se"
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    width: 24,
                    height: 24,
                    cursor: 'se-resize',
                    display: editMode ? 'block' : 'none',
                    opacity: 1,
                  }}
                />
              ),
            }}
            onDragStop={(layout: RGLLayout) => handleLayoutSave(layout)}
            onResizeStop={(layout: RGLLayout) => handleLayoutSave(layout)}
          >
            {sectionOrder.map((key) => (
              <div key={key}>
                <DashboardSection
                  id={key}
                  editMode={editMode}
                  onToggle={() => handleToggleSection(key)}
                  title={sectionTitle(key)}
                  titleAction={sectionTitleAction(key)}
                >
                  {renderSectionContent(key)}
                </DashboardSection>
              </div>
            ))}
          </GridLayout>
        )}
      </Box>

      {/* Hidden sections chips (edit mode only) */}
      {editMode && hiddenKeys.length > 0 && (
        <Box
          sx={{
            mt: 2,
            p: 2,
            borderRadius: 2,
            bgcolor: (t) => alpha(t.palette.brand[50], 0.5),
            border: (t) => `1px dashed ${alpha(t.palette.brand[300], 0.3)}`,
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 700, mb: 1, color: 'text.secondary' }}>
            Hidden sections
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {hiddenKeys.map((k) => (
              <Chip
                key={k}
                label={`${SECTION_META[k].emoji} ${SECTION_META[k].label}`}
                onClick={() => handleToggleSection(k)}
                size="small"
                sx={{
                  fontWeight: 600,
                  bgcolor: (t) => alpha(t.palette.brand[100], 0.5),
                  border: (t) => `1px dashed ${alpha(t.palette.brand[300], 0.4)}`,
                  '&:hover': {
                    bgcolor: (t) => alpha(t.palette.brand[200], 0.5),
                  },
                }}
              />
            ))}
          </Stack>
        </Box>
      )}

      {editMode && (
        <Box sx={{ mt: 1, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            size="small"
            onClick={handleResetLayout}
            sx={{ fontSize: '0.75rem', color: 'text.secondary' }}
          >
            Reset layout
          </Button>
        </Box>
      )}

      {homeSections.messages && homeChatPartner && user && (
        <MessageThread
          open={homeChatOpen}
          onClose={() => setHomeChatOpen(false)}
          messages={dmMessages}
          onSend={sendMessage}
          onMarkAllRead={markAllDmRead}
          recipientId={homeChatPartner.id}
          recipientName={homeChatPartner.name}
          currentUserId={user.id}
          isMember={isMemberAccount}
        />
      )}

      <ShareEmbedDialog
        open={shareDeckId !== null}
        onClose={() => setShareDeckId(null)}
        deckId={shareDeckId ?? ''}
        deckName={shareDeckName}
        isPublic={decks.find((d) => d.id === shareDeckId)?.isPublic ?? false}
        onPublicChange={(val) => {
          if (shareDeckId) setDeckPublic(shareDeckId, val);
        }}
      />

      <CustomizeHomeDialog open={customizeOpen} onClose={() => setCustomizeOpen(false)} />
    </Box>
  );
}
