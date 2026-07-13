import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { rpcMock, fromMock, subsSelect, progressUpdate, setCandidates, setSubs } = vi.hoisted(() => {
  let candidates: unknown[] = [];
  let subs: unknown[] = [];

  const subsSelect = { in: vi.fn(() => Promise.resolve({ data: subs, error: null })) };
  const progressUpdate = { in: vi.fn(() => Promise.resolve({ error: null })) };

  const fromMock = vi.fn((table: string) => {
    if (table === 'push_subscriptions') return { select: vi.fn(() => subsSelect) };
    if (table === 'user_progress') return { update: vi.fn(() => progressUpdate) };
    throw new Error(`unexpected table ${table}`);
  });

  return {
    // Annotated, not inferred: a test overrides this with an error result, which
    // an inferred `error: null` would reject.
    rpcMock: vi.fn(
      (): Promise<{ data: unknown[] | null; error: { message: string } | null }> =>
        Promise.resolve({ data: candidates, error: null }),
    ),
    fromMock,
    subsSelect,
    progressUpdate,
    setCandidates: (rows: unknown[]) => {
      candidates = rows;
    },
    setSubs: (rows: unknown[]) => {
      subs = rows;
    },
  };
});

vi.mock('@/app/api/group/_lib/serviceSupabase', () => ({
  getServiceSupabase: () => ({ rpc: rpcMock, from: fromMock }),
}));

const { sendPushToSubscriptions } = vi.hoisted(() => ({
  sendPushToSubscriptions: vi.fn((_devices: unknown[], _payload: unknown) =>
    Promise.resolve({ sent: 1, failed: 0, pruned: 0 }),
  ),
}));

vi.mock('@/app/api/_lib/sendPushNotification', () => ({ sendPushToSubscriptions }));

import { GET } from '../route';

const SECRET = 'test-cron-secret';

/** A candidate row exactly as review_reminder_candidates() returns it. */
function row(overrides: Record<string, unknown> = {}) {
  return {
    user_id: 'user-1',
    due_count: 5,
    reminders_enabled: true,
    last_study_date: '2026-07-11',
    last_reminder_date: null,
    streak_days: 0,
    ...overrides,
  };
}

function request(authorization?: string) {
  return new NextRequest('https://kannanao.app/api/cron/review-reminders', {
    headers: authorization ? { authorization } : {},
  });
}

describe('GET /api/cron/review-reminders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = SECRET;
    setCandidates([]);
    setSubs([]);
    // The route reads "today" from the clock; pin it so the fixtures above
    // ("studied yesterday") stay meaningful. 23:00 UTC is when the cron fires —
    // 4pm in America/Los_Angeles, still the 12th there, which is the point.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-07-12T23:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('authorization', () => {
    it('rejects a request with no authorization header', async () => {
      const res = await GET(request());
      expect(res.status).toBe(401);
      expect(rpcMock).not.toHaveBeenCalled();
    });

    it('rejects a wrong secret', async () => {
      const res = await GET(request('Bearer not-the-secret'));
      expect(res.status).toBe(401);
      expect(rpcMock).not.toHaveBeenCalled();
    });

    it('rejects a secret of a different length', async () => {
      const res = await GET(request('Bearer short'));
      expect(res.status).toBe(401);
    });

    it('fails closed when CRON_SECRET is not configured', async () => {
      delete process.env.CRON_SECRET;
      const res = await GET(request(`Bearer ${SECRET}`));
      expect(res.status).toBe(401);
      expect(rpcMock).not.toHaveBeenCalled();
    });

    it('accepts the Vercel-issued bearer token', async () => {
      const res = await GET(request(`Bearer ${SECRET}`));
      expect(res.status).toBe(200);
      expect(rpcMock).toHaveBeenCalledWith('review_reminder_candidates');
    });
  });

  describe('sending', () => {
    it('pushes to an eligible user and records the reminder date', async () => {
      setCandidates([row()]);
      setSubs([{ user_id: 'user-1', endpoint: 'https://push/1', p256dh: 'k', auth: 'a' }]);

      const res = await GET(request(`Bearer ${SECRET}`));
      const json = await res.json();

      expect(sendPushToSubscriptions).toHaveBeenCalledTimes(1);
      const [devices, payload] = sendPushToSubscriptions.mock.calls[0];
      expect(devices).toHaveLength(1);
      expect(payload).toEqual({
        title: 'Kannanao',
        body: '5 words are ready to review! 🌱',
        url: '/review',
      });

      expect(progressUpdate.in).toHaveBeenCalledWith('user_id', ['user-1']);
      expect(json).toMatchObject({ candidates: 1, notified: 1, sent: 1 });
    });

    it('sends one push carrying every device a user has', async () => {
      setCandidates([row()]);
      setSubs([
        { user_id: 'user-1', endpoint: 'https://push/phone', p256dh: 'k', auth: 'a' },
        { user_id: 'user-1', endpoint: 'https://push/ipad', p256dh: 'k', auth: 'a' },
      ]);

      await GET(request(`Bearer ${SECRET}`));

      expect(sendPushToSubscriptions).toHaveBeenCalledTimes(1);
      expect(sendPushToSubscriptions.mock.calls[0][0]).toHaveLength(2);
    });

    it('sends nothing — and queries no subscriptions — when nobody is eligible', async () => {
      setCandidates([
        row({ user_id: 'off', reminders_enabled: false }),
        row({ user_id: 'empty', due_count: 0 }),
        row({ user_id: 'studied', last_study_date: '2026-07-12' }),
        row({ user_id: 'reminded', last_reminder_date: '2026-07-12' }),
      ]);

      const res = await GET(request(`Bearer ${SECRET}`));
      const json = await res.json();

      expect(sendPushToSubscriptions).not.toHaveBeenCalled();
      expect(subsSelect.in).not.toHaveBeenCalled();
      expect(progressUpdate.in).not.toHaveBeenCalled();
      expect(json).toMatchObject({
        sent: 0,
        skipped: {
          disabled: 1,
          'nothing-due': 1,
          'studied-today': 1,
          'already-reminded': 1,
        },
      });
    });

    it('does not mark a user as reminded when every device failed', async () => {
      // A transient push outage must not cost the user their nudge — they stay
      // eligible for the next run.
      sendPushToSubscriptions.mockResolvedValueOnce({ sent: 0, failed: 1, pruned: 1 });
      setCandidates([row()]);
      setSubs([{ user_id: 'user-1', endpoint: 'https://push/dead', p256dh: 'k', auth: 'a' }]);

      const res = await GET(request(`Bearer ${SECRET}`));
      const json = await res.json();

      expect(progressUpdate.in).not.toHaveBeenCalled();
      expect(json).toMatchObject({ notified: 0, sent: 0, failed: 1, pruned: 1 });
    });

    it('skips a user whose subscription vanished between the two queries', async () => {
      setCandidates([row()]);
      setSubs([]);

      const res = await GET(request(`Bearer ${SECRET}`));

      expect(sendPushToSubscriptions).not.toHaveBeenCalled();
      expect(progressUpdate.in).not.toHaveBeenCalled();
      expect(res.status).toBe(200);
    });

    it('returns 500 when the candidate query fails', async () => {
      rpcMock.mockResolvedValueOnce({ data: null, error: { message: 'db down' } });
      const res = await GET(request(`Bearer ${SECRET}`));
      expect(res.status).toBe(500);
      expect(sendPushToSubscriptions).not.toHaveBeenCalled();
    });
  });
});
