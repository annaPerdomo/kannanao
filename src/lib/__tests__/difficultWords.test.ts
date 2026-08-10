import { describe, expect, it } from 'vitest';

import { deriveReason, type DifficultWordSignals, learnersAffected } from '@/lib/difficultWords';

function signals(overrides: Partial<DifficultWordSignals> = {}): DifficultWordSignals {
  return {
    attemptCount: 10,
    strugglingCount: 0,
    lowEaseCount: 0,
    lapseLearnerCount: 0,
    avgEase: 2.5,
    ...overrides,
  };
}

describe('deriveReason', () => {
  it('calls a recent lapse "forgotten"', () => {
    expect(deriveReason(signals({ lapseLearnerCount: 1 }))).toBe('forgotten');
  });

  it('prefers "forgotten" over the other two reasons', () => {
    const both = signals({ lapseLearnerCount: 1, avgEase: 1.3, strugglingCount: 4 });
    expect(deriveReason(both)).toBe('forgotten');
  });

  it('calls a bottomed-out ease with enough answers "missed"', () => {
    expect(deriveReason(signals({ avgEase: 1.6, attemptCount: 4 }))).toBe('missed');
  });

  it('will not call a low ease "missed" on too few answers', () => {
    // Same ease, one answer short — noise, not a chronic problem.
    expect(deriveReason(signals({ avgEase: 1.4, attemptCount: 3 }))).toBeNull();
    expect(deriveReason(signals({ avgEase: 1.4, attemptCount: 3, strugglingCount: 1 }))).toBe(
      'shaky',
    );
  });

  it('falls back to "shaky" for a struggling learner with a healthy ease', () => {
    expect(deriveReason(signals({ strugglingCount: 2 }))).toBe('shaky');
  });

  it('returns null when no reason holds, so the row is dropped', () => {
    expect(deriveReason(signals())).toBeNull();
    expect(deriveReason(signals({ avgEase: 1.7, attemptCount: 40 }))).toBeNull();
  });
});

describe('learnersAffected', () => {
  const s = signals({
    lapseLearnerCount: 2,
    lowEaseCount: 3,
    strugglingCount: 4,
  });

  it('counts a different set per reason so the number matches the chip', () => {
    expect(learnersAffected(s, 'forgotten')).toBe(2);
    expect(learnersAffected(s, 'missed')).toBe(3);
    expect(learnersAffected(s, 'shaky')).toBe(4);
  });
});
