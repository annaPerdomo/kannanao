'use client';

import { Box } from '@mui/material';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import FlipStudy, { type FlipStudyController } from '@/components/FlipStudy';
import { cardsToMatchWords, WordMatchEmbedded } from '@/components/Games';
import { Loading } from '@/components/Loading';
import { CelebrationScreen, pickPraise } from '@/components/Practice/CelebrationScreen';
import { useAuth } from '@/contexts/AuthContext';
import { useBuddyFriendshipCtx } from '@/contexts/BuddyFriendshipContext';
import { useXpAnimation } from '@/contexts/XpAnimationContext';
import { useCombo } from '@/hooks/useCombo';
import { useProgress } from '@/hooks/useProgress';
import { XP_PER_WRONG } from '@/hooks/useProgress';
import { CHEST_XP, chestVariant, isChestEligible, localDateString } from '@/lib/chest';
import { cardXp } from '@/lib/flashcardUtils';
import { planQuest } from '@/lib/quest';
import { getDueCount } from '@/lib/supabase';
import { LAYOUT } from '@/theme';
import type { Flashcard } from '@/types/flashcard';

import { BossRound } from './BossRound';
import { QuestInterstitial } from './QuestInterstitial';
import { QuestMap } from './QuestMap';
import type { QuestGrade } from './types';

export interface ReviewQuestProps {
  /** Due cards for today, soonest-first (already fetched by the page). */
  cards: Flashcard[];
  onExit: () => void;
}

/**
 * Today's review as a short quest. The controller owns the ONE 'review' session
 * that every node grades into (so a quest run is a single study_sessions row),
 * plus the shared combo. Nodes run in sequence — Warm-up (flip) → optional Word
 * Match → optional Boss Round — and the perfect bonus + daily chest are checked
 * once, at the end.
 */
export function ReviewQuest({ cards, onExit }: ReviewQuestProps) {
  const t = useTranslations('Review.reviewQuest');
  const { user } = useAuth();
  const { startSession, recordAnswer, endSession, addBonusXp, openDailyChest, progress } =
    useProgress();
  const { triggerXpEarned } = useXpAnimation();
  const { awardFriendship } = useBuddyFriendshipCtx();

  // Every answer/bonus write is tracked here and awaited in finishQuest:
  // endSession re-reads progress from the DB (an in-flight bonus write would be
  // clobbered), and the chest's due-count check must see the SRS rows the final
  // node just wrote.
  const pendingWritesRef = useRef<Promise<unknown>[]>([]);
  const trackedAddBonusXp = useCallback(
    (amount: number) => {
      const write = Promise.resolve(addBonusXp(amount));
      pendingWritesRef.current.push(write);
      return write;
    },
    [addBonusXp],
  );
  const combo = useCombo(trackedAddBonusXp);

  const plan = useMemo(() => planQuest(cards), [cards]);
  const matchWords = useMemo(() => cardsToMatchWords(plan.match), [plan.match]);

  const sessionIdRef = useRef('');
  const startTimeRef = useRef(0);
  const answeredRef = useRef(0);
  const correctRef = useRef(0);
  const endedRef = useRef(false);
  // Snapshot last_chest_date every render so finishQuest reads the pre-open value
  // without a stale closure.
  const lastChestDateRef = useRef<string | null>(null);
  lastChestDateRef.current = progress?.last_chest_date ?? null;

  const [ready, setReady] = useState(false);
  const [nodeIdx, setNodeIdx] = useState(0);
  const [showBossIntro, setShowBossIntro] = useState(false);
  const [done, setDone] = useState(false);
  const [chestEligible, setChestEligible] = useState(false);
  const [perfect, setPerfect] = useState(false);
  const [heartsEarned, setHeartsEarned] = useState(0);

  // Open the one review session on mount. startSession is identity-stable, so
  // this fires exactly once even as progress updates.
  useEffect(() => {
    if (cards.length === 0) return;
    let cancelled = false;
    startSession(null, 'review').then((id) => {
      if (cancelled) return;
      sessionIdRef.current = id;
      startTimeRef.current = Date.now();
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [cards.length, startSession]);

  const finishQuest = useCallback(async () => {
    if (endedRef.current) return;
    endedRef.current = true;
    await Promise.allSettled(pendingWritesRef.current);
    const studied = answeredRef.current;
    const correct = correctRef.current;
    if (sessionIdRef.current) {
      await endSession(sessionIdRef.current, {
        cardsStudied: studied,
        cardsCorrect: correct,
        durationSecs: Math.round((Date.now() - startTimeRef.current) / 1000),
      });
    }
    setPerfect(studied >= 5 && correct === studied);

    // Daily chest: only when clearing the due queue actually emptied it. Guard
    // the network read so a failure quietly skips the chest, never errors the
    // celebration.
    try {
      const dueCount = user ? await getDueCount(user.id) : 1;
      setChestEligible(
        isChestEligible({
          lastChestDate: lastChestDateRef.current,
          today: localDateString(new Date()),
          dueCount,
          fromReview: true,
        }),
      );
      // An emptied due queue is the day's adventure. Never awaited — hearts
      // must not hold up or break the celebration. A failed count skips the
      // award for good (endedRef blocks a retry), which beats paying out for a
      // queue we can't confirm is empty.
      if (dueCount === 0) {
        void awardFriendship('adventure')
          .then((award) => setHeartsEarned(award?.awarded ?? 0))
          .catch(() => {});
      }
    } catch {
      setChestEligible(false);
    }

    setDone(true);
  }, [endSession, user, awardFriendship]);

  // Cards already SRS-advanced by a correct answer this quest. The Boss Round
  // deliberately re-tests the last Word Match cards, and without this a card
  // answered correctly in both nodes had its schedule advanced twice in one
  // session (pushed days further out than one review should).
  const correctlyGradedRef = useRef<Set<string>>(new Set());

  // The single grading primitive every node calls.
  const grade = useCallback<QuestGrade>(
    (correct, jlpt, cardId) => {
      answeredRef.current += 1;
      if (correct) correctRef.current += 1;
      triggerXpEarned(correct ? cardXp(jlpt) : XP_PER_WRONG);
      if (sessionIdRef.current) {
        // A repeat CORRECT drops the cardId (XP still counts, schedule doesn't
        // move twice); a wrong always records — a lapse must reset the card.
        let srsCardId = cardId;
        if (cardId && correct) {
          if (correctlyGradedRef.current.has(cardId)) srsCardId = undefined;
          else correctlyGradedRef.current.add(cardId);
        }
        pendingWritesRef.current.push(recordAnswer(sessionIdRef.current, correct, jlpt, srsCardId));
      }
      // Combo steps AFTER the answer is recorded so its bonus builds on the
      // updated progress snapshot.
      return combo.onAnswer(correct);
    },
    [triggerXpEarned, recordAnswer, combo],
  );

  const advanceNode = useCallback(() => {
    const next = nodeIdx + 1;
    if (next >= plan.nodes.length) {
      void finishQuest();
      return;
    }
    if (plan.nodes[next].type === 'boss') setShowBossIntro(true);
    setNodeIdx(next);
  }, [nodeIdx, plan.nodes, finishQuest]);

  const awardBossBonus = useCallback(
    (amount: number) => {
      if (amount <= 0) return;
      void trackedAddBonusXp(amount);
      triggerXpEarned(amount);
    },
    [trackedAddBonusXp, triggerXpEarned],
  );

  const flipController = useMemo<FlipStudyController>(
    () => ({
      onGrade: (card, correct) => grade(correct, card.jlptLevel, card.id),
      onComplete: advanceNode,
      comboCount: combo.count,
    }),
    [grade, advanceNode, combo.count],
  );

  if (cards.length === 0) return null;
  if (!ready) {
    return (
      <Box
        sx={{
          maxWidth: LAYOUT.narrowMaxWidth,
          mx: 'auto',
          px: LAYOUT.pagePx,
          py: { xs: 3, sm: 6 },
        }}
      >
        <Loading message={t('settingUpQuest')} />
      </Box>
    );
  }

  // ── Completion ──────────────────────────────────────────────────────────────
  if (done) {
    const pct = answeredRef.current > 0 ? correctRef.current / answeredRef.current : 1;
    const praise = pickPraise(pct, 0);
    return (
      <CelebrationScreen
        heading={praise.jp}
        headingEn={praise.en}
        subheading={t('clearedReview')}
        mode="study"
        exitLabel={t('backToReview')}
        heartsEarned={heartsEarned}
        chest={
          chestEligible
            ? {
                variant: chestVariant(perfect),
                xp: CHEST_XP,
                onOpen: () => {
                  // Only animate the XP once the write actually landed —
                  // openDailyChest rolls back and returns false on failure,
                  // and a count-up for XP that was never persisted is a lie.
                  void openDailyChest().then((ok) => {
                    if (ok) triggerXpEarned(CHEST_XP);
                  });
                },
              }
            : undefined
        }
        onExit={onExit}
      />
    );
  }

  const chestAvailable = lastChestDateRef.current !== localDateString(new Date());
  const node = plan.nodes[nodeIdx];
  const questMap = (
    <QuestMap nodes={plan.nodes} currentIndex={nodeIdx} chestAvailable={chestAvailable} />
  );

  // ── Boss intro interstitial ────────────────────────────────────────────────
  if (showBossIntro && node?.type === 'boss') {
    return (
      <Box
        sx={{ maxWidth: LAYOUT.narrowMaxWidth, mx: 'auto', px: LAYOUT.pagePx, py: LAYOUT.pagePy }}
      >
        <QuestInterstitial
          emoji="⚔️"
          title={t('bossRoundTitle')}
          subtitle={t('bossRoundSubtitle')}
          dark
          onContinue={() => setShowBossIntro(false)}
        />
      </Box>
    );
  }

  // Each node brings its own <PracticeStage>/<GameShell> container; a wrapper
  // here would stack page padding on top of theirs and cost the fold that much.
  return (
    <>
      {node?.type === 'warmup' && (
        <FlipStudy
          cards={plan.warmup}
          title={t('todaysPractice')}
          badge={t('cardsBadge', { count: plan.warmup.length })}
          sessionMode="review"
          sessionDeckId={null}
          onBack={onExit}
          controller={flipController}
          questMap={questMap}
        />
      )}

      {node?.type === 'match' && (
        <WordMatchEmbedded
          words={matchWords}
          comboCount={combo.count}
          onPairResolved={(correct, cardId, jlpt) => grade(correct, jlpt, cardId)}
          onComplete={advanceNode}
          onQuit={onExit}
          questMap={questMap}
        />
      )}

      {node?.type === 'boss' && (
        <BossRound
          cards={plan.boss}
          pool={cards}
          comboCount={combo.count}
          grade={grade}
          onBossBonus={awardBossBonus}
          onComplete={advanceNode}
          questMap={questMap}
        />
      )}
    </>
  );
}
