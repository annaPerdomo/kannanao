import type { GoalMode } from './assignmentMastery';
import { isPureKana } from './reviewGames';

const KANJI = /[㐀-䶿一-鿿]/;

export const KANJI_GOAL_MODES: readonly GoalMode[] = ['reading', 'kanji-match', 'reading-pick'];

export function isKanjiGoalMode(mode: string | null | undefined): boolean {
  return (KANJI_GOAL_MODES as readonly string[]).includes(mode ?? '');
}

export interface KanjiCandidate {
  word: string;
  reading: string;
  mainViewMode?: string;
}

export function isKanjiWord(card: KanjiCandidate): boolean {
  if (typeof card.word !== 'string' || typeof card.reading !== 'string') return false;
  const reading = card.reading.trim();
  return KANJI.test(card.word) && isPureKana(reading) && reading !== card.word;
}

export function hasKanjiWords(cards: readonly KanjiCandidate[]): boolean {
  return cards.some(isKanjiWord);
}

export function suggestKanjiPractice(args: {
  cards: readonly KanjiCandidate[];
  classUsesKanji: boolean;
}): boolean {
  const kanji = args.cards.filter(isKanjiWord);
  if (kanji.length === 0) return false;
  return args.classUsesKanji || kanji.some((card) => card.mainViewMode === 'kanji');
}
