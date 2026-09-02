import { allKana, confusablesFor, getKanaEntry, getSet } from '@/lib/kanaCurriculum';
import { buildQuizOptions, type QuizOption, shuffle } from '@/lib/reviewGames';

export const CHOICE_COUNT = 4;

export const FOCUS_SIZE = 5;

// Never hand a drill the tapped character alone: Lightning would grade the same
// button a hundred times and write every tap to kana_progress as real evidence.
export function focusDrillChars(kana: string): string[] {
  const entry = getKanaEntry(kana);
  if (!entry) return [];
  const lookAlikes = confusablesFor(kana).filter((k) => getKanaEntry(k)?.track === entry.track);
  const row = getSet(entry.setId)?.entries.map((e) => e.kana) ?? [];
  return [...new Set([kana, ...lookAlikes, ...row])].slice(0, FOCUS_SIZE);
}

export function romajiOf(kana: string): string {
  return getKanaEntry(kana)?.romaji ?? kana;
}

export function buildDrillPool(chars: string[], decoyPool?: string[]): string[] {
  const pool = decoyPool?.length ? decoyPool : tracksOf(chars);
  if (pool.length >= CHOICE_COUNT) return pool;
  const rest = tracksOf(chars).filter((kana) => !pool.includes(kana));
  return [...pool, ...rest];
}

function tracksOf(chars: string[]): string[] {
  const tracks = new Set(chars.map((kana) => getKanaEntry(kana)?.track).filter((t) => !!t));
  if (tracks.size === 0) return allKana();
  return [...tracks].flatMap((track) => allKana(track));
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
