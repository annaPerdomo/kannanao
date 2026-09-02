import { fireEvent, screen } from '@testing-library/react';
import { act } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/test/renderWithProviders';

import type { MatchWord } from '../gameWords';
import { WordMatchEmbedded } from '../WordMatch';

const WORDS: MatchWord[] = [
  { jp: 'やちん', english: 'rent', speak: 'やちん', cardId: 'c1' },
  { jp: 'しごと', english: 'work', speak: 'しごと', cardId: 'c2' },
];

function renderBoard(onPairResolved = vi.fn()) {
  renderWithProviders(
    <WordMatchEmbedded
      words={WORDS}
      comboCount={0}
      onPairResolved={onPairResolved}
      onComplete={vi.fn()}
      onQuit={vi.fn()}
    />,
  );
  return onPairResolved;
}

function tile(label: string) {
  return screen.getByRole('button', { name: label });
}

describe('WordMatch board', () => {
  it('grades a pair after one tap per tile', () => {
    const onPairResolved = renderBoard();

    fireEvent.click(tile('やちん'));
    fireEvent.click(tile('rent'));

    expect(onPairResolved).toHaveBeenCalledTimes(1);
    expect(onPairResolved).toHaveBeenCalledWith(true, 'c1', undefined);
  });

  // Safari only fires click on the second tap of a role="button" div.
  it('renders each tile as a real button', () => {
    renderBoard();

    expect(tile('やちん').tagName).toBe('BUTTON');
  });

  it('ignores taps on an already matched tile', () => {
    const onPairResolved = renderBoard();

    fireEvent.click(tile('やちん'));
    fireEvent.click(tile('rent'));
    fireEvent.click(tile('やちん'));

    expect(onPairResolved).toHaveBeenCalledTimes(1);
  });

  it('grades a mismatch as wrong against the tapped tile', () => {
    const onPairResolved = renderBoard();

    fireEvent.click(tile('やちん'));
    fireEvent.click(tile('work'));

    expect(onPairResolved).toHaveBeenCalledWith(false, 'c2', undefined);
  });

  it('does not grade a re-pick on the same side', () => {
    const onPairResolved = renderBoard();

    fireEvent.click(tile('やちん'));
    fireEvent.click(tile('しごと'));

    expect(onPairResolved).not.toHaveBeenCalled();
  });
});

describe('WordMatch board, after the shared-board lift', () => {
  it('offers read-aloud on the Japanese tiles only', () => {
    renderBoard();

    expect(screen.getAllByRole('button', { name: 'Read aloud' })).toHaveLength(WORDS.length);
  });

  it('shows the emoji alongside the meaning when the word has one', () => {
    const onPairResolved = vi.fn();
    renderWithProviders(
      <WordMatchEmbedded
        words={[{ jp: 'ねこ', english: 'cat', emoji: '🐱', speak: 'ねこ' }]}
        comboCount={0}
        onPairResolved={onPairResolved}
        onComplete={vi.fn()}
        onQuit={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: '🐱 cat' })).toBeInTheDocument();
  });

  it('hands back once every pair in the round is matched', () => {
    vi.useFakeTimers();
    try {
      const onComplete = vi.fn();
      renderWithProviders(
        <WordMatchEmbedded
          words={WORDS}
          comboCount={0}
          onPairResolved={vi.fn()}
          onComplete={onComplete}
          onQuit={vi.fn()}
        />,
      );

      fireEvent.click(tile('やちん'));
      fireEvent.click(tile('rent'));
      fireEvent.click(tile('しごと'));
      fireEvent.click(tile('work'));
      expect(onComplete).not.toHaveBeenCalled();

      act(() => void vi.advanceTimersByTime(800));
      expect(onComplete).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('hands back immediately when it is handed no words at all', () => {
    const onComplete = vi.fn();
    renderWithProviders(
      <WordMatchEmbedded
        words={[]}
        comboCount={0}
        onPairResolved={vi.fn()}
        onComplete={onComplete}
        onQuit={vi.fn()}
      />,
    );

    expect(onComplete).toHaveBeenCalled();
  });
});
