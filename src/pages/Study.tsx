'use client';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

import FlipStudy from '@/components/FlipStudy';
import { useCards } from '@/hooks/useCards';
import { useDecks } from '@/hooks/useDecks';

interface StudyProps {
  deckId: string;
  onBack: () => void;
  /** Assignment-quest step chrome, shown above the cards when a quest is running. */
  questBanner?: React.ReactNode;
  /** Restrict the session to these cards — a mixed practice leg, not the deck. */
  cardIds?: string[];
}

/**
 * Deck study: loads a single deck's cards and runs them through the shared
 * flip-with-self-grading flow (see {@link FlipStudy}). Cross-deck Smart Review
 * (/review) drives the same component with due cards instead.
 */
export default function Study({ deckId, onBack, questBanner, cardIds }: StudyProps) {
  const t = useTranslations('Study.study');
  const { cards: deckCards, loading: cardsLoading } = useCards(deckId);
  const { decks, loading: decksLoading } = useDecks();
  const deck = decks.find((d) => d.id === deckId);
  const deckName = deck ? deck.name : t('defaultDeckName');
  const cards = useMemo(() => {
    if (!cardIds) return deckCards;
    const wanted = new Set(cardIds);
    return deckCards.filter((c) => wanted.has(c.id));
  }, [deckCards, cardIds]);

  return (
    <FlipStudy
      cards={cards}
      title={deckName}
      badge={t('cardsBadge', { count: cards.length })}
      sessionMode="study"
      sessionDeckId={deckId}
      onBack={onBack}
      loading={cardsLoading || decksLoading}
      loadingMessage={t('loadingDecks')}
      completionSubheading={t('completionSubheading', { count: cards.length })}
      questMap={questBanner}
    />
  );
}
