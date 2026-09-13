import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { EditCardDialog } from '@/components/EditCardDialog';
import type * as ApiModule from '@/services/api';
import { renderWithProviders } from '@/test/renderWithProviders';
import type { Flashcard } from '@/types/flashcard';

vi.mock('@/services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof ApiModule>();
  return { ...actual, formatFurigana: vi.fn() };
});

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ isMemberAccount: false }),
}));

const CARD: Flashcard = {
  id: 'card1',
  word: '猫',
  reading: 'ねこ',
  meaning: 'cat',
  image_query: 'cat',
  example_jp: '{猫|ねこ}が好きです。',
  example_en: 'I like cats.',
  deckId: 'deck1',
  mainViewMode: 'hiragana',
  cardType: 'word',
  position: 0,
};

describe('EditCardDialog', () => {
  it('renders ruby for a markup example sentence and saves the reflowed markup', () => {
    const onSave = vi.fn();
    renderWithProviders(<EditCardDialog card={CARD} open onClose={vi.fn()} onSave={onSave} />);

    expect(document.querySelector('ruby rt')).toHaveTextContent('ねこ');

    fireEvent.click(screen.getByRole('button', { name: 'Edit reading' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Reading for 猫' }), {
      target: { value: 'ネコ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));

    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ example_jp: '{猫|ネコ}が好きです。' }),
    );
  });
});
