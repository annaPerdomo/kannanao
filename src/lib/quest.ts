/**
 * Quest map planning — pure, side-effect-free so it can be exhaustively unit
 * tested. Today's review is presented as a short node path whose shape is sized
 * by how many cards are due (N). Everything downstream (the map UI, the quest
 * controller) derives from this one function, so the boundaries live in exactly
 * one place.
 *
 * Sizing (transitions at N = 4 and N = 8):
 *   N = 0     → no map (the "all caught up" state shows instead).
 *   1..3      → one node: a flip round only (too few cards for a Boss finale).
 *   4..7      → two nodes: Warm-up (flip) → Boss Round (the last 3 cards).
 *   N >= 8    → three nodes: Warm-up (flip, first N-6) → Word Match (the last 6
 *               due cards) → Boss Round (the last 3). Word Match and the Boss
 *               deliberately share the final cards so a big backlog gets a third
 *               format without inventing extra cards.
 */
import type { Flashcard } from '@/types/flashcard';

export type QuestNodeType = 'warmup' | 'match' | 'boss';

export interface QuestNode {
  /** Node kind — also the message key for its label (Review.questMap.<type>). */
  type: QuestNodeType;
  /** Emoji shown on the node in the map. */
  emoji: string;
  /** How many cards this node covers. */
  cardCount: number;
}

const WARMUP = (cardCount: number): QuestNode => ({ type: 'warmup', emoji: '🔖', cardCount });
const MATCH = (cardCount: number): QuestNode => ({ type: 'match', emoji: '🍉', cardCount });
const BOSS: QuestNode = { type: 'boss', emoji: '⚔️', cardCount: 3 };

/** How many trailing due cards make up the Boss Round. */
export const BOSS_CARDS = 3;
/** How many due cards the Word Match node draws (one full round of pairs). */
export const MATCH_CARDS = 6;
/** Fewest due cards that earn a Boss Round finale. */
export const BOSS_MIN_DUE = 4;
/** Fewest due cards that earn the three-node (Word Match) quest. */
export const MATCH_MIN_DUE = 8;

/** The node structure for a given due count — the sizing rule, on its own. */
export function planQuestNodes(dueCount: number): QuestNode[] {
  if (dueCount <= 0) return [];
  if (dueCount < BOSS_MIN_DUE) return [WARMUP(dueCount)];
  if (dueCount < MATCH_MIN_DUE) return [WARMUP(dueCount - BOSS_CARDS), BOSS];
  return [WARMUP(dueCount - MATCH_CARDS), MATCH(MATCH_CARDS), BOSS];
}

export interface QuestPlan {
  nodes: QuestNode[];
  /** Cards for the flip Warm-up node. */
  warmup: Flashcard[];
  /** Cards for the Word Match node (empty when the quest has no match node). */
  match: Flashcard[];
  /** Cards for the Boss Round (empty when the quest has no boss). */
  boss: Flashcard[];
}

/**
 * Slice the ordered due cards into each node's set, following `planQuestNodes`.
 * For the three-node quest the Word Match and Boss cards overlap by design (the
 * Boss is the last 3 of the 6 Word Match cards).
 */
export function planQuest(cards: Flashcard[]): QuestPlan {
  const n = cards.length;
  const nodes = planQuestNodes(n);
  if (n <= 0) return { nodes, warmup: [], match: [], boss: [] };
  if (n < BOSS_MIN_DUE) return { nodes, warmup: cards, match: [], boss: [] };
  if (n < MATCH_MIN_DUE) {
    return {
      nodes,
      warmup: cards.slice(0, n - BOSS_CARDS),
      match: [],
      boss: cards.slice(n - BOSS_CARDS),
    };
  }
  return {
    nodes,
    warmup: cards.slice(0, n - MATCH_CARDS),
    match: cards.slice(n - MATCH_CARDS),
    boss: cards.slice(n - BOSS_CARDS),
  };
}
