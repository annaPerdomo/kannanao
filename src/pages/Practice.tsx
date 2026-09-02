'use client';
import { Box, Button, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

import { DataErrorState } from '@/components/DataErrorState';
import { Loading } from '@/components/Loading';
import { PageHeader } from '@/components/PageHeader';
import { BatchPicker, maxBatchForMode } from '@/components/Practice/BatchPicker';
import { FillMode } from '@/components/Practice/FillMode';
import { KanjiMatchMode, kanjiMatchPairs } from '@/components/Practice/KanjiMatchMode';
import { KotobaBubbleMode } from '@/components/Practice/KotobaBubbleMode';
import { KotobaBubbleSetup } from '@/components/Practice/KotobaBubbleMode/KotobaBubbleSetup';
import { ListenMode } from '@/components/Practice/ListenMode';
import { MatchMode } from '@/components/Practice/MatchMode';
import { QuizMode } from '@/components/Practice/QuizMode';
import {
  eligibleReadingCards,
  MIN_READING_CARDS,
  ReadingMode,
} from '@/components/Practice/ReadingMode';
import { RecallMode } from '@/components/Practice/RecallMode';
import { PracticeStage } from '@/components/PracticeStage';
import { useCards } from '@/hooks/useCards';
import { useDecks } from '@/hooks/useDecks';
import { LAYOUT } from '@/theme';
import type { PracticeMode } from '@/types/app';

interface PracticeProps {
  deckId: string;
  mode: PracticeMode;
  onBack: () => void;
  /** Assignment-quest step chrome, shown under the header when a quest is running. */
  questBanner?: React.ReactNode;
  /** Restrict the session to these cards — a mixed practice leg, not the deck. */
  cardIds?: string[];
  /** This page is one leg of a practice chain, so nothing here may ask a question. */
  inChain?: boolean;
}

/** Show the batch picker when the deck exceeds this many cards. */
const BATCH_PICKER_THRESHOLD = 10;

export default function Practice({
  deckId,
  mode,
  onBack,
  questBanner,
  cardIds,
  inChain,
}: PracticeProps) {
  const t = useTranslations('Practice.page');
  const { cards: deckCards, loading, error, retry } = useCards(deckId);
  const cards = useMemo(() => {
    if (!cardIds) return deckCards;
    const wanted = new Set(cardIds);
    return deckCards.filter((c) => wanted.has(c.id));
  }, [deckCards, cardIds]);
  // Both kanji modes hang off the deck's one Reading switch.
  const needsKanji = mode === 'reading' || mode === 'kanji-match';
  const {
    decks,
    loading: decksLoading,
    error: decksError,
    retry: retryDecks,
  } = useDecks(needsKanji);
  const [batchSize, setBatchSize] = useState<number | null>(null);

  const modeTitles: Record<PracticeMode, string> = {
    match: t('modeTitles.match'),
    fill: t('modeTitles.fill'),
    recall: t('modeTitles.recall'),
    'kotoba-bubble': t('modeTitles.kotobaBubble'),
    quiz: t('modeTitles.quiz'),
    listen: t('modeTitles.listen'),
    reading: t('modeTitles.reading'),
    'kanji-match': t('modeTitles.kanjiMatch'),
  };
  // Fill-in-the-blank needs a sentence to blank out. A card with no example
  // (older Travel saves, or a generation that came back without one) rendered
  // an empty prompt that could never be answered, so it sits the mode out.
  // Reading needs kanji to hide a reading behind — kana-only cards sit it out.
  const modeCards =
    mode === 'fill'
      ? cards.filter((c) => c.example_jp.trim())
      : needsKanji
        ? eligibleReadingCards(cards)
        : cards;
  const badge = t('cardsBadge', { count: modeCards.length });

  if (loading || decksLoading) {
    return (
      <Box
        sx={{ maxWidth: LAYOUT.narrowMaxWidth, mx: 'auto', px: LAYOUT.pagePx, py: LAYOUT.pagePy }}
      >
        <Loading message={t('loadingSession')} />
      </Box>
    );
  }

  if (error || (needsKanji && decksError)) {
    return (
      <Box
        sx={{ maxWidth: LAYOUT.narrowMaxWidth, mx: 'auto', px: LAYOUT.pagePx, py: LAYOUT.pagePy }}
      >
        <PageHeader title={modeTitles[mode]} onBack={onBack} badge={badge} mb={3} />
        <DataErrorState error={error ?? decksError} onRetry={error ? retry : retryDecks} />
      </Box>
    );
  }

  // Typing the URL must not get past the deck's Reading switch either.
  const readingLocked = needsKanji && decks.find((d) => d.id === deckId)?.readingPractice !== true;

  // 作る/造る/創る is one pair, so counting cards here would open a board of a
  // single forced match.
  const kanjiUnits = mode === 'kanji-match' ? kanjiMatchPairs(modeCards).length : modeCards.length;

  // Locked and too-few-cards get the same message, so neither is a dead end.
  if (readingLocked || (needsKanji && kanjiUnits < MIN_READING_CARDS)) {
    return (
      <Box
        sx={{ maxWidth: LAYOUT.narrowMaxWidth, mx: 'auto', px: LAYOUT.pagePx, py: LAYOUT.pagePy }}
      >
        <PageHeader title={modeTitles[mode]} onBack={onBack} badge={badge} mb={3} />
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography sx={{ fontSize: '3rem', mb: 1 }} aria-hidden>
            {mode === 'kanji-match' ? '🀄' : '📖'}
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3, maxWidth: 420, mx: 'auto' }}>
            {readingLocked ? t('readingLocked') : t('noKanjiCards')}
          </Typography>
          <Button variant="contained" size="large" onClick={onBack}>
            {t('pickAnotherMode')}
          </Button>
        </Box>
      </Box>
    );
  }

  if (modeCards.length < 2) {
    return (
      <Box
        sx={{ maxWidth: LAYOUT.narrowMaxWidth, mx: 'auto', px: LAYOUT.pagePx, py: LAYOUT.pagePy }}
      >
        <PageHeader title={modeTitles[mode]} onBack={onBack} badge={badge} mb={3} />
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography color="text.secondary">{t('notEnoughCards')}</Typography>
        </Box>
      </Box>
    );
  }

  // Quiz asks a fixed set of up to 10 questions and caps itself — no batch picker.
  if (mode === 'quiz') {
    return (
      <PracticeStage>
        <PageHeader title={modeTitles[mode]} onBack={onBack} badge={badge} mb={2} />
        {questBanner}
        <QuizMode cards={modeCards} deckId={deckId} onExit={onBack} />
      </PracticeStage>
    );
  }

  const preSized = inChain || !!cardIds;

  // The setup screen must stay off every chain leg: it dead-ends a member on an
  // unseeded deck. The mode's own empty state still offers organizers Generate.
  if (mode === 'kotoba-bubble' && !preSized && batchSize === null) {
    return (
      <Box
        sx={{ maxWidth: LAYOUT.narrowMaxWidth, mx: 'auto', px: LAYOUT.pagePx, py: LAYOUT.pagePy }}
      >
        <PageHeader title={modeTitles[mode]} onBack={onBack} badge={badge} mb={3} />
        {questBanner}
        <KotobaBubbleSetup deckId={deckId} totalCards={modeCards.length} onSelect={setBatchSize} />
      </Box>
    );
  }

  const needsPicker = !preSized && modeCards.length > BATCH_PICKER_THRESHOLD;
  if (needsPicker && batchSize === null) {
    return (
      <Box
        sx={{ maxWidth: LAYOUT.narrowMaxWidth, mx: 'auto', px: LAYOUT.pagePx, py: LAYOUT.pagePy }}
      >
        <PageHeader title={modeTitles[mode]} onBack={onBack} badge={badge} mb={3} />
        {questBanner}
        <BatchPicker totalCards={modeCards.length} mode={mode} onSelect={setBatchSize} />
      </Box>
    );
  }

  // A pre-sized leg never sees the picker, so its per-mode cap is applied here
  // too — twelve Match cards would be twenty-four tiles on screen. Kotoba
  // Bubble's batch counts sentences: sizing it from cards starves the game
  // below MIN_SENTENCES on a short leg.
  const effectiveBatchSize =
    batchSize ??
    (mode === 'kotoba-bubble'
      ? maxBatchForMode(mode)
      : Math.min(modeCards.length, maxBatchForMode(mode)));

  return (
    <PracticeStage>
      <PageHeader title={modeTitles[mode]} onBack={onBack} badge={badge} mb={2} />

      {questBanner}

      {mode === 'match' && (
        <MatchMode
          cards={modeCards}
          deckId={deckId}
          batchSize={effectiveBatchSize}
          onExit={onBack}
        />
      )}
      {mode === 'fill' && (
        <FillMode
          cards={modeCards}
          deckId={deckId}
          batchSize={effectiveBatchSize}
          onExit={onBack}
        />
      )}
      {mode === 'recall' && (
        <RecallMode
          cards={modeCards}
          deckId={deckId}
          batchSize={effectiveBatchSize}
          onExit={onBack}
        />
      )}
      {mode === 'listen' && (
        <ListenMode
          cards={modeCards}
          deckId={deckId}
          batchSize={effectiveBatchSize}
          onExit={onBack}
        />
      )}
      {mode === 'reading' && (
        <ReadingMode
          cards={modeCards}
          deckId={deckId}
          batchSize={effectiveBatchSize}
          onExit={onBack}
        />
      )}
      {mode === 'kanji-match' && (
        <KanjiMatchMode
          cards={modeCards}
          deckId={deckId}
          batchSize={effectiveBatchSize}
          onExit={onBack}
        />
      )}
      {mode === 'kotoba-bubble' && (
        <KotobaBubbleMode
          cards={modeCards}
          deckId={deckId}
          batchSize={effectiveBatchSize}
          onExit={onBack}
        />
      )}
    </PracticeStage>
  );
}
