import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/test/renderWithProviders';
import type { PracticeSentence } from '@/types/practiceSentence';

import { SessionSummary } from '../SessionSummary';

vi.mock('@/components/SpeakButton', () => ({ SpeakButton: () => null }));
vi.mock('../../CelebrationScreen', () => ({ NextUpCard: () => null }));

function sentence(id: string): PracticeSentence {
  return {
    id,
    deckId: 'd1',
    sentenceJp: `文${id}`,
    sentenceEn: `sentence ${id}`,
    targetParticle: 'は',
  } as PracticeSentence;
}

describe('SessionSummary', () => {
  it('makes the handoff button the contained primary and Practice Again outlined', () => {
    renderWithProviders(
      <SessionSummary
        results={[{ sentence: sentence('s1'), correct: true }]}
        totalCorrect={1}
        total={1}
        bestStreak={0}
        handoff={{ label: 'Next: Match', onNext: vi.fn(), onStop: vi.fn(), final: false }}
        onRestart={vi.fn()}
        onExit={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: 'Next: Match' })).toHaveClass('MuiButton-contained');
    expect(screen.getByRole('button', { name: 'Practice Again' })).toHaveClass(
      'MuiButton-outlined',
    );
  });

  it('keeps Practice Again contained when there is no handoff', () => {
    renderWithProviders(
      <SessionSummary
        results={[{ sentence: sentence('s1'), correct: true }]}
        totalCorrect={1}
        total={1}
        bestStreak={0}
        handoff={null}
        onRestart={vi.fn()}
        onExit={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: 'Practice Again' })).toHaveClass(
      'MuiButton-contained',
    );
  });

  it('hides the "show the ones I got right" toggle when nothing was correct', () => {
    renderWithProviders(
      <SessionSummary
        results={[{ sentence: sentence('s1'), correct: false }]}
        totalCorrect={0}
        total={1}
        bestStreak={0}
        handoff={null}
        onRestart={vi.fn()}
        onExit={vi.fn()}
      />,
    );
    expect(screen.queryByText(/got right/i)).not.toBeInTheDocument();
  });
});
