'use client';
import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { sb } from '@/lib/supabase';

export interface GroupMember {
  id: string;
  username: string;
  displayName: string | null;
  createdAt: string;
  level: number;
  totalXp: number;
  streakDays: number;
  totalCardsStudied: number;
  totalCorrect: number;
  totalSessions: number;
  lastActive: string | null;
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
  sessions: {
    id: string;
    deckId: string | null;
    practiceMode: string | null;
    cardsStudied: number;
    cardsCorrect: number;
    xpEarned: number;
    durationSecs: number;
    startedAt: string;
    endedAt: string | null;
  }[];
  achievements: { key: string; unlockedAt: string }[];
  deckProgress: {
    deckId: string;
    deckName: string;
    deckEmoji: string | null;
    cardsStudied: number;
    cardsCorrect: number;
    accuracy: number;
    lastStudied: string | null;
  }[];
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

export function useGroupMembers(groupId?: string | null) {
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, isMemberAccount } = useAuth();

  const fetchMembers = useCallback(async () => {
    if (!user || isMemberAccount) {
      setMembers([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const url = groupId ? `/api/group/members?groupId=${groupId}` : '/api/group/members';
      const res = await fetch(url, { headers: await authHeaders() });
      if (!res.ok) throw new Error('Failed to load members');
      const data = await res.json();
      setMembers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load members');
    } finally {
      setLoading(false);
    }
  }, [user, isMemberAccount, groupId]);

  useEffect(() => {
    void fetchMembers();
  }, [fetchMembers]);

  return { members, loading, error, refetch: fetchMembers };
}

export function useMemberDetail(memberId: string | null) {
  const [detail, setDetail] = useState<MemberDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDetail = useCallback(async () => {
    if (!memberId) {
      setDetail(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/group/members/${memberId}`, {
        headers: await authHeaders(),
      });
      if (!res.ok) throw new Error('Failed to load member details');
      const data = await res.json();
      setDetail(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load details');
    } finally {
      setLoading(false);
    }
  }, [memberId]);

  useEffect(() => {
    void fetchDetail();
  }, [fetchDetail]);

  return { detail, loading, error, refetch: fetchDetail };
}

export function useGroupFeed(groupId?: string | null) {
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setFeed([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const url = groupId ? `/api/group/feed?groupId=${groupId}` : '/api/group/feed';
        const res = await fetch(url, { headers: await authHeaders() });
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (!cancelled) setFeed(data);
      } catch {
        // silently fail for feed
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, groupId]);

  return { feed, loading };
}
