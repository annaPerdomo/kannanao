import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/test/renderWithProviders';
import type { LessonPlan } from '@/types/lessonPlan';

vi.mock('@/lib/worksheetPrintable', () => ({
  buildWorksheetHtml: vi.fn().mockReturnValue('<html></html>'),
  hasWorksheetContent: vi.fn().mockReturnValue(true),
}));

vi.mock('@/lib/lessonPrintable', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/lessonPrintable')>('@/lib/lessonPrintable');
  return { ...actual, openPrintWindow: vi.fn() };
});

import { WorksheetSection } from '@/components/MaterialsBuilder/ReferenceSheetsDialog/WorksheetSection';
import { openPrintWindow } from '@/lib/lessonPrintable';
import { buildWorksheetHtml, hasWorksheetContent } from '@/lib/worksheetPrintable';

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

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(hasWorksheetContent).mockReturnValue(true);
});

describe('WorksheetSection', () => {
  it('disables the button and shows the empty text when there is no content', () => {
    vi.mocked(hasWorksheetContent).mockReturnValue(false);
    renderWithProviders(<WorksheetSection plan={PLAN} locale="en" onPopupBlocked={vi.fn()} />);
    expect(screen.getByText(/add at least 3 words/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /print worksheet/i })).toBeDisabled();
  });

  it('passes the plan and both options to the builder, then opens the window', () => {
    vi.mocked(openPrintWindow).mockReturnValue(true);
    const onPopupBlocked = vi.fn();
    renderWithProviders(
      <WorksheetSection plan={PLAN} locale="en" onPopupBlocked={onPopupBlocked} />,
    );

    fireEvent.click(screen.getByRole('button', { name: /print worksheet/i }));

    expect(buildWorksheetHtml).toHaveBeenCalledWith(
      expect.objectContaining({
        plan: PLAN,
        locale: 'en',
        options: { furigana: true, answerKey: true },
      }),
    );
    expect(openPrintWindow).toHaveBeenCalled();
    expect(onPopupBlocked).toHaveBeenCalledWith(false);
  });

  it('passes furigana: false when the furigana checkbox is unticked', () => {
    vi.mocked(openPrintWindow).mockReturnValue(true);
    renderWithProviders(<WorksheetSection plan={PLAN} locale="en" onPopupBlocked={vi.fn()} />);

    fireEvent.click(screen.getByRole('checkbox', { name: /furigana/i }));
    fireEvent.click(screen.getByRole('button', { name: /print worksheet/i }));

    expect(buildWorksheetHtml).toHaveBeenCalledWith(
      expect.objectContaining({ options: { furigana: false, answerKey: true } }),
    );
  });

  it('passes answerKey: false when the answer key checkbox is unticked', () => {
    vi.mocked(openPrintWindow).mockReturnValue(true);
    renderWithProviders(<WorksheetSection plan={PLAN} locale="en" onPopupBlocked={vi.fn()} />);

    fireEvent.click(screen.getByRole('checkbox', { name: /answer key/i }));
    fireEvent.click(screen.getByRole('button', { name: /print worksheet/i }));

    expect(buildWorksheetHtml).toHaveBeenCalledWith(
      expect.objectContaining({ options: { furigana: true, answerKey: false } }),
    );
  });

  it('reports a blocked popup', () => {
    vi.mocked(openPrintWindow).mockReturnValue(false);
    const onPopupBlocked = vi.fn();
    renderWithProviders(
      <WorksheetSection plan={PLAN} locale="en" onPopupBlocked={onPopupBlocked} />,
    );

    fireEvent.click(screen.getByRole('button', { name: /print worksheet/i }));

    expect(onPopupBlocked).toHaveBeenCalledWith(true);
  });
});
