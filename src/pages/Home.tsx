'use client';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import CheckIcon from '@mui/icons-material/Check';
import DragIndicatorRoundedIcon from '@mui/icons-material/DragIndicatorRounded';
import TuneIcon from '@mui/icons-material/Tune';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import GlobalStyles from '@mui/material/GlobalStyles';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import { alpha } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Layout as RGLLayout } from 'react-grid-layout';
import { GridLayout } from 'react-grid-layout';

import { DashedAddRow } from '@/components/DashedAddRow';
import { DataErrorState } from '@/components/DataErrorState';
import { DeckTile } from '@/components/DeckCard';
import { DECK_TILE_MIN_HEIGHT } from '@/components/DeckCard/DeckTile';
import { AssignmentCard, GroupRow, LeaderboardWidget } from '@/components/Group';
import { GreetingHero, SpeechRow, XpProgressCard } from '@/components/Home';
import { LoadingOverlay } from '@/components/Loading';
import { TodayAdventureCard } from '@/components/TodayAdventureCard';
import { TodoList } from '@/components/TodoList';
import { useAuth } from '@/contexts/AuthContext';
import { useProgressCtx } from '@/contexts/ProgressContext';
import { useAssignments } from '@/hooks/useAssignments';
import { useDecks } from '@/hooks/useDecks';
import { useGroupLeaderboards } from '@/hooks/useGroupLeaderboards';
import { useGroups } from '@/hooks/useGroups';
import { useOhanashikais } from '@/hooks/useOhanashikais';
import { useStartAssignmentQuest } from '@/hooks/usePracticeChain';
import type { HomeData } from '@/lib/dbMappers';
import { resolveTimeOfDay } from '@/lib/timeOfDay';
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
const CreateGroupDialog = dynamic(
  () => import('@/components/Group/CreateGroupDialog').then((m) => m.CreateGroupDialog),
  { ssr: false },
);
const CreateDeckDialog = dynamic(
  () => import('@/components/CreateDeckDialog').then((m) => m.CreateDeckDialog),
  { ssr: false },
);
const CreateSpeechDialog = dynamic(
  () => import('@/components/Ohanashikai/CreateSpeechDialog').then((m) => m.CreateSpeechDialog),
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

/**
 * Tango's greeting — おはよう / こんにちは / こんばんは, in Japanese whichever locale
 * the UI is in. It shares `resolveTimeOfDay` with the hero's banner art, so
 * こんばんは can never end up over the sunrise illustration.
 *
 * Rich rather than plain text because Japanese permits a line break between any
 * two characters: left alone, a narrow hero splits the reader's own name as
 * «Annaさ / ん！». The `<n>` run holds the name and its honorific together, which
 * leaves the 、as the only place the line may break.
 */
function getGreeting(
  name: string,
  t: ReturnType<typeof useTranslations<'Home.greeting'>>,
): React.ReactNode {
  return t.rich(resolveTimeOfDay(new Date()), {
    name,
    n: (chunks) => (
      <Box component="span" sx={{ whiteSpace: 'nowrap' }}>
        {chunks}
      </Box>
    ),
  });
}

function DashboardSection({
  id,
  editMode,
  onToggle,
  title,
  titleAction,
  panel,
  children,
}: {
  id: string;
  editMode: boolean;
  onToggle: () => void;
  title?: React.ReactNode;
  titleAction?: React.ReactNode;
  /** Wrap the section in a raised white surface (see PANEL_SECTIONS). */
  panel?: boolean;
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
        ...(panel &&
          !editMode && {
            borderRadius: 4,
            px: { xs: 2, sm: 2.5 },
            pt: 2,
            pb: 0.5,
            bgcolor: 'background.paper',
            border: (t) => `1.5px solid ${alpha(t.palette.brand[300], 0.35)}`,
            boxShadow: (t) => `0 10px 30px ${alpha(t.palette.brand[400], 0.12)}`,
          }),
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
            mb: 0.25,
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
                {meta.label}
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
          pt: 0.75,
          pb: 1.5,
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

/**
 * Sections that get a raised white surface behind them. `decks`, `speeches` and
 * `groups` already render their own card/row frame, so panelling them would
 * double-frame every tile; `todo` draws its own panel too.
 */
const PANEL_SECTIONS = new Set<SectionKey>(['leaderboard', 'assignments']);

/** Fixed (not fractional) width so a deck tile keeps a card's proportions at any column width. */
const DECK_TILE_WIDTH = 172;

/** Narrowest a group or speech row may get before the list drops to one column. */
const LIST_COLUMN_MIN_WIDTH = 320;

/** Reflowing column track shared by the group and speech lists. */
const listGridSx = {
  display: 'grid',
  gridTemplateColumns: `repeat(auto-fill, minmax(min(100%, ${LIST_COLUMN_MIN_WIDTH}px), 1fr))`,
  gap: 1.25,
  alignItems: 'stretch',
} as const;

/** Placeholder for the dashboard grid shown until it's mounted + measured. */
function DashboardGridSkeleton({ message }: { message: string }) {
  return (
    <LoadingOverlay message={message}>
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
    </LoadingOverlay>
  );
}

export default function Home({ initialData }: { initialData?: HomeData }) {
  const t = useTranslations('Home');
  const tCommon = useTranslations('Common');
  const tGreeting = useTranslations('Home.greeting');
  const {
    user,
    displayName,
    homeSections,
    updateHomeSections,
    isMemberAccount,
    isInGroup,
    groupShowLeaderboard,
  } = useAuth();
  const homeRole = useMemo(
    () => ({ isInGroup, canRunGroups: !isMemberAccount }),
    [isInGroup, isMemberAccount],
  );
  const {
    decks,
    deleteDeck,
    pinDeck,
    setDeckPublic,
    updateDeckEmoji,
    loading,
    error: decksError,
    retry: retryDecks,
  } = useDecks(homeSections.decks, initialData?.decks ?? undefined);
  const { progress, addBonusXp } = useProgressCtx();
  const { ohanashikais, pinOhanashikai, createOhanashikai } = useOhanashikais(
    homeSections.speeches,
    initialData?.ohanashikais ?? undefined,
  );
  const {
    assignments,
    error: assignmentsError,
    refetch: refetchAssignments,
  } = useAssignments(undefined, homeSections.assignments, 'mine');
  const {
    groups,
    loading: groupsLoading,
    error: groupsError,
    refetch: refetchGroups,
    createGroup,
    pinGroup,
  } = useGroups(homeSections.groups);
  // One board per group: an account can be in several, and pooling them would
  // rank classmates who never meet against each other. Gated on `isInGroup`
  // because the preference defaults to on for everyone while getSectionsForRole
  // renders the section only for a learner — ungated, organizers pay for boards
  // nothing displays.
  const { boards } = useGroupLeaderboards(homeSections.leaderboard && isInGroup);
  const router = useRouter();
  const startQuest = useStartAssignmentQuest();

  const pendingAssignments = assignments.filter((a) => !a.completed_at);
  const [shareDeckId, setShareDeckId] = useState<string | null>(null);
  const [shareDeckName, setShareDeckName] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [createDeckOpen, setCreateDeckOpen] = useState(false);
  const [createSpeechOpen, setCreateSpeechOpen] = useState(false);

  // Defer each dynamically-imported dialog's chunk until its first open, then
  // keep it mounted so close transitions and internal state survive.
  const shareEverOpened = useHasOpened(shareDeckId !== null);
  const customizeEverOpened = useHasOpened(customizeOpen);
  const createGroupEverOpened = useHasOpened(createGroupOpen);
  const createDeckEverOpened = useHasOpened(createDeckOpen);
  const createSpeechEverOpened = useHasOpened(createSpeechOpen);

  // `groups.length` (not pinnedGroups.length) picks the empty state below, so it
  // can tell "no groups yet" apart from "none pinned".
  const pinnedGroups = useMemo(() => groups.filter((g) => g.pinned), [groups]);

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
    () => resolveSectionOrder(homeSections, homeRole, groupShowLeaderboard),
    [homeSections, homeRole, groupShowLeaderboard],
  );
  const roleKeys = useMemo(
    () => getSectionsForRole(homeRole, groupShowLeaderboard),
    [homeRole, groupShowLeaderboard],
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
    const full = resolveGridLayout(homeSections, homeRole);
    const visible = new Set(sectionOrder);
    return full
      .filter((item) => visible.has(item.i as SectionKey))
      .map((item) => ({ ...item, minW: 3, minH: 3 }));
  }, [homeSections, homeRole, sectionOrder]);

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
    // meta.emoji is intentionally unused here — it's still shown in the customize dialog.
    return (
      <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 800 }} noWrap>
        {meta.label}
      </Typography>
    );
  };

  const sectionTitleAction = (key: SectionKey): React.ReactNode | undefined => {
    const navMap: Partial<Record<SectionKey, { label: string; href: string }>> = {
      groups: {
        label:
          groups.length > 0
            ? t('sectionNav.allGroupsCount', { count: groups.length })
            : t('sectionNav.allGroups'),
        href: '/group',
      },
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
        if (groupsError && groups.length === 0) {
          return <DataErrorState error={groupsError} onRetry={() => void refetchGroups()} dense />;
        }
        // Without a loading state, the first paint is the empty state — "create
        // a group" shown to someone who already has four, until the fetch lands.
        if (groupsLoading && groups.length === 0) {
          return (
            <Box sx={listGridSx} aria-busy aria-label={t('groupsSection.loading')}>
              {[0, 1, 2].map((i) => (
                <Skeleton
                  key={i}
                  variant="rounded"
                  height={92}
                  sx={{
                    borderRadius: (th) => th.radii.lg,
                    bgcolor: (th) => alpha(th.palette.brand[100], 0.6),
                  }}
                />
              ))}
            </Box>
          );
        }
        return (
          <Stack spacing={1.25}>
            {pinnedGroups.length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ px: 0.5 }}>
                {groups.length === 0 ? t('groupsSection.emptyCreate') : t('groupsSection.emptyPin')}
              </Typography>
            )}
            <Box sx={listGridSx}>
              {pinnedGroups.map((group) => (
                <GroupRow
                  key={group.id}
                  group={group}
                  onOpen={(id) => router.push(`/group/${id}`)}
                  onPin={pinGroup}
                />
              ))}
              <DashedAddRow
                label={t('groupsSection.createGroup')}
                onClick={() => setCreateGroupOpen(true)}
              />
            </Box>
          </Stack>
        );

      case 'leaderboard':
        if (boards.length === 0) {
          return (
            <Typography variant="body2" color="text.secondary">
              {t('leaderboardSection.emptyCheckBack')}
            </Typography>
          );
        }
        // One group needs no label — it is the only board there is. Two or more
        // get their group's name, or the ranking is unreadable.
        return (
          <Stack spacing={boards.length > 1 ? 2 : 0}>
            {boards.map((board) => (
              <Box key={board.groupId}>
                {boards.length > 1 && (
                  <Typography
                    sx={{
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      color: 'text.secondary',
                      mb: 0.75,
                    }}
                  >
                    {board.groupEmoji ? `${board.groupEmoji} ` : ''}
                    {board.groupName}
                  </Typography>
                )}
                <LeaderboardWidget entries={board.entries} compact maxVisible={5} />
              </Box>
            ))}
          </Stack>
        );

      case 'assignments':
        if (assignmentsError && assignments.length === 0) {
          return (
            <DataErrorState
              error={assignmentsError}
              onRetry={() => void refetchAssignments()}
              dense
            />
          );
        }
        return (
          <>
            {pendingAssignments.length > 0 ? (
              <Stack spacing={1}>
                {pendingAssignments.map((a) => (
                  <AssignmentCard
                    key={a.id}
                    assignment={a}
                    onStart={(assignment) =>
                      startQuest(
                        assignment,
                        decks.find((d) => d.id === assignment.deck_id),
                      )
                    }
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
        // Ahead of the empty state: "create your first deck" is the outage bug.
        if (decksError && decks.length === 0) {
          return <DataErrorState error={decksError} onRetry={retryDecks} dense />;
        }
        return (
          <Stack spacing={1.25}>
            {!loading && pinnedDecks.length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ px: 0.5 }}>
                {totalDeckCount === 0
                  ? t('decksSection.emptyCreateFirstSub')
                  : t('decksSection.emptyPinSub')}
              </Typography>
            )}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: `repeat(auto-fill, minmax(0, ${DECK_TILE_WIDTH}px))`,
                justifyContent: 'start',
                gap: 1.5,
              }}
            >
              {loading && decks.length === 0
                ? [0, 1].map((i) => (
                    <Skeleton
                      key={i}
                      variant="rounded"
                      height={DECK_TILE_MIN_HEIGHT}
                      sx={{
                        borderRadius: (th) => th.radii.card,
                        bgcolor: (th) => alpha(th.palette.brand[100], 0.6),
                      }}
                    />
                  ))
                : pinnedDecks.map((deck) => {
                    const owned = isOwner(deck);
                    return (
                      <DeckTile
                        key={deck.id}
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
                    );
                  })}
              {!(loading && decks.length === 0) && (
                <DashedAddRow
                  label={t('decksSection.createDeck')}
                  onClick={() => setCreateDeckOpen(true)}
                  cardSlot
                  minHeight={DECK_TILE_MIN_HEIGHT}
                />
              )}
            </Box>
          </Stack>
        );

      case 'speeches':
        return (
          <Stack spacing={1.25}>
            {pinnedSpeeches.length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ px: 0.5 }}>
                {totalSpeechCount === 0
                  ? t('speechesSection.emptyCreateFirstSub')
                  : t('speechesSection.emptyPinSub')}
              </Typography>
            )}
            <Box sx={listGridSx}>
              {pinnedSpeeches.map((item) => (
                <SpeechRow
                  key={item.id}
                  speech={item}
                  onOpen={(id) => router.push(`/ohanashikai/${id}?from=home`)}
                  onPin={pinOhanashikai}
                />
              ))}
              <DashedAddRow
                label={t('speechesSection.writeSpeech')}
                onClick={() => setCreateSpeechOpen(true)}
              />
            </Box>
          </Stack>
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
      {/* Hero: the mascot's banner for the current time of day carries the
          greeting, today's date in Japanese and the day's one call to action,
          with the XP card floated over its right edge (stacking underneath on
          narrower screens). The hero renders immediately — only the XP card
          waits on progress, and it holds its space with a skeleton so nothing
          below it jumps when the number lands.

          Full content width, flush with the dashboard columns below it. Boxed to
          the narrower header width it read as an inset thumbnail on a wide
          screen, and the banner's own proportions meant a shorter one too. */}
      <Box sx={{ mb: { xs: 1.5, sm: 2 } }}>
        <GreetingHero
          greeting={getGreeting(username, tGreeting)}
          aside={
            progress ? (
              <XpProgressCard
                level={progress.level}
                totalXp={progress.total_xp}
                onShopClick={() => router.push('/shop')}
              />
            ) : (
              <Skeleton
                variant="rounded"
                height={94}
                sx={{
                  borderRadius: (t) => t.radii.md,
                  bgcolor: (t) => alpha(t.palette.brand[100], 0.6),
                }}
              />
            )
          }
        >
          {/* The single home entry point to cross-deck review. */}
          <TodayAdventureCard />
        </GreetingHero>
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
      <Stack direction="row" justifyContent="flex-end" spacing={1} sx={{ pt: 0, pb: 1 }}>
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
          <DashboardGridSkeleton message={tCommon('loading')} />
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
                panel={PANEL_SECTIONS.has(key)}
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
                  panel={PANEL_SECTIONS.has(key)}
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

      {createGroupEverOpened && (
        <CreateGroupDialog
          open={createGroupOpen}
          onClose={() => setCreateGroupOpen(false)}
          onCreate={createGroup}
        />
      )}

      {createDeckEverOpened && (
        <CreateDeckDialog open={createDeckOpen} onClose={() => setCreateDeckOpen(false)} />
      )}

      {createSpeechEverOpened && (
        <CreateSpeechDialog
          open={createSpeechOpen}
          onClose={() => setCreateSpeechOpen(false)}
          onCreate={createOhanashikai}
        />
      )}
    </Box>
  );
}
