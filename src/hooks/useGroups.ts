'use client';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import {
  fetchJsonCached,
  invalidateApiCache,
  peekApiCache,
  peekApiCacheMeta,
} from '@/lib/apiCache';
import { type DataError, toDataError } from '@/lib/dataError';
import { sb } from '@/lib/supabase';

/** One member's identity, enough to draw an initial avatar. */
export interface GroupMemberFace {
  avatar?: string | null;
  id: string;
  name: string;
}

export interface Group {
  id: string;
  organizer_id: string;
  name: string;
  emoji: string | null;
  pinned: boolean;
  show_leaderboard: boolean;
  created_at: string;
  memberCount: number;
  // ── Rollups computed by GET /api/group/groups (see that route) ──
  /** Members who studied today. */
  activeCount: number;
  /** Lifetime cards studied across the group. */
  cardsStudied: number;
  /** XP earned since Monday across the group — same week as the leaderboard. */
  weeklyXp: number;
  /** Up to four members, for the avatar stack. */
  faces: GroupMemberFace[];
}

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await sb.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const GROUPS_URL = '/api/group/groups';

export function useGroups(enabled = true) {
  // Seed from the cache so returning to a page paints instantly; the effect
  // below still revalidates stale data in the background.
  const [groups, setGroups] = useState<Group[]>(() => peekApiCache(GROUPS_URL) ?? []);
  const [loading, setLoading] = useState(enabled && peekApiCache(GROUPS_URL) === undefined);
  const [error, setError] = useState<DataError | null>(null);
  const [stale, setStale] = useState(() => peekApiCacheMeta(GROUPS_URL)?.stale ?? false);
  const { user, isMemberAccount } = useAuth();
  const t = useTranslations('Group.useGroups');

  const load = useCallback(
    async (freshMs?: number) => {
      if (!enabled || !user || isMemberAccount) {
        setGroups([]);
        setLoading(false);
        return;
      }
      const cached = peekApiCache<Group[]>(GROUPS_URL);
      if (cached) setGroups(cached);
      setStale(peekApiCacheMeta(GROUPS_URL)?.stale ?? false);
      setLoading(!cached);
      setError(null);
      try {
        const data = await fetchJsonCached<Group[]>(
          GROUPS_URL,
          authHeaders,
          freshMs === undefined ? {} : { freshMs },
        );
        setGroups(data);
      } catch (err) {
        setError(toDataError(err));
      } finally {
        setStale(peekApiCacheMeta(GROUPS_URL)?.stale ?? false);
        setLoading(false);
      }
    },
    [user, isMemberAccount, enabled],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const fetchGroups = useCallback(() => load(0), [load]);

  const createGroup = useCallback(
    async (name: string, emoji?: string): Promise<Group> => {
      const res = await fetch('/api/group/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
        body: JSON.stringify({ name, emoji }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? t('createFailed'));
      }
      const group: Group = await res.json();
      invalidateApiCache(GROUPS_URL);
      setGroups((prev) => [...prev, group]);
      return group;
    },
    [t],
  );

  const updateGroup = useCallback(
    async (
      id: string,
      updates: {
        name?: string;
        emoji?: string | null;
        pinned?: boolean;
        show_leaderboard?: boolean;
      },
    ) => {
      const prev = groups;
      invalidateApiCache(GROUPS_URL);
      setGroups((g) => g.map((item) => (item.id === id ? { ...item, ...updates } : item)));
      try {
        const res = await fetch(`/api/group/groups/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
          body: JSON.stringify(updates),
        });
        if (!res.ok) throw new Error();
      } catch {
        setGroups(prev);
      }
    },
    [groups],
  );

  const deleteGroup = useCallback(
    async (id: string) => {
      const prev = groups;
      invalidateApiCache(GROUPS_URL);
      setGroups((g) => g.filter((item) => item.id !== id));
      try {
        const res = await fetch(`/api/group/groups/${id}`, {
          method: 'DELETE',
          headers: await authHeaders(),
        });
        if (!res.ok) throw new Error();
      } catch {
        setGroups(prev);
      }
    },
    [groups],
  );

  const pinGroup = useCallback(
    async (id: string, pinned: boolean) => {
      await updateGroup(id, { pinned });
    },
    [updateGroup],
  );

  return {
    groups,
    loading,
    error,
    errorMessage: error ? t('loadFailed') : null,
    stale,
    createGroup,
    updateGroup,
    deleteGroup,
    pinGroup,
    refetch: fetchGroups,
  };
}
