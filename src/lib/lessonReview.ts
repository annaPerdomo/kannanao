export interface ReviewSourceCard {
  id: string;
  deck_id: string;
  word: string;
  [key: string]: unknown;
}

/** Dedupes by NFKC-normalized word: 会う and 合う both survive (different words), full/half-width spellings of one word don't. */
export function pickReviewCards(args: {
  cards: ReviewSourceCard[];
  trickyCardIds: string[];
  max: number;
}): ReviewSourceCard[] {
  const { cards, trickyCardIds, max } = args;

  const byId = new Map(cards.map((c) => [c.id, c]));
  const seenWords = new Set<string>();
  const picked: ReviewSourceCard[] = [];

  function wordKey(card: ReviewSourceCard): string {
    return card.word.normalize('NFKC').trim();
  }

  function tryAdd(card: ReviewSourceCard): boolean {
    if (picked.length >= max) return false;
    const key = wordKey(card);
    if (seenWords.has(key)) return false;
    seenWords.add(key);
    picked.push(card);
    return true;
  }

  for (const id of trickyCardIds) {
    if (picked.length >= max) break;
    const card = byId.get(id);
    if (card) tryAdd(card);
  }

  if (picked.length >= max) return picked;

  const pickedIds = new Set(picked.map((c) => c.id));
  const deckOrder: string[] = [];
  const remainingByDeck = new Map<string, ReviewSourceCard[]>();
  for (const card of cards) {
    if (pickedIds.has(card.id) || seenWords.has(wordKey(card))) continue;
    if (!remainingByDeck.has(card.deck_id)) {
      remainingByDeck.set(card.deck_id, []);
      deckOrder.push(card.deck_id);
    }
    remainingByDeck.get(card.deck_id)?.push(card);
  }

  let progressed = true;
  while (picked.length < max && progressed) {
    progressed = false;
    for (const deckId of deckOrder) {
      if (picked.length >= max) break;
      const queue = remainingByDeck.get(deckId);
      if (!queue || queue.length === 0) continue;
      const card = queue.shift() as ReviewSourceCard;
      if (tryAdd(card)) progressed = true;
    }
  }

  return picked;
}
