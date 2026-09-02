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
import { isContextualKana } from '@/lib/kanaCurriculum';
import { type KanaProgressMap, pickReviewQueue } from '@/lib/kanaProficiency';
import type { Flashcard } from '@/types/flashcard';

export type QuestNodeType = 'warmup' | 'match' | 'kana' | 'boss';

export interface QuestNode {
  /** Node kind — also the message key for its label (Review.questMap.<type>). */
  type: QuestNodeType;
  /** Emoji shown on the node in the map. */
  emoji: string;
  /** How many items this node covers — cards, or characters for the kana node. */
  cardCount: number;
}

const WARMUP = (cardCount: number): QuestNode => ({ type: 'warmup', emoji: '🔖', cardCount });
const MATCH = (cardCount: number): QuestNode => ({ type: 'match', emoji: '🍉', cardCount });
const KANA = (cardCount: number): QuestNode => ({ type: 'kana', emoji: 'あ', cardCount });
const BOSS: QuestNode = { type: 'boss', emoji: '⚔️', cardCount: 3 };

/** How many trailing due cards make up the Boss Round. */
export const BOSS_CARDS = 3;
/** How many due cards the Word Match node draws (one full round of pairs). */
export const MATCH_CARDS = 6;
/** Fewest due cards that earn a Boss Round finale. */
export const BOSS_MIN_DUE = 4;
/** Fewest due cards that earn the three-node (Word Match) quest. */
export const MATCH_MIN_DUE = 8;

export const KANA_NODE_CHARS = 4;
export const KANA_MIN_CHARS = 3;
export const KANA_MAX_DUE = 12;

// getKanaProgress has no timeout and supabase-js adds none: past this, a
// surface waiting on the read gives up and plans a quest with no characters.
export const KANA_WAIT_MS = 4000;

/** Wider than the node so the characters dropped below can't starve it. */
export const KANA_QUEUE_SCAN = KANA_NODE_CHARS * 2;

/**
 * Weakest first, and only what she has answered: unseen characters belong to
 * Learn Kana, and っ/ッ/ー have no romaji, so a drill would print the answer.
 */
export function pickQuestKana(byKana: KanaProgressMap, now?: Date): string[] {
  return pickReviewQueue(byKana, {
    track: 'both',
    size: KANA_QUEUE_SCAN,
    includeStrong: false,
    includeUnseen: false,
    now,
  }).filter((kana) => !isContextualKana(kana));
}

export function kanaNodeSize(dueCount: number, weakCount: number): number {
  if (dueCount > KANA_MAX_DUE) return 0;
  const size = Math.min(Math.max(0, Math.floor(weakCount)), KANA_NODE_CHARS);
  return size >= KANA_MIN_CHARS ? size : 0;
}

function cardNodes(dueCount: number): QuestNode[] {
  if (dueCount <= 0) return [];
  if (dueCount < BOSS_MIN_DUE) return [WARMUP(dueCount)];
  if (dueCount < MATCH_MIN_DUE) return [WARMUP(dueCount - BOSS_CARDS), BOSS];
  return [WARMUP(dueCount - MATCH_CARDS), MATCH(MATCH_CARDS), BOSS];
}

/** The node structure for a given due count — the sizing rule, on its own. */
export function planQuestNodes(dueCount: number, weakKanaCount = 0): QuestNode[] {
  const nodes = cardNodes(dueCount);
  const kana = kanaNodeSize(dueCount, weakKanaCount);
  if (kana === 0) return nodes;
  // slice(0, 1) of no card nodes is empty, so a kana-only quest leads.
  return [...nodes.slice(0, 1), KANA(kana), ...nodes.slice(1)];
}

export interface QuestPlan {
  nodes: QuestNode[];
  /** Cards for the flip Warm-up node. */
  warmup: Flashcard[];
  /** Cards for the Word Match node (empty when the quest has no match node). */
  match: Flashcard[];
  /** Cards for the Boss Round (empty when the quest has no boss). */
  boss: Flashcard[];
  kana: string[];
}

/**
 * Slice the ordered due cards into each node's set, following `planQuestNodes`.
 * For the three-node quest the Word Match and Boss cards overlap by design (the
 * Boss is the last 3 of the 6 Word Match cards).
 */
export function planQuest(cards: Flashcard[], weakKana: string[] = []): QuestPlan {
  const n = cards.length;
  const nodes = planQuestNodes(n, weakKana.length);
  const kana = weakKana.slice(0, kanaNodeSize(n, weakKana.length));
  if (n <= 0) return { nodes, warmup: [], match: [], boss: [], kana };
  if (n < BOSS_MIN_DUE) return { nodes, warmup: cards, match: [], boss: [], kana };
  if (n < MATCH_MIN_DUE) {
    return {
      nodes,
      warmup: cards.slice(0, n - BOSS_CARDS),
      match: [],
      boss: cards.slice(n - BOSS_CARDS),
      kana,
    };
  }
  return {
    nodes,
    warmup: cards.slice(0, n - MATCH_CARDS),
    match: cards.slice(n - MATCH_CARDS),
    boss: cards.slice(n - BOSS_CARDS),
    kana,
  };
}
