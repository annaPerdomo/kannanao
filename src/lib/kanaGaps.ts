import type { PlanDeck } from '@/types/lessonPlan';

import { kanaSetForChar, orderKanaSets, segmentReading } from './kanaCurriculum';
import { cardIsBlank, deckIsSkipped } from './lessonPlanEdits';

export interface KanaGroupMember {
  id: string;
  name: string;
  started: boolean;
}

export interface GroupKanaReadiness {
  members: KanaGroupMember[];
  /**
   * Kana at least one started member cannot read yet, as indexes into
   * `members` — a just-started group owes an entry per character, and repeating
   * uuids there costs tens of kilobytes per plan. Absent means the group reads it.
   */
  shakyBy: Record<string, number[]>;
}

/** Answers below this and a member counts as untried: a couple of taps is not a reading level. */
export const KANA_SIGNAL_MIN_ANSWERS = 5;

/** One lesson can only lean on so many rows before "also assign these" stops being one decision. */
export const MAX_COMPANION_KANA_SETS = 6;

export interface KanaGap {
  kana: string;
  setId: string | null;
  shaky: KanaGroupMember[];
  untried: KanaGroupMember[];
}

/** No data is not the same as not mastered: a group that never opened Learn Kana has no rows, and flagging every card for them reads as broken. */
export function hasKanaSignal(readiness: GroupKanaReadiness | null | undefined): boolean {
  return !!readiness && readiness.members.some((m) => m.started);
}

export function readingKanaGaps(reading: string, readiness: GroupKanaReadiness): KanaGap[] {
  const untried = readiness.members.filter((m) => !m.started);
  const seen = new Set<string>();
  const gaps: KanaGap[] = [];

  for (const kana of segmentReading(reading)) {
    if (seen.has(kana)) continue;
    seen.add(kana);

    const behind = readiness.shakyBy[kana];
    if (!behind || behind.length === 0) continue;

    gaps.push({
      kana,
      setId: kanaSetForChar(kana),
      shaky: behind.map((i) => readiness.members[i]).filter((m): m is KanaGroupMember => !!m),
      untried,
    });
  }

  return gaps;
}

export function gapSetIds(gaps: KanaGap[]): string[] {
  const ids = new Set(gaps.map((gap) => gap.setId).filter((id): id is string => !!id));
  return orderKanaSets(ids).map((set) => set.id);
}

/** Gaps per deck, per card, index-aligned with every card so the review rows can read them off. */
export function planKanaGaps(
  decks: PlanDeck[],
  readiness: GroupKanaReadiness | null | undefined,
): KanaGap[][][] {
  if (!hasKanaSignal(readiness)) return decks.map((deck) => (deck.cards ?? []).map(() => []));
  // The generator leaves `reading` empty when the word is already kana, so the
  // word itself is the reading. segmentReading drops kanji, so this is safe.
  return decks.map((deck) =>
    (deck.cards ?? []).map((card) => readingKanaGaps(card.reading || card.word || '', readiness!)),
  );
}

/** Capped here so the callout, the apply route and the printable all name the same rows. */
export function companionSetIds(decks: PlanDeck[], perDeck: KanaGap[][][]): string[] {
  const gaps = decks.flatMap((deck, d) =>
    deckIsSkipped(deck)
      ? []
      : (deck.cards ?? []).flatMap((card, c) =>
          card.excluded || cardIsBlank(card) ? [] : (perDeck[d]?.[c] ?? []),
        ),
  );
  return gapSetIds(gaps).slice(0, MAX_COMPANION_KANA_SETS);
}
