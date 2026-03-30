'use client';

import { useCallback, useEffect, useState } from 'react';
import { sb } from '@/lib/supabase'; // adjust to your Supabase client path

// ─── Types ───────────────────────────────────────────────────────────────────

export interface UserProgress {
  id: string;
  total_xp: number;
  level: number;
  streak_days: number;
  longest_streak: number;
  last_study_date: string | null;
  total_cards_studied: number;
  total_correct: number;
  total_sessions: number;
}

export interface StudySession {
  id: string;
  deck_id: string | null;
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
    key: 'cards_500',
    label: 'Study Superstar',
    description: 'Study 500 cards total',
    emoji: '🏆',
    color: '#FFD700',
  },
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
    key: 'streak_30',
    label: 'Month Master',
    description: '30-day streak — incredible!',
    emoji: '👑',
    color: '#9C27B0',
  },
  {
    key: 'perfect_session',
    label: 'Perfect Score!',
    description: 'Get 100% in a session (5+ cards)',
    emoji: '💎',
    color: '#2196F3',
  },
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
];

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useProgress() {
  const supabase = sb;
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [recentSessions, setRecentSessions] = useState<StudySession[]>([]);
  const [loading, setLoading] = useState(true);
  const [newlyUnlocked, setNewlyUnlocked] = useState<AchievementDef[]>([]);

  const fetchAll = useCallback(async () => {
    const [{ data: prog }, { data: ach }, { data: sess }] = await Promise.all([
      supabase.from('user_progress').select('*').limit(1).single(),
      supabase.from('user_achievements').select('*').order('unlocked_at', { ascending: false }),
      supabase
        .from('study_sessions')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(20),
    ]);
    if (prog) setProgress(prog);
    if (ach) setAchievements(ach);
    if (sess) setRecentSessions(sess);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  /**
   * Call this after each quiz answer.
   * Pass the active session ID (from startSession) and whether the answer was correct.
   */
  const recordAnswer = useCallback(
    async (sessionId: string, correct: boolean) => {
      if (!progress) return;

      const xpGain = correct ? XP_PER_CORRECT : XP_PER_WRONG;
      const newXp = progress.total_xp + xpGain;
      const newLevel = levelFromXp(newXp);
      const newStudied = progress.total_cards_studied + 1;
      const newCorrect = progress.total_correct + (correct ? 1 : 0);

      // Streak logic
      const today = new Date().toISOString().split('T')[0];
      const lastDate = progress.last_study_date;
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

      let newStreak = progress.streak_days;
      if (lastDate !== today) {
        newStreak = lastDate === yesterday ? progress.streak_days + 1 : 1;
      }
      const newLongest = Math.max(progress.longest_streak, newStreak);

      // Persist progress
      await supabase
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
        .eq('id', progress.id);

      // Persist session card count
      await supabase.rpc('increment_session_cards', {
        p_session_id: sessionId,
        p_correct: correct,
        p_xp: xpGain,
      });

      // Check achievements
      const unlocked = achievements.map((a) => a.achievement_key);
      const toUnlock: string[] = [];

      if (newStudied >= 1 && !unlocked.includes('first_card')) toUnlock.push('first_card');
      if (newStudied >= 10 && !unlocked.includes('cards_10')) toUnlock.push('cards_10');
      if (newStudied >= 50 && !unlocked.includes('cards_50')) toUnlock.push('cards_50');
      if (newStudied >= 100 && !unlocked.includes('cards_100')) toUnlock.push('cards_100');
      if (newStudied >= 500 && !unlocked.includes('cards_500')) toUnlock.push('cards_500');
      if (newStreak >= 3 && !unlocked.includes('streak_3')) toUnlock.push('streak_3');
      if (newStreak >= 7 && !unlocked.includes('streak_7')) toUnlock.push('streak_7');
      if (newStreak >= 30 && !unlocked.includes('streak_30')) toUnlock.push('streak_30');
      if (newLevel >= 5 && !unlocked.includes('level_5')) toUnlock.push('level_5');
      if (newLevel >= 10 && !unlocked.includes('level_10')) toUnlock.push('level_10');

      if (toUnlock.length > 0) {
        await supabase
          .from('user_achievements')
          .upsert(toUnlock.map((key) => ({ achievement_key: key })), {
            onConflict: 'achievement_key',
          });

        const newDefs = ACHIEVEMENTS.filter((a) => toUnlock.includes(a.key));
        setNewlyUnlocked(newDefs);
      }

      // Optimistic local update
      setProgress((p) =>
        p
          ? {
              ...p,
              total_xp: newXp,
              level: newLevel,
              streak_days: newStreak,
              longest_streak: newLongest,
              last_study_date: today,
              total_cards_studied: newStudied,
              total_correct: newCorrect,
            }
          : p,
      );
    },
    [progress, achievements, supabase],
  );

  /**
   * Call when a session ends to check for the perfect-session achievement
   * and close out the session row.
   */
  const endSession = useCallback(
    async (
      sessionId: string,
      opts: { cardsStudied: number; cardsCorrect: number; durationSecs: number },
    ) => {
      const { cardsStudied, cardsCorrect, durationSecs } = opts;
      await supabase
        .from('study_sessions')
        .update({ ended_at: new Date().toISOString(), duration_secs: durationSecs })
        .eq('id', sessionId);

      // Perfect session achievement
      if (
        cardsStudied >= 5 &&
        cardsCorrect === cardsStudied &&
        !achievements.find((a) => a.achievement_key === 'perfect_session')
      ) {
        await supabase
          .from('user_achievements')
          .upsert([{ achievement_key: 'perfect_session' }], { onConflict: 'achievement_key' });

        // XP bonus
        if (progress) {
          await supabase
            .from('user_progress')
            .update({ total_xp: progress.total_xp + XP_PERFECT_BONUS })
            .eq('id', progress.id);
        }

        setNewlyUnlocked((prev) => {
          const def = ACHIEVEMENTS.find((a) => a.key === 'perfect_session');
          return def ? [...prev, def] : prev;
        });
      }

      await fetchAll();
    },
    [achievements, progress, supabase, fetchAll],
  );

  /** Call at the beginning of a study session to create a session row */
  const startSession = useCallback(
    async (deckId: string): Promise<string> => {
      const { data } = await supabase
        .from('study_sessions')
        .insert({ deck_id: deckId })
        .select('id')
        .single();

      if (progress) {
        await supabase
          .from('user_progress')
          .update({ total_sessions: progress.total_sessions + 1 })
          .eq('id', progress.id);
      }
      return data?.id ?? '';
    },
    [supabase, progress],
  );

  const clearNewlyUnlocked = useCallback(() => setNewlyUnlocked([]), []);

  return {
    progress,
    achievements,
    recentSessions,
    loading,
    newlyUnlocked,
    clearNewlyUnlocked,
    recordAnswer,
    endSession,
    startSession,
    refetch: fetchAll,
  };
}