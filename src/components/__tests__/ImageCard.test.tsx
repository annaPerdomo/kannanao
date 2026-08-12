import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/test/renderWithProviders';
import type { Flashcard as FlashcardType } from '@/types/flashcard';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/components/FuriganaText', () => ({
  // Base text and readings in separate nodes, like the real ruby markup.
  default: ({ text }: { text: string }) => (
    <span data-testid="furigana">
      {text.replace(/\{([^|}]+)\|([^}]+)\}/g, '$1')}
      <span>{[...text.matchAll(/\{[^|}]+\|([^}]+)\}/g)].map((m) => m[1]).join('')}</span>
    </span>
  ),
  stripFurigana: (t: string) => t.replace(/\{[^|]+\|([^}]+)\}/g, '$1'),
  titleRubySx: {},
}));

vi.mock('@/components/SpeakButton', () => ({ SpeakButton: () => null }));
vi.mock('@/components/UnsplashAttribution', () => ({ UnsplashAttribution: () => null }));
vi.mock('@/components/EditCardDialog', () => ({ EditCardDialog: () => null }));

import { ImageCard } from '@/components/ImageCard';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeCard(overrides: Partial<FlashcardType> = {}): FlashcardType {
  return {
    id: 'c1',
    deckId: 'deck-1',
    word: '猫',
    reading: 'ねこ',
    meaning: 'cat',
    image_query: 'cat',
    example_jp: '',
    example_en: '',
    mainViewMode: 'hiragana',
    cardType: 'word',
    jlptLevel: 'N5',
    position: 0,
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ImageCard', () => {
  it('leads with the reading in hiragana mode', () => {
    renderWithProviders(<ImageCard card={makeCard()} onDelete={vi.fn()} />);

    expect(screen.getByText('ねこ')).toBeInTheDocument();
  });

  // A deck-wide view mode change rewrites every card row at once; the tile has
  // its own copy of the card for in-place edits and used to ignore the new prop.
  it('follows the card when the deck rewrites it', () => {
    const { rerender } = renderWithProviders(<ImageCard card={makeCard()} onDelete={vi.fn()} />);

    rerender(<ImageCard card={makeCard({ mainViewMode: 'kanji' })} onDelete={vi.fn()} />);

    expect(screen.getByText('猫')).toBeInTheDocument();
  });
});
