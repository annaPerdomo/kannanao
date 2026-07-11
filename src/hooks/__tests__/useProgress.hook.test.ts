import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { cardXp } from '@/lib/flashcardUtils';

import { useProgress, type UserProgress } from '../useProgress';

// Regression tests for two session-tracking bugs:
// 1. `startSession` identity changing whenever progress state changed — mount
//    effects in Study/Practice/Ohanashikai depend on it, so every recorded
//    answer re-fired the effect and inserted a duplicate study_sessions row.
// 2. Rapid consecutive `recordAnswer` calls both computing from the same stale
//    progress snapshot, losing XP and card counts.

const { updates, sbMock, upsertCardProgressMock } = vi.hoisted(() => {
  const updates: Array<{ table: string; payload: Record<string, unknown> }> = [];
  const upsertCardProgressMock = vi.fn(async () => undefined);

  function chain(result: unknown) {
    const c: Record<string, unknown> = {};
    const self = () => c;
    for (const m of [
      'select',
      'eq',
      'gte',
      'order',
      'limit',
      'insert',
      'upsert',
      'maybeSingle',
      'single',
      'is',
      'in',
    ]) {
      c[m] = vi.fn(self);
    }
    c.then = (resolve: (v: unknown) => void) => resolve(result);
    return c;
  }

  const sbMock = {
    auth: {
      getUser: vi.fn(async () => ({ data: { user: { id: 'u1' } } })),
      getSession: vi.fn(async () => ({ data: { session: null } })),
    },
    rpc: vi.fn(async () => ({ data: null, error: null })),
    from: vi.fn((table: string) => {
      const c = chain({
        data: table === 'study_sessions' ? { id: 's1' } : null,
        error: null,
      });
      c.update = vi.fn((payload: Record<string, unknown>) => {
        updates.push({ table, payload });
        return c;
      });
      return c;
    }),
  };

  return { updates, sbMock, upsertCardProgressMock };
});

vi.mock('@/lib/supabase', () => ({
  sb: sbMock,
  isConfigured: vi.fn(() => true),
  upsertCardProgress: upsertCardProgressMock,
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1' } }) }));
vi.mock('@/lib/apiCache', () => ({ invalidateApiCache: vi.fn() }));

function localToday(): string {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');
}

function seededProgress(): UserProgress {
  return {
    id: 'p1',
    total_xp: 100,
    total_xp_spent: 0,
    level: 1,
    streak_days: 1,
    longest_streak: 1,
    last_study_date: localToday(),
    total_cards_studied: 5,
    total_correct: 5,
    total_sessions: 1,
    last_chest_date: null,
  };
}

function renderProgress() {
  return renderHook(() =>
    useProgress({ progress: seededProgress(), achievements: [], recentSessions: [] }),
  );
}

describe('useProgress session tracking', () => {
  beforeEach(() => {
    updates.length = 0;
    upsertCardProgressMock.mockClear();
  });

  it('keeps startSession identity stable across recorded answers', async () => {
    const { result } = renderProgress();
    const initialStartSession = result.current.startSession;

    await act(async () => {
      await result.current.recordAnswer('s1', true);
    });

    expect(result.current.progress?.total_xp).toBe(100 + cardXp(undefined));
    expect(result.current.startSession).toBe(initialStartSession);
  });

  it('accumulates two rapid answers instead of losing one', async () => {
    const { result } = renderProgress();
    const xp = cardXp(undefined);

    await act(async () => {
      // Fire both before either resolves — the second must build on the first.
      const first = result.current.recordAnswer('s1', true);
      const second = result.current.recordAnswer('s1', true);
      await Promise.all([first, second]);
    });

    expect(result.current.progress?.total_xp).toBe(100 + 2 * xp);
    expect(result.current.progress?.total_cards_studied).toBe(7);

    const progressWrites = updates.filter((u) => u.table === 'user_progress');
    expect(progressWrites.at(-1)?.payload.total_xp).toBe(100 + 2 * xp);
    expect(progressWrites.at(-1)?.payload.total_cards_studied).toBe(7);
  });

  it('records per-card progress when a cardId is passed', async () => {
    const { result } = renderProgress();

    await act(async () => {
      await result.current.recordAnswer('s1', false, 'N5', 'card-42');
    });

    expect(upsertCardProgressMock).toHaveBeenCalledWith('card-42', false);
  });

  it('skips per-card progress for sentence-based answers (no cardId)', async () => {
    const { result } = renderProgress();

    await act(async () => {
      await result.current.recordAnswer('s1', true);
    });

    expect(upsertCardProgressMock).not.toHaveBeenCalled();
  });

  it('openDailyChest awards the flat chest XP and stamps today locally', async () => {
    const { result } = renderProgress();

    let ok = false;
    await act(async () => {
      ok = await result.current.openDailyChest();
    });

    expect(ok).toBe(true);
    expect(result.current.progress?.total_xp).toBe(200); // 100 seeded + 100 chest
    expect(result.current.progress?.last_chest_date).toBe(localToday());
    const write = updates.filter((u) => u.table === 'user_progress').at(-1);
    expect(write?.payload.last_chest_date).toBe(localToday());
    expect(write?.payload.total_xp).toBe(200);
  });

  it('increments total_sessions from the latest progress in startSession', async () => {
    const { result } = renderProgress();

    let sessionId = '';
    await act(async () => {
      sessionId = await result.current.startSession('deck1', 'study');
    });

    expect(sessionId).toBe('s1');
    expect(result.current.progress?.total_sessions).toBe(2);
    const sessionWrites = updates.filter((u) => u.table === 'user_progress');
    expect(sessionWrites.at(-1)?.payload.total_sessions).toBe(2);
  });
});
