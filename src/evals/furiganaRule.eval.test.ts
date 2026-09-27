import { existsSync } from 'node:fs';

import { NextRequest } from 'next/server';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { _resetStore } from '@/app/api/_lib/rateLimit';
import type { POST as PostType } from '@/app/api/furigana/route';
import { furiganaGroupRegex, parseFurigana, stripFurigana } from '@/lib/furigana';
import { isKana } from '@/lib/furiganaEdit';
import { isUsualReading, loadKanjiReadings, splitReading } from '@/lib/kanjiReadings';

import { FURIGANA_EVAL_LINES } from './furiganaFixtures';

vi.mock('@/app/api/_lib/requireOrganizerAccount', () => ({
  requireOrganizerAccount: vi.fn().mockResolvedValue({
    id: 'org1',
    username: 'organizer',
    account_type: 'organizer',
  }),
}));

const RUN = process.env.RUN_GEMINI_EVAL === '1';

type Group = { kanji: string; reading: string };
const groupsOf = (text: string): Group[] =>
  parseFurigana(text).filter((seg): seg is Group => typeof seg !== 'string');

const multiReadingGroupCount = (text: string): number => {
  const regex = furiganaGroupRegex();
  let count = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    if (match[2].split('|').length > 2) count += 1;
  }
  return count;
};

describe.skipIf(!RUN)('live Gemini furigana rule eval', () => {
  let POST: typeof PostType;

  beforeAll(async () => {
    if (existsSync('.env')) process.loadEnvFile('.env');
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is missing from .env — required to run the Gemini eval');
    }
    ({ POST } = await import('@/app/api/furigana/route'));
  });

  beforeEach(() => {
    _resetStore();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('keeps one reading per kanji across a live Gemini batch', async () => {
    const realFetch = globalThis.fetch;
    let rawText: string | null = null;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (...args) => {
      const response = await realFetch(...(args as Parameters<typeof fetch>));
      const data = await response
        .clone()
        .json()
        .catch(() => null);
      rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
      return response;
    });

    const dict = await loadKanjiReadings();
    const req = new NextRequest('http://localhost/api/furigana', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lines: FURIGANA_EVAL_LINES.map((l) => l.input) }),
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(rawText, 'no raw Gemini response was captured').toBeTruthy();
    const rawLines: string[] = JSON.parse(rawText as unknown as string).lines;
    const finalLines: string[] = body.lines ?? [];

    expect(rawLines).toHaveLength(FURIGANA_EVAL_LINES.length);
    expect(finalLines).toHaveLength(FURIGANA_EVAL_LINES.length);

    const rows = FURIGANA_EVAL_LINES.map((fixture, i) => {
      const raw = rawLines[i];
      const final = finalLines[i];
      const rawGroups = groupsOf(raw);
      const finalGroups = groupsOf(final);

      const rawDivisibleWordGroups = rawGroups.filter(
        (g) => Array.from(g.kanji).length >= 2 && splitReading(g.kanji, g.reading, dict) !== null,
      ).length;
      const rawUnusualReadings = rawGroups.filter(
        (g) =>
          Array.from(g.kanji).length === 1 && isUsualReading(g.kanji, g.reading, dict) === false,
      ).length;
      const rawNonKanaReadings = rawGroups.filter((g) => !isKana(g.reading)).length;
      const rawMalformed = /[{|}]/.test(stripFurigana(raw)) ? 1 : 0;
      const rawMultiReadingGroups = multiReadingGroupCount(raw);

      const goldenFailures: string[] = [];
      for (const [word, reading] of Object.entries(fixture.golden ?? {})) {
        const found = finalGroups.some((g) => g.kanji === word && g.reading === reading);
        if (!found) {
          goldenFailures.push(
            `"${fixture.input}": expected {${word}|${reading}}, final was ${JSON.stringify(finalGroups)}`,
          );
        }
      }

      return {
        line: fixture.input,
        raw,
        final,
        rawGroups: rawGroups.length,
        finalGroups: finalGroups.length,
        rawDivisibleWordGroups,
        rawUnusualReadings,
        rawNonKanaReadings,
        rawMalformed,
        rawMultiReadingGroups,
        goldenFailures,
      };
    });

    console.table(rows.map(({ goldenFailures: _goldenFailures, ...row }) => row));

    const totals = rows.reduce(
      (acc, r) => ({
        rawGroups: acc.rawGroups + r.rawGroups,
        finalGroups: acc.finalGroups + r.finalGroups,
        rawDivisibleWordGroups: acc.rawDivisibleWordGroups + r.rawDivisibleWordGroups,
        rawUnusualReadings: acc.rawUnusualReadings + r.rawUnusualReadings,
        rawNonKanaReadings: acc.rawNonKanaReadings + r.rawNonKanaReadings,
        rawMalformed: acc.rawMalformed + r.rawMalformed,
        rawMultiReadingGroups: acc.rawMultiReadingGroups + r.rawMultiReadingGroups,
      }),
      {
        rawGroups: 0,
        finalGroups: 0,
        rawDivisibleWordGroups: 0,
        rawUnusualReadings: 0,
        rawNonKanaReadings: 0,
        rawMalformed: 0,
        rawMultiReadingGroups: 0,
      },
    );
    console.table([{ line: 'TOTAL', ...totals }]);

    const goldenFailures = rows.flatMap((r) => r.goldenFailures);

    expect(
      rows.every((r) => r.rawMalformed === 0),
      'malformed markup in raw output',
    ).toBe(true);
    expect(
      rows.every((r) => r.rawNonKanaReadings === 0),
      'non-kana reading in raw output',
    ).toBe(true);
    expect(
      rows.every((r) => r.rawMultiReadingGroups === 0),
      'raw output has a group with more than one reading',
    ).toBe(true);
    expect(goldenFailures, goldenFailures.join('\n')).toEqual([]);
  }, 60_000);
});
