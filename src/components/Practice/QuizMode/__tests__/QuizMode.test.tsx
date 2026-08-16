import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { QuizMode } from '@/components/Practice/QuizMode';
import { renderWithProviders } from '@/test/renderWithProviders';
import type { Flashcard } from '@/types/flashcard';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const { useQuizFlowMock, startSession, recordAnswer, endSession, insertQuizResult } = vi.hoisted(
  () => ({
    useQuizFlowMock: vi.fn(),
    startSession: vi.fn(),
    recordAnswer: vi.fn(),
    endSession: vi.fn(),
    insertQuizResult: vi.fn(),
  }),
);

vi.mock('@/hooks/useQuizFlow', () => ({ useQuizFlow: (...a: unknown[]) => useQuizFlowMock(...a) }));
vi.mock('@/hooks/useProgress', () => ({
  useProgress: () => ({ startSession, recordAnswer, endSession }),
}));
vi.mock('@/lib/supabase', () => ({
  insertQuizResult: (...a: unknown[]) => insertQuizResult(...a),
}));
vi.mock('@/components/SpeakButton', () => ({ SpeakButton: () => null }));

const cards = [{ id: '1', deckId: 'd1', word: 'w', meaning: 'm' }] as Flashcard[];

describe('QuizMode finalization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    startSession.mockResolvedValue('sess-1');
    endSession.mockResolvedValue(undefined);
    insertQuizResult.mockResolvedValue(true);
  });

  it('writes a quiz_results row with score/total/accuracy when the quiz completes', async () => {
    useQuizFlowMock.mockReturnValue({
      questions: [],
      current: undefined,
      index: 10,
      total: 10,
      score: 8,
      phase: 'done',
      answer: vi.fn(),
    });

    renderWithProviders(<QuizMode cards={cards} deckId="deck-1" onExit={() => {}} />);

    await waitFor(() => expect(insertQuizResult).toHaveBeenCalledTimes(1));
    expect(insertQuizResult).toHaveBeenCalledWith({
      deckId: 'deck-1',
      score: 8,
      total: 10,
      accuracy: 80,
      sessionId: 'sess-1',
    });
    // endSession must run first so the session's card counts are settled for the
    // mastery auto-complete it triggers.
    expect(endSession).toHaveBeenCalledWith('sess-1', {
      cardsStudied: 10,
      cardsCorrect: 8,
      durationSecs: expect.any(Number),
      sampleWords: expect.any(Array),
    });
  });

  it('does not write a row while the quiz is still playing', async () => {
    useQuizFlowMock.mockReturnValue({
      questions: [{ card: cards[0], type: 'choice' }],
      current: { card: cards[0], type: 'choice' },
      index: 0,
      total: 10,
      score: 0,
      phase: 'playing',
      answer: vi.fn(),
    });

    renderWithProviders(<QuizMode cards={cards} deckId="deck-1" onExit={() => {}} />);
    await waitFor(() => expect(startSession).toHaveBeenCalled());
    expect(insertQuizResult).not.toHaveBeenCalled();
  });
});

describe('QuizMode question interaction', () => {
  const two = [
    { id: '1', deckId: 'd1', word: 'いぬ', reading: 'いぬ', meaning: 'dog' },
    { id: '2', deckId: 'd1', word: 'ねこ', reading: 'ねこ', meaning: 'cat' },
  ] as Flashcard[];

  beforeEach(() => {
    vi.clearAllMocks();
    startSession.mockResolvedValue('sess-1');
  });

  it('grades a multiple-choice pick and shows correct feedback', async () => {
    useQuizFlowMock.mockReturnValue({
      questions: [],
      current: { card: two[0], type: 'choice' },
      index: 0,
      total: 2,
      score: 0,
      phase: 'playing',
      answer: vi.fn(),
    });

    renderWithProviders(<QuizMode cards={two} deckId="deck-1" onExit={() => {}} />);
    await waitFor(() => expect(startSession).toHaveBeenCalled());

    fireEvent.click(screen.getByRole('button', { name: 'dog' }));

    await screen.findByText('✓ Correct — moving on…');
    await waitFor(() => expect(recordAnswer).toHaveBeenCalledWith('sess-1', true, undefined, '1'));
  });

  it('grades a typed answer as wrong and reveals the correct word', async () => {
    useQuizFlowMock.mockReturnValue({
      questions: [],
      current: { card: two[0], type: 'typed' },
      index: 0,
      total: 2,
      score: 0,
      phase: 'playing',
      answer: vi.fn(),
    });

    renderWithProviders(<QuizMode cards={two} deckId="deck-1" onExit={() => {}} />);
    await waitFor(() => expect(startSession).toHaveBeenCalled());

    fireEvent.change(screen.getByLabelText('Your answer'), { target: { value: 'wrong' } });
    fireEvent.click(screen.getByRole('button', { name: 'Check' }));

    await screen.findByText(/Answer: いぬ/);
    await waitFor(() => expect(recordAnswer).toHaveBeenCalledWith('sess-1', false, undefined, '1'));
    // Wrong answers require a manual advance — no auto-advance timer.
    expect(screen.getByRole('button', { name: /Next/ })).toBeInTheDocument();
  });
});
