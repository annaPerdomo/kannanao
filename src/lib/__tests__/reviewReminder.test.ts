import { describe, expect, it } from 'vitest';

import {
  buildReminderPayload,
  dateStringInTimeZone,
  previousDay,
  type ReminderCandidate,
  selectReminders,
  skipReason,
} from '@/lib/reviewReminder';

const TODAY = '2026-07-12';
const YESTERDAY = '2026-07-11';

function candidate(overrides: Partial<ReminderCandidate> = {}): ReminderCandidate {
  return {
    userId: 'user-1',
    dueCount: 12,
    remindersEnabled: true,
    lastStudyDate: YESTERDAY,
    lastReminderDate: null,
    streakDays: 0,
    ...overrides,
  };
}

describe('dateStringInTimeZone', () => {
  it('formats as YYYY-MM-DD in the given timezone', () => {
    expect(dateStringInTimeZone(new Date('2026-07-12T23:00:00Z'), 'America/Los_Angeles')).toBe(
      '2026-07-12',
    );
  });

  it('resolves the date in the target timezone, not UTC', () => {
    // 02:00 UTC on the 13th is still the evening of the 12th in Los Angeles. The
    // whole "have they studied today?" check hinges on getting this right.
    const instant = new Date('2026-07-13T02:00:00Z');
    expect(dateStringInTimeZone(instant, 'America/Los_Angeles')).toBe('2026-07-12');
    expect(dateStringInTimeZone(instant, 'Asia/Tokyo')).toBe('2026-07-13');
  });
});

describe('previousDay', () => {
  it('steps back one calendar day', () => {
    expect(previousDay('2026-07-12')).toBe('2026-07-11');
  });

  it('steps back across a month boundary', () => {
    expect(previousDay('2026-07-01')).toBe('2026-06-30');
  });
});

describe('skipReason', () => {
  it('sends when cards are due and the user has not studied today', () => {
    expect(skipReason(candidate(), TODAY)).toBeNull();
  });

  it('skips a user who turned the reminder off', () => {
    expect(skipReason(candidate({ remindersEnabled: false }), TODAY)).toBe('disabled');
  });

  it('skips a user with nothing due — the app stays silent on an empty day', () => {
    expect(skipReason(candidate({ dueCount: 0 }), TODAY)).toBe('nothing-due');
  });

  it('skips a user who already studied today', () => {
    expect(skipReason(candidate({ lastStudyDate: TODAY }), TODAY)).toBe('studied-today');
  });

  it('skips a user already reminded today — the once-per-day guard', () => {
    expect(skipReason(candidate({ lastReminderDate: TODAY }), TODAY)).toBe('already-reminded');
  });

  it('reminds a user who was reminded yesterday', () => {
    expect(skipReason(candidate({ lastReminderDate: YESTERDAY }), TODAY)).toBeNull();
  });

  it('reminds a brand-new user with no progress row', () => {
    expect(
      skipReason(candidate({ lastStudyDate: null, lastReminderDate: null }), TODAY),
    ).toBeNull();
  });

  it('prefers the toggle over every other reason', () => {
    // A disabled user must never be counted as merely "nothing due" — the skip
    // summary is how a silent run gets explained.
    expect(skipReason(candidate({ remindersEnabled: false, dueCount: 0 }), TODAY)).toBe('disabled');
  });
});

describe('buildReminderPayload', () => {
  it('writes the plain nudge when no streak is at stake', () => {
    const payload = buildReminderPayload(candidate({ streakDays: 0 }), TODAY);
    expect(payload).toEqual({
      title: 'Tangodachi',
      body: '12 words are ready to review! 🌱',
      url: '/review',
    });
  });

  it('names the streak when it would break today', () => {
    const payload = buildReminderPayload(
      candidate({ streakDays: 7, lastStudyDate: YESTERDAY }),
      TODAY,
    );
    expect(payload.body).toBe('Keep your 7-day streak going — 12 words are ready!');
  });

  it('ignores a streak shorter than 3 days — the number is not motivating yet', () => {
    const payload = buildReminderPayload(
      candidate({ streakDays: 2, lastStudyDate: YESTERDAY }),
      TODAY,
    );
    expect(payload.body).toBe('12 words are ready to review! 🌱');
  });

  it('ignores a long streak that is already broken', () => {
    // Last studied three days ago: the streak is gone, so promising to "keep it
    // going" would be a lie.
    const payload = buildReminderPayload(
      candidate({ streakDays: 9, lastStudyDate: '2026-07-09' }),
      TODAY,
    );
    expect(payload.body).toBe('12 words are ready to review! 🌱');
  });

  it('speaks singular for one card', () => {
    expect(buildReminderPayload(candidate({ dueCount: 1 }), TODAY).body).toBe(
      '1 word is ready to review! 🌱',
    );
    expect(buildReminderPayload(candidate({ dueCount: 1, streakDays: 5 }), TODAY).body).toBe(
      'Keep your 5-day streak going — 1 word is ready!',
    );
  });

  it('always deep-links to the review queue', () => {
    expect(buildReminderPayload(candidate(), TODAY).url).toBe('/review');
  });
});

describe('selectReminders', () => {
  it('sends to the eligible users and tallies why the rest were skipped', () => {
    const plan = selectReminders(
      [
        candidate({ userId: 'send-1' }),
        candidate({ userId: 'send-2', dueCount: 3, streakDays: 4 }),
        candidate({ userId: 'off', remindersEnabled: false }),
        candidate({ userId: 'empty', dueCount: 0 }),
        candidate({ userId: 'studied', lastStudyDate: TODAY }),
        candidate({ userId: 'reminded', lastReminderDate: TODAY }),
      ],
      TODAY,
    );

    expect(plan.send.map((s) => s.userId)).toEqual(['send-1', 'send-2']);
    expect(plan.skipped).toEqual({
      disabled: 1,
      'nothing-due': 1,
      'studied-today': 1,
      'already-reminded': 1,
    });
  });

  it('sends exactly one payload per user', () => {
    const plan = selectReminders([candidate(), candidate({ userId: 'user-2' })], TODAY);
    expect(plan.send).toHaveLength(2);
    expect(new Set(plan.send.map((s) => s.userId)).size).toBe(2);
  });

  it('returns nothing for an empty candidate list', () => {
    const plan = selectReminders([], TODAY);
    expect(plan.send).toEqual([]);
    expect(plan.skipped).toEqual({
      disabled: 0,
      'nothing-due': 0,
      'studied-today': 0,
      'already-reminded': 0,
    });
  });
});
