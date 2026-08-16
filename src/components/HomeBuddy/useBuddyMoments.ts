'use client';

import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useRef } from 'react';

import { useBuddyFriendshipCtx } from '@/contexts/BuddyFriendshipContext';
import { type GreetingKind, selectGreeting } from '@/lib/buddyGreetings';
import { type BuddyReactionMoment, greetingLines, reactionLines } from '@/lib/buddyPhrases';
import { localDateString } from '@/lib/chest';
import { isMeaningfulSession } from '@/lib/friendship';
import { isSessionRoute } from '@/lib/sessionRoutes';
import { onSessionEnd } from '@/lib/sessionSignal';

const GREETING_KEY = 'kannanao:buddy-greeting-date';

export function pickRandom(items: string | string[]): string {
  if (typeof items === 'string') return items;
  return items[Math.floor(Math.random() * items.length)];
}

export function isNonEmptyStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.length > 0 && value.every((v) => typeof v === 'string');
}

interface UseBuddyMomentsParams {
  buddyKey: string;
  showLine: (text: string, sparkle: boolean) => void;
}

export function useBuddyMoments({ buddyKey, showLine }: UseBuddyMomentsParams) {
  const t = useTranslations('Home.buddy');
  const tBuddies = useTranslations('Shop.buddies');
  const pathname = usePathname();
  const { equipped, stamps, loadState, todayGoals } = useBuddyFriendshipCtx();

  const friendshipCopy = useMemo(() => {
    try {
      return tBuddies.raw(`${buddyKey}.friendship`) as unknown;
    } catch {
      return null;
    }
  }, [buddyKey, tBuddies]);

  const chromeLines = useCallback(
    (path: string): string[] => {
      try {
        const raw = t.raw(path);
        return isNonEmptyStringArray(raw) ? raw : [];
      } catch {
        return [];
      }
    },
    [t],
  );

  const greetingLine = useCallback(
    (kind: GreetingKind): string | null => {
      const authored = greetingLines(friendshipCopy, kind);
      const pool = authored.length ? authored : chromeLines(`friendship.greetings.${kind}`);
      return pool.length ? pickRandom(pool) : null;
    },
    [friendshipCopy, chromeLines],
  );

  const reactionLine = useCallback(
    (moment: BuddyReactionMoment): string | null => {
      const authored = reactionLines(friendshipCopy, moment);
      const pool = authored.length ? authored : chromeLines(`friendship.reactions.${moment}`);
      return pool.length ? pickRandom(pool) : null;
    },
    [friendshipCopy, chromeLines],
  );

  // Stamped even when there is nothing to say: otherwise a state change later
  // the same day would pop the day's first greeting mid-day.
  useEffect(() => {
    if (loadState !== 'loaded' || isSessionRoute(pathname)) return;
    const today = localDateString(new Date());
    if (localStorage.getItem(GREETING_KEY) === today) return;
    const kind = selectGreeting(equipped?.points ?? 0, stamps ?? {}, today);
    localStorage.setItem(GREETING_KEY, today);
    if (!kind) return;
    const line = greetingLine(kind);
    if (line) showLine(line, false);
  }, [loadState, pathname, equipped, stamps, greetingLine, showLine]);

  // The award toast speaks for the first meaningful session of the day (it pays
  // the heart); this covers only the later ones, so nothing is said twice.
  const sessionDone = todayGoals?.find((goal) => goal.source === 'session')?.done ?? false;
  const sessionEndState = useRef({ sessionDone, reactionLine, showLine });
  sessionEndState.current = { sessionDone, reactionLine, showLine };
  useEffect(
    () =>
      onSessionEnd((signal) => {
        const current = sessionEndState.current;
        if (!isMeaningfulSession(signal.cardsStudied) || !current.sessionDone) return;
        const line = current.reactionLine('sessionComplete');
        if (line) current.showLine(line, true);
      }),
    [],
  );

  return { reactionLine };
}
