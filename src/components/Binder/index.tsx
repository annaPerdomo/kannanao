'use client';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { DataErrorState } from '@/components/DataErrorState';
import { Loading } from '@/components/Loading';
import { PageHeader } from '@/components/PageHeader';
import { useAuth } from '@/contexts/AuthContext';
import { useDecks } from '@/hooks/useDecks';
import { useStartMixedPractice } from '@/hooks/usePracticeChain';
import { useJapaneseVoice } from '@/hooks/useSpeech';
import {
  type BinderCard as BinderEntry,
  type BinderFilters as Filters,
  type BinderTab,
  buildBinder,
  DEFAULT_FILTERS,
  filterBinderCards,
  hasPhrases,
  jlptLevelsIn,
} from '@/lib/binder';
import { type DataError, toDataError } from '@/lib/dataError';
import {
  type CardProgress,
  getAccessibleDeckIds,
  getCardProgressForUser,
  loadAccessibleCards,
} from '@/lib/supabase';
import { LAYOUT } from '@/theme';
import type { Flashcard } from '@/types/flashcard';

import { BinderCard } from './BinderCard';
import { BinderFilters } from './BinderFilters';
import { CardDetailDialog } from './CardDetailDialog';
import { CollectedBar, CollectedPanel } from './CollectedBar';
import { MemoriesTab } from './MemoriesTab';
import { binderGridSx } from './styles';

const ALL = '__all__';
const MEMORIES = '__memories__';

function useBinderData() {
  const { user } = useAuth();
  const { decks, loading: decksLoading, error: decksError, retry: retryDecks } = useDecks(true);
  const [cards, setCards] = useState<Flashcard[] | null>(null);
  const [progress, setProgress] = useState<CardProgress[]>([]);
  const [error, setError] = useState<DataError | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setError(null);
    // Must go through the access lookup: cards has no RLS, so an unscoped
    // select leaks other groups' material into the binder.
    getAccessibleDeckIds(user.id)
      .then(
        async (ids): Promise<[Flashcard[], CardProgress[]]> => [
          await loadAccessibleCards(user.id, ids),
          await getCardProgressForUser(user.id),
        ],
      )
      .then(([loaded, rows]) => {
        if (cancelled) return;
        setCards(loaded);
        setProgress(rows);
      })
      .catch((e) => {
        if (!cancelled) setError(toDataError(e));
      });
    return () => {
      cancelled = true;
    };
  }, [user, attempt]);

  const retry = useCallback(() => {
    setCards(null);
    setAttempt((a) => a + 1);
    retryDecks();
  }, [retryDecks]);

  const tabs = useMemo(
    () => (cards ? buildBinder(decks, cards, progress) : []),
    [decks, cards, progress],
  );
  return {
    tabs,
    loading: decksLoading || cards === null,
    error: error ?? decksError,
    retry,
  };
}

export function Binder() {
  const t = useTranslations('Binder');
  const { tabs, loading, error, retry } = useBinderData();
  const [tab, setTab] = useState<string>(ALL);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [open, setOpen] = useState<BinderEntry | null>(null);
  const [hint, setHint] = useState(false);
  const openCard = useCallback((entry: BinderEntry) => {
    if (entry.strength === 'new') setHint(true);
    else setOpen(entry);
  }, []);
  const voice = useJapaneseVoice();
  const { start, starting, error: startError } = useStartMixedPractice();

  const current: BinderTab | null = useMemo(
    () => tabs.find((x) => x.deck.id === tab) ?? null,
    [tabs, tab],
  );
  const pool = useMemo(
    () => (current ? current.cards : tabs.flatMap((x) => x.cards)),
    [current, tabs],
  );
  const shown = useMemo(() => filterBinderCards(pool, filters), [pool, filters]);
  const collected = pool.filter((c) => c.strength !== 'new').length;
  const levels = useMemo(() => jlptLevelsIn(pool), [pool]);
  const phrases = useMemo(() => hasPhrases(pool), [pool]);

  const frame = (children: React.ReactNode) => (
    <Box sx={{ maxWidth: LAYOUT.headerMaxWidth, mx: 'auto', px: LAYOUT.pagePx, py: LAYOUT.pagePy }}>
      <PageHeader
        icon={
          <Box component="span" aria-hidden sx={{ fontSize: { xs: '1.7rem', sm: '2rem' } }}>
            🎴
          </Box>
        }
        title={t('title')}
        subtitle={t('subtitle')}
        mb={{ xs: 2, sm: 3 }}
      />
      {children}
    </Box>
  );

  if (error) return frame(<DataErrorState error={error} onRetry={retry} />);
  if (loading) return frame(<Loading message={t('loading')} />);
  const emptyDecks = (
    <Box sx={{ textAlign: 'center', py: 6 }}>
      <Typography sx={{ fontSize: '3rem', mb: 1 }} aria-hidden>
        🌱
      </Typography>
      <Typography variant="h6" sx={{ fontWeight: 800, color: 'text.primary' }}>
        {t('emptyTitle')}
      </Typography>
      <Typography color="text.secondary">{t('emptyBody')}</Typography>
    </Box>
  );

  return frame(
    <Stack spacing={{ xs: 2, sm: 2.5 }}>
      <Tabs
        value={tab}
        onChange={(_, next: string) => setTab(next)}
        variant="scrollable"
        scrollButtons="auto"
        allowScrollButtonsMobile
        aria-label={t('tabsAria')}
        sx={{ '& .MuiTab-root': { fontWeight: 800, textTransform: 'none' } }}
      >
        <Tab value={ALL} label={t('allLessons')} />
        {tabs.map((x) => (
          <Tab
            key={x.deck.id}
            value={x.deck.id}
            label={`${x.deck.emoji ? `${x.deck.emoji} ` : ''}${x.deck.name} · ${x.collected}/${x.cards.length}`}
          />
        ))}
        <Tab value={MEMORIES} label={`💞 ${t('memoriesTab')}`} />
      </Tabs>

      {tab === MEMORIES ? (
        <MemoriesTab />
      ) : tabs.length === 0 ? (
        emptyDecks
      ) : (
        <>
          <CollectedPanel>
            <Box sx={{ flexGrow: 1 }}>
              <CollectedBar
                collected={collected}
                total={pool.length}
                label={t('collected', { collected, total: pool.length })}
                ariaLabel={t('collectedAria')}
              />
            </Box>
            {current && current.cards.length >= 2 && (
              <Button
                variant="contained"
                disabled={starting || voice === 'checking'}
                onClick={() =>
                  void start(
                    current.deck.id,
                    current.cards.map((c) => c.card),
                    {
                      readingUnlocked: current.deck.readingPractice === true,
                      ttsReady: voice === 'ready',
                    },
                  )
                }
                sx={{ flexShrink: 0, fontWeight: 800, px: 3 }}
              >
                {starting ? t('practiceStarting') : t('practiceLesson')}
              </Button>
            )}
          </CollectedPanel>
          {startError && <Alert severity="error">{t('practiceFailed')}</Alert>}

          <BinderFilters
            filters={filters}
            onChange={setFilters}
            levels={levels}
            phrases={phrases}
          />

          {shown.length === 0 ? (
            <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
              {t('noMatches')}
            </Typography>
          ) : (
            <Box sx={binderGridSx}>
              {shown.map((entry) => (
                <BinderCard key={entry.card.id} entry={entry} onOpen={openCard} />
              ))}
            </Box>
          )}

          <CardDetailDialog entry={open} onClose={() => setOpen(null)} />
          <Snackbar
            open={hint}
            autoHideDuration={2500}
            onClose={() => setHint(false)}
            message={t('lockedHint')}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          />
        </>
      )}
    </Stack>,
  );
}
