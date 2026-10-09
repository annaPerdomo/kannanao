import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { saveQuizletQueue, toImportSet } from '@/lib/quizlet';
import { renderWithProviders } from '@/test/renderWithProviders';

import { QuizletWordsDialog } from '../QuizletWordsDialog';

function setSet() {
  return toImportSet({
    title: 'Ch 5 Vocabulary',
    url: 'https://quizlet.com/826640589/ch-5-vocabulary-flash-cards/',
    cards: [
      { front: 'しゅみ', back: 'Hobby' },
      { front: 'あか 赤', back: 'red' },
    ],
  });
}

describe('QuizletWordsDialog', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('shows the empty state with a link to set up the bookmarklet', () => {
    renderWithProviders(
      <QuizletWordsDialog open onClose={vi.fn()} groupId="g1" onPick={vi.fn()} />,
    );
    expect(
      screen.getByText('No Quizlet sets waiting. Use the bookmarklet on a Quizlet set first.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Set up the bookmarklet' })).toHaveAttribute(
      'href',
      '/group/g1/add/quizlet',
    );
  });

  it('lists queued sets with their kept card count and picks one', () => {
    const set = setSet();
    saveQuizletQueue([set]);
    const onPick = vi.fn();
    renderWithProviders(<QuizletWordsDialog open onClose={vi.fn()} groupId="g1" onPick={onPick} />);

    expect(screen.getByText('Ch 5 Vocabulary')).toBeInTheDocument();
    expect(screen.getByText('2 of 2 cards')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Ch 5 Vocabulary'));
    expect(onPick).toHaveBeenCalledWith(set);
  });
});
