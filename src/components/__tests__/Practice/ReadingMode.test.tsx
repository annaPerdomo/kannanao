import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/test/renderWithProviders';
import type { Flashcard } from '@/types/flashcard';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const recordAnswer = vi.fn().mockResolvedValue(undefined);

vi.mock('@/hooks/useProgress', () => ({
  useProgress: () => ({
    startSession: vi.fn().mockResolvedValue('session-1'),
    recordAnswer,
    endSession: vi.fn().mockResolvedValue(undefined),
    progress: null,
    spendableXp: 0,
    newlyUnlocked: [],
    clearNewlyUnlocked: vi.fn(),
  }),
  XP_PER_WRONG: 2,
}));

vi.mock('@/contexts/XpAnimationContext', () => ({
  useXpAnimation: () => ({ pendingXp: [], triggerXpEarned: vi.fn(), dismissXpEvent: vi.fn() }),
}));

vi.mock('@/contexts/BuddyReactionContext', () => ({
  useBuddyReaction: () => ({ reactionEvent: null, triggerReaction: vi.fn() }),
}));

vi.mock('@/components/SpeakButton', () => ({ SpeakButton: () => null }));

import { ReadingMode } from '@/components/Practice/ReadingMode';

// ─── Test data ────────────────────────────────────────────────────────────────

function makeCard(id: string, overrides: Partial<Flashcard> = {}): Flashcard {
  return {
    id,
    deckId: 'deck-1',
    word: '猫',
    reading: 'ねこ',
    meaning: 'cat',
    image_query: '',
    example_jp: '猫が好きです',
    example_en: 'I like cats',
    mainViewMode: 'hiragana',
    cardType: 'word',
    position: 0,
    ...overrides,
  };
}

/** One card keeps the queue deterministic — no shuffle to guess around. */
const ONE_CARD = [makeCard('c1')];

function renderMode(cards: Flashcard[] = ONE_CARD) {
  return renderWithProviders(
    <ReadingMode cards={cards} deckId="deck-1" batchSize={10} onExit={vi.fn()} />,
  );
}

function switchToTyping() {
  fireEvent.click(screen.getByText('Type it instead'));
}

describe('ReadingMode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('shows the kanji prompt and hides the reading until it is answered', async () => {
    renderMode();

    await waitFor(() => expect(screen.getByText('猫')).toBeInTheDocument());
    expect(screen.queryByText('ねこ')).not.toBeInTheDocument();
    expect(screen.queryByText('cat')).not.toBeInTheDocument();
  });

  it('grades an assembled tile answer as correct', async () => {
    renderMode();

    await waitFor(() => expect(screen.getByText('猫')).toBeInTheDocument());
    fireEvent.click(screen.getByLabelText('Add ね'));
    fireEvent.click(screen.getByLabelText('Add こ'));

    await waitFor(() => expect(screen.getByText(/✓ Correct/)).toBeInTheDocument());
    expect(recordAnswer).toHaveBeenCalledWith('session-1', true, undefined, 'c1');
  });

  it('reveals the reading and the meaning after a wrong tile answer', async () => {
    renderMode();

    await waitFor(() => expect(screen.getByText('猫')).toBeInTheDocument());
    // Backwards: the right characters in the wrong order.
    fireEvent.click(screen.getByLabelText('Add こ'));
    fireEvent.click(screen.getByLabelText('Add ね'));

    await waitFor(() => expect(screen.getByText(/it reads ねこ/)).toBeInTheDocument());
    expect(screen.getByText('cat')).toBeInTheDocument();
    expect(recordAnswer).toHaveBeenCalledWith('session-1', false, undefined, 'c1');
  });

  it('accepts typed romaji by converting it to kana as you type', async () => {
    renderMode();

    await waitFor(() => expect(screen.getByText('猫')).toBeInTheDocument());
    switchToTyping();

    const input = await screen.findByRole('textbox');
    fireEvent.change(input, { target: { value: 'neko' } });
    expect((input as HTMLInputElement).value).toBe('ねこ');

    fireEvent.click(screen.getByText('Check'));
    await waitFor(() => expect(screen.getByText(/✓ Correct/)).toBeInTheDocument());
  });

  it('accepts a katakana answer for a hiragana reading', async () => {
    renderMode();

    await waitFor(() => expect(screen.getByText('猫')).toBeInTheDocument());
    switchToTyping();

    fireEvent.change(await screen.findByRole('textbox'), { target: { value: 'ネコ' } });
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' });

    await waitFor(() => expect(screen.getByText(/✓ Correct/)).toBeInTheDocument());
  });

  it('rejects the kanji itself — Reading asks for the reading', async () => {
    renderMode();

    await waitFor(() => expect(screen.getByText('猫')).toBeInTheDocument());
    switchToTyping();

    fireEvent.change(await screen.findByRole('textbox'), { target: { value: '猫' } });
    fireEvent.click(screen.getByText('Check'));

    await waitFor(() => expect(screen.getByText(/it reads ねこ/)).toBeInTheDocument());
  });

  it('grades a long-vowel katakana reading typed as romaji', async () => {
    renderMode([makeCard('c1', { word: '珈琲', reading: 'コーヒー', meaning: 'coffee' })]);

    await waitFor(() => expect(screen.getByText('珈琲')).toBeInTheDocument());
    switchToTyping();

    fireEvent.change(await screen.findByRole('textbox'), { target: { value: 'ko-hi-' } });
    fireEvent.click(screen.getByText('Check'));

    await waitFor(() => expect(screen.getByText(/✓ Correct/)).toBeInTheDocument());
  });

  it('remembers the typed choice for next time', async () => {
    renderMode();

    await waitFor(() => expect(screen.getByText('猫')).toBeInTheDocument());
    switchToTyping();

    expect(localStorage.getItem('kannanao:reading-input')).toBe('typed');
    fireEvent.click(screen.getByText('Use tiles instead'));
    expect(localStorage.getItem('kannanao:reading-input')).toBe('tiles');
  });

  it('opens in the remembered typed mode', async () => {
    localStorage.setItem('kannanao:reading-input', 'typed');
    renderMode();

    expect(await screen.findByRole('textbox')).toBeInTheDocument();
  });

  it('offers a Next button after a wrong answer instead of auto-advancing', async () => {
    renderMode([
      makeCard('c1'),
      makeCard('c2', { word: '山', reading: 'やま', meaning: 'mountain' }),
    ]);

    await waitFor(() => expect(screen.getByRole('progressbar')).toBeInTheDocument());
    switchToTyping();

    fireEvent.change(await screen.findByRole('textbox'), { target: { value: 'ちがう' } });
    fireEvent.click(screen.getByText('Check'));

    await waitFor(() => expect(screen.getByText('Next')).toBeInTheDocument());
  });

  it('takes tiles back with backspace', async () => {
    renderMode();

    await waitFor(() => expect(screen.getByText('猫')).toBeInTheDocument());
    fireEvent.click(screen.getByLabelText('Add こ'));
    fireEvent.click(screen.getByLabelText('Remove the last character'));
    // With the slot cleared, the right order still grades as correct.
    fireEvent.click(screen.getByLabelText('Add ね'));
    fireEvent.click(screen.getByLabelText('Add こ'));

    await waitFor(() => expect(screen.getByText(/✓ Correct/)).toBeInTheDocument());
  });

  it('places tiles from the keyboard', async () => {
    renderMode();

    await waitFor(() => expect(screen.getByText('猫')).toBeInTheDocument());
    fireEvent.keyDown(screen.getByLabelText('Add ね'), { key: 'Enter' });
    fireEvent.keyDown(screen.getByLabelText('Add こ'), { key: ' ' });

    await waitFor(() => expect(screen.getByText(/✓ Correct/)).toBeInTheDocument());
  });

  it('celebrates once the last card is answered', async () => {
    renderMode();

    await waitFor(() => expect(screen.getByText('猫')).toBeInTheDocument());
    fireEvent.click(screen.getByLabelText('Add ね'));
    fireEvent.click(screen.getByLabelText('Add こ'));

    await waitFor(() => expect(screen.getByText('1 / 1 correct')).toBeInTheDocument(), {
      timeout: 3000,
    });
  });

  it('saves the session when the learner quits early', async () => {
    const onExit = vi.fn();
    renderWithProviders(
      <ReadingMode cards={ONE_CARD} deckId="deck-1" batchSize={10} onExit={onExit} />,
    );

    await waitFor(() => expect(screen.getByText('猫')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Quit & Save Progress'));

    await waitFor(() => expect(onExit).toHaveBeenCalled());
  });
});
