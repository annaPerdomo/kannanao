import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/test/renderWithProviders';

import { AddWordsMenu, type AddWordsSource } from '../AddWordsMenu';

const SOURCES: { source: AddWordsSource; label: string }[] = [
  { source: 'topic', label: 'From a topic with AI' },
  { source: 'text', label: 'From a textbook page' },
  { source: 'pdf', label: 'From a PDF' },
  { source: 'list', label: 'From a word list' },
  { source: 'decks', label: 'From my decks' },
  { source: 'quizlet', label: 'From Quizlet' },
  { source: 'type', label: 'Type one word' },
];

describe('AddWordsMenu', () => {
  it.each(SOURCES)('opens the menu and invokes onSelect for %s', ({ source, label }) => {
    const onSelect = vi.fn();
    renderWithProviders(<AddWordsMenu onSelect={onSelect} />);

    fireEvent.click(screen.getByRole('button', { name: 'Add words' }));
    fireEvent.click(screen.getByRole('menuitem', { name: new RegExp(label) }));

    expect(onSelect).toHaveBeenCalledWith(source);
  });

  it('is keyboard reachable: Enter on the trigger opens the menu', () => {
    const onSelect = vi.fn();
    renderWithProviders(<AddWordsMenu onSelect={onSelect} />);
    const trigger = screen.getByRole('button', { name: 'Add words' });
    trigger.focus();
    fireEvent.click(trigger);
    expect(screen.getByRole('menu')).toBeInTheDocument();
  });

  it('disables the trigger when disabled', () => {
    renderWithProviders(<AddWordsMenu disabled onSelect={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Add words' })).toBeDisabled();
  });
});
