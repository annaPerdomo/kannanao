'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { useShopCtx } from '@/contexts/ShopContext';
import { resolveBuddyKey } from '@/lib/buddies';
import { localDateString } from '@/lib/chest';
import {
  canEarn,
  FRIENDSHIP_POINTS,
  friendshipLevel,
  type FriendshipSource,
  isMeaningfulSession,
} from '@/lib/friendship';
import { logger } from '@/lib/logger';
import { onSessionEnd } from '@/lib/sessionSignal';
import { sb } from '@/lib/supabase';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface BuddyFriendship {
  buddyKey: string;
  points: number;
  lastAdventureDate: string | null;
  lastSessionDate: string | null;
  lastPetDate: string | null;
}

export interface FriendshipAward {
  /** Hearts this call paid. */
  awarded: number;
  /** The buddy's new total, as reported by the RPC. */
  points: number;
  leveledUp: boolean;
  newLevel: number;
}

export interface FriendshipLevelUp {
  buddyKey: string;
  level: number;
}

interface DbBuddyFriendship {
  buddy_key: string;
  points: number | null;
  last_adventure_date: string | null;
  last_session_date: string | null;
  last_pet_date: string | null;
}

type Stamps = Record<FriendshipSource, string | null>;

const SOURCE_FIELD: Record<FriendshipSource, keyof BuddyFriendship> = {
  adventure: 'lastAdventureDate',
  session: 'lastSessionDate',
  pet: 'lastPetDate',
};

function dbFriendshipToApp(row: DbBuddyFriendship): BuddyFriendship {
  return {
    buddyKey: row.buddy_key,
    points: row.points ?? 0,
    lastAdventureDate: row.last_adventure_date,
    lastSessionDate: row.last_session_date,
    lastPetDate: row.last_pet_date,
  };
}

function emptyFriendship(buddyKey: string): BuddyFriendship {
  return {
    buddyKey,
    points: 0,
    lastAdventureDate: null,
    lastSessionDate: null,
    lastPetDate: null,
  };
}

/**
 * The newest stamp per source across every buddy row. The daily cap is per
 * USER, not per buddy (the RPC enforces the same cross-row rule), so switching
 * buddies mid-day must not hand a source a second payout.
 */
function mergeStamps(friendships: Record<string, BuddyFriendship>): Stamps {
  const rows = Object.values(friendships);
  const newest = (field: keyof BuddyFriendship) =>
    rows.reduce<string | null>((max, row) => {
      const value = row[field];
      return typeof value === 'string' && (!max || value > max) ? value : max;
    }, null);
  return {
    adventure: newest('lastAdventureDate'),
    session: newest('lastSessionDate'),
    pet: newest('lastPetDate'),
  };
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useBuddyFriendship() {
  const { user } = useAuth();
  const { equipped: shopEquipped } = useShopCtx();
  const buddyKey = resolveBuddyKey(shopEquipped['study_buddy']);

  const [friendships, setFriendships] = useState<Record<string, BuddyFriendship>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [levelUpEvent, setLevelUpEvent] = useState<FriendshipLevelUp | null>(null);

  const fetchFriendships = useCallback(async () => {
    if (!user) {
      setFriendships({});
      setLoading(false);
      return;
    }
    const { data, error: err } = await sb
      .from('buddy_friendship')
      .select('*')
      .eq('user_id', user.id);
    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }
    const next: Record<string, BuddyFriendship> = {};
    ((data ?? []) as DbBuddyFriendship[]).forEach((row) => {
      next[row.buddy_key] = dbFriendshipToApp(row);
    });
    setFriendships(next);
    setError(null);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchFriendships();
  }, [fetchFriendships]);

  const stamps = useMemo(() => mergeStamps(friendships), [friendships]);

  // Mirrored into refs so an award reads the values as of the tap rather than
  // as of the last render — two pets in the same frame would otherwise both
  // pass the local gate and fire the RPC twice.
  const friendshipsRef = useRef(friendships);
  friendshipsRef.current = friendships;
  const stampsRef = useRef(stamps);
  stampsRef.current = stamps;

  const awardFriendship = useCallback(
    async (source: FriendshipSource): Promise<FriendshipAward | null> => {
      if (!user) return null;
      const today = localDateString(new Date());
      if (!canEarn(source, stampsRef.current, today)) return null;

      const points = FRIENDSHIP_POINTS[source];
      const existing = friendshipsRef.current[buddyKey];
      const before = existing ?? emptyFriendship(buddyKey);
      const previousStamp = stampsRef.current[source];

      stampsRef.current = { ...stampsRef.current, [source]: today };
      setFriendships((current) => ({
        ...current,
        [buddyKey]: {
          ...(current[buddyKey] ?? before),
          points: (current[buddyKey] ?? before).points + points,
          [SOURCE_FIELD[source]]: today,
        },
      }));

      // Subtract rather than restore the snapshot: the adventure and session
      // awards can both be in flight at the end of a quest, and putting back a
      // row captured before the other one landed would eat its hearts.
      const rollback = () => {
        stampsRef.current = { ...stampsRef.current, [source]: previousStamp };
        setFriendships((current) => {
          const row = current[buddyKey];
          if (!row) return current;
          const next = { ...current };
          if (!existing && row.points <= points) delete next[buddyKey];
          else
            next[buddyKey] = {
              ...row,
              points: row.points - points,
              [SOURCE_FIELD[source]]: previousStamp,
            };
          return next;
        });
      };

      try {
        const { data, error: rpcErr } = await sb.rpc('award_friendship', {
          p_buddy_key: buddyKey,
          p_source: source,
          p_points: points,
          p_today: today,
        });
        if (rpcErr) throw rpcErr;

        const result = data as { status?: string; points?: number } | null;
        if (result?.status !== 'ok') {
          // 'capped' is the expected loser of a race (two tabs, a double tap
          // the local gate didn't see): the day was already paid, so take the
          // hearts back without bothering the learner about it.
          rollback();
          return null;
        }

        const total = typeof result.points === 'number' ? result.points : before.points + points;
        setFriendships((current) => ({
          ...current,
          [buddyKey]: { ...(current[buddyKey] ?? before), points: total },
        }));

        const newLevel = friendshipLevel(total);
        const leveledUp = newLevel > friendshipLevel(before.points);
        if (leveledUp) setLevelUpEvent({ buddyKey, level: newLevel });
        setError(null);
        return { awarded: points, points: total, leveledUp, newLevel };
      } catch (err) {
        rollback();
        // Supabase hands back a plain PostgrestError object, not an Error.
        const message =
          (err as { message?: string } | null)?.message ?? 'Could not award friendship';
        logger.error('award_friendship failed', { source, buddyKey, message });
        setError(message);
        return null;
      }
    },
    [buddyKey, user],
  );

  const petBuddy = useCallback(() => awardFriendship('pet'), [awardFriendship]);

  // The signal fires from whichever practice mode just ended, so keep the
  // subscription itself stable and read the current award fn through a ref.
  const awardRef = useRef(awardFriendship);
  awardRef.current = awardFriendship;
  useEffect(
    () =>
      onSessionEnd((signal) => {
        if (isMeaningfulSession(signal.cardsStudied)) void awardRef.current('session');
      }),
    [],
  );

  const clearLevelUpEvent = useCallback(() => setLevelUpEvent(null), []);

  const equipped = buddyKey in friendships ? friendships[buddyKey] : null;
  const canPetToday = canEarn('pet', stamps, localDateString(new Date()));

  return {
    friendships,
    equipped,
    loading,
    error,
    awardFriendship,
    petBuddy,
    canPetToday,
    levelUpEvent,
    clearLevelUpEvent,
    refetch: fetchFriendships,
  };
}
