'use client';
import { Box, Button, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Loading } from '@/components/Loading';
import { PageHeader } from '@/components/PageHeader';
import { BatchPicker } from '@/components/Practice/BatchPicker';
import { FillMode } from '@/components/Practice/FillMode';
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
import { useCards } from '@/hooks/useCards';
import { useDecks } from '@/hooks/useDecks';
import { LAYOUT } from '@/theme';
import type { PracticeMode } from '@/types/app';

interface PracticeProps {
  deckId: string;
  mode: PracticeMode;
  onBack: () => void;
}

/** Show the batch picker when the deck exceeds this many cards. */
const BATCH_PICKER_THRESHOLD = 10;

export default function Practice({ deckId, mode, onBack }: PracticeProps) {
  const t = useTranslations('Practice.page');
  const { cards, loading } = useCards(deckId);
  // Only Reading is deck-gated, so only Reading pays for the decks query.
  const { decks, loading: decksLoading } = useDecks(mode === 'reading');
  const [batchSize, setBatchSize] = useState<number | null>(null);

  const modeTitles: Record<PracticeMode, string> = {
    match: t('modeTitles.match'),
    fill: t('modeTitles.fill'),
    recall: t('modeTitles.recall'),
    'kotoba-bubble': t('modeTitles.kotobaBubble'),
    quiz: t('modeTitles.quiz'),
    listen: t('modeTitles.listen'),
    reading: t('modeTitles.reading'),
  };
  // Fill-in-the-blank needs a sentence to blank out. A card with no example
  // (older Travel saves, or a generation that came back without one) rendered
  // an empty prompt that could never be answered, so it sits the mode out.
  // Reading needs kanji to hide a reading behind — kana-only cards sit it out.
  const modeCards =
    mode === 'fill'
      ? cards.filter((c) => c.example_jp.trim())
      : mode === 'reading'
        ? eligibleReadingCards(cards)
        : cards;
  const badge = t('cardsBadge', { count: modeCards.length });

  if (loading || decksLoading) {
    return (
      <Box sx={{ maxWidth: LAYOUT.narrowMaxWidth, mx: 'auto', px: LAYOUT.pagePx, py: 4 }}>
        <Loading message={t('loadingSession')} />
      </Box>
    );
  }

  // Typing the URL must not get past the deck's Reading switch either.
  const readingLocked =
    mode === 'reading' && decks.find((d) => d.id === deckId)?.readingPractice !== true;

  // Reading needs the deck unlocked AND a few kanji cards, or the round is over
  // before it starts — either way the learner gets one message, not a dead end.
  if (readingLocked || (mode === 'reading' && modeCards.length < MIN_READING_CARDS)) {
    return (
      <Box sx={{ maxWidth: LAYOUT.narrowMaxWidth, mx: 'auto', px: LAYOUT.pagePx, py: 4 }}>
        <PageHeader title={modeTitles[mode]} onBack={onBack} badge={badge} mb={3} />
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography sx={{ fontSize: '3rem', mb: 1 }} aria-hidden>
            📖
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
      <Box sx={{ maxWidth: LAYOUT.narrowMaxWidth, mx: 'auto', px: LAYOUT.pagePx, py: 4 }}>
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
      <Box sx={{ maxWidth: LAYOUT.narrowMaxWidth, mx: 'auto', px: LAYOUT.pagePx, py: 4 }}>
        <PageHeader title={modeTitles[mode]} onBack={onBack} badge={badge} mb={3} />
        <QuizMode cards={modeCards} deckId={deckId} onExit={onBack} />
      </Box>
    );
  }

  // Kotoba Bubble always shows its own setup page (handles generation + batch picking)
  if (mode === 'kotoba-bubble' && batchSize === null) {
    return (
      <Box sx={{ maxWidth: LAYOUT.narrowMaxWidth, mx: 'auto', px: LAYOUT.pagePx, py: 4 }}>
        <PageHeader title={modeTitles[mode]} onBack={onBack} badge={badge} mb={3} />
        <KotobaBubbleSetup deckId={deckId} totalCards={modeCards.length} onSelect={setBatchSize} />
      </Box>
    );
  }

  // Show batch picker for large decks (non-kotoba-bubble)
  const needsPicker = modeCards.length > BATCH_PICKER_THRESHOLD;
  if (needsPicker && batchSize === null) {
    return (
      <Box sx={{ maxWidth: LAYOUT.narrowMaxWidth, mx: 'auto', px: LAYOUT.pagePx, py: 4 }}>
        <PageHeader title={modeTitles[mode]} onBack={onBack} badge={badge} mb={3} />
        <BatchPicker totalCards={modeCards.length} mode={mode} onSelect={setBatchSize} />
      </Box>
    );
  }

  const effectiveBatchSize = batchSize ?? modeCards.length;

  return (
    <Box sx={{ maxWidth: LAYOUT.narrowMaxWidth, mx: 'auto', px: LAYOUT.pagePx, py: 4 }}>
      <PageHeader title={modeTitles[mode]} onBack={onBack} badge={badge} mb={3} />

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
      {mode === 'kotoba-bubble' && (
        <KotobaBubbleMode
          cards={modeCards}
          deckId={deckId}
          batchSize={effectiveBatchSize}
          onExit={onBack}
        />
      )}
    </Box>
  );
}
