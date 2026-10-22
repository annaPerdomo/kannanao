'use client';
import { useTranslations } from 'next-intl';

import { Loading } from '@/components/Loading';
import { useQuestHandoff } from '@/contexts/QuestHandoffContext';
import type { Flashcard } from '@/types/flashcard';

import { CelebrationScreen, pickPraise } from '../CelebrationScreen';
import { MIN_SENTENCES } from './constants';
import { GameBoard } from './GameBoard';
import { EmptyState, ErrorState, NotEnoughState } from './GameStates';
import { SessionSummary } from './SessionSummary';
import { useKotobaGame } from './useKotobaGame';

interface KotobaBubbleModeProps {
  cards: Flashcard[];
  deckId: string;
  batchSize: number;
  onExit: () => void;
}

export function KotobaBubbleMode({ cards, deckId, batchSize, onExit }: KotobaBubbleModeProps) {
  const t = useTranslations('Practice.kotobaBubble');
  const tCommon = useTranslations('Practice.common');
  // This mode's celebration opens its sentence review rather than leaving, so
  // the quest hands off from the review screen — the actual way out.
  const handoff = useQuestHandoff();
  const game = useKotobaGame({ cards, deckId, batchSize });

  if (game.loading) return <Loading message={t('loadingBuilder')} />;

  if (game.error && !game.hasContent) {
    return <ErrorState error={game.error} onExit={onExit} />;
  }

  if (game.generating) return <Loading message={t('generatingSentences')} />;

  if (!game.hasContent) {
    return <EmptyState onExit={onExit} onGenerate={game.generate} error={game.error} />;
  }

  if (game.gameSentences.length < MIN_SENTENCES) {
    return <NotEnoughState onExit={onExit} />;
  }

  if (game.gameComplete && !game.showSummary) {
    const pct = game.gameSentences.length > 0 ? game.totalCorrect / game.gameSentences.length : 0;
    const praise = pickPraise(pct, game.praiseSeed);
    return (
      <CelebrationScreen
        heading={praise.jp}
        headingEn={praise.en}
        subheading={tCommon('correctSummary', {
          correct: game.totalCorrect,
          total: game.gameSentences.length,
        })}
        extra={game.bestStreak >= 3 ? t('bestStreakRow', { count: game.bestStreak }) : undefined}
        mode="kotoba-bubble"
        exitLabel={t('sentenceReview')}
        onExit={() => game.setShowSummary(true)}
        disableHandoff
      />
    );
  }

  if (game.gameComplete && game.showSummary) {
    return (
      <SessionSummary
        results={game.results}
        totalCorrect={game.totalCorrect}
        total={game.gameSentences.length}
        bestStreak={game.bestStreak}
        handoff={handoff}
        onRestart={game.handleRestart}
        onExit={onExit}
      />
    );
  }

  if (!game.currentSentence) return null;

  return <GameBoard game={game} />;
}
