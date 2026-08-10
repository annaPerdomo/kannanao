import type { DeckReadiness } from '@/hooks/useDeckReadiness';
import type { GroupMember } from '@/hooks/useGroup';

/** Each value needs a `Group.deckReadiness.level` string in both locale files. */
export type ReadinessLevel = 'notStarted' | 'ready' | 'gettingThere' | 'needsLesson';

const READY_MIN_PCT = 80;
const GETTING_THERE_MIN_PCT = 40;

export const MAX_STRUGGLING_NAMES = 3;

export interface ReadinessMeter {
  strongPct: number;
  learningPct: number;
  unseenPct: number;
}

type TierCounts = Pick<DeckReadiness, 'strong' | 'learning' | 'unseen'>;

/**
 * Bands are read off the same rounded percentage the row prints, so a deck can
 * never show "80% strong" above "Getting there". A deck nobody has touched gets
 * its own verdict rather than being told to reteach a lesson that never ran.
 */
export function readinessLevel(deck: TierCounts): ReadinessLevel {
  if (deck.strong + deck.learning <= 0) return 'notStarted';
  const { strongPct } = readinessMeter(deck);
  if (strongPct >= READY_MIN_PCT) return 'ready';
  if (strongPct >= GETTING_THERE_MIN_PCT) return 'gettingThere';
  return 'needsLesson';
}

/** Percentages that always sum to 100, so the meter never leaves a seam. */
export function readinessMeter(deck: TierCounts): ReadinessMeter {
  const total = deck.strong + deck.learning + deck.unseen;
  if (total <= 0) return { strongPct: 0, learningPct: 0, unseenPct: 0 };
  const strongPct = Math.round((deck.strong / total) * 100);
  const learningPct = Math.round((deck.learning / total) * 100);
  return { strongPct, learningPct, unseenPct: Math.max(0, 100 - strongPct - learningPct) };
}

function firstName(member: Pick<GroupMember, 'displayName' | 'username'>): string {
  const display = member.displayName?.trim();
  return display ? display.split(/\s+/)[0] : member.username;
}

export interface StrugglingNames {
  /** "Mika, Ken +2", or '' when no id matched a current member. */
  text: string;
  /** How many ids resolved — the count the caller should print alongside `text`. */
  resolved: number;
}

/**
 * Ids with no matching member are dropped rather than rendered as a raw uuid.
 * `resolved` comes back so the count can match the names: members and readiness
 * are cached separately, so a learner who left the group can sit in the id list
 * for up to a cache window.
 */
export function strugglingNames(
  ids: string[],
  members: Pick<GroupMember, 'id' | 'displayName' | 'username'>[],
  max = MAX_STRUGGLING_NAMES,
): StrugglingNames {
  const byId = new Map(members.map((m) => [m.id, m]));
  const names = ids
    .map((id) => byId.get(id))
    .filter((m) => m !== undefined)
    .map(firstName);
  if (names.length === 0) return { text: '', resolved: 0 };
  const extra = names.length - max;
  return {
    text: extra > 0 ? `${names.slice(0, max).join(', ')} +${extra}` : names.join(', '),
    resolved: names.length,
  };
}
