'use client';
import { useCallback, useEffect, useRef, useState } from 'react';

type SendFn = (memberId: string, message: string, emoji?: string) => Promise<unknown>;

const SENT_RESET_MS = 3000;

/** Sending/sent state for encouragement sends; takes a list so bulk and single-member callers share it. */
export function useQuickSend(onSend: SendFn) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearResetTimer = useCallback(() => {
    if (resetTimer.current) {
      clearTimeout(resetTimer.current);
      resetTimer.current = null;
    }
  }, []);

  useEffect(() => clearResetTimer, [clearResetTimer]);

  /** Callers reusing one instance across targets must call this on target change. */
  const reset = useCallback(() => {
    clearResetTimer();
    setSent(false);
  }, [clearResetTimer]);

  const send = useCallback(
    async (memberIds: string[], message: string, emoji?: string) => {
      setSending(true);
      try {
        await Promise.all(memberIds.map((id) => onSend(id, message, emoji)));
        clearResetTimer();
        setSent(true);
        resetTimer.current = setTimeout(() => setSent(false), SENT_RESET_MS);
        return true;
      } catch {
        return false;
      } finally {
        setSending(false);
      }
    },
    [onSend, clearResetTimer],
  );

  return { sending, sent, send, reset };
}
