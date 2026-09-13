import type { Flashcard } from '@/types/flashcard';

type CardFields = Omit<Flashcard, 'id' | 'deckId' | 'position'> & { image_query: string };

export type PendingCard = CardFields & {
  /**
   * Set only when the row is a card that already lives in the deck — the
   * picture review reopens this dialog over saved cards, and the confirm step
   * needs the id to write the edits back instead of inserting copies.
   */
  id?: string;
  /** Deck the saved copy came from; '' when its name couldn't be read. */
  reusedFrom?: string;
  /**
   * The version of this row that isn't showing. Swapping trades places with it,
   * so the move works in both directions however many times it's made.
   */
  alternate?: CardFields;
  /** True while the model's card is showing and the saved one is the alternate. */
  showingFresh?: boolean;
};
