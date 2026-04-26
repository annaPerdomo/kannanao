'use client';

import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/contexts/AuthContext';

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

export function useInvites() {
  const { session } = useAuth();
  const [invites, setInvites] = useState<InviteCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const headers = useCallback(() => {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (session?.access_token) h.Authorization = `Bearer ${session.access_token}`;
    return h;
  }, [session?.access_token]);

  const fetchInvites = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/group/invite', { headers: headers() });
      if (!res.ok) throw new Error('Failed to load invites');
      const data = await res.json();
      setInvites(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load invites');
    } finally {
      setLoading(false);
    }
  }, [headers]);

  useEffect(() => {
    if (session?.access_token) void fetchInvites();
  }, [session?.access_token, fetchInvites]);

  const createInvite = useCallback(
    async (params: CreateInviteParams): Promise<InviteCode> => {
      const res = await fetch('/api/group/invite', {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify(params),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Failed to create invite');
      }
      const invite: InviteCode = await res.json();
      setInvites((prev) => [invite, ...prev]);
      return invite;
    },
    [headers],
  );

  const revokeInvite = useCallback(
    async (id: string) => {
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
