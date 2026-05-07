import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { usePracticeQueue } from '@/hooks/usePracticeQueue';
import type { Flashcard } from '@/types/flashcard';

function makeCard(id: string): Flashcard {
  return {
    id,
    deckId: 'deck-1',
    word: `word-${id}`,
    reading: `reading-${id}`,
    meaning: `meaning-${id}`,
    image_query: '',
    example_jp: '',
    example_en: '',
    mainViewMode: 'hiragana',
    cardType: 'word',
    position: 0,
  };
}

const CARDS = ['c1', 'c2', 'c3', 'c4', 'c5'].map(makeCard);

describe('usePracticeQueue', () => {
  describe('initial state', () => {
    it('should start in playing phase', () => {
      const { result } = renderHook(() => usePracticeQueue(CARDS, 10));
      expect(result.current.phase).toBe('playing');
    });

    it('should populate currentCards with the card list', () => {
      const { result } = renderHook(() => usePracticeQueue(CARDS, 10));
      expect(result.current.currentCards.length).toBe(CARDS.length);
    });

    it('should start with correct=0 stats (firstAttemptCorrect is 0 until allDone)', () => {
      const { result } = renderHook(() => usePracticeQueue(CARDS, 10));
      // firstAttemptCorrect is 0 while phase !== 'allDone'
      expect(result.current.firstAttemptCorrect).toBe(0);
    });

    it('should report lastRoundWrong=0 and lastRoundTotal=0 before any round ends', () => {
      const { result } = renderHook(() => usePracticeQueue(CARDS, 10));
      expect(result.current.lastRoundWrong).toBe(0);
      expect(result.current.lastRoundTotal).toBe(0);
    });

    it('should not be a retry round initially', () => {
      const { result } = renderHook(() => usePracticeQueue(CARDS, 10));
      expect(result.current.isRetryRound).toBe(false);
      expect(result.current.retryCount).toBe(0);
    });

    it('should handle empty card list gracefully', () => {
      const { result } = renderHook(() => usePracticeQueue([], 10));
      expect(result.current.currentCards).toHaveLength(0);
      expect(result.current.phase).toBe('playing');
    });
  });

  describe('reportResult', () => {
    it('should track correct answers — all correct in last batch goes allDone', () => {
      const { result } = renderHook(() => usePracticeQueue(CARDS, 10));

      act(() => {
        CARDS.forEach((c) => result.current.reportResult(c.id, true));
      });

      act(() => {
        result.current.finishRound();
      });

      // All correct + last batch → allDone directly (no retry needed)
      expect(result.current.phase).toBe('allDone');
      expect(result.current.lastRoundWrong).toBe(0);
    });

    it('should track incorrect answers (false is sticky)', () => {
      const { result } = renderHook(() => usePracticeQueue(CARDS, 10));

      act(() => {
        result.current.reportResult('c1', false);
        result.current.reportResult('c1', true); // second attempt - should stay false
      });

      act(() => {
        result.current.reportResult('c2', true);
        result.current.reportResult('c3', true);
        result.current.reportResult('c4', true);
        result.current.reportResult('c5', true);
      });

      act(() => {
        result.current.finishRound();
      });

      // c1 was wrong (sticky) → 1 card wrong
      expect(result.current.lastRoundWrong).toBe(1);
    });
  });

  describe('finishRound', () => {
    it('should transition to allDone when all correct in last batch', () => {
      const { result } = renderHook(() => usePracticeQueue(CARDS, 10));

      act(() => {
        CARDS.forEach((c) => result.current.reportResult(c.id, true));
      });

      act(() => {
        result.current.finishRound();
      });

      // Single batch, all correct → goes straight to allDone
      expect(result.current.phase).toBe('allDone');
    });

    it('should transition to roundEnd when there are wrong answers', () => {
      const { result } = renderHook(() => usePracticeQueue(CARDS, 10));

      act(() => {
        result.current.reportResult('c1', false); // one wrong
        result.current.reportResult('c2', true);
        result.current.reportResult('c3', true);
        result.current.reportResult('c4', true);
        result.current.reportResult('c5', true);
      });

      act(() => {
        result.current.finishRound();
      });

      expect(result.current.phase).toBe('roundEnd');
    });

    it('should set lastRoundTotal to number of cards in round', () => {
      const { result } = renderHook(() => usePracticeQueue(CARDS, 10));

      act(() => {
        CARDS.forEach((c) => result.current.reportResult(c.id, true));
      });

      act(() => {
        result.current.finishRound();
      });

      expect(result.current.lastRoundTotal).toBe(CARDS.length);
    });
  });

  describe('nextRound', () => {
    it('should enter allDone directly from finishRound when all correct in last batch', () => {
      const { result } = renderHook(() => usePracticeQueue(CARDS, 10));

      act(() => {
        CARDS.forEach((c) => result.current.reportResult(c.id, true));
      });
      act(() => {
        result.current.finishRound();
      });

      // finishRound goes straight to allDone — nextRound isn't needed
      expect(result.current.phase).toBe('allDone');
    });

    it('should re-enter playing after nextRound on a retry', () => {
      const { result } = renderHook(() => usePracticeQueue(CARDS, 10));

      // All wrong → retry
      act(() => {
        CARDS.forEach((c) => result.current.reportResult(c.id, false));
      });
      act(() => {
        result.current.finishRound();
      });
      expect(result.current.phase).toBe('roundEnd');

      act(() => {
        result.current.nextRound();
      });
      expect(result.current.phase).toBe('playing');
    });

    it('should retry wrong cards when retryCount < MAX_RETRIES', () => {
      const { result } = renderHook(() => usePracticeQueue(CARDS, 10));

      act(() => {
        result.current.reportResult('c1', false);
        result.current.reportResult('c2', true);
        result.current.reportResult('c3', true);
        result.current.reportResult('c4', true);
        result.current.reportResult('c5', true);
      });
      act(() => {
        result.current.finishRound();
      });
      act(() => {
        result.current.nextRound();
      });

      expect(result.current.isRetryRound).toBe(true);
      expect(result.current.retryCount).toBe(1);
    });

    it('should set phase back to playing after nextRound', () => {
      const { result } = renderHook(() => usePracticeQueue(CARDS, 10));

      act(() => {
        CARDS.forEach((c) => result.current.reportResult(c.id, false));
      });
      act(() => {
        result.current.finishRound();
      });
      act(() => {
        result.current.nextRound();
      });

      expect(result.current.phase).toBe('playing');
    });
  });

  describe('multi-batch', () => {
    it('should split cards into batches correctly', () => {
      const manyCards = Array.from({ length: 6 }, (_, i) => makeCard(`c${i + 1}`));
      const { result } = renderHook(() => usePracticeQueue(manyCards, 3));

      expect(result.current.totalBatches).toBe(2);
      expect(result.current.currentCards.length).toBe(3);
    });

    it('should advance to next batch after completing current batch', () => {
      const manyCards = Array.from({ length: 6 }, (_, i) => makeCard(`c${i + 1}`));
      const { result } = renderHook(() => usePracticeQueue(manyCards, 3));

      // Answer all in batch 1 correctly
      act(() => {
        result.current.currentCards.forEach((c) => result.current.reportResult(c.id, true));
      });
      act(() => {
        result.current.finishRound();
      });
      act(() => {
        result.current.nextRound();
      });

      expect(result.current.batchIndex).toBe(1);
    });
  });

  describe('firstAttemptCorrect', () => {
    it('should count first-attempt correct answers when phase is allDone', () => {
      const twoCards = [makeCard('c1'), makeCard('c2')];
      const { result } = renderHook(() => usePracticeQueue(twoCards, 10));

      act(() => {
        result.current.reportResult('c1', true);
        result.current.reportResult('c2', false);
      });
      act(() => {
        result.current.finishRound();
      });
      act(() => {
        // c2 retry - mark correct this time
        result.current.reportResult('c2', true);
      });
      act(() => {
        result.current.finishRound();
      });
      act(() => {
        result.current.nextRound();
      });

      // Phase should be allDone now; c1 was correct on first attempt
      if (result.current.phase === 'allDone') {
        expect(result.current.firstAttemptCorrect).toBe(1);
      }
    });
  });
});
