import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Flashcard } from '@/types/flashcard';
import type { PracticeSentence } from '@/types/practiceSentence';

import { useKotobaGame } from '../useKotobaGame';

const { startSession, recordAnswer, endSession, addBonusXp, triggerXpEarned, sentences, auth } =
  vi.hoisted(() => ({
    startSession: vi.fn(),
    recordAnswer: vi.fn(),
    endSession: vi.fn(),
    addBonusXp: vi.fn(),
    triggerXpEarned: vi.fn(),
    sentences: [] as unknown[],
    auth: { isMemberAccount: false, user: { id: 'user1' } as { id: string } | null },
  }));

vi.mock('@/hooks/useProgress', () => ({
  useProgress: () => ({ startSession, recordAnswer, endSession, addBonusXp }),
}));
vi.mock('@/contexts/XpAnimationContext', () => ({ useXpAnimation: () => ({ triggerXpEarned }) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('@/hooks/usePracticeSentences', () => ({
  usePracticeSentences: () => ({
    sentences,
    loading: false,
    generating: false,
    error: null,
    hasContent: sentences.length > 0,
    generate: vi.fn(),
  }),
}));

const CORRECT = 'は';
const WRONG = 'を';

function sentence(id: string): PracticeSentence {
  return {
    id,
    deckId: 'd1',
    sentenceJp: `ねこ${CORRECT}すきです`,
    sentenceEn: 'I like cats',
    targetParticle: CORRECT,
    particleIndex: 2,
    distractors: [WRONG, 'に'],
    sentenceType: 'statement',
    conversationGroup: 1,
    sortOrder: 0,
    sourceCardIds: [],
    createdAt: '2026-07-30',
  };
}

const cards = [{ id: '1', deckId: 'd1', word: 'ねこ', meaning: 'cat' }] as Flashcard[];

describe('useKotobaGame', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    startSession.mockResolvedValue('sess-1');
    recordAnswer.mockResolvedValue(undefined);
    endSession.mockResolvedValue(undefined);
    sentences.length = 0;
    sentences.push(sentence('s1'), sentence('s2'), sentence('s3'));
  });

  it('increments totalCorrect and combo count and records a result on a correct answer', async () => {
    const { result } = renderHook(() => useKotobaGame({ cards, deckId: 'd1', batchSize: 3 }));
    await waitFor(() => expect(result.current.currentSentence).toBeTruthy());

    await act(async () => {
      await result.current.handleSelect(CORRECT);
    });

    expect(result.current.totalCorrect).toBe(1);
    expect(result.current.combo.count).toBe(1);
    expect(result.current.results).toEqual([expect.objectContaining({ correct: true })]);
  });

  it('resets the combo count on a wrong answer', async () => {
    const { result } = renderHook(() => useKotobaGame({ cards, deckId: 'd1', batchSize: 3 }));
    await waitFor(() => expect(result.current.currentSentence).toBeTruthy());

    await act(async () => {
      await result.current.handleSelect(CORRECT);
    });
    expect(result.current.combo.count).toBe(1);

    await act(async () => {
      result.current.handleNext();
    });
    await act(async () => {
      await result.current.handleSelect(WRONG);
    });

    expect(result.current.combo.count).toBe(0);
  });

  it('marks the game complete after advancing past the last sentence', async () => {
    const { result } = renderHook(() => useKotobaGame({ cards, deckId: 'd1', batchSize: 3 }));
    await waitFor(() => expect(result.current.currentSentence).toBeTruthy());

    for (let i = 0; i < 3; i++) {
      await act(async () => {
        await result.current.handleSelect(CORRECT);
      });
      await act(async () => {
        result.current.handleNext();
      });
    }

    await waitFor(() => expect(result.current.gameComplete).toBe(true));
  });
});
