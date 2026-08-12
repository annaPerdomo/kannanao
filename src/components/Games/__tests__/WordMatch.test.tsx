import { fireEvent, screen } from '@testing-library/react';
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
