'use client';

import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { fetchJsonCached, invalidateApiCache, peekApiCache } from '@/lib/apiCache';

export interface InviteCode {
  id: string;
  code: string;
  organizer_id: string;
  label: string | null;
  max_uses: number | null;
  times_used: number;
  expires_at: string | null;
  created_at: string;
}

export interface CreateInviteParams {
  label?: string;
  maxUses: number | null; // null = unlimited
  expiresIn: '24h' | '7d' | '30d' | 'never';
}

const INVITES_URL = '/api/group/invite';

export function useInvites(groupId?: string | null) {
  const { session } = useAuth();
  const url = groupId ? `${INVITES_URL}?groupId=${groupId}` : INVITES_URL;
  // Seed from the cache so returning to a page paints instantly; the effect
  // below still revalidates stale data in the background.
  const [invites, setInvites] = useState<InviteCode[]>(() => peekApiCache(url) ?? []);
  const [loading, setLoading] = useState(() => peekApiCache(url) === undefined);
  const [error, setError] = useState<string | null>(null);

  const headers = useCallback(() => {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (session?.access_token) h.Authorization = `Bearer ${session.access_token}`;
    return h;
  }, [session?.access_token]);

  const load = useCallback(
    async (freshMs?: number) => {
      const cached = peekApiCache<InviteCode[]>(url);
      if (cached) setInvites(cached);
      setLoading(!cached);
      setError(null);
      try {
        const data = await fetchJsonCached<InviteCode[]>(
          url,
          headers,
          freshMs === undefined ? {} : { freshMs },
        );
        setInvites(data);
      } catch {
        setError('Failed to load invites');
      } finally {
        setLoading(false);
      }
    },
    [headers, url],
  );

  useEffect(() => {
    if (session?.access_token) void load();
  }, [session?.access_token, load]);

  const fetchInvites = useCallback(() => {
    invalidateApiCache(INVITES_URL);
    return load(0);
  }, [load]);

  const createInvite = useCallback(
    async (params: CreateInviteParams): Promise<InviteCode> => {
      const res = await fetch('/api/group/invite', {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ ...params, groupId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Failed to create invite');
      }
      const invite: InviteCode = await res.json();
      invalidateApiCache(INVITES_URL);
      setInvites((prev) => [invite, ...prev]);
      return invite;
    },
    [headers, groupId],
  );

  const revokeInvite = useCallback(
    async (id: string) => {
      invalidateApiCache(INVITES_URL);
      setInvites((prev) => prev.filter((i) => i.id !== id));
      try {
        const res = await fetch(`/api/group/invite/${id}`, {
          method: 'DELETE',
          headers: headers(),
        });
        if (!res.ok) {
          // Rollback
          void fetchInvites();
          throw new Error('Failed to revoke invite');
        }
      } catch {
        void fetchInvites();
      }
    },
    [headers, fetchInvites],
  );

  return { invites, loading, error, createInvite, revokeInvite, refresh: fetchInvites };
}
