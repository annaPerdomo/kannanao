import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/test/renderWithProviders';
import type { LessonPlan } from '@/types/lessonPlan';

vi.mock('@/lib/kanjiStrokes', async () => {
  const actual = await vi.importActual<typeof import('@/lib/kanjiStrokes')>('@/lib/kanjiStrokes');
  return { ...actual, fetchKanjiStrokes: vi.fn() };
});

vi.mock('@/lib/lessonPrintable', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/lessonPrintable')>('@/lib/lessonPrintable');
  return {
    ...actual,
    openBlankPrintWindow: vi.fn(),
    writePrintWindow: vi.fn(),
  };
});

import { KanjiSheetSection } from '@/components/MaterialsBuilder/ReferenceSheetsDialog/KanjiSheetSection';
import { fetchKanjiStrokes } from '@/lib/kanjiStrokes';
import { openBlankPrintWindow, writePrintWindow } from '@/lib/lessonPrintable';

const PLAN: LessonPlan = {
  decks: [
    {
      name: 'Food words',
      description: 'Ordering at a restaurant',
      emoji: '🍜',
      mainViewMode: 'hiragana',
      cards: [
        {
          word: '食堂',
          reading: 'しょくどう',
          meaning: 'cafeteria',
          exampleJp: '',
          exampleEn: '',
          jlptLevel: 'N5',
        },
      ],
    },
  ],
};

function fakeWindow() {
  return {
    document: { write: vi.fn(), close: vi.fn() },
    close: vi.fn(),
    closed: false,
  } as unknown as Window;
}

function waitForFinalWrite() {
  return waitFor(() =>
    expect(vi.mocked(writePrintWindow).mock.calls.length).toBeGreaterThanOrEqual(2),
  );
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(fetchKanjiStrokes).mockResolvedValue(new Map());
});

describe('KanjiSheetSection', () => {
  it('fetches stroke data for the unique kanji and writes HTML with ruby when both toggles are on', async () => {
    const win = fakeWindow();
    vi.mocked(openBlankPrintWindow).mockReturnValue(win);
    const onPopupBlocked = vi.fn();

    renderWithProviders(
      <KanjiSheetSection plan={PLAN} locale="en" onPopupBlocked={onPopupBlocked} />,
    );
    fireEvent.click(screen.getByRole('button', { name: /kanji writing sheet/i }));

    expect(onPopupBlocked).toHaveBeenCalledWith(false);
    expect(screen.getByRole('button', { name: /getting stroke order/i })).toBeDisabled();

    await waitForFinalWrite();
    expect(fetchKanjiStrokes).toHaveBeenCalledWith(['食', '堂']);
    expect(vi.mocked(writePrintWindow).mock.calls.at(-1)?.[1]).toContain('<ruby>');
  });

  it('does not fetch stroke data when stroke order is unticked', async () => {
    const win = fakeWindow();
    vi.mocked(openBlankPrintWindow).mockReturnValue(win);

    renderWithProviders(<KanjiSheetSection plan={PLAN} locale="en" onPopupBlocked={vi.fn()} />);
    fireEvent.click(screen.getByRole('checkbox', { name: /stroke order/i }));
    fireEvent.click(screen.getByRole('button', { name: /kanji writing sheet/i }));

    await waitForFinalWrite();
    expect(fetchKanjiStrokes).not.toHaveBeenCalled();
  });

  it('reports a blocked popup and never fetches', () => {
    vi.mocked(openBlankPrintWindow).mockReturnValue(null);
    const onPopupBlocked = vi.fn();

    renderWithProviders(
      <KanjiSheetSection plan={PLAN} locale="en" onPopupBlocked={onPopupBlocked} />,
    );
    fireEvent.click(screen.getByRole('button', { name: /kanji writing sheet/i }));

    expect(onPopupBlocked).toHaveBeenCalledWith(true);
    expect(fetchKanjiStrokes).not.toHaveBeenCalled();
  });

  it('closes the window and shows an error alert when writePrintWindow throws', async () => {
    const win = fakeWindow();
    vi.mocked(openBlankPrintWindow).mockReturnValue(win);
    vi.mocked(writePrintWindow).mockImplementation(() => {
      throw new Error('boom');
    });

    renderWithProviders(<KanjiSheetSection plan={PLAN} locale="en" onPopupBlocked={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /kanji writing sheet/i }));

    expect(await screen.findByText(/kanji sheet could not be made/i)).toBeInTheDocument();
    expect(win.close).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /kanji writing sheet/i })).not.toBeDisabled();
  });
});
