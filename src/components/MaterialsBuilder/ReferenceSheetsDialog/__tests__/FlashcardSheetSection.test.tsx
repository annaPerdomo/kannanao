import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/test/renderWithProviders';
import type { LessonPlan } from '@/types/lessonPlan';

vi.mock('@/lib/flashcardsPrintable', () => ({
  buildFlashcardSheetHtml: vi.fn().mockReturnValue('<html></html>'),
}));

vi.mock('@/lib/lessonPrintable', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/lessonPrintable')>('@/lib/lessonPrintable');
  return { ...actual, openPrintWindow: vi.fn() };
});

import { FlashcardSheetSection } from '@/components/MaterialsBuilder/ReferenceSheetsDialog/FlashcardSheetSection';
import { buildFlashcardSheetHtml } from '@/lib/flashcardsPrintable';
import { openPrintWindow } from '@/lib/lessonPrintable';

const PLAN: LessonPlan = {
  decks: [
    {
      name: 'Food words',
      description: '',
      emoji: '🍜',
      mainViewMode: 'kanji',
      cards: [
        {
          word: '寿司',
          reading: 'すし',
          meaning: 'sushi',
          exampleJp: '',
          exampleEn: '',
          jlptLevel: 'N5',
        },
      ],
    },
  ],
};

const EMPTY_PLAN: LessonPlan = { decks: [] };

const PLAN_WITH_IMAGE: LessonPlan = {
  decks: [
    {
      ...PLAN.decks[0],
      cards: [{ ...PLAN.decks[0].cards[0], imageUrl: 'https://example.com/a.png' }],
    },
  ],
};

beforeEach(() => vi.clearAllMocks());

describe('FlashcardSheetSection', () => {
  it('disables the button and shows the empty text for an empty plan', () => {
    renderWithProviders(
      <FlashcardSheetSection plan={EMPTY_PLAN} locale="en" onPopupBlocked={vi.fn()} />,
    );
    expect(screen.getByText(/add some words first/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /print flashcards/i })).toBeDisabled();
  });

  it('passes the plan and both options to the builder, then opens the window', () => {
    vi.mocked(openPrintWindow).mockReturnValue(true);
    const onPopupBlocked = vi.fn();
    renderWithProviders(
      <FlashcardSheetSection plan={PLAN} locale="en" onPopupBlocked={onPopupBlocked} />,
    );

    fireEvent.click(screen.getByRole('button', { name: /print flashcards/i }));

    expect(buildFlashcardSheetHtml).toHaveBeenCalledWith(
      expect.objectContaining({
        plan: PLAN,
        locale: 'en',
        options: { furigana: true, pictures: false },
      }),
    );
    expect(openPrintWindow).toHaveBeenCalled();
    expect(onPopupBlocked).toHaveBeenCalledWith(false);
  });

  it('passes furigana: false when the furigana checkbox is unticked', () => {
    vi.mocked(openPrintWindow).mockReturnValue(true);
    renderWithProviders(<FlashcardSheetSection plan={PLAN} locale="en" onPopupBlocked={vi.fn()} />);

    fireEvent.click(screen.getByRole('checkbox', { name: /furigana/i }));
    fireEvent.click(screen.getByRole('button', { name: /print flashcards/i }));

    expect(buildFlashcardSheetHtml).toHaveBeenCalledWith(
      expect.objectContaining({ options: { furigana: false, pictures: false } }),
    );
  });

  it('reports a blocked popup', () => {
    vi.mocked(openPrintWindow).mockReturnValue(false);
    const onPopupBlocked = vi.fn();
    renderWithProviders(
      <FlashcardSheetSection plan={PLAN} locale="en" onPopupBlocked={onPopupBlocked} />,
    );

    fireEvent.click(screen.getByRole('button', { name: /print flashcards/i }));

    expect(onPopupBlocked).toHaveBeenCalledWith(true);
  });

  it('hides the pictures checkbox when no card has an image', () => {
    renderWithProviders(<FlashcardSheetSection plan={PLAN} locale="en" onPopupBlocked={vi.fn()} />);
    expect(screen.queryByRole('checkbox', { name: /add pictures/i })).toBeNull();
  });

  it('shows the pictures checkbox, checked by default, when a card has an image', () => {
    renderWithProviders(
      <FlashcardSheetSection plan={PLAN_WITH_IMAGE} locale="en" onPopupBlocked={vi.fn()} />,
    );
    expect(screen.getByRole('checkbox', { name: /add pictures/i })).toBeChecked();
  });
});
