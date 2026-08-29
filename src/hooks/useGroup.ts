'use client';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { fetchJsonCached, peekApiCache, peekApiCacheMeta } from '@/lib/apiCache';
import { type DataError, toDataError } from '@/lib/dataError';
import { sb } from '@/lib/supabase';

export interface GroupMember {
  id: string;
  username: string;
  displayName: string | null;
  avatar?: string | null;
  createdAt: string;
  level: number;
  totalXp: number;
  streakDays: number;
  totalCardsStudied: number;
  totalCorrect: number;
  totalSessions: number;
  lastActive: string | null;
  lastNudgedAt: string | null;
  /** Answered-at-least-once split by SRS tier; no "new" bucket — that needs a deck's full card list. */
  masteryLearning: number;
  masteryStrong: number;
  /**
   * Cards whose SRS review date has passed, and the subset overdue by 3+ days.
   * `null` when the count failed to load — never render that as 0.
   */
  reviewsWaiting: number | null;
  reviewsOverdue3d: number | null;
}

export interface MasteryCounts {
  new: number;
  learning: number;
  strong: number;
}

export interface MemberSession {
  id: string;
  deckId: string | null;
  practiceMode: string | null;
  cardsStudied: number;
  cardsCorrect: number;
  xpEarned: number;
  durationSecs: number;
  startedAt: string;
  endedAt: string | null;
}

export interface MemberDetail {
  member: { id: string; username: string; displayName: string | null };
  progress: {
    totalXp: number;
    level: number;
    streakDays: number;
    totalCardsStudied: number;
    totalCorrect: number;
    totalSessions: number;
  };
  sessions: MemberSession[];
  achievements: { key: string; unlockedAt: string }[];
  deckProgress: {
    deckId: string;
    deckName: string;
    deckEmoji: string | null;
    cardsStudied: number;
    cardsCorrect: number;
    accuracy: number;
    lastStudied: string | null;
    mastery: MasteryCounts;
  }[];
  totalMastery: MasteryCounts;
  speechProgress: {
    totalSessions: number;
    totalLines: number;
    totalCorrect: number;
    totalXp: number;
    accuracy: number;
    lastPracticed: string | null;
    byMode: {
      mode: string;
      sessions: number;
      lines: number;
      correct: number;
      xp: number;
      accuracy: number;
      lastPracticed: string | null;
    }[];
  } | null;
  practiceModeStats: {
    mode: string;
    source: 'deck' | 'speech';
    sessions: number;
    cardsStudied: number;
    cardsCorrect: number;
    accuracy: number;
    xpEarned: number;
    totalDurationSecs: number;
  }[];
  assignments: {
    total: number;
    completed: number;
    pending: number;
    overdue: number;
    completionRate: number;
    items: {
      id: string;
      title: string | null;
      deckName: string;
      deckEmoji: string | null;
      dueDate: string | null;
      completedAt: string | null;
      createdAt: string;
      requiredAccuracy: number | null;
      requiredMode: string | null;
      progressAccuracy: number | null;
    }[];
  };
  weakWords: {
    cardId: string;
    word: string;
    reading: string | null;
    meaning: string | null;
    deckName: string;
    correctCount: number;
    wrongCount: number;
    wrongRate: number;
    lastReviewedAt: string | null;
  }[];
  reviewsWaiting: number | null;
  reviewsOverdue3d: number | null;
}

export interface FeedItem {
  type: 'achievement' | 'perfect_score' | 'streak' | 'level';
  memberId: string;
  memberName: string;
  description: string;
  emoji: string;
  timestamp: string;
}

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await sb.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function useGroupMembers(groupId?: string | null, enabled = true) {
  const url = groupId ? `/api/group/members?groupId=${groupId}` : '/api/group/members';
  // Seed from the cache so returning to a page paints instantly; the effect
  // below still revalidates stale data in the background.
  const [members, setMembers] = useState<GroupMember[]>(() => peekApiCache(url) ?? []);
  const [loading, setLoading] = useState(enabled && peekApiCache(url) === undefined);
  const [error, setError] = useState<DataError | null>(null);
  const [stale, setStale] = useState(() => peekApiCacheMeta(url)?.stale ?? false);
  const { user, isMemberAccount } = useAuth();
  const t = useTranslations('Group.useGroup');

  const load = useCallback(
    async (freshMs?: number) => {
      if (!enabled || !user || isMemberAccount) {
        setMembers([]);
        setLoading(false);
        return;
      }
      const cached = peekApiCache<GroupMember[]>(url);
      if (cached) setMembers(cached);
      setStale(peekApiCacheMeta(url)?.stale ?? false);
      setLoading(!cached);
      setError(null);
      try {
        const data = await fetchJsonCached<GroupMember[]>(
          url,
          authHeaders,
          freshMs === undefined ? {} : { freshMs },
        );
        setMembers(data);
      } catch (err) {
        setError(toDataError(err));
      } finally {
        setStale(peekApiCacheMeta(url)?.stale ?? false);
        setLoading(false);
      }
    },
    [user, isMemberAccount, url, enabled],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const refetch = useCallback(() => load(0), [load]);

  return {
    members,
    loading,
    error,
    errorMessage: error ? t('failedToLoadMembers') : null,
    stale,
    refetch,
  };
}

export function useMemberDetail(memberId: string | null) {
  const [detail, setDetail] = useState<MemberDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<DataError | null>(null);
  const [stale, setStale] = useState(false);
  const t = useTranslations('Group.useGroup');

  const fetchDetail = useCallback(async () => {
    if (!memberId) {
      setDetail(null);
      return;
    }
    const url = `/api/group/members/${memberId}`;
    const cached = peekApiCache<MemberDetail>(url);
    if (cached) setDetail(cached);
    setStale(peekApiCacheMeta(url)?.stale ?? false);
    setLoading(cached === undefined);
    setError(null);
    try {
      const data = await fetchJsonCached<MemberDetail>(url, authHeaders);
      setDetail(data);
    } catch (err) {
      setError(toDataError(err));
    } finally {
      setStale(peekApiCacheMeta(url)?.stale ?? false);
      setLoading(false);
    }
  }, [memberId]);

  useEffect(() => {
    void fetchDetail();
  }, [fetchDetail]);

  return {
    detail,
    loading,
    error,
    errorMessage: error ? t('failedToLoadDetails') : null,
    stale,
    refetch: fetchDetail,
  };
}

export function useGroupFeed(groupId?: string | null) {
  const url = groupId ? `/api/group/feed?groupId=${groupId}` : '/api/group/feed';
  const [feed, setFeed] = useState<FeedItem[]>(() => peekApiCache(url) ?? []);
  const [loading, setLoading] = useState(() => peekApiCache(url) === undefined);
  const [error, setError] = useState<DataError | null>(null);
  const [stale, setStale] = useState(() => peekApiCacheMeta(url)?.stale ?? false);
  const { user } = useAuth();
  const t = useTranslations('Group.useGroup');

  useEffect(() => {
    if (!user) {
      setFeed([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    const cached = peekApiCache<FeedItem[]>(url);
    if (cached) setFeed(cached);
    setStale(peekApiCacheMeta(url)?.stale ?? false);
    setLoading(cached === undefined);
    (async () => {
      try {
        const data = await fetchJsonCached<FeedItem[]>(url, authHeaders);
        if (!cancelled) {
          setFeed(data);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) setError(toDataError(err));
      } finally {
        if (!cancelled) {
          setStale(peekApiCacheMeta(url)?.stale ?? false);
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, url]);

  return { feed, loading, error, errorMessage: error ? t('failedToLoadFeed') : null, stale };
}

export function useMemberSessions(memberId: string | null) {
  const [sessions, setSessions] = useState<MemberSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const cursorRef = useRef<string | null>(null);

  const fetchPage = useCallback(
    async (cursor: string | null) => {
      if (!memberId) return;
      const isFirstPage = !cursor;
      if (isFirstPage) setLoading(true);
      else setLoadingMore(true);

      try {
        const params = new URLSearchParams();
        if (cursor) params.set('cursor', cursor);
        const res = await fetch(`/api/group/members/${memberId}/sessions?${params.toString()}`, {
          headers: await authHeaders(),
        });
        if (!res.ok) throw new Error('Failed to load sessions');
        const data = await res.json();
        setSessions((prev) => (isFirstPage ? data.sessions : [...prev, ...data.sessions]));
        setHasMore(data.hasMore);
        cursorRef.current = data.nextCursor;
      } catch {
        setHasMore(false);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [memberId],
  );

  useEffect(() => {
    cursorRef.current = null;
    setSessions([]);
    setHasMore(true);
    void fetchPage(null);
  }, [fetchPage]);

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    void fetchPage(cursorRef.current);
  }, [fetchPage, loadingMore, hasMore]);

  return { sessions, loading, loadingMore, hasMore, loadMore };
}
