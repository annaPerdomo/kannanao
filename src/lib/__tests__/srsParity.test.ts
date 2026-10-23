import { fileURLToPath, URL as NodeURL } from 'node:url';

import { describe, expect, it } from 'vitest';

import { latestSrsNextSource } from '../../../ops/srsSource.mjs';
import { nextSchedule } from '../srs';
import fixture from './fixtures/srsVectors.json';

const DAY_MS = 86_400_000;
const NOW = new Date('2026-07-11T12:00:00.000Z');
const MIGRATIONS_DIR = fileURLToPath(new NodeURL('../../../supabase/migrations', import.meta.url));

describe('srs_next parity with nextSchedule', () => {
  it('has enough vectors covering both outcomes and an unreviewed card', () => {
    expect(fixture.vectors.length).toBeGreaterThanOrEqual(100);
    expect(fixture.vectors.some((v) => v.correct)).toBe(true);
    expect(fixture.vectors.some((v) => !v.correct)).toBe(true);
    expect(fixture.vectors.some((v) => v.elapsedDays === null)).toBe(true);
  });

  it('matches the live srs_next migration', () => {
    const live = latestSrsNextSource(MIGRATIONS_DIR);
    expect(
      { source: fixture.source, sqlHash: fixture.sqlHash },
      `srs_next changed in ${live.file}. Run \`pnpm srs:vectors\` and update nextSchedule in src/lib/srs.ts to match.`,
    ).toEqual({ source: live.file, sqlHash: live.hash });
  });

  it.each(fixture.vectors)(
    'interval=$interval ease=$ease correct=$correct elapsedDays=$elapsedDays',
    (vector) => {
      const lastReviewedAt =
        vector.elapsedDays === null ? null : new Date(NOW.getTime() - vector.elapsedDays * DAY_MS);

      const result = nextSchedule(
        {
          correct: vector.correct,
          intervalDays: vector.interval,
          ease: vector.ease,
          lastReviewedAt,
        },
        NOW,
      );

      expect(Math.abs(result.intervalDays - vector.expected.intervalDays)).toBeLessThanOrEqual(
        1e-3,
      );
      expect(Math.abs(result.ease - vector.expected.ease)).toBeLessThanOrEqual(1e-3);

      const actualSeconds = (result.nextReviewAt.getTime() - NOW.getTime()) / 1000;
      expect(Math.abs(actualSeconds - vector.expected.nextInSeconds)).toBeLessThanOrEqual(60);
    },
  );
});
