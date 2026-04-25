import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';
import type { Flashcard as FlashcardType } from '@/types/flashcard';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/components/FuriganaText', () => ({
  default: ({ text }: { text: string }) => <span data-testid="furigana">{text}</span>,
  stripFurigana: (t: string) => t.replace(/\{[^|]+\|([^}]+)\}/g, '$1'),
}));

vi.mock('@/components/SpeakButton', () => ({
  SpeakButton: () => null,
}));

vi.mock('@/components/UnsplashAttribution', () => ({
  UnsplashAttribution: () => null,
}));

import { Flashcard } from '@/components/Flashcard';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeCard(overrides: Partial<FlashcardType> = {}): FlashcardType {
  return {
    id: 'c1',
    deckId: 'deck-1',
    word: '猫',
    reading: 'ねこ',
    meaning: 'cat',
    image_query: 'cat',
    example_jp: '{猫|ねこ}が好きです',
    example_en: 'I like cats',
    mainViewMode: 'hiragana',
    cardType: 'word',
    jlptLevel: 'N5',
    ...overrides,
  };
}

// Note: The Flashcard uses a CSS 3D flip. In jsdom, both front and back
// faces are always present in the DOM (only visually toggled via transforms).
// Tests verify DOM content, not visual visibility.

describe('Flashcard', () => {
  describe('hiragana mode (front face)', () => {
    it('should display the reading as the title in hiragana mode', () => {
      const card = makeCard({ mainViewMode: 'hiragana', reading: 'ねこ' });
      renderWithProviders(<Flashcard card={card} />);
      expect(screen.getByText('ねこ')).toBeInTheDocument();
    });

    it('should show the かな mode label in hiragana mode', () => {
      const card = makeCard({ mainViewMode: 'hiragana' });
      renderWithProviders(<Flashcard card={card} />);
      expect(screen.getByText('かな')).toBeInTheDocument();
    });

    it('should show the kanji word on the back face in hiragana mode', () => {
      const card = makeCard({ mainViewMode: 'hiragana', word: '猫' });
      renderWithProviders(<Flashcard card={card} />);
      // The back always renders word + meaning
      expect(screen.getByText('猫')).toBeInTheDocument();
    });
  });

  describe('kanji mode (front face)', () => {
    it('should display the word as the title in kanji mode', () => {
      const card = makeCard({ mainViewMode: 'kanji', word: '猫' });
      renderWithProviders(<Flashcard card={card} />);
      expect(screen.getAllByText('猫').length).toBeGreaterThanOrEqual(1);
    });

    it('should show the reading as subtitle in kanji mode', () => {
      const card = makeCard({ mainViewMode: 'kanji', word: '猫', reading: 'ねこ' });
      renderWithProviders(<Flashcard card={card} />);
      expect(screen.getByText('ねこ')).toBeInTheDocument();
    });

    it('should show the 漢字 mode label in kanji mode', () => {
      const card = makeCard({ mainViewMode: 'kanji' });
      renderWithProviders(<Flashcard card={card} />);
      expect(screen.getByText('漢字')).toBeInTheDocument();
    });
  });

  describe('back face content', () => {
    it('should always render the meaning (back is always in the DOM)', () => {
      const card = makeCard({ meaning: 'cat' });
      renderWithProviders(<Flashcard card={card} />);
      expect(screen.getByText('cat')).toBeInTheDocument();
    });

    it('should render the example English translation', () => {
      const card = makeCard({ example_en: 'I like cats' });
      renderWithProviders(<Flashcard card={card} />);
      expect(screen.getByText('I like cats')).toBeInTheDocument();
    });

    it('should render the example Japanese via FuriganaText', () => {
      const card = makeCard({ example_jp: '{猫|ねこ}が好きです' });
      renderWithProviders(<Flashcard card={card} />);
      expect(screen.getByTestId('furigana')).toBeInTheDocument();
    });

    it('should show "Answer" label on the back', () => {
      renderWithProviders(<Flashcard card={makeCard()} />);
      expect(screen.getByText('Answer')).toBeInTheDocument();
    });
  });

  describe('JLPT level and XP', () => {
    it('should display the JLPT level when set', () => {
      const card = makeCard({ jlptLevel: 'N5' });
      renderWithProviders(<Flashcard card={card} />);
      expect(screen.getAllByText('JLPT N5').length).toBeGreaterThan(0);
    });

    it('should not show JLPT label when jlptLevel is undefined', () => {
      const card = makeCard({ jlptLevel: undefined });
      renderWithProviders(<Flashcard card={card} />);
      expect(screen.queryByText(/JLPT/)).not.toBeInTheDocument();
    });

    it('should show correct XP for N5 (40 XP)', () => {
      const card = makeCard({ jlptLevel: 'N5' });
      renderWithProviders(<Flashcard card={card} />);
      expect(screen.getAllByText('40').length).toBeGreaterThan(0);
    });

    it('should show correct XP for N1 (120 XP)', () => {
      const card = makeCard({ jlptLevel: 'N1' });
      renderWithProviders(<Flashcard card={card} />);
      expect(screen.getAllByText('120').length).toBeGreaterThan(0);
    });
  });

  describe('flip interaction', () => {
    it('should show the tap hint on front', () => {
      renderWithProviders(<Flashcard card={makeCard()} />);
      expect(screen.getByText('✦ tap to flip ✦')).toBeInTheDocument();
    });

    it('should not throw when clicked', () => {
      renderWithProviders(<Flashcard card={makeCard()} />);
      expect(() => fireEvent.click(screen.getByText('✦ tap to flip ✦'))).not.toThrow();
    });

    it('should show "tap to flip back" hint on the back face', () => {
      renderWithProviders(<Flashcard card={makeCard()} />);
      expect(screen.getByText('tap to flip back')).toBeInTheDocument();
    });
  });

  describe('card without reading', () => {
    it('should fall back to word as title when reading is empty', () => {
      const card = makeCard({ mainViewMode: 'hiragana', reading: '', word: 'hello' });
      renderWithProviders(<Flashcard card={card} />);
      expect(screen.getAllByText('hello').length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('image handling', () => {
    it('should render an img element when imageUrl is provided', () => {
      const card = makeCard({ imageUrl: 'https://example.com/cat.jpg' });
      renderWithProviders(<Flashcard card={card} />);
      const img = document.querySelector('img');
      expect(img).toBeTruthy();
      expect(img?.getAttribute('src')).toBe('https://example.com/cat.jpg');
    });

    it('should not render an img element when imageUrl is absent', () => {
      const card = makeCard({ imageUrl: undefined });
      renderWithProviders(<Flashcard card={card} />);
      expect(document.querySelector('img')).toBeNull();
    });
  });
});
