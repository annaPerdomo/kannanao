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
  heartsEarnedToday,
  isMeaningfulSession,
  todayOpportunities,
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

/**
 * 'idle' until someone calls ensureLoaded. Consumers need "not fetched yet"
 * and "fetched, no rows" to be distinguishable — 0 ❤️ for the former is a lie.
 */
export type FriendshipLoadState = 'idle' | 'loading' | 'loaded' | 'error';

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

/** A row a rollback emptied back out — indistinguishable from having no row. */
function isBlank(row: BuddyFriendship): boolean {
  return row.points <= 0 && !row.lastAdventureDate && !row.lastSessionDate && !row.lastPetDate;
}

/**
 * One stamp per source across every buddy row: the daily cap is per USER, not
 * per buddy, so switching buddies mid-day must not re-pay a source. `today`
 * beats a newer stamp because the RPC's check is "does ANY row equal today" —
 * a future-dated row (clock skew) would otherwise read as spent.
 */
function mergeStamps(friendships: Record<string, BuddyFriendship>, today: string): Stamps {
  const rows = Object.values(friendships);
  const merge = (field: keyof BuddyFriendship) => {
    if (rows.some((row) => row[field] === today)) return today;
    return rows.reduce<string | null>((max, row) => {
      const value = row[field];
      return typeof value === 'string' && (!max || value > max) ? value : max;
    }, null);
  };
  return {
    adventure: merge('lastAdventureDate'),
    session: merge('lastSessionDate'),
    pet: merge('lastPetDate'),
  };
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useBuddyFriendship() {
  const { user } = useAuth();
  const { equipped: shopEquipped, loading: shopLoading } = useShopCtx();
  const buddyKey = resolveBuddyKey(shopEquipped['study_buddy']);

  const [friendships, setFriendships] = useState<Record<string, BuddyFriendship>>({});
  const [loadState, setLoadState] = useState<FriendshipLoadState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [levelUpEvent, setLevelUpEvent] = useState<FriendshipLevelUp | null>(null);

  const loadRef = useRef<{ userId: string; promise: Promise<void> } | null>(null);

  const fetchFriendships = useCallback(async (userId: string) => {
    setLoadState('loading');
    const { data, error: err } = await sb
      .from('buddy_friendship')
      .select('*')
      .eq('user_id', userId);
    if (err) {
      setError(err.message);
      setLoadState('error');
      // ensureLoaded caches its promise, so a kept one would never retry.
      loadRef.current = null;
      return;
    }
    const next: Record<string, BuddyFriendship> = {};
    ((data ?? []) as DbBuddyFriendship[]).forEach((row) => {
      next[row.buddy_key] = dbFriendshipToApp(row);
    });
    setFriendships(next);
    setError(null);
    setLoadState('loaded');
  }, []);

  /**
   * Deliberately not fetched on mount — this provider is app-wide and the RPC's
   * cap is authoritative, so the local stamps only save a doomed call. Awarding
   * loads them; a screen that renders hearts calls this itself.
   */
  const ensureLoaded = useCallback(() => {
    // Consumers gate their render on this settling, so a signed-out visitor
    // left at 'idle' would hold a skeleton forever.
    if (!user) {
      setLoadState('loaded');
      return Promise.resolve();
    }
    if (loadRef.current?.userId !== user.id) {
      loadRef.current = { userId: user.id, promise: fetchFriendships(user.id) };
    }
    return loadRef.current.promise;
  }, [user, fetchFriendships]);

  const refetch = useCallback(() => {
    if (!user) return Promise.resolve();
    loadRef.current = { userId: user.id, promise: fetchFriendships(user.id) };
    return loadRef.current.promise;
  }, [user, fetchFriendships]);

  useEffect(() => {
    if (user) return;
    loadRef.current = null;
    setFriendships({});
    setLoadState('idle');
    // A level-up is held until the user leaves a session route, so an unconsumed
    // one would otherwise pop for whoever signs in next on this tab.
    setLevelUpEvent(null);
    setError(null);
  }, [user]);

  const today = localDateString(new Date());
  const stamps = useMemo(() => mergeStamps(friendships, today), [friendships, today]);

  // Read at tap time, not last-render time: two pets in one frame would
  // otherwise both pass the local gate and fire the RPC twice.
  const friendshipsRef = useRef(friendships);
  friendshipsRef.current = friendships;
  const stampsRef = useRef(stamps);
  stampsRef.current = stamps;

  // Optimistic hearts still awaiting their RPC, per buddy. A settling award
  // rebases onto the server's total plus whatever the OTHER open awards added
  // — baselining off local state folds in their unconfirmed points and leaves
  // the total wrong until a full reload.
  const inFlightRef = useRef(new Map<string, Map<number, number>>());
  const awardIdRef = useRef(0);

  const awardFriendship = useCallback(
    async (source: FriendshipSource): Promise<FriendshipAward | null> => {
      // Until the shop resolves, resolveBuddyKey answers with the default
      // buddy — and the per-day cap means hearts paid to the wrong buddy can't
      // be moved to the right one today.
      if (!user || shopLoading) return null;
      await ensureLoaded();

      const awardedOn = localDateString(new Date());
      if (!canEarn(source, stampsRef.current, awardedOn)) return null;

      const points = FRIENDSHIP_POINTS[source];
      const existing = friendshipsRef.current[buddyKey];
      const before = existing ?? emptyFriendship(buddyKey);
      const previousStamp = stampsRef.current[source];
      // The row's own stamp, not the merged one: restoring the merged value
      // would claim this buddy was petted on another buddy's day.
      const previousRowStamp = (existing?.[SOURCE_FIELD[source]] as string | null) ?? null;

      const awardId = ++awardIdRef.current;
      const open = inFlightRef.current.get(buddyKey) ?? new Map<number, number>();
      inFlightRef.current.set(buddyKey, open);
      open.set(awardId, points);
      /** Closes this award out and reports the hearts the others still hold. */
      const settle = () => {
        open.delete(awardId);
        if (open.size === 0) inFlightRef.current.delete(buddyKey);
        let pending = 0;
        for (const value of open.values()) pending += value;
        return pending;
      };

      stampsRef.current = { ...stampsRef.current, [source]: awardedOn };
      setFriendships((current) => ({
        ...current,
        [buddyKey]: {
          ...(current[buddyKey] ?? before),
          points: (current[buddyKey] ?? before).points + points,
          [SOURCE_FIELD[source]]: awardedOn,
        },
      }));

      const rollback = () => {
        settle();
        stampsRef.current = { ...stampsRef.current, [source]: previousStamp };
        setFriendships((current) => {
          const row = current[buddyKey];
          if (!row) return current;
          const next = { ...current };
          const restored = {
            ...row,
            points: row.points - points,
            [SOURCE_FIELD[source]]: previousRowStamp,
          };
          if (isBlank(restored)) delete next[buddyKey];
          else next[buddyKey] = restored;
          return next;
        });
      };

      try {
        const { data, error: rpcErr } = await sb.rpc('award_friendship', {
          p_buddy_key: buddyKey,
          p_source: source,
          p_points: points,
          p_today: awardedOn,
        });
        if (rpcErr) throw rpcErr;

        const result = data as { status?: string; points?: number } | null;
        if (result?.status !== 'ok') {
          // 'capped' is the expected loser of a race (two tabs, a double tap
          // the local gate missed) — take the hearts back, say nothing.
          rollback();
          return null;
        }

        const serverTotal = typeof result.points === 'number' ? result.points : null;
        const pending = settle();
        if (serverTotal !== null) {
          setFriendships((current) => {
            const row = current[buddyKey];
            if (!row) return current;
            return { ...current, [buddyKey]: { ...row, points: serverTotal + pending } };
          });
        }
        const total = serverTotal ?? before.points + points;

        // Levels come off the RPC's total, not local state: a concurrent
        // award's unconfirmed points in `before` would hide a real crossing.
        const newLevel = friendshipLevel(total);
        const leveledUp = newLevel > friendshipLevel(total - points);
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
    [buddyKey, ensureLoaded, shopLoading, user],
  );

  const petBuddy = useCallback(() => awardFriendship('pet'), [awardFriendship]);

  // Subscribe once — awardFriendship's identity changes on every award.
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
  const canPetToday = canEarn('pet', stamps, today);
  const todayGoals = useMemo(() => todayOpportunities(stamps, today), [stamps, today]);
  const heartsToday = useMemo(() => heartsEarnedToday(stamps, today), [stamps, today]);

  return {
    friendships,
    equipped,
    loadState,
    loading: loadState === 'loading',
    error,
    awardFriendship,
    petBuddy,
    canPetToday,
    todayGoals,
    heartsToday,
    levelUpEvent,
    clearLevelUpEvent,
    ensureLoaded,
    refetch,
  };
}
