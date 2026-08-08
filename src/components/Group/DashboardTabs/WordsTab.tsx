import type { Deck } from '@/types/deck';

import { ReteachPanel } from '../ReteachPanel';

interface WordsTabProps {
  ownDecks: Deck[];
}

export function WordsTab({ ownDecks }: WordsTabProps) {
  return <ReteachPanel decks={ownDecks} />;
}
