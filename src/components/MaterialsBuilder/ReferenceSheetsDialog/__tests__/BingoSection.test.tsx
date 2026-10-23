import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/test/renderWithProviders';
import type { LessonPlan, PlanCard } from '@/types/lessonPlan';

vi.mock('@/lib/bingoPrintable', () => ({
  bingoPool: vi.fn(),
  bingoSize: vi.fn(),
  buildBingoHtml: vi.fn().mockReturnValue('<html></html>'),
}));

vi.mock('@/lib/lessonPrintable', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/lessonPrintable')>('@/lib/lessonPrintable');
  return { ...actual, openPrintWindow: vi.fn() };
});

import { BingoSection } from '@/components/MaterialsBuilder/ReferenceSheetsDialog/BingoSection';
import { bingoPool, bingoSize, buildBingoHtml } from '@/lib/bingoPrintable';
import { openPrintWindow } from '@/lib/lessonPrintable';

function wordCard(i: number): PlanCard {
  return {
    word: `word${i}`,
    reading: `reading${i}`,
    meaning: `meaning${i}`,
    exampleJp: '',
    exampleEn: '',
    jlptLevel: 'N5',
  };
}

const PLAN: LessonPlan = {
  decks: [
    {
      name: 'Food words',
      description: '',
      emoji: '🍜',
      mainViewMode: 'kanji',
      cards: Array.from({ length: 24 }, (_, i) => wordCard(i)),
    },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(bingoPool).mockReturnValue(
    Array.from({ length: 24 }, (_, i) => ({
      front: `word${i}`,
      frontHtml: `word${i}`,
      meaning: `meaning${i}`,
    })),
  );
  vi.mocked(bingoSize).mockReturnValue(5);
});

describe('BingoSection', () => {
  it('shows the grid size and enables the button when there are enough words', () => {
    renderWithProviders(<BingoSection plan={PLAN} locale="en" onPopupBlocked={vi.fn()} />);

    expect(screen.getByText('5 × 5 squares')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /print bingo cards/i })).not.toBeDisabled();
  });

  it('disables the button and shows how many more words are needed when the pool is too small', () => {
    vi.mocked(bingoPool).mockReturnValue([
      { front: 'word0', frontHtml: 'word0', meaning: 'meaning0' },
    ]);
    vi.mocked(bingoSize).mockReturnValue(null);

    renderWithProviders(<BingoSection plan={PLAN} locale="en" onPopupBlocked={vi.fn()} />);

    expect(screen.getByText('Add 8 more words to play bingo.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /print bingo cards/i })).toBeDisabled();
  });

  it('passes the copies field value to the builder', () => {
    vi.mocked(openPrintWindow).mockReturnValue(true);
    renderWithProviders(<BingoSection plan={PLAN} locale="en" onPopupBlocked={vi.fn()} />);

    const copiesField = screen.getByLabelText('Cards');
    fireEvent.change(copiesField, { target: { value: '15' } });
    fireEvent.click(screen.getByRole('button', { name: /print bingo cards/i }));

    expect(buildBingoHtml).toHaveBeenCalledWith(
      expect.objectContaining({ options: { furigana: true, copies: 15 } }),
    );
  });

  it('passes furigana: false when the furigana checkbox is unticked', () => {
    vi.mocked(openPrintWindow).mockReturnValue(true);
    renderWithProviders(<BingoSection plan={PLAN} locale="en" onPopupBlocked={vi.fn()} />);

    fireEvent.click(screen.getByRole('checkbox', { name: /furigana/i }));
    fireEvent.click(screen.getByRole('button', { name: /print bingo cards/i }));

    expect(buildBingoHtml).toHaveBeenCalledWith(
      expect.objectContaining({ options: { furigana: false, copies: 10 } }),
    );
  });

  it('resets an emptied copies field to the default 10 on blur', () => {
    renderWithProviders(<BingoSection plan={PLAN} locale="en" onPopupBlocked={vi.fn()} />);

    const copiesField = screen.getByLabelText('Cards');
    fireEvent.change(copiesField, { target: { value: '' } });
    fireEvent.blur(copiesField);

    expect(copiesField).toHaveValue(10);
  });

  it('clamps a value over 40 to 40, printing and showing the clamped value', () => {
    vi.mocked(openPrintWindow).mockReturnValue(true);
    renderWithProviders(<BingoSection plan={PLAN} locale="en" onPopupBlocked={vi.fn()} />);

    const copiesField = screen.getByLabelText('Cards');
    fireEvent.change(copiesField, { target: { value: '100' } });
    fireEvent.click(screen.getByRole('button', { name: /print bingo cards/i }));

    expect(buildBingoHtml).toHaveBeenCalledWith(
      expect.objectContaining({ options: { furigana: true, copies: 40 } }),
    );
    expect(copiesField).toHaveValue(40);
  });

  it('reports a blocked popup', () => {
    vi.mocked(openPrintWindow).mockReturnValue(false);
    const onPopupBlocked = vi.fn();
    renderWithProviders(<BingoSection plan={PLAN} locale="en" onPopupBlocked={onPopupBlocked} />);

    fireEvent.click(screen.getByRole('button', { name: /print bingo cards/i }));

    expect(onPopupBlocked).toHaveBeenCalledWith(true);
  });
});
