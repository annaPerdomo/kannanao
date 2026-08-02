import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ReviewCardsDialog } from '@/components/ReviewCardsDialog';
import type { PendingCard } from '@/components/ReviewCardsDialog/CardRow';
import { renderWithProviders } from '@/test/renderWithProviders';

vi.mock('@/services/api', () => ({
  fetchImage: vi.fn().mockResolvedValue(null),
  uploadImage: vi.fn(),
  deleteStorageImage: vi.fn(),
  isStorageImage: vi.fn(() => false),
  encodeUnsplashUrl: vi.fn((r) => r.url),
  triggerUnsplashDownload: vi.fn(),
  formatFurigana: vi.fn(),
}));

function card(word: string, meaning = 'x', mainViewMode = 'kanji'): PendingCard {
  return {
    word,
    reading: '',
    romaji: '',
    meaning,
    image_query: '',
    example_jp: `${word}の例`,
    example_en: 'example',
    mainViewMode,
    cardType: 'word',
  } as PendingCard;
}

const CARDS = [card('月曜日'), card('1月'), card('2月')];

type RegenerateFn = (words: string[], instruction: string) => Promise<PendingCard[]>;

function setup(onRegenerate?: RegenerateFn) {
  const onConfirm = vi.fn();
  renderWithProviders(
    <ReviewCardsDialog
      open
      cards={CARDS}
      onConfirm={onConfirm}
      onClose={vi.fn()}
      onRegenerate={onRegenerate}
    />,
  );
  return { onConfirm };
}

function selectCard(word: string) {
  fireEvent.click(screen.getByLabelText(`Select ${word} to redo`));
}

beforeEach(() => vi.clearAllMocks());

describe('ReviewCardsDialog regeneration', () => {
  it('should hide the selection UI when no regenerate handler is given', () => {
    setup(undefined);
    expect(screen.queryByLabelText(/to redo$/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Redo/ })).not.toBeInTheDocument();
  });

  it('should keep the redo button disabled until cards and an instruction are given', () => {
    setup(vi.fn());
    const button = screen.getByRole('button', { name: /^Redo/ });
    expect(button).toBeDisabled();

    selectCard('1月');
    expect(button).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText(/What should change/), {
      target: { value: 'use kanji numbers' },
    });
    expect(button).toBeEnabled();
  });

  it('should send only the selected words plus the instruction', async () => {
    const onRegenerate = vi.fn().mockResolvedValue([card('一月'), card('二月')]);
    setup(onRegenerate);

    selectCard('1月');
    selectCard('2月');
    fireEvent.change(screen.getByPlaceholderText(/What should change/), {
      target: { value: 'use kanji numbers' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^Redo/ }));

    await waitFor(() =>
      expect(onRegenerate).toHaveBeenCalledWith(['1月', '2月'], 'use kanji numbers'),
    );
  });

  it('should replace only the selected rows and leave the confirmed one alone', async () => {
    const onRegenerate = vi.fn().mockResolvedValue([card('一月'), card('二月')]);
    const { onConfirm } = setup(onRegenerate);

    selectCard('1月');
    selectCard('2月');
    fireEvent.change(screen.getByPlaceholderText(/What should change/), {
      target: { value: 'kanji' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^Redo/ }));

    await waitFor(() => expect(screen.getByText('一月')).toBeInTheDocument());
    expect(screen.getByText('二月')).toBeInTheDocument();
    // The row that was never selected must survive untouched.
    expect(screen.getByText('月曜日')).toBeInTheDocument();
    expect(screen.queryByText('1月')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Add 3 Cards to Deck/ }));
    expect(onConfirm.mock.calls[0][0].map((c: PendingCard) => c.word)).toEqual([
      '月曜日',
      '一月',
      '二月',
    ]);
  });

  it('should surface a failure without dropping any cards', async () => {
    const onRegenerate = vi.fn().mockRejectedValue(new Error('Rate limited'));
    setup(onRegenerate);

    selectCard('1月');
    fireEvent.change(screen.getByPlaceholderText(/What should change/), {
      target: { value: 'kanji' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^Redo/ }));

    await waitFor(() => expect(screen.getByText('Rate limited')).toBeInTheDocument());
    expect(screen.getByText('1月')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add 3 Cards to Deck/ })).toBeEnabled();
  });

  it('should report a short response and keep the unanswered rows', async () => {
    const onRegenerate = vi.fn().mockResolvedValue([card('一月')]);
    setup(onRegenerate);

    selectCard('1月');
    selectCard('2月');
    fireEvent.change(screen.getByPlaceholderText(/What should change/), {
      target: { value: 'kanji' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^Redo/ }));

    await waitFor(() =>
      expect(screen.getByText(/Only 1 of 2 cards came back/)).toBeInTheDocument(),
    );
    expect(screen.getByText('一月')).toBeInTheDocument();
    expect(screen.getByText('2月')).toBeInTheDocument();
  });

  it('should select and clear every card from the bar', () => {
    setup(vi.fn());
    fireEvent.click(screen.getByRole('button', { name: 'Select all' }));
    expect(screen.getByText('3 cards selected')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(screen.getByText('Tick any cards to redo')).toBeInTheDocument();
  });

  it('should keep the row view mode a replacement card did not ask about', async () => {
    const onRegenerate = vi.fn().mockResolvedValue([card('一月', 'x', 'hiragana')]);
    const { onConfirm } = setup(onRegenerate);

    selectCard('1月');
    fireEvent.change(screen.getByPlaceholderText(/What should change/), {
      target: { value: 'kanji' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^Redo/ }));

    await waitFor(() => expect(screen.getByText('一月')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /Add 3 Cards to Deck/ }));

    expect(onConfirm.mock.calls[0][0].map((c: PendingCard) => c.mainViewMode)).toEqual([
      'kanji',
      'kanji',
      'kanji',
    ]);
  });

  it('should keep selection pointing at the right cards after a delete', async () => {
    const onRegenerate = vi.fn().mockResolvedValue([card('二月')]);
    setup(onRegenerate);

    // Select the last row, then delete a row above it — indices shift by one.
    selectCard('2月');
    fireEvent.click(screen.getAllByLabelText('Remove card')[0]);
    expect(screen.queryByText('月曜日')).not.toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText(/What should change/), {
      target: { value: 'kanji' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^Redo/ }));

    await waitFor(() => expect(onRegenerate).toHaveBeenCalledWith(['2月'], 'kanji'));
  });
});
