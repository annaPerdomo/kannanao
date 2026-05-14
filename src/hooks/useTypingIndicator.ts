'use client';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { isConfigured, sb } from '@/lib/supabase';

const THROTTLE_MS = 2_000;
const EXPIRE_MS = 3_500;

/**
 * Broadcasts and listens for typing events on a shared Supabase Realtime
 * broadcast channel between two users. No database writes — purely ephemeral.
 */
export function useTypingIndicator(recipientId: string | undefined) {
  const { user } = useAuth();
  const [isRecipientTyping, setIsRecipientTyping] = useState(false);
  const channelRef = useRef<ReturnType<typeof sb.channel> | null>(null);
  const lastSentRef = useRef(0);
  const expireTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (!user || !recipientId || !isConfigured()) return;

    // Deterministic channel name so both users join the same channel
    const sorted = [user.id, recipientId].sort();
    const channelName = `typing:${sorted[0]}:${sorted[1]}`;

    const channel = sb.channel(channelName);
    channel
      .on('broadcast', { event: 'typing' }, (payload) => {
        if (payload.payload?.userId !== user.id) {
          setIsRecipientTyping(true);
          clearTimeout(expireTimerRef.current);
          expireTimerRef.current = setTimeout(() => setIsRecipientTyping(false), EXPIRE_MS);
        }
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      clearTimeout(expireTimerRef.current);
      setIsRecipientTyping(false);
      void sb.removeChannel(channel);
      channelRef.current = null;
    };
  }, [user, recipientId]);

  const sendTyping = useCallback(() => {
    const now = Date.now();
    if (now - lastSentRef.current < THROTTLE_MS) return;
    lastSentRef.current = now;

    channelRef.current?.send({
      type: 'broadcast',
      event: 'typing',
      payload: { userId: user?.id },
    });
  }, [user?.id]);

  return { isRecipientTyping, sendTyping };
}
