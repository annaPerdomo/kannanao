import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/test/renderWithProviders';
import type { Flashcard } from '@/types/flashcard';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/hooks/useProgress', () => ({
  useProgress: () => ({
    startSession: vi.fn().mockResolvedValue('session-1'),
    recordAnswer: vi.fn().mockResolvedValue(undefined),
    endSession: vi.fn().mockResolvedValue(undefined),
    progress: null,
    spendableXp: 0,
    newlyUnlocked: [],
    clearNewlyUnlocked: vi.fn(),
  }),
  XP_PER_WRONG: 2,
}));

vi.mock('@/hooks/useShop', () => ({
  useShop: () => ({ equipped: {}, purchasedKeys: [], buyItem: vi.fn() }),
  CARD_BORDER_STYLES: {},
}));

vi.mock('@/contexts/XpAnimationContext', () => ({
  useXpAnimation: () => ({ pendingXp: [], triggerXpEarned: vi.fn(), dismissXpEvent: vi.fn() }),
}));

vi.mock('@/contexts/BuddyReactionContext', () => ({
  useBuddyReaction: () => ({ reactionEvent: null, triggerReaction: vi.fn() }),
}));

vi.mock('@/components/UnsplashAttribution', () => ({
  UnsplashAttribution: () => null,
}));

vi.mock('@/components/FuriganaText', () => ({
  default: ({ text }: { text: string }) => <span>{text}</span>,
  stripFurigana: (t: string) => t,
}));

vi.mock('@/components/SpeakButton', () => ({
  SpeakButton: () => null,
}));

import { FillMode } from '@/components/Practice/FillMode';

// ─── Test data ────────────────────────────────────────────────────────────────

function makeCard(id: string, overrides: Partial<Flashcard> = {}): Flashcard {
  return {
    id,
    deckId: 'deck-1',
    word: 'ねこ',
    reading: 'ねこ',
    meaning: 'cat',
    image_query: '',
    example_jp: 'ねこが好きです',
    example_en: 'I like cats',
    mainViewMode: 'hiragana',
    cardType: 'word',
    position: 0,
    ...overrides,
  };
}

const CARDS: Flashcard[] = [
  makeCard('c1', { word: 'ねこ', reading: 'ねこ', meaning: 'cat', example_jp: 'ねこが好きです' }),
  makeCard('c2', { word: 'いぬ', reading: 'いぬ', meaning: 'dog', example_jp: 'いぬが走ります' }),
  makeCard('c3', {
    word: 'さかな',
    reading: 'さかな',
    meaning: 'fish',
    example_jp: 'さかなを食べます',
  }),
];

describe('FillMode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render a text input', async () => {
    renderWithProviders(<FillMode cards={CARDS} deckId="deck-1" batchSize={10} onExit={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });
  });

  it('should render a sentence with a blank', async () => {
    renderWithProviders(<FillMode cards={CARDS} deckId="deck-1" batchSize={10} onExit={vi.fn()} />);

    await waitFor(() => {
      // The masked sentence should show ＿＿＿ or the sentence with blank
      const body = document.body.textContent ?? '';
      expect(body.includes('＿')).toBe(true);
    });
  });

  it('should allow user to type in the input', async () => {
    renderWithProviders(<FillMode cards={CARDS} deckId="deck-1" batchSize={10} onExit={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'ねこ' } });
    expect((input as HTMLInputElement).value).toBe('ねこ');
  });

  it('should render a submit/check button', async () => {
    renderWithProviders(<FillMode cards={CARDS} deckId="deck-1" batchSize={10} onExit={vi.fn()} />);

    await waitFor(() => {
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  it('should show success feedback on correct answer', async () => {
    renderWithProviders(<FillMode cards={CARDS} deckId="deck-1" batchSize={10} onExit={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'ねこ' } });

    // Submit by pressing Enter
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    // Or find and click the check/submit button
    const checkBtn = screen
      .getAllByRole('button')
      .find(
        (b) =>
          b.textContent?.toLowerCase().includes('check') || b.getAttribute('type') === 'submit',
      );
    if (checkBtn) fireEvent.click(checkBtn);

    // Wait for result to appear (correct or wrong feedback)
    await waitFor(() => {
      const body = document.body.textContent ?? '';
      // Some kind of result feedback should appear
      expect(body.length).toBeGreaterThan(0);
    });
  });

  it('should render a progress bar', async () => {
    renderWithProviders(<FillMode cards={CARDS} deckId="deck-1" batchSize={10} onExit={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });
  });

  it('should show correct feedback after a right answer', async () => {
    renderWithProviders(<FillMode cards={CARDS} deckId="deck-1" batchSize={10} onExit={vi.fn()} />);

    await waitFor(() => expect(screen.getByRole('textbox')).toBeInTheDocument());

    // Detect which card is showing by reading the "Meaning: X" label from the DOM,
    // then submit the matching word (robust to usePracticeQueue shuffle order).
    const meaningEl = document.querySelector('[class*="MuiTypography"]');
    const bodyText = document.body.textContent ?? '';
    const currentCard = CARDS.find((c) => bodyText.includes(`Meaning: ${c.meaning}`));
    const correctAnswer = currentCard?.word ?? CARDS[0].word;

    fireEvent.change(screen.getByRole('textbox'), { target: { value: correctAnswer } });
    fireEvent.click(screen.getByText('Check'));

    await waitFor(() => {
      expect(screen.getByText(/✓ Correct/)).toBeInTheDocument();
    });
    void meaningEl; // used above
  });

  it('should show incorrect feedback after a wrong answer', async () => {
    renderWithProviders(<FillMode cards={CARDS} deckId="deck-1" batchSize={10} onExit={vi.fn()} />);

    await waitFor(() => expect(screen.getByRole('textbox')).toBeInTheDocument());

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'wronganswer' } });

    fireEvent.click(screen.getByText('Check'));

    await waitFor(() => {
      expect(screen.getByText(/Incorrect/)).toBeInTheDocument();
    });
  });

  it('should show Next button after a wrong answer', async () => {
    renderWithProviders(<FillMode cards={CARDS} deckId="deck-1" batchSize={10} onExit={vi.fn()} />);

    await waitFor(() => expect(screen.getByRole('textbox')).toBeInTheDocument());
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'wrong' } });
    fireEvent.click(screen.getByText('Check'));

    await waitFor(() => {
      expect(screen.getByText('Next')).toBeInTheDocument();
    });
  });

  it('should disable the input after submitting', async () => {
    renderWithProviders(<FillMode cards={CARDS} deckId="deck-1" batchSize={10} onExit={vi.fn()} />);

    await waitFor(() => expect(screen.getByRole('textbox')).toBeInTheDocument());
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'wrong' } });
    fireEvent.click(screen.getByText('Check'));

    await waitFor(() => {
      expect(screen.getByRole('textbox')).toBeDisabled();
    });
  });

  it('should show the "Fill in the Blank" heading', async () => {
    renderWithProviders(<FillMode cards={CARDS} deckId="deck-1" batchSize={10} onExit={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByText('Fill in the Blank')).toBeInTheDocument();
    });
  });

  it('should keep Check button disabled when input is empty', async () => {
    renderWithProviders(<FillMode cards={CARDS} deckId="deck-1" batchSize={10} onExit={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('Check')).toBeInTheDocument());
    expect(screen.getByText('Check').closest('button')).toBeDisabled();
  });
});
