'use client';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CheckIcon from '@mui/icons-material/Check';
import DragIndicatorRoundedIcon from '@mui/icons-material/DragIndicatorRounded';
import NightsStayIcon from '@mui/icons-material/NightsStay';
import StorefrontIcon from '@mui/icons-material/Storefront';
import TuneIcon from '@mui/icons-material/Tune';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import WbSunnyIcon from '@mui/icons-material/WbSunny';
import WbTwilightIcon from '@mui/icons-material/WbTwilight';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import GlobalStyles from '@mui/material/GlobalStyles';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import LinearProgress from '@mui/material/LinearProgress';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Layout as RGLLayout } from 'react-grid-layout';
import { GridLayout } from 'react-grid-layout';

import { DeckCard } from '@/components/DeckCard';
import { AssignmentCard, GroupHomeWidget, LeaderboardWidget } from '@/components/Group';
import { PageHeader } from '@/components/PageHeader';
import { ReviewTile } from '@/components/ReviewTile';
import { TodoList } from '@/components/TodoList';
import { useAuth } from '@/contexts/AuthContext';
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
import type { HomeData } from '@/lib/dbMappers';
import { LAYOUT } from '@/theme';
import type { SectionKey } from '@/types/homeSections';
import {
  getSectionsForRole,
  resolveGridLayout,
  resolveSectionOrder,
  SECTION_META,
} from '@/types/homeSections';

// These are rendered conditionally (modals / member-only chat) and aren't part
// of the dashboard's first paint, so load them on demand to keep them out of
// the initial bundle.
const CustomizeHomeDialog = dynamic(
  () => import('@/components/CustomizeHomeDialog').then((m) => m.CustomizeHomeDialog),
  { ssr: false },
);
const ShareEmbedDialog = dynamic(
  () => import('@/components/ShareEmbedDialog').then((m) => m.ShareEmbedDialog),
  { ssr: false },
);

/**
 * Latches to `true` the first time `open` becomes true and stays true.
 * Lets us defer a dynamically-imported dialog's chunk until its first open
 * (the component isn't rendered — and therefore not fetched — until then),
 * while keeping it mounted afterwards so MUI exit transitions and internal
 * dialog state are preserved on subsequent closes.
 */
function useHasOpened(open: boolean): boolean {
  const [opened, setOpened] = useState(open);
  useEffect(() => {
    if (open) setOpened(true);
  }, [open]);
  return opened;
}

function getGreeting(
  name: string,
  t: (key: string, values?: Record<string, string>) => string,
): { text: string; icon: React.ReactNode } {
  const h = new Date().getHours();
  if (h < 12) return { text: t('morning', { name }), icon: <WbTwilightIcon /> };
  if (h < 17) return { text: t('afternoon', { name }), icon: <WbSunnyIcon /> };
  return { text: t('evening', { name }), icon: <NightsStayIcon /> };
}

function WelcomeBanner({
  username,
  level,
  totalXp,
  spendableXp,
  ownedItemKeys,
  onShopClick,
  xpReady,
}: {
  username: string;
  level: number;
  totalXp: number;
  spendableXp: number;
  ownedItemKeys: string[];
  onShopClick: () => void;
  xpReady: boolean;
}) {
  const t = useTranslations('Home.welcomeBanner');
  const tGreeting = useTranslations('Home.greeting');
  const { text, icon } = getGreeting(username, tGreeting);
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
      icon={icon}
      title={text}
      gradientTitle
      mb={1.5}
      endContent={
        // Only render the XP widget once progress has loaded — otherwise it
        // would flash a placeholder 0 and then jump to the real number.
        !xpReady ? undefined : (
          <Box
            role="button"
            tabIndex={0}
            aria-label={t('openShopAriaLabel')}
            onClick={onShopClick}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onShopClick();
              }
            }}
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
                {t('xpProgressLabel')}
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
              {t('xpToLevel', { xp: needed - current, level: level + 1 })}
            </Typography>

            <Box sx={{ mt: 1, pt: 1, borderTop: `1px solid ${alpha(brand[300], 0.25)}` }}>
              <Stack direction="row" alignItems="center" spacing={0.5} mb={nextItem ? 0.5 : 0}>
                <AutoAwesomeIcon sx={{ fontSize: '0.85rem', color: accent[500] }} />
                <Typography variant="caption" sx={{ fontWeight: 800, color: accent[600] }}>
                  {t('xpToSpend', { xp: spendableXp.toLocaleString() })}
                </Typography>
                <StorefrontIcon sx={{ fontSize: '0.85rem', color: brand[500], ml: 'auto' }} />
              </Stack>
              {nextItem && xpNeeded > 0 && (
                <Typography
                  variant="caption"
                  sx={{ color: brand[500], fontWeight: 600, fontSize: '0.7rem', display: 'block' }}
                >
                  {nextItem.emoji} {nextItem.name} —{' '}
                  {t('moreXp', { xp: xpNeeded.toLocaleString() })}
                </Typography>
              )}
            </Box>
          </Box>
        )
      }
    ></PageHeader>
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
  const t = useTranslations('Home.dashboardSection');
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
              aria-label={t('hideAriaLabel', { label: meta.label })}
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

/** Placeholder for the dashboard grid shown until it's mounted + measured. */
function DashboardGridSkeleton() {
  return (
    <Grid container spacing={2}>
      {[0, 1, 2, 3].map((i) => (
        <Grid size={{ xs: 12, md: 6 }} key={i}>
          <Stack spacing={1.5}>
            <Skeleton variant="text" width={150} height={30} />
            <Skeleton
              variant="rounded"
              height={180}
              sx={{ borderRadius: 3, bgcolor: (t) => alpha(t.palette.brand[100], 0.5) }}
            />
          </Stack>
        </Grid>
      ))}
    </Grid>
  );
}

export default function Home({ initialData }: { initialData?: HomeData }) {
  const t = useTranslations('Home');
  const tCommon = useTranslations('Common');
  const {
    user,
    displayName,
    homeSections,
    updateHomeSections,
    isMemberAccount,
    groupShowLeaderboard,
  } = useAuth();
  const { decks, deleteDeck, pinDeck, setDeckPublic, updateDeckEmoji, loading } = useDecks(
    homeSections.decks,
    initialData?.decks ?? undefined,
  );
  const { progress, spendableXp, addBonusXp } = useProgressCtx();
  const { ohanashikais } = useOhanashikais(
    homeSections.speeches,
    initialData?.ohanashikais ?? undefined,
  );
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
  const [editMode, setEditMode] = useState(false);
  const [customizeOpen, setCustomizeOpen] = useState(false);

  // Defer each dynamically-imported dialog's chunk until its first open, then
  // keep it mounted so close transitions and internal state survive.
  const shareEverOpened = useHasOpened(shareDeckId !== null);
  const customizeEverOpened = useHasOpened(customizeOpen);

  const username = displayName ?? user?.email?.split('@')[0] ?? 'there';
  const isOwner = (deck: { ownerId: string }) => deck.ownerId === user?.id;

  const pinnedDecks = decks.filter((d) => d.pinned);
  const pinnedSpeeches = ohanashikais.filter((o) => o.pinned);
  // `decks`/`ohanashikais` are seeded pinned-only by the server, so the loaded
  // list can't tell "no decks yet" from "decks exist but none pinned". The
  // server sends total counts for that; fall back to list length when absent.
  const totalDeckCount = initialData?.totalDeckCount ?? decks.length;
  const totalSpeechCount = initialData?.totalOhanashikaiCount ?? ohanashikais.length;

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
  // The grid's width is measured and the mobile/desktop breakpoint is resolved
  // on the client, so the very first paint can briefly show a mis-sized layout.
  // Gate the real grid behind a mount flag and show a skeleton until then — by
  // the time this flips true the ResizeObserver has measured the container, so
  // the grid renders at the correct width with no flash.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
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
      groups: { label: t('sectionNav.allGroups'), href: '/group' },
      decks: { label: t('sectionNav.allDecks'), href: '/decks' },
      speeches: { label: t('sectionNav.allSpeeches'), href: '/ohanashikai' },
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
        return (
          <TodoList
            onXpEarned={addBonusXp}
            initialTodos={initialData?.todos ?? undefined}
            initialEntryTypes={initialData?.eventTypes ?? undefined}
          />
        );

      case 'groups':
        return (
          <>
            {groups.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                {t('groupsSection.emptyCreate')}
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
                {t('leaderboardSection.emptyCheckBack')}
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
                {t('assignmentsSection.emptyAllCaughtUp')}
              </Typography>
            )}
          </>
        );

      case 'decks':
        return (
          <>
            {loading && decks.length === 0 ? (
              <Grid container spacing={1.5}>
                {[0, 1, 2].map((i) => (
                  <Grid size={{ xs: 6, sm: 4 }} key={i}>
                    <Skeleton
                      variant="rounded"
                      height={150}
                      sx={{ borderRadius: 3, bgcolor: (t) => alpha(t.palette.brand[100], 0.6) }}
                    />
                  </Grid>
                ))}
              </Grid>
            ) : pinnedDecks.length === 0 ? (
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
                    {totalDeckCount === 0
                      ? t('decksSection.emptyCreateFirstTitle')
                      : t('decksSection.emptyPinTitle')}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {totalDeckCount === 0
                      ? t('decksSection.emptyCreateFirstSub')
                      : t('decksSection.emptyPinSub')}
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
                    {totalSpeechCount === 0
                      ? t('speechesSection.emptyCreateFirstTitle')
                      : t('speechesSection.emptyPinTitle')}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {totalSpeechCount === 0
                      ? t('speechesSection.emptyCreateFirstSub')
                      : t('speechesSection.emptyPinSub')}
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
                          {t('speechesSection.lineCount', { count: item.lineCount })}
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

  // No full-page loading gate — the shell (header + section layout) renders
  // immediately and each section fills in as its data arrives. The decks
  // section shows a skeleton while its data loads (see renderSectionContent).

  return (
    <Box
      sx={{
        maxWidth: 1600,
        mx: 'auto',
        px: { xs: 2, sm: 2, lg: 1 },
        py: { xs: 3, sm: 5 },
      }}
    >
      {/* Welcome banner — always shown so the greeting/header is present even
          before (or if) XP progress finishes loading. Falls back to zeroed XP. */}
      <Box sx={{ maxWidth: LAYOUT.headerMaxWidth, mx: 'auto' }}>
        <WelcomeBanner
          username={username}
          level={progress?.level ?? 0}
          totalXp={progress?.total_xp ?? 0}
          spendableXp={spendableXp}
          ownedItemKeys={ownedItemKeys}
          onShopClick={() => router.push('/shop')}
          xpReady={progress != null}
        />
        {/* The single home entry point to Smart Review — cross-deck due cards. */}
        <Box sx={{ mt: 1.5, mb: 1 }}>
          <ReviewTile />
        </Box>
      </Box>

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
            {t('editModeControls.addSection')}
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
          {editMode ? tCommon('done') : t('editModeControls.editLayout')}
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
        {!mounted ? (
          <DashboardGridSkeleton />
        ) : isMobile ? (
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
            {t('hiddenSections.heading')}
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
            {t('hiddenSections.resetLayout')}
          </Button>
        </Box>
      )}

      {/* These dialogs are dynamically imported. next/dynamic only fetches a
          chunk once its component renders, so we mount each lazily on its first
          open (via useHasOpened) to keep the chunk out of the initial home
          render, then keep it mounted and drive visibility through `open` so MUI
          exit transitions and internal dialog state are preserved on close. */}
      {shareEverOpened && (
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
      )}

      {customizeEverOpened && (
        <CustomizeHomeDialog open={customizeOpen} onClose={() => setCustomizeOpen(false)} />
      )}
    </Box>
  );
}
