import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SpeechLineRow } from '@/components/OhanashikaiDetail/SpeechLineRow';
import { renderWithProviders } from '@/test/renderWithProviders';

vi.mock('@/services/api', () => ({
  formatFurigana: vi.fn(),
}));

const BRAND: Record<number, string> = {
  50: '#fff',
  100: '#fff',
  200: '#fff',
  300: '#fff',
  400: '#fff',
  500: '#fff',
  600: '#fff',
  700: '#fff',
};

describe('SpeechLineRow', () => {
  it('shows a reading input for a tagged kanji group while editing and commits the updated markup', () => {
    const onEditValChange = vi.fn();
    const onCommitEdit = vi.fn();

    renderWithProviders(
      <SpeechLineRow
        lineId="line1"
        text="{私|わたし}は元気です。"
        index={0}
        editingId="line1"
        editVal="{私|わたし}は元気です。"
        brandPalette={BRAND}
        onStartEdit={vi.fn()}
        onEditValChange={onEditValChange}
        onCommitEdit={onCommitEdit}
        onCancelEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    const readingInput = screen.getByRole('textbox', { name: 'Reading for 私' });
    fireEvent.change(readingInput, { target: { value: 'わたくし' } });
    expect(onEditValChange).toHaveBeenCalledWith('{私|わたくし}は元気です。');

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onCommitEdit).toHaveBeenCalled();
  });

  it('Escape cancels editing', () => {
    const onCancelEdit = vi.fn();
    renderWithProviders(
      <SpeechLineRow
        lineId="line1"
        text="{私|わたし}は元気です。"
        index={0}
        editingId="line1"
        editVal="{私|わたし}は元気です。"
        brandPalette={BRAND}
        onStartEdit={vi.fn()}
        onEditValChange={vi.fn()}
        onCommitEdit={vi.fn()}
        onCancelEdit={onCancelEdit}
        onDelete={vi.fn()}
      />,
    );

    fireEvent.keyDown(screen.getByRole('textbox', { name: 'Sentence' }), { key: 'Escape' });
    expect(onCancelEdit).toHaveBeenCalled();
  });
});
