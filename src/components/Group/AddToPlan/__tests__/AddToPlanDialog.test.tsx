import { fireEvent, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/test/renderWithProviders';

import { AddToPlanDialog } from '../AddToPlanDialog';

const EXPECTED_LABELS = [
  'Make a lesson with AI',
  'Use one of my decks',
  'Import from Quizlet',
  'Kana course',
  'Start a blank deck',
];

describe('AddToPlanDialog', () => {
  it('renders the five sources as cards (sm+), in order, titled with no emoji', () => {
    renderWithProviders(
      <AddToPlanDialog
        open
        groupId="g1"
        groupName="Japanese 1"
        onClose={vi.fn()}
        onPick={vi.fn()}
      />,
    );
    const cards = within(screen.getByTestId('source-cards')).getAllByRole('button');
    expect(cards.map((el) => el.getAttribute('aria-label'))).toEqual(EXPECTED_LABELS);
    expect(cards[0]).toHaveTextContent('Make a lesson with AI');
    expect(cards[0]).not.toHaveTextContent('✨');
  });

  it('renders the five sources as rows (xs), in order', () => {
    renderWithProviders(
      <AddToPlanDialog
        open
        groupId="g1"
        groupName="Japanese 1"
        onClose={vi.fn()}
        onPick={vi.fn()}
      />,
    );
    const rows = within(screen.getByTestId('source-rows')).getAllByRole('button');
    expect(rows.map((el) => el.getAttribute('aria-label'))).toEqual(EXPECTED_LABELS);
  });

  it('calls onPick with the source key on Enter, from the sm+ card', () => {
    const onPick = vi.fn();
    renderWithProviders(
      <AddToPlanDialog
        open
        groupId="g1"
        groupName="Japanese 1"
        onClose={vi.fn()}
        onPick={onPick}
      />,
    );
    const quizletCard = within(screen.getByTestId('source-cards')).getByLabelText(
      'Import from Quizlet',
    );
    fireEvent.keyDown(quizletCard, { key: 'Enter' });
    expect(onPick).toHaveBeenCalledWith('quizlet');
  });

  it('calls onPick with the source key on click, from the xs row', () => {
    const onPick = vi.fn();
    renderWithProviders(
      <AddToPlanDialog
        open
        groupId="g1"
        groupName="Japanese 1"
        onClose={vi.fn()}
        onPick={onPick}
      />,
    );
    const quizletRow = within(screen.getByTestId('source-rows')).getByLabelText(
      'Import from Quizlet',
    );
    fireEvent.click(quizletRow);
    expect(onPick).toHaveBeenCalledWith('quizlet');
  });
});
