/**
 * Mixed Practice planning — the deck page's one Practice button, expanded into
 * a short chain of ordinary sessions.
 *
 * The mix is a difficulty ladder, not random variety: the plan only reaches for
 * a rung the cards have earned. An exercise whose requirement fails (no
 * sentences, no Japanese voice, Reading switched off) drops out silently, down
 * to a floor of flip plus meaning pick that any two-card deck can serve.
 */
import { MIN_SENTENCES } from '@/components/Practice/KotobaBubbleMode/constants';
import {
  eligibleReadingCards,
  MIN_READING_CARDS,
} from '@/components/Practice/ReadingMode/eligibility';
import type { Flashcard } from '@/types/flashcard';

import { cardStrength, type StrengthCounts } from './cardStrength';
import { endingItems, MIN_ENDING_ITEMS } from './grammarEndings';
import type { ChainLeg, ChainMode } from './practiceChain';
import type { CardProgress } from './supabase';

/** What this deck, on this device, is able to ask. */
export interface MixedDeckSupport {
  cardCount: number;
  /** Cards with an example sentence to blank out. */
  fillCards: number;
  /** Cards with kanji to hide a reading behind. */
  readingCards: number;
  readingUnlocked: boolean;
  /** A Japanese voice resolved — Listen is useless without one. */
  ttsReady: boolean;
  /** Deck-wide, unlike every other field here: sentences aren't tied to cards. */
  sentenceCount: number;
  /** Conjugation cards the ending-picker mode can ask about. */
  endingItems: number;
  /** Of those, the ones whose own word/meaning drill the detected form —
   * a deck built around the grammar point, not a vocab deck that has a few. */
  drillItems: number;
}

/** The choice-based exercises need distractors, and Match needs a grid. */
export const MIXED_GAME_MIN_CARDS = 4;
/** Cards one session covers, whatever the deck holds: 60 through four legs is half an hour. */
export const MIXED_SESSION_CARDS = 12;
/** Legs, not minutes, but it is the length cap: ~5–8 minutes of practice. */
export const MAX_MIXED_LEGS = 4;
const MIN_FILL_CARDS = 2;

export function deckSupport(
  cards: Flashcard[],
  {
    readingUnlocked,
    ttsReady,
    sentenceCount,
  }: { readingUnlocked: boolean; ttsReady: boolean; sentenceCount: number },
): MixedDeckSupport {
  return {
    cardCount: cards.length,
    fillCards: cards.filter((c) => c.example_jp.trim()).length,
    readingCards: eligibleReadingCards(cards).length,
    readingUnlocked,
    ttsReady,
    sentenceCount,
    endingItems: endingItems(cards).length,
    drillItems: endingItems(cards).filter((item) => item.drillsCard).length,
  };
}

/**
 * Rank for the session picker, low first: cards being missed now, then cards
 * never met, then strong ones — due before waiting within each.
 */
function sessionRank(card: Flashcard, progress: CardProgress | undefined, nowMs: number): number {
  const strength = cardStrength(progress);
  const base = strength === 'learning' ? 0 : strength === 'new' ? 1 : 2;
  // A card with no row has nothing scheduled — it is neither due nor waiting.
  const waiting = progress ? Date.parse(progress.nextReviewAt) > nowMs : false;
  return base + (waiting ? 0.5 : 0);
}

/** Every card ranked in mixed-session order: weakest and due first. */
export function rankCardsForSession(
  cards: Flashcard[],
  progress: CardProgress[],
  now: Date = new Date(),
): Flashcard[] {
  const byCard = new Map(progress.map((row) => [row.cardId, row]));
  const nowMs = now.getTime();
  return [...cards]
    .map((card, i) => ({ card, i, rank: sessionRank(card, byCard.get(card.id), nowMs) }))
    .sort((a, b) => a.rank - b.rank || a.i - b.i)
    .map((entry) => entry.card);
}

/** The cards one mixed session covers: weakest and due first, capped. */
export function pickMixedSessionCards(
  cards: Flashcard[],
  progress: CardProgress[],
  now: Date = new Date(),
  limit: number = MIXED_SESSION_CARDS,
): Flashcard[] {
  return rankCardsForSession(cards, progress, now).slice(0, limit);
}

export interface MixedPlanInput {
  support: MixedDeckSupport;
  counts: StrengthCounts;
  /** Modes to leave out — an assignment quest owns its goal mode and warm-up. */
  exclude?: readonly ChainMode[];
}

function productionLeg({ support, counts }: MixedPlanInput): ChainLeg | null {
  if (counts.strong === 0) return null;
  if (support.readingUnlocked && support.readingCards >= MIN_READING_CARDS) {
    return { step: 'goal', mode: 'reading' };
  }
  if (support.fillCards >= MIN_FILL_CARDS) return { step: 'goal', mode: 'fill' };
  return null;
}

/** Grammar practice on brand-new words, so it carries no strength condition. */
function sentenceLeg(support: MixedDeckSupport): ChainLeg | null {
  return support.sentenceCount >= MIN_SENTENCES
    ? { step: 'practice', mode: 'kotoba-bubble' }
    : null;
}

export const VOCAB_DROP_ORDER: readonly ChainMode[] = ['match', 'listen', 'endings'];
export const GRAMMAR_DROP_ORDER: readonly ChainMode[] = ['match', 'listen', 'recall'];

export function trimLadder(
  opening: ChainLeg[],
  tail: ChainLeg[],
  budget: number,
  dropOrder: readonly ChainMode[],
): ChainLeg[] {
  const result = [...opening];
  while (result.length + tail.length > budget) {
    let removedIndex = -1;
    for (const mode of dropOrder) {
      const idx = result.findLastIndex((leg, i) => i >= 1 && leg.mode === mode);
      if (idx !== -1) {
        removedIndex = idx;
        break;
      }
    }
    if (removedIndex === -1) {
      removedIndex = result.findLastIndex((leg, i) => i >= 1 && leg.mode !== 'kotoba-bubble');
    }
    if (removedIndex === -1) break;
    result.splice(removedIndex, 1);
  }
  return [...result, ...tail];
}

/**
 * The legs of one mixed session, in ladder order. Empty when the deck can't
 * serve even the floor, so callers can fall back to the plain deck page.
 */
export function planMixedPractice(input: MixedPlanInput): ChainLeg[] {
  const { support, counts, exclude = [] } = input;
  if (support.cardCount < 2) return [];

  const keep = (leg: ChainLeg) => !exclude.includes(leg.mode);
  const production = productionLeg(input);
  const sentence = sentenceLeg(support);

  const unfiltered: ChainLeg[] = [];
  if (counts.new > 0) unfiltered.push({ step: 'warmup', mode: 'study' });
  unfiltered.push({ step: 'practice', mode: 'recall' });
  if (sentence) unfiltered.push(sentence);
  // Hearing a word never seen written is guesswork, so Listen waits for a card
  // that has been answered at least once.
  if (support.ttsReady && counts.new < support.cardCount) {
    unfiltered.push({ step: 'practice', mode: 'listen' });
  }
  if (support.cardCount >= MIXED_GAME_MIN_CARDS) {
    unfiltered.push({ step: 'practice', mode: 'match' });
  }

  const opening = unfiltered.filter(keep);
  const tail = production && keep(production) ? [production] : [];
  if (opening.length + tail.length === 0) return [];

  const endingsLeg: ChainLeg = { step: 'practice', mode: 'endings' };
  const isGrammarDeck = support.drillItems * 2 >= support.cardCount;
  if (support.endingItems >= MIN_ENDING_ITEMS && keep(endingsLeg)) {
    if (isGrammarDeck) {
      opening.splice(1, 0, endingsLeg);
    } else {
      opening.push(endingsLeg);
    }
  }

  return trimLadder(
    opening,
    tail,
    MAX_MIXED_LEGS,
    isGrammarDeck ? GRAMMAR_DROP_ORDER : VOCAB_DROP_ORDER,
  );
}
