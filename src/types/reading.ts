import type { KanaStars, KanaStrengthState, ReadingStage } from '@/lib/kanaProficiency';

export interface TrackReading {
  stage: ReadingStage;
  known: number;
  total: number;
  seen: number;
  characters: { kana: string; stars: KanaStars; state: KanaStrengthState }[];
}

export interface MemberReading {
  hiragana: TrackReading;
  katakana: TrackReading;
  lastPracticedAt: string | null;
}
