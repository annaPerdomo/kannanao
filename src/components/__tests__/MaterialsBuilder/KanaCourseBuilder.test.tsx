import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Group } from '@/hooks/useGroups';
import { renderWithProviders } from '@/test/renderWithProviders';

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

vi.mock('@/lib/supabase', () => ({
  sb: { auth: { getSession: async () => ({ data: { session: null } }) } },
  isConfigured: () => true,
}));

const fetchJsonCached = vi.fn();
vi.mock('@/lib/apiCache', () => ({
  fetchJsonCached: (...args: unknown[]) => fetchJsonCached(...args),
  invalidateApiCache: vi.fn(),
}));

vi.mock('@/components/Loading', () => ({ Loading: () => <div>loading</div> }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

import { KanaCourseBuilder } from '@/components/MaterialsBuilder/KanaCourseBuilder';

const GROUP = {
  id: 'g1',
  organizer_id: 'org1',
  name: 'Japanese 1',
  emoji: null,
  pinned: false,
  show_leaderboard: true,
  created_at: '2026-01-01',
  memberCount: 3,
  activeCount: 0,
  cardsStudied: 0,
  weeklyXp: 0,
  faces: [],
} satisfies Group;

function jsonResponse(body: unknown, ok = true) {
  return { ok, json: async () => body } as Response;
}

function renderBuilder() {
  renderWithProviders(<KanaCourseBuilder groups={[GROUP]} groupId="g1" onGroupChange={vi.fn()} />);
}

let sourceData: unknown = { needs: [], deckCount: 0 };

beforeEach(() => {
  vi.clearAllMocks();
  sourceData = { needs: [], deckCount: 0 };
  fetchJsonCached.mockImplementation(async (url: string) =>
    String(url).includes('/kana-course/source')
      ? sourceData
      : { learnerCount: 3, startedCount: 3, knownByKana: {} },
  );
  fetchMock.mockResolvedValue(jsonResponse({ assigned: [], failed: [], memberCount: 3 }));
});

describe('KanaCourseBuilder', () => {
  it('offers the whole chart when the group has no lessons to read sounds from', async () => {
    renderBuilder();
    await screen.findByText('The whole chart');
    await waitFor(() =>
      expect(screen.getByText('Your group has no lessons handed out yet.')).toBeInTheDocument(),
    );
  });

  it('plans the weeks the educator asked for and lets a week be switched off', async () => {
    renderBuilder();
    fireEvent.click(await screen.findByText('The whole chart'));
    fireEvent.click(screen.getByRole('button', { name: 'Plan the course' }));

    // 4 weeks x 3 rows, the defaults.
    await screen.findByText('4 weeks, 12 rows');
    expect(screen.getByText('Week 1')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('switch', { name: 'Include week 1' }));
    await screen.findByText('3 weeks, 9 rows');
    expect(screen.getByText('Skipped')).toBeInTheDocument();
    expect(screen.getAllByText(/^Week [123]$/)).toHaveLength(3);
  });

  it('hands out only the rows still ticked', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ assigned: ['hira-ka'], failed: [], memberCount: 3 }),
    );
    renderBuilder();
    fireEvent.click(await screen.findByText('The whole chart'));
    fireEvent.click(screen.getByRole('button', { name: 'Plan the course' }));
    await screen.findByText('4 weeks, 12 rows');

    fireEvent.click(screen.getByRole('checkbox', { name: 'あ · い · う · え · お' }));
    await screen.findByText('4 weeks, 11 rows');

    fireEvent.click(screen.getByRole('button', { name: 'Hand out the course' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    const body = JSON.parse(String(fetchMock.mock.calls[0][1].body));
    const rows = body.weeks.flatMap((w: { setIds: string[] }) => w.setIds);
    expect(rows).not.toContain('hira-a');
    expect(rows).toHaveLength(11);
  });
  it('renumbers the switch labels with the weeks, so a name still points at its card', async () => {
    renderBuilder();
    fireEvent.click(await screen.findByText('The whole chart'));
    fireEvent.click(screen.getByRole('button', { name: 'Plan the course' }));
    await screen.findByText('4 weeks, 12 rows');

    fireEvent.click(screen.getByRole('switch', { name: 'Include week 1' }));
    await screen.findByText('3 weeks, 9 rows');
    // The card now titled "Week 1" is the one the label names.
    expect(screen.getAllByRole('switch', { name: 'Include week 1' })).toHaveLength(1);
  });

  it('says nothing landed rather than celebrating an empty hand-out', async () => {
    renderBuilder();
    fireEvent.click(await screen.findByText('The whole chart'));
    fireEvent.click(screen.getByRole('button', { name: 'Plan the course' }));
    await screen.findByText('4 weeks, 12 rows');

    fireEvent.click(screen.getByRole('button', { name: 'Hand out the course' }));
    await screen.findByText('Nothing was handed out. Please try again.');
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});
