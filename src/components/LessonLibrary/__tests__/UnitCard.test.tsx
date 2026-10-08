import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type * as LessonPrintableModule from '@/lib/lessonPrintable';
import { renderWithProviders } from '@/test/renderWithProviders';
import type { LessonUnit } from '@/types/lessonUnit';

const mockLoadCards = vi.fn();
vi.mock('@/lib/supabase', () => ({
  loadCards: (...args: unknown[]) => mockLoadCards(...args),
  isConfigured: () => true,
}));

const mockOpenBlankPrintWindow = vi.fn();
const mockWritePrintWindow = vi.fn();
vi.mock('@/lib/lessonPrintable', async () => {
  const actual = await vi.importActual<typeof LessonPrintableModule>('@/lib/lessonPrintable');
  return {
    ...actual,
    openBlankPrintWindow: (...args: unknown[]) => mockOpenBlankPrintWindow(...args),
    writePrintWindow: (...args: unknown[]) => mockWritePrintWindow(...args),
  };
});

import { UnitCard } from '../UnitCard';

function unit(): LessonUnit {
  return {
    id: 'plan1',
    title: 'Unit 1',
    level: 'N5',
    createdAt: '2026-01-01T00:00:00Z',
    weeks: [
      {
        deckId: 'd1',
        deckName: 'Greetings',
        deckEmoji: null,
        week: 1,
        title: 'Week 1',
        note: null,
        dueDate: '2026-09-01',
        availableOn: '2026-08-25',
        requiredAccuracy: null,
        requiredMode: null,
        learnerCount: 0,
        finishedCount: 0,
        wordCount: 0,
        status: 'past',
      },
    ],
  };
}

const NOOP_PROPS = {
  onOpenWeek: vi.fn(),
  onShiftWeek: vi.fn(),
  onRenameUnit: vi.fn(),
  onAddWeek: vi.fn(),
  onCopyUnit: vi.fn(),
};

async function openPrintMenuItem() {
  fireEvent.click(screen.getByRole('button', { name: /Options for/ }));
  fireEvent.click(await screen.findByText('Print unit plan'));
}

describe('UnitCard print unit plan', () => {
  beforeEach(() => {
    mockLoadCards.mockReset();
    mockOpenBlankPrintWindow.mockReset();
    mockWritePrintWindow.mockReset();
  });

  it('shows a popup-blocked warning when the print window is blocked', async () => {
    mockOpenBlankPrintWindow.mockReturnValue(null);
    renderWithProviders(<UnitCard unit={unit()} groupName="Section A" {...NOOP_PROPS} />);

    await openPrintMenuItem();

    await screen.findByText(
      'Your browser blocked the print tab. Allow pop-ups for this site and try again.',
    );
    expect(mockLoadCards).not.toHaveBeenCalled();
  });

  it('writes an error message into the popup when a deck fails to load', async () => {
    const fakeWindow = {};
    mockOpenBlankPrintWindow.mockReturnValue(fakeWindow);
    mockLoadCards.mockRejectedValue(new Error('boom'));
    renderWithProviders(<UnitCard unit={unit()} groupName="Section A" {...NOOP_PROPS} />);

    await openPrintMenuItem();

    await waitFor(() => {
      const lastCall = mockWritePrintWindow.mock.calls.at(-1);
      expect(lastCall?.[1]).toContain("Couldn't load the word lists");
    });
  });

  it('writes the full plan when every deck loads successfully', async () => {
    const fakeWindow = {};
    mockOpenBlankPrintWindow.mockReturnValue(fakeWindow);
    mockLoadCards.mockResolvedValue([{ word: '猫', reading: 'ねこ', meaning: 'cat' }]);
    renderWithProviders(<UnitCard unit={unit()} groupName="Section A" {...NOOP_PROPS} />);

    await openPrintMenuItem();

    await waitFor(() => {
      const lastCall = mockWritePrintWindow.mock.calls.at(-1);
      expect(lastCall?.[1]).toContain('<ruby>');
      expect(lastCall?.[1]).not.toContain("Couldn't load");
    });
  });
});
