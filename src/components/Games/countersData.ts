/**
 * Content and round logic for the "How Many?" counter game.
 *
 * Japanese counts things with a counter word, and the first ten of each series
 * are where the irregulars live (ひとつ・ふたつ, ひとり・ふたり, よにん, しちにん).
 * The tables below are the source of truth for both the answer and the
 * distractors, so a round can never offer a reading that does not exist.
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

/** Reading for `count` (1–10) in this counter series. */
export function counterReading(series: CounterSeries, count: number): string {
  return COUNTER_READINGS[series][count - 1];
}

/**
 * Four shuffled answer chips: the correct reading, two neighbours from the same
 * series (±1, ±2 — the ones a learner actually mixes up) and one same-number
 * reading from another series (さんにん vs さんまい).
 */
export function buildCounterOptions(series: CounterSeries, count: number): string[] {
  const answer = counterReading(series, count);
  const neighbours = shuffle([count - 1, count + 1, count - 2, count + 2])
    .filter((n) => n >= 1 && n <= MAX_COUNT)
    .map((n) => counterReading(series, n));
  const otherSeries = shuffle(COUNTER_SERIES.filter((s) => s !== series));

  const options = new Set<string>([answer]);
  for (const reading of neighbours.slice(0, 2)) options.add(reading);
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
  /** The correct reading — also the one highlighted after an answer. */
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
