import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { KotobaBubbleMode } from '@/components/Practice/KotobaBubbleMode';
import { XP_PERFECT_BONUS } from '@/components/Practice/KotobaBubbleMode/constants';
import { renderWithProviders } from '@/test/renderWithProviders';
import type { Flashcard } from '@/types/flashcard';
import type { PracticeSentence } from '@/types/practiceSentence';

// Regression: the perfect-run bonus used to call `triggerXpEarned` only, which
// animates a +50 the player never banked. It must also go through `addBonusXp`.

const {
  startSession,
  recordAnswer,
  endSession,
  addBonusXp,
  triggerXpEarned,
  sentences,
  sentencesOverride,
  usePracticeSentencesSpy,
  auth,
} = vi.hoisted(() => ({
  startSession: vi.fn(),
  recordAnswer: vi.fn(),
  endSession: vi.fn(),
  addBonusXp: vi.fn(),
  triggerXpEarned: vi.fn(),
  sentences: [] as unknown[],
  // Lets a test hand the hook a fresh array reference, since useMemo in the
  // component won't recompute from an in-place mutation of `sentences`.
  sentencesOverride: { current: null as unknown[] | null },
  usePracticeSentencesSpy: vi.fn(),
  auth: { isMemberAccount: false, user: { id: 'user1' } as { id: string } | null },
}));

vi.mock('@/hooks/useProgress', () => ({
  useProgress: () => ({ startSession, recordAnswer, endSession, addBonusXp }),
}));
vi.mock('@/contexts/XpAnimationContext', () => ({ useXpAnimation: () => ({ triggerXpEarned }) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('@/hooks/usePracticeSentences', () => ({
  usePracticeSentences: (deckId: string, memberId?: string) => {
    usePracticeSentencesSpy(deckId, memberId);
    const current = sentencesOverride.current ?? sentences;
    return {
      sentences: current,
      loading: false,
      generating: false,
      error: null,
      hasContent: current.length > 0,
      generate: vi.fn(),
    };
  },
}));
vi.mock('@/components/SpeakButton', () => ({ SpeakButton: () => null }));

// The component shuffles `gameSentences`, so every sentence shares one target
// particle — the correct answer is 'は' at every step whatever the order.
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

async function answerWith(particle: string) {
  const bubble = await screen.findByRole('button', { name: `Particle ${particle}` });
  fireEvent.click(bubble);
  const next = await screen.findByRole('button', { name: 'Next' });
  fireEvent.click(next);
}

describe('KotobaBubbleMode perfect bonus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    startSession.mockResolvedValue('sess-1');
    recordAnswer.mockResolvedValue(undefined);
    endSession.mockResolvedValue(undefined);
    sentences.length = 0;
    sentences.push(sentence('s1'), sentence('s2'), sentence('s3'));
  });

  it('banks the perfect bonus, not just the animation, on a flawless run', async () => {
    renderWithProviders(
      <KotobaBubbleMode cards={cards} deckId="d1" batchSize={3} onExit={() => {}} />,
    );

    await answerWith(CORRECT);
    await answerWith(CORRECT);
    await answerWith(CORRECT);

    await waitFor(() => expect(addBonusXp).toHaveBeenCalledWith(XP_PERFECT_BONUS));
    expect(triggerXpEarned).toHaveBeenCalledWith(XP_PERFECT_BONUS);
  });

  it('awards no perfect bonus when a sentence is missed', async () => {
    renderWithProviders(
      <KotobaBubbleMode cards={cards} deckId="d1" batchSize={3} onExit={() => {}} />,
    );

    await answerWith(WRONG);
    await answerWith(CORRECT);
    await answerWith(CORRECT);

    await waitFor(() => expect(endSession).toHaveBeenCalled());
    expect(addBonusXp).not.toHaveBeenCalledWith(XP_PERFECT_BONUS);
  });
});

// Regression: the Lesson Builder writes each learner a personalised sentence
// set keyed on their id, but this screen used to ask for the shared set only —
// so an applied plan's sentences were paid for and never shown to anyone.
describe('KotobaBubbleMode sentence set', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    startSession.mockResolvedValue('sess-1');
    sentences.length = 0;
    sentences.push(sentence('s1'));
  });

  it('asks for the learner’s own set', () => {
    auth.isMemberAccount = true;
    auth.user = { id: 'naomi' };

    renderWithProviders(
      <KotobaBubbleMode cards={cards} deckId="d1" batchSize={1} onExit={() => {}} />,
    );

    expect(usePracticeSentencesSpy).toHaveBeenCalledWith('d1', 'naomi');
  });

  it('leaves an organizer on the shared set they generate and edit', () => {
    auth.isMemberAccount = false;
    auth.user = { id: 'org1' };

    renderWithProviders(
      <KotobaBubbleMode cards={cards} deckId="d1" batchSize={1} onExit={() => {}} />,
    );

    expect(usePracticeSentencesSpy).toHaveBeenCalledWith('d1', undefined);
  });
});

// Regression: the unmount cleanup used to hardcode cardsStudied/cardsCorrect
// to 0, so exiting mid-game (not via the finish button) forfeited XP.
describe('KotobaBubbleMode session accounting', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    startSession.mockResolvedValue('sess-1');
    recordAnswer.mockResolvedValue(undefined);
    endSession.mockResolvedValue(undefined);
    sentences.length = 0;
    sentences.push(sentence('s1'), sentence('s2'), sentence('s3'));
    sentencesOverride.current = null;
  });

  it('records real answers, not zeros, when the learner leaves before finishing', async () => {
    const { unmount } = renderWithProviders(
      <KotobaBubbleMode cards={cards} deckId="d1" batchSize={3} onExit={() => {}} />,
    );

    await answerWith(CORRECT);
    await answerWith(WRONG);

    unmount();

    expect(endSession).toHaveBeenCalledTimes(1);
    expect(endSession).toHaveBeenCalledWith(
      'sess-1',
      expect.objectContaining({ cardsStudied: 2, cardsCorrect: 1 }),
    );
  });

  it('ends the prior session exactly once before a restart starts a new one', async () => {
    renderWithProviders(
      <KotobaBubbleMode cards={cards} deckId="d1" batchSize={3} onExit={() => {}} />,
    );

    await answerWith(CORRECT);
    await answerWith(CORRECT);
    await answerWith(CORRECT);

    const toSummary = await screen.findByText('Sentence Review');
    fireEvent.click(toSummary);

    await waitFor(() => expect(screen.getByText('Practice Again')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Practice Again'));

    await waitFor(() => expect(endSession).toHaveBeenCalledTimes(1));
    expect(startSession).toHaveBeenCalledTimes(2);
  });

  it('starts exactly one session even when the sentence list resolves, then changes, after mount', async () => {
    sentencesOverride.current = [];

    // batchSize > sentence count so gameSentences.length tracks the list's
    // size instead of being clamped, or the start effect's dep never changes.
    const { rerender } = renderWithProviders(
      <KotobaBubbleMode cards={cards} deckId="d1" batchSize={10} onExit={() => {}} />,
    );

    expect(startSession).not.toHaveBeenCalled();

    sentencesOverride.current = [sentence('s1'), sentence('s2'), sentence('s3')];
    rerender(<KotobaBubbleMode cards={cards} deckId="d1" batchSize={10} onExit={() => {}} />);

    await waitFor(() => expect(startSession).toHaveBeenCalledTimes(1));

    sentencesOverride.current = [...sentencesOverride.current, sentence('s4')];
    rerender(<KotobaBubbleMode cards={cards} deckId="d1" batchSize={10} onExit={() => {}} />);

    expect(startSession).toHaveBeenCalledTimes(1);
  });
});
