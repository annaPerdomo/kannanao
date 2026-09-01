'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { invalidateApiCache } from '@/lib/apiCache';
import { publishAssignmentComplete } from '@/lib/assignmentSignal';
import type { BuddyWord } from '@/lib/buddyWords';
import { CHEST_XP } from '@/lib/chest';
import { cardXp } from '@/lib/flashcardUtils';
import { publishSessionEnd } from '@/lib/sessionSignal';
import { sb, upsertCardProgress } from '@/lib/supabase';
import type { JlptLevel } from '@/types/flashcard';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface UserProgress {
  id: string;
  total_xp: number;
  total_xp_spent: number;
  level: number;
  streak_days: number;
  longest_streak: number;
  last_study_date: string | null;
  total_cards_studied: number;
  total_correct: number;
  total_sessions: number;
  /** Local YYYY-MM-DD of the last daily-chest open, or null. */
  last_chest_date: string | null;
}

export type SessionMode =
  | 'study'
  | 'review'
  | 'match'
  | 'fill'
  | 'recall'
  | 'quiz'
  | 'listen'
  | 'reading'
  | 'speech_read'
  | 'speech_recall'
  | 'kotoba-bubble'
  | 'kana-build'
  | 'kana-journey'
  | 'particle-quiz'
  | 'question-quiz'
  | 'word-match'
  | 'counter-quiz';

/** What `/api/group/assignments/complete` reports back for a finished session. */
export interface AssignmentCompleteResult {
  completed: number;
  progressUpdated?: number;
}

export interface StudySession {
  id: string;
  deck_id: string | null;
  /** Set only by a session scoped to one kana row; null for a mixed review. */
  kana_set?: string | null;
  practice_mode: SessionMode | null;
  cards_studied: number;
  cards_correct: number;
  xp_earned: number;
  duration_secs: number;
  started_at: string;
  ended_at: string | null;
}

export interface Achievement {
  id: string;
  achievement_key: string;
  unlocked_at: string;
}

// ─── XP / Level config ───────────────────────────────────────────────────────

/** XP awarded per correct answer */
export const XP_PER_CORRECT = 10;
/** XP awarded per wrong answer (participation points!) */
export const XP_PER_WRONG = 2;
/** XP bonus for a perfect session (100% correct, min 5 cards) */
export const XP_PERFECT_BONUS = 50;
/** XP needed to reach a given level: level * 200 */
export const xpForLevel = (level: number) => level * 200;

export function levelFromXp(xp: number): number {
  let level = 1;
  while (xp >= xpForLevel(level)) {
    xp -= xpForLevel(level);
    level++;
  }
  return level;
}

export function xpProgressInLevel(totalXp: number): { current: number; needed: number } {
  let xp = totalXp;
  let level = 1;
  while (xp >= xpForLevel(level)) {
    xp -= xpForLevel(level);
    level++;
  }
  return { current: xp, needed: xpForLevel(level) };
}

// ─── Achievement definitions ─────────────────────────────────────────────────

export interface AchievementDef {
  key: string;
  label: string;
  description: string;
  emoji: string;
  color: string; // MUI color or hex
}

export const ACHIEVEMENTS: AchievementDef[] = [
  // ── Cards studied milestones ──
  {
    key: 'first_card',
    label: 'First Step!',
    description: 'Study your very first card',
    emoji: '🌱',
    color: '#4CAF50',
  },
  {
    key: 'cards_10',
    label: 'Getting Warmed Up',
    description: 'Study 10 cards total',
    emoji: '✨',
    color: '#FF9800',
  },
  {
    key: 'cards_50',
    label: 'Flashcard Fan',
    description: 'Study 50 cards total',
    emoji: '⭐',
    color: '#FF9800',
  },
  {
    key: 'cards_100',
    label: 'Century Club!',
    description: 'Study 100 cards total',
    emoji: '💯',
    color: '#E91E63',
  },
  {
    key: 'cards_250',
    label: 'Knowledge Seeker',
    description: 'Study 250 cards total',
    emoji: '📖',
    color: '#7C4DFF',
  },
  {
    key: 'cards_500',
    label: 'Study Superstar',
    description: 'Study 500 cards total',
    emoji: '🏆',
    color: '#FFD700',
  },
  {
    key: 'cards_1000',
    label: 'Grand Scholar',
    description: 'Study 1,000 cards total',
    emoji: '🎓',
    color: '#1565C0',
  },
  {
    key: 'cards_2500',
    label: 'Legendary Learner',
    description: 'Study 2,500 cards total',
    emoji: '🐉',
    color: '#B71C1C',
  },

  // ── Streak milestones ──
  {
    key: 'streak_3',
    label: '3-Day Streak',
    description: 'Study 3 days in a row',
    emoji: '🔥',
    color: '#FF5722',
  },
  {
    key: 'streak_7',
    label: 'One Full Week!',
    description: 'Study 7 days in a row',
    emoji: '🌟',
    color: '#FF5722',
  },
  {
    key: 'streak_14',
    label: 'Two-Week Warrior',
    description: 'Study 14 days in a row',
    emoji: '⚔️',
    color: '#D84315',
  },
  {
    key: 'streak_30',
    label: 'Month Master',
    description: '30-day streak — incredible!',
    emoji: '👑',
    color: '#9C27B0',
  },
  {
    key: 'streak_60',
    label: 'Unstoppable!',
    description: '60-day streak — truly dedicated',
    emoji: '🌋',
    color: '#BF360C',
  },
  {
    key: 'streak_100',
    label: '100 Days Strong',
    description: '100-day streak — you are a legend',
    emoji: '💫',
    color: '#FFD700',
  },

  // ── Level milestones ──
  {
    key: 'level_5',
    label: 'Level 5 Reached!',
    description: 'Reach level 5',
    emoji: '🎀',
    color: '#E91E63',
  },
  {
    key: 'level_10',
    label: 'Level 10 — Amazing!',
    description: 'Reach level 10',
    emoji: '🎆',
    color: '#9C27B0',
  },
  {
    key: 'level_15',
    label: 'Rising Star',
    description: 'Reach level 15',
    emoji: '🌠',
    color: '#1976D2',
  },
  {
    key: 'level_20',
    label: 'Sakura Master',
    description: 'Reach level 20',
    emoji: '🌸',
    color: '#EC407A',
  },
  {
    key: 'level_30',
    label: 'Elite Scholar',
    description: 'Reach level 30',
    emoji: '🏅',
    color: '#FF6F00',
  },
  {
    key: 'level_50',
    label: 'Grandmaster',
    description: 'Reach level 50 — the pinnacle!',
    emoji: '🐲',
    color: '#D50000',
  },

  // ── XP milestones ──
  {
    key: 'xp_1000',
    label: 'First Thousand',
    description: 'Earn 1,000 total XP',
    emoji: '🪙',
    color: '#FFA000',
  },
  {
    key: 'xp_5000',
    label: 'XP Collector',
    description: 'Earn 5,000 total XP',
    emoji: '💰',
    color: '#F57F17',
  },
  {
    key: 'xp_10000',
    label: 'XP Hoarder',
    description: 'Earn 10,000 total XP',
    emoji: '💎',
    color: '#00BCD4',
  },
  {
    key: 'xp_50000',
    label: 'XP Tycoon',
    description: 'Earn 50,000 total XP',
    emoji: '👸',
    color: '#6A1B9A',
  },

  // ── Session milestones ──
  {
    key: 'sessions_10',
    label: 'Getting Consistent',
    description: 'Complete 10 study sessions',
    emoji: '📝',
    color: '#0097A7',
  },
  {
    key: 'sessions_50',
    label: 'Dedicated Student',
    description: 'Complete 50 study sessions',
    emoji: '📚',
    color: '#00695C',
  },
  {
    key: 'sessions_100',
    label: 'Session Centurion',
    description: 'Complete 100 study sessions',
    emoji: '🏛️',
    color: '#4E342E',
  },

  // ── Special ──
  {
    key: 'perfect_session',
    label: 'Perfect Score!',
    description: 'Get 100% in a session (5+ cards)',
    emoji: '💎',
    color: '#2196F3',
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** achievement key (snake_case) → i18n slug (camelCase), e.g. first_card → firstCard */
export function achievementSlug(key: string): string {
  return key.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());
}

/** Returns a YYYY-MM-DD string in the user's local timezone (not UTC). */
function toLocalDateString(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useProgress(
  initialProgress?: {
    progress: UserProgress | null;
    achievements: Achievement[];
    recentSessions: StudySession[];
  } | null,
) {
  const supabase = sb;
  const { user } = useAuth();
  const tAch = useTranslations('Review.achievements');
  const [progress, setProgress] = useState<UserProgress | null>(initialProgress?.progress ?? null);
  const [achievements, setAchievements] = useState<Achievement[]>(
    initialProgress?.achievements ?? [],
  );
  const [recentSessions, setRecentSessions] = useState<StudySession[]>(
    initialProgress?.recentSessions ?? [],
  );
  // Seeded with a real progress row → start resolved. Otherwise fetch (which
  // also creates the row for brand-new users).
  const [loading, setLoading] = useState(!initialProgress?.progress);
  const [newlyUnlocked, setNewlyUnlocked] = useState<AchievementDef[]>([]);

  // Latest progress, readable synchronously. Action callbacks read from this
  // ref instead of the `progress` state so that (a) their identities stay
  // stable — `startSession` in a mount effect must not refire and create a
  // duplicate session row every time an answer updates progress — and (b) two
  // rapid answers accumulate instead of both computing from the same stale
  // snapshot and losing XP/card counts.
  const progressRef = useRef<UserProgress | null>(initialProgress?.progress ?? null);
  const applyProgress = useCallback((p: UserProgress | null) => {
    progressRef.current = p;
    setProgress(p);
  }, []);

  // Use the already-resolved user from AuthContext rather than auth.getUser(),
  // which adds an extra auth-server round-trip on the home critical path before
  // any progress data can load. RLS still scopes these reads server-side.
  const fetchAll = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    const [{ data: prog }, { data: ach }, { data: sess }] = await Promise.all([
      supabase.from('user_progress').select('*').eq('user_id', user.id).maybeSingle(),
      supabase
        .from('user_achievements')
        .select('*')
        .eq('user_id', user.id)
        .order('unlocked_at', { ascending: false }),
      supabase
        .from('study_sessions')
        .select('*')
        .eq('user_id', user.id)
        .gte('started_at', new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString())
        .order('started_at', { ascending: false })
        .limit(200),
    ]);

    if (!prog) {
      const { data: newProg } = await supabase
        .from('user_progress')
        .insert({ user_id: user.id })
        .select('*')
        .single();
      if (newProg) applyProgress(newProg);
    } else {
      // Detect a broken streak on load — if last_study_date is neither today nor
      // yesterday (local time), the streak should already be 0 in the display.
      // We also write it back to the DB so subsequent reads are correct.
      const todayLocal = toLocalDateString(new Date());
      const yesterdayLocal = toLocalDateString(new Date(Date.now() - 86400000));
      const lastDate = prog.last_study_date;
      if (
        lastDate &&
        lastDate !== todayLocal &&
        lastDate !== yesterdayLocal &&
        prog.streak_days > 0
      ) {
        const reset = { ...prog, streak_days: 0 };
        applyProgress(reset);
        await supabase.from('user_progress').update({ streak_days: 0 }).eq('id', prog.id);
      } else {
        applyProgress(prog);
      }
    }

    if (ach) setAchievements(ach);
    if (sess) setRecentSessions(sess);
    setLoading(false);
  }, [supabase, user, applyProgress]);

  useEffect(() => {
    // When the server seeded a progress row, skip the network fetch — but still
    // reconcile a broken streak using the user's LOCAL timezone (the server,
    // which runs in UTC, can't compute "today"/"yesterday" for the user).
    const seeded = initialProgress?.progress;
    if (seeded) {
      const todayLocal = toLocalDateString(new Date());
      const yesterdayLocal = toLocalDateString(new Date(Date.now() - 86400000));
      if (
        seeded.last_study_date &&
        seeded.last_study_date !== todayLocal &&
        seeded.last_study_date !== yesterdayLocal &&
        seeded.streak_days > 0
      ) {
        applyProgress({ ...seeded, streak_days: 0 });
        void supabase.from('user_progress').update({ streak_days: 0 }).eq('id', seeded.id);
      }
      return;
    }
    fetchAll();
  }, [fetchAll, initialProgress, supabase, applyProgress]);

  /**
   * Call this after each quiz answer.
   * Pass the active session ID (from startSession) and whether the answer was
   * correct. When `cardId` is provided (flip + card-based practice modes), the
   * answer is also recorded into per-card progress. Sentence/line-based modes
   * (kotoba-bubble, speech) omit it.
   * `correctXp` overrides the JLPT-scaled rate for modes whose unit of work is
   * smaller than a card.
   */
  const recordAnswer = useCallback(
    async (
      sessionId: string,
      correct: boolean,
      jlptLevel?: JlptLevel,
      cardId?: string,
      correctXp?: number,
    ) => {
      const base = progressRef.current;
      if (!base) return;

      const xpGain = correct ? (correctXp ?? cardXp(jlptLevel)) : XP_PER_WRONG;
      const newXp = base.total_xp + xpGain;
      const newLevel = levelFromXp(newXp);
      const newStudied = base.total_cards_studied + 1;
      const newCorrect = base.total_correct + (correct ? 1 : 0);

      // Streak logic — use local dates so midnight rolls over at the user's clock
      const today = toLocalDateString(new Date());
      const lastDate = base.last_study_date;
      const yesterday = toLocalDateString(new Date(Date.now() - 86400000));

      let newStreak = base.streak_days;
      if (lastDate !== today) {
        newStreak = lastDate === yesterday ? base.streak_days + 1 : 1;
      }
      const newLongest = Math.max(base.longest_streak, newStreak);

      // Apply locally BEFORE the network round-trip so the next rapid answer
      // builds on this one instead of a stale snapshot.
      applyProgress({
        ...base,
        total_xp: newXp,
        level: newLevel,
        streak_days: newStreak,
        longest_streak: newLongest,
        last_study_date: today,
        total_cards_studied: newStudied,
        total_correct: newCorrect,
      });

      // Persist the progress update, the session card-count increment, and (when
      // this answer is tied to a card) the per-card progress upsert in parallel —
      // they touch different rows and don't depend on each other, so there's no
      // reason to pay sequential round-trips on every answer.
      const writes: PromiseLike<unknown>[] = [
        supabase
          .from('user_progress')
          .update({
            total_xp: newXp,
            level: newLevel,
            streak_days: newStreak,
            longest_streak: newLongest,
            last_study_date: today,
            total_cards_studied: newStudied,
            total_correct: newCorrect,
          })
          .eq('id', base.id),
        supabase.rpc('increment_session_cards', {
          p_session_id: sessionId,
          p_correct: correct,
          p_xp: xpGain,
        }),
      ];
      if (cardId) writes.push(upsertCardProgress(cardId, correct));
      await Promise.all(writes);

      const unlocked = achievements.map((a) => a.achievement_key);
      const toUnlock: string[] = [];

      if (newStudied >= 1 && !unlocked.includes('first_card')) toUnlock.push('first_card');
      if (newStudied >= 10 && !unlocked.includes('cards_10')) toUnlock.push('cards_10');
      if (newStudied >= 50 && !unlocked.includes('cards_50')) toUnlock.push('cards_50');
      if (newStudied >= 100 && !unlocked.includes('cards_100')) toUnlock.push('cards_100');
      if (newStudied >= 250 && !unlocked.includes('cards_250')) toUnlock.push('cards_250');
      if (newStudied >= 500 && !unlocked.includes('cards_500')) toUnlock.push('cards_500');
      if (newStudied >= 1000 && !unlocked.includes('cards_1000')) toUnlock.push('cards_1000');
      if (newStudied >= 2500 && !unlocked.includes('cards_2500')) toUnlock.push('cards_2500');

      if (newStreak >= 3 && !unlocked.includes('streak_3')) toUnlock.push('streak_3');
      if (newStreak >= 7 && !unlocked.includes('streak_7')) toUnlock.push('streak_7');
      if (newStreak >= 14 && !unlocked.includes('streak_14')) toUnlock.push('streak_14');
      if (newStreak >= 30 && !unlocked.includes('streak_30')) toUnlock.push('streak_30');
      if (newStreak >= 60 && !unlocked.includes('streak_60')) toUnlock.push('streak_60');
      if (newStreak >= 100 && !unlocked.includes('streak_100')) toUnlock.push('streak_100');

      if (newLevel >= 5 && !unlocked.includes('level_5')) toUnlock.push('level_5');
      if (newLevel >= 10 && !unlocked.includes('level_10')) toUnlock.push('level_10');
      if (newLevel >= 15 && !unlocked.includes('level_15')) toUnlock.push('level_15');
      if (newLevel >= 20 && !unlocked.includes('level_20')) toUnlock.push('level_20');
      if (newLevel >= 30 && !unlocked.includes('level_30')) toUnlock.push('level_30');
      if (newLevel >= 50 && !unlocked.includes('level_50')) toUnlock.push('level_50');

      if (newXp >= 1000 && !unlocked.includes('xp_1000')) toUnlock.push('xp_1000');
      if (newXp >= 5000 && !unlocked.includes('xp_5000')) toUnlock.push('xp_5000');
      if (newXp >= 10000 && !unlocked.includes('xp_10000')) toUnlock.push('xp_10000');
      if (newXp >= 50000 && !unlocked.includes('xp_50000')) toUnlock.push('xp_50000');

      const sessionCount = base.total_sessions;
      if (sessionCount >= 10 && !unlocked.includes('sessions_10')) toUnlock.push('sessions_10');
      if (sessionCount >= 50 && !unlocked.includes('sessions_50')) toUnlock.push('sessions_50');
      if (sessionCount >= 100 && !unlocked.includes('sessions_100')) toUnlock.push('sessions_100');

      if (toUnlock.length > 0) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        await supabase.from('user_achievements').upsert(
          toUnlock.map((key) => ({ user_id: user?.id, achievement_key: key })),
          {
            onConflict: 'user_id,achievement_key',
          },
        );

        const newDefs = ACHIEVEMENTS.filter((a) => toUnlock.includes(a.key));
        setNewlyUnlocked(newDefs);
      }
    },
    [achievements, supabase, applyProgress],
  );

  /**
   * Call when a session ends to check for the perfect-session achievement and
   * close out the session row. Resolves with what the assignment auto-complete
   * did for this session (null when there was nothing to report).
   */
  const endSession = useCallback(
    async (
      sessionId: string,
      opts: {
        cardsStudied: number;
        cardsCorrect: number;
        durationSecs: number;
        sampleWords?: BuddyWord[];
      },
    ): Promise<AssignmentCompleteResult | null> => {
      const { cardsStudied, cardsCorrect, durationSecs, sampleWords } = opts;
      // Declared out here so the finally below can still report what landed if
      // one of the writes throws.
      let result: AssignmentCompleteResult | null = null;
      try {
        await supabase
          .from('study_sessions')
          .update({ ended_at: new Date().toISOString(), duration_secs: durationSecs })
          .eq('id', sessionId);

        if (cardsStudied >= 5 && cardsCorrect === cardsStudied) {
          // Every perfect session pays, not just the first. Level is recomputed
          // so it can't drift out of sync with total_xp.
          const base = progressRef.current;
          if (base) {
            const newXp = base.total_xp + XP_PERFECT_BONUS;
            const newLevel = levelFromXp(newXp);
            applyProgress({ ...base, total_xp: newXp, level: newLevel });
            await supabase
              .from('user_progress')
              .update({ total_xp: newXp, level: newLevel })
              .eq('id', base.id);
          }

          if (!achievements.find((a) => a.achievement_key === 'perfect_session')) {
            const {
              data: { user },
            } = await supabase.auth.getUser();
            await supabase
              .from('user_achievements')
              .upsert([{ user_id: user?.id, achievement_key: 'perfect_session' }], {
                onConflict: 'user_id,achievement_key',
              });

            setNewlyUnlocked((prev) => {
              const def = ACHIEVEMENTS.find((a) => a.key === 'perfect_session');
              return def ? [...prev, def] : prev;
            });
          }
        }

        await fetchAll();

        // Auto-complete any pending assignment for the deck — or the kana row —
        // that was just studied. Awaited (not fired and forgotten) so that
        // anything reading the assignment afterwards — the quest's finish screen
        // most of all — can't race the write and report a goal as missed.
        try {
          const { data: session } = await supabase
            .from('study_sessions')
            .select('deck_id, kana_set')
            .eq('id', sessionId)
            .single();
          const target = session?.deck_id
            ? { deckId: session.deck_id }
            : session?.kana_set
              ? { kanaSet: session.kana_set }
              : null;
          if (target) {
            const { data: authData } = await supabase.auth.getSession();
            const token = authData.session?.access_token;
            if (token) {
              const res = await fetch('/api/group/assignments/complete', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`,
                },
                // sessionId lets the server evaluate mastery goals (mode +
                // accuracy) against this session's stats.
                body: JSON.stringify({ ...target, sessionId }),
              });
              // The assignment list is cached client-side; drop it so the
              // dashboard reflects the auto-completed assignment right away.
              invalidateApiCache('/api/group/assignments');
              result = (await res.json().catch(() => null)) as AssignmentCompleteResult | null;
            }
          }
        } catch {
          // Non-critical — don't block the session end flow
        }
      } finally {
        // Published on every terminal path, thrown or not — a screen waiting on
        // this has to be released, and the session heart is paid off it.
        publishAssignmentComplete(result?.completed ?? 0);
        publishSessionEnd(cardsStudied, sampleWords);
      }
      return result;
    },
    [achievements, supabase, fetchAll, applyProgress],
  );

  const startSession = useCallback(
    async (
      deckId: string | null,
      mode?: SessionMode,
      opts?: { kanaSet?: string | null },
    ): Promise<string> => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { data } = await supabase
        .from('study_sessions')
        .insert({
          deck_id: deckId ?? null,
          user_id: user?.id,
          practice_mode: mode ?? null,
          // Omitted, not null: a bundle that ships before the kana_set migration
          // would otherwise fail every insert and stop recording XP app-wide.
          ...(opts?.kanaSet ? { kana_set: opts.kanaSet } : {}),
        })
        .select('id')
        .single();

      const base = progressRef.current;
      if (base) {
        const next = { ...base, total_sessions: base.total_sessions + 1 };
        applyProgress(next);
        await supabase
          .from('user_progress')
          .update({ total_sessions: next.total_sessions })
          .eq('id', base.id);
      }
      return data?.id ?? '';
    },
    [supabase, applyProgress],
  );

  const clearNewlyUnlocked = useCallback(() => setNewlyUnlocked([]), []);

  /** Award a flat XP bonus (e.g. for completing a to-do item). */
  const addBonusXp = useCallback(
    async (amount: number) => {
      const base = progressRef.current;
      if (!base) return;
      const newXp = base.total_xp + amount;
      const newLevel = levelFromXp(newXp);
      applyProgress({ ...base, total_xp: newXp, level: newLevel });
      await supabase
        .from('user_progress')
        .update({ total_xp: newXp, level: newLevel })
        .eq('id', base.id);
    },
    [supabase, applyProgress],
  );

  /**
   * Open the daily chest: award the flat chest XP and stamp today's local date
   * so it can't be opened again today. Written optimistically with rollback on
   * failure, matching the other progress writes. Returns false if it couldn't
   * (no progress row) so the caller can avoid showing a phantom reward.
   */
  const openDailyChest = useCallback(async (): Promise<boolean> => {
    const base = progressRef.current;
    if (!base) return false;
    const today = toLocalDateString(new Date());
    const newXp = base.total_xp + CHEST_XP;
    const newLevel = levelFromXp(newXp);
    const optimistic = { ...base, total_xp: newXp, level: newLevel, last_chest_date: today };
    applyProgress(optimistic);
    const { error } = await supabase
      .from('user_progress')
      .update({ total_xp: newXp, level: newLevel, last_chest_date: today })
      .eq('id', base.id);
    if (error) {
      applyProgress(base); // roll back — the chest stays available to retry
      return false;
    }
    return true;
  }, [supabase, applyProgress]);

  const spendableXp = progress ? progress.total_xp - (progress.total_xp_spent ?? 0) : 0;

  // Localize the newly-unlocked toast copy at the render boundary. The source
  // ACHIEVEMENTS array keeps its English label/description as the fallback and
  // for callers that read the const directly.
  const translatedNewlyUnlocked = newlyUnlocked.map((def) => {
    const slug = achievementSlug(def.key);
    return { ...def, label: tAch(`${slug}.label`), description: tAch(`${slug}.description`) };
  });

  return {
    progress,
    spendableXp,
    achievements,
    recentSessions,
    loading,
    newlyUnlocked: translatedNewlyUnlocked,
    clearNewlyUnlocked,
    recordAnswer,
    endSession,
    startSession,
    addBonusXp,
    openDailyChest,
    refetch: fetchAll,
  };
}
