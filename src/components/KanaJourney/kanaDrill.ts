import {
  confusablesFor,
  getKanaEntry,
  getSet,
  kanaBefore,
  setsForTrack,
} from '@/lib/kanaCurriculum';
import { buildQuizOptions, type QuizOption, shuffle } from '@/lib/reviewGames';

export const CHOICE_COUNT = 4;

export function romajiOf(kana: string): string {
  return getKanaEntry(kana)?.romaji ?? kana;
}

export function buildDrillPool(setId: string, unlocked?: string[]): string[] {
  const set = getSet(setId);
  if (!set) return unlocked ?? [];
  const own = set.entries.map((e) => e.kana);
  const pool = unlocked ?? [...own, ...kanaBefore(setId)];
  if (pool.length >= CHOICE_COUNT) return pool;
  const rest = setsForTrack(set.track).flatMap((s) => s.entries.map((e) => e.kana));
  return [...pool, ...rest.filter((k) => !pool.includes(k))];
}

// Never two characters with the same sound (ぢ/じ, づ/ず): a duplicate reading
// would make two options right at once.
export function pickDecoys(target: string, pool: string[], count = CHOICE_COUNT - 1): string[] {
  const inPool = new Set(pool);
  const lookAlikes = shuffle(confusablesFor(target).filter((k) => inPool.has(k)));
  const others = shuffle(pool.filter((k) => !lookAlikes.includes(k)));

  const usedRomaji = new Set([romajiOf(target)]);
  const decoys: string[] = [];
  for (const kana of [...lookAlikes, ...others]) {
    if (decoys.length >= count) break;
    const romaji = romajiOf(kana);
    if (kana === target || usedRomaji.has(romaji)) continue;
    usedRomaji.add(romaji);
    decoys.push(kana);
  }
  return decoys;
}

export function buildRomajiChoices(target: string, pool: string[]): QuizOption[] {
  return buildQuizOptions(romajiOf(target), pickDecoys(target, pool).map(romajiOf));
}

export function buildKanaChoices(target: string, pool: string[]): QuizOption[] {
  return buildQuizOptions(target, pickDecoys(target, pool));
}

export function drillOrder(chars: string[], rounds = 1): string[] {
  const out: string[] = [];
  for (let i = 0; i < rounds; i++) out.push(...shuffle(chars));
  return out;
}
