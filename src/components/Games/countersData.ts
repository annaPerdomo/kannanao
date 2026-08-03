/**
 * The first ten of each counter series are where Japanese hides its irregulars
 * (ひとつ・ふたつ, ひとり・ふたり, よにん, しちにん). The tables below are the source of
 * truth for the answer *and* the distractors, so a round can never offer a
 * reading that does not exist.
 */
import { shuffle } from '@/lib/reviewGames';

/** つ (general things), まい (flat things), にん (people). */
export type CounterSeries = 'tsu' | 'mai' | 'nin';

export const COUNTER_SERIES: CounterSeries[] = ['tsu', 'mai', 'nin'];

/** Readings for 1–10, index 0 = one. */
export const COUNTER_READINGS: Record<CounterSeries, string[]> = {
  tsu: [
    'ひとつ',
    'ふたつ',
    'みっつ',
    'よっつ',
    'いつつ',
    'むっつ',
    'ななつ',
    'やっつ',
    'ここのつ',
    'とお',
  ],
  mai: [
    'いちまい',
    'にまい',
    'さんまい',
    'よんまい',
    'ごまい',
    'ろくまい',
    'ななまい',
    'はちまい',
    'きゅうまい',
    'じゅうまい',
  ],
  nin: [
    'ひとり',
    'ふたり',
    'さんにん',
    'よにん',
    'ごにん',
    'ろくにん',
    'しちにん',
    'はちにん',
    'きゅうにん',
    'じゅうにん',
  ],
};

export const MAX_COUNT = 10;

export interface CounterItem {
  /** Message key under `Games.counterGame.items` — also the aria-label source. */
  id: string;
  emoji: string;
  series: CounterSeries;
}

export const COUNTER_ITEMS: CounterItem[] = [
  { id: 'apple', emoji: '🍎', series: 'tsu' },
  { id: 'egg', emoji: '🥚', series: 'tsu' },
  { id: 'candy', emoji: '🍬', series: 'tsu' },
  { id: 'donut', emoji: '🍩', series: 'tsu' },
  { id: 'ball', emoji: '⚽', series: 'tsu' },
  { id: 'riceBall', emoji: '🍙', series: 'tsu' },
  { id: 'balloon', emoji: '🎈', series: 'tsu' },
  { id: 'cupcake', emoji: '🧁', series: 'tsu' },

  { id: 'paper', emoji: '📄', series: 'mai' },
  { id: 'shirt', emoji: '👕', series: 'mai' },
  { id: 'ticket', emoji: '🎫', series: 'mai' },
  { id: 'disc', emoji: '💿', series: 'mai' },
  { id: 'card', emoji: '🃏', series: 'mai' },
  { id: 'bread', emoji: '🍞', series: 'mai' },
  { id: 'tissue', emoji: '🧻', series: 'mai' },
  { id: 'photo', emoji: '🖼️', series: 'mai' },

  { id: 'boy', emoji: '👦', series: 'nin' },
  { id: 'girl', emoji: '👧', series: 'nin' },
  { id: 'teacher', emoji: '🧑‍🏫', series: 'nin' },
  { id: 'student', emoji: '🧑‍🎓', series: 'nin' },
  { id: 'baby', emoji: '👶', series: 'nin' },
  { id: 'cook', emoji: '🧑‍🍳', series: 'nin' },
  { id: 'doctor', emoji: '🧑‍⚕️', series: 'nin' },
  { id: 'person', emoji: '🧑', series: 'nin' },
];

/**
 * Quantities to draw from. 1–7 appear twice: the small numbers carry the
 * irregular readings, and ten of one emoji is a busy screen for a beginner.
 */
const QUANTITY_POOL = [1, 2, 3, 4, 5, 6, 7, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

/**
 * Wrong readings learners actually produce, per series and number.
 *
 * These are not invented: they are the two mistakes on the summer packet's own
 * answer sheet (しまい for 4, しちまい for 7 — the し/しち readings carried over
 * from 四月・七月) plus the same over-regularisation applied to the counters
 * that reject a plain number (よんにん for よにん, いちつ for ひとつ).
 *
 * Offering the real mistake makes a round a discrimination instead of a lookup.
 * At most one appears per round, so three of the four chips are always real
 * readings, and a wrong tap always shows the correct one.
 */
export const COUNTER_MISREADINGS: Record<CounterSeries, Partial<Record<number, string>>> = {
  tsu: { 1: 'いちつ', 2: 'につ', 3: 'さんつ', 10: 'じゅうつ' },
  mai: { 4: 'しまい', 7: 'しちまい' },
  nin: { 1: 'いちにん', 2: 'ににん', 4: 'よんにん' },
};

/** Reading for `count` (1–10) in this counter series. */
export function counterReading(series: CounterSeries, count: number): string {
  return COUNTER_READINGS[series][count - 1];
}

/**
 * Four shuffled answer chips: the correct reading, the mistake a learner
 * actually makes for this number (when there is one), one same-number reading
 * from another series (さんにん vs さんまい), and neighbours from the same
 * series (±1, ±2) to fill.
 */
export function buildCounterOptions(series: CounterSeries, count: number): string[] {
  const answer = counterReading(series, count);
  const neighbours = shuffle([count - 1, count + 1, count - 2, count + 2])
    .filter((n) => n >= 1 && n <= MAX_COUNT)
    .map((n) => counterReading(series, n));
  const otherSeries = shuffle(COUNTER_SERIES.filter((s) => s !== series));

  const options = new Set<string>([answer]);
  const misreading = COUNTER_MISREADINGS[series][count];
  if (misreading) options.add(misreading);
  for (const reading of neighbours.slice(0, misreading ? 1 : 2)) options.add(reading);
  options.add(counterReading(otherSeries[0], count));

  // Top up if any of the picks collided, so a round always offers four chips.
  for (const fallback of [
    ...neighbours,
    ...otherSeries.flatMap((s) => COUNTER_READINGS[s]),
    ...COUNTER_READINGS[series],
  ]) {
    if (options.size >= 4) break;
    options.add(fallback);
  }
  return shuffle([...options]);
}

export interface CounterRound {
  item: CounterItem;
  count: number;
  answer: string;
  /** Four shuffled chips, one of them the answer. */
  options: string[];
}

/**
 * A game's worth of rounds. Series rotate so a session always drills all three
 * counters instead of leaving one to chance.
 */
export function buildCounterRounds(total = 9): CounterRound[] {
  const pools: Record<CounterSeries, CounterItem[]> = {
    tsu: shuffle(COUNTER_ITEMS.filter((i) => i.series === 'tsu')),
    mai: shuffle(COUNTER_ITEMS.filter((i) => i.series === 'mai')),
    nin: shuffle(COUNTER_ITEMS.filter((i) => i.series === 'nin')),
  };
  const order = shuffle(COUNTER_SERIES);

  return Array.from({ length: total }, (_, i) => {
    const series = order[i % order.length];
    const item = pools[series][Math.floor(i / order.length) % pools[series].length];
    const count = QUANTITY_POOL[Math.floor(Math.random() * QUANTITY_POOL.length)];
    return {
      item,
      count,
      answer: counterReading(series, count),
      options: buildCounterOptions(series, count),
    };
  });
}
