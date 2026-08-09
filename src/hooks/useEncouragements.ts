'use client';
import { useTranslations } from 'next-intl';
import { useCallback } from 'react';

import { invalidateApiCache } from '@/lib/apiCache';
import { sb } from '@/lib/supabase';

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await sb.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function useEncouragements() {
  const t = useTranslations('Group.useEncouragements');

  const sendEncouragement = useCallback(
    async (memberId: string, message: string, emoji?: string) => {
      const res = await fetch('/api/group/encouragements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
        body: JSON.stringify({ memberId, message, emoji }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error ?? t('sendFailed'));
      }
      // Sending a nudge stamps last_nudged_at, which both of these responses embed.
      invalidateApiCache('/api/group/members');
      invalidateApiCache('/api/group/assignments');
      return res.json();
    },
    [t],
  );

  return { sendEncouragement };
}
