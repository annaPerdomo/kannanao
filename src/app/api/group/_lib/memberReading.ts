import { allKana, type KanaTrack } from '@/lib/kanaCurriculum';
import {
  isKanaKnown,
  type KanaProgressMap,
  kanaProgressMap,
  kanaStars,
  kanaStrengthState,
  readingStage,
  totalAnswers,
} from '@/lib/kanaProficiency';
import type { MemberReading, TrackReading } from '@/types/reading';

export const KANA_PROGRESS_COLUMNS =
  'kana, correct_count, wrong_count, last_reviewed_at, interval_days';

export interface KanaProgressRow {
  kana: string;
  correct_count: number | null;
  wrong_count: number | null;
  last_reviewed_at?: string | null;
  interval_days?: number | null;
}

export function toKanaProgressMap(rows: KanaProgressRow[]): KanaProgressMap {
  return kanaProgressMap(
    rows.map((row) => ({
      kana: row.kana,
      correctCount: row.correct_count ?? 0,
      wrongCount: row.wrong_count ?? 0,
      lastReviewedAt: row.last_reviewed_at ?? null,
      intervalDays: row.interval_days ?? undefined,
    })),
  );
}

export function groupKanaProgressByUser<T extends KanaProgressRow & { user_id: string }>(
  rows: T[],
): Map<string, T[]> {
  const byUser = new Map<string, T[]>();
  for (const row of rows) {
    const list = byUser.get(row.user_id) ?? [];
    list.push(row);
    byUser.set(row.user_id, list);
  }
  return byUser;
}

export function knownCount(byKana: KanaProgressMap, track: KanaTrack): number {
  return allKana(track).filter((kana) => isKanaKnown(byKana.get(kana))).length;
}

function trackReading(byKana: KanaProgressMap, track: KanaTrack, now?: Date): TrackReading {
  let known = 0;
  let seen = 0;
  const characters = allKana(track).map((kana) => {
    const progress = byKana.get(kana);
    if (totalAnswers(progress) > 0) seen += 1;
    if (isKanaKnown(progress)) known += 1;
    return { kana, stars: kanaStars(progress), state: kanaStrengthState(progress, now) };
  });
  return { stage: readingStage(byKana, track), known, total: characters.length, seen, characters };
}

export function memberReading(byKana: KanaProgressMap, now?: Date): MemberReading {
  let lastPracticedAt: string | null = null;
  for (const progress of byKana.values()) {
    if (
      progress.lastReviewedAt &&
      (!lastPracticedAt || progress.lastReviewedAt > lastPracticedAt)
    ) {
      lastPracticedAt = progress.lastReviewedAt;
    }
  }
  return {
    hiragana: trackReading(byKana, 'hiragana', now),
    katakana: trackReading(byKana, 'katakana', now),
    lastPracticedAt,
  };
}
