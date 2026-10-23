import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { _resetApiCache } from '@/lib/apiCache';
import { renderWithProviders } from '@/test/renderWithProviders';
import type { LessonPlan } from '@/types/lessonPlan';

vi.mock('@/lib/supabase', () => ({
  sb: { auth: { getSession: () => Promise.resolve({ data: { session: null } }) } },
  isConfigured: () => true,
}));

import { ReferenceSheetsDialog } from '@/components/MaterialsBuilder/ReferenceSheetsDialog';

const PLAN: LessonPlan = {
  decks: [
    {
      name: 'Food words',
      description: 'Ordering at a restaurant',
      emoji: '🍜',
      mainViewMode: 'hiragana',
      cards: [
        {
          word: '寿司',
          reading: 'すし',
          meaning: 'sushi',
          exampleJp: '寿司をたべます',
          exampleEn: 'I eat sushi',
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
  } as unknown as Window & { document: { write: ReturnType<typeof vi.fn> }; close: () => void };
}

function setup(coverage: unknown, ok = true) {
  const win = fakeWindow();
  const openSpy = vi.spyOn(window, 'open').mockReturnValue(win);
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok,
      status: ok ? 200 : 403,
      statusText: ok ? 'OK' : 'Forbidden',
      body: null,
      text: () => Promise.resolve(ok ? '' : 'Forbidden'),
      json: () => Promise.resolve(coverage),
    }),
  );
  renderWithProviders(<ReferenceSheetsDialog open onClose={() => {}} plan={PLAN} groupId="g1" />);
  return { win, openSpy };
}

beforeEach(() => _resetApiCache());
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('ReferenceSheetsDialog', () => {
  it('claims the print tab before awaiting coverage, so a pop-up blocker never fires', async () => {
    const { win, openSpy } = setup({ learnerCount: 3, knownByKana: { あ: 2 } });

    fireEvent.click(screen.getByRole('button', { name: /group progress chart/i }));

    // The tab must already be open at this point: the fetch has not resolved.
    expect(openSpy).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(win.document.write).toHaveBeenCalled());
    expect(win.document.write.mock.calls[0][0]).toContain('Kana your group can read');
  });

  it('closes the claimed tab and says so when the group has no learners', async () => {
    const { win } = setup({ learnerCount: 0, knownByKana: {} });

    fireEvent.click(screen.getByRole('button', { name: /group progress chart/i }));

    expect(await screen.findByText(/no learners in this group yet/i)).toBeInTheDocument();
    expect(win.document.write).not.toHaveBeenCalled();
    expect(win.close).toHaveBeenCalled();
  });

  it('shows the permission error, not a generic one, when the group is not the requester’s', async () => {
    const { win } = setup(null, false);

    fireEvent.click(screen.getByRole('button', { name: /group progress chart/i }));

    expect(await screen.findByText(/please sign in again/i)).toBeInTheDocument();
    expect(win.close).toHaveBeenCalled();
  });

  it('warns when the browser blocks the print tab outright', async () => {
    vi.spyOn(window, 'open').mockReturnValue(null);
    renderWithProviders(<ReferenceSheetsDialog open onClose={() => {}} plan={PLAN} groupId="g1" />);

    fireEvent.click(screen.getByRole('button', { name: /^kana chart$/i }));

    expect(await screen.findByText(/blocked the print tab/i)).toBeInTheDocument();
  });
});
