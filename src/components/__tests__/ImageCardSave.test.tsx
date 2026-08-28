import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/test/renderWithProviders';
import type { Flashcard } from '@/types/flashcard';

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('@/components/FuriganaText', () => ({
  default: ({ text }: { text: string }) => <span>{text}</span>,
  stripFurigana: (t: string) => t,
  furiganaToKana: (t: string) => t,
  titleRubySx: {},
}));
vi.mock('@/components/SpeakButton', () => ({ SpeakButton: () => null }));
vi.mock('@/components/UnsplashAttribution', () => ({ UnsplashAttribution: () => null }));

// A stand-in that lets the test fire onSave directly; the real dialog's own
// behavior is covered by its own suite.
vi.mock('@/components/EditCardDialog', () => ({
  EditCardDialog: ({ card, onSave }: { card: Flashcard | null; onSave: (c: Flashcard) => void }) =>
    card ? (
      <button onClick={() => onSave({ ...card, meaning: 'edited meaning' })}>save-card</button>
    ) : null,
}));

import { ImageCard } from '@/components/ImageCard';
import { DataError } from '@/lib/dataError';

function makeCard(overrides: Partial<Flashcard> = {}): Flashcard {
  return {
    id: 'c1',
    word: '猫',
    reading: 'ねこ',
    meaning: 'cat',
    imageUrl: '',
    image_query: '',
    example_jp: '',
    example_en: '',
    deckId: 'deck-1',
    mainViewMode: 'hiragana',
    cardType: 'word',
    position: 0,
    ...overrides,
  };
}

describe('editing a card when the write fails', () => {
  it('rolls back the card so it does not claim an unsaved edit landed', async () => {
    const onUpdate = vi.fn().mockRejectedValue(new DataError('upstream', 'gateway down'));

    renderWithProviders(<ImageCard card={makeCard()} onDelete={vi.fn()} onUpdate={onUpdate} />);
    fireEvent.click(screen.getByRole('button', { name: 'save-card' }));

    await waitFor(() => expect(onUpdate).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByText('edited meaning')).not.toBeInTheDocument());
    expect(screen.getByText('cat')).toBeInTheDocument();
  });

  it('keeps the edit on screen when the write succeeds', async () => {
    const onUpdate = vi.fn().mockResolvedValue(makeCard({ meaning: 'edited meaning' }));

    renderWithProviders(<ImageCard card={makeCard()} onDelete={vi.fn()} onUpdate={onUpdate} />);
    fireEvent.click(screen.getByRole('button', { name: 'save-card' }));

    await waitFor(() => expect(screen.getByText('edited meaning')).toBeInTheDocument());
  });
});
