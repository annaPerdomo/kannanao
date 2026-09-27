import { beforeEach, describe, expect, it, vi } from 'vitest';

import type * as FuriganaEdit from '@/lib/furiganaEdit';
import type * as KanjiReadings from '@/lib/kanjiReadings';

vi.mock('@/lib/furiganaEdit', async (importActual) => {
  const actual = await importActual<typeof FuriganaEdit>();
  return { ...actual, splitFuriganaDeep: vi.fn(actual.splitFuriganaDeep) };
});
vi.mock('@/lib/kanjiReadings', async (importActual) => {
  const actual = await importActual<typeof KanjiReadings>();
  return { ...actual, loadKanjiReadings: vi.fn(actual.loadKanjiReadings) };
});

import { splitFuriganaDeep } from '@/lib/furiganaEdit';
import { loadKanjiReadings } from '@/lib/kanjiReadings';

import { splitFuriganaSafe } from '../splitFurigana';

const mockLoadKanjiReadings = vi.mocked(loadKanjiReadings);
const mockSplitFuriganaDeep = vi.mocked(splitFuriganaDeep);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('splitFuriganaSafe', () => {
  it('splits a word-level compound into one reading per kanji', async () => {
    const result = await splitFuriganaSafe('{駐車|ちゅうしゃ}', 'test-route');
    expect(result).toBe('{駐|ちゅう}{車|しゃ}');
  });

  it('returns the value unsplit when the dictionary fails to load', async () => {
    mockLoadKanjiReadings.mockRejectedValueOnce(new Error('boom'));
    const result = await splitFuriganaSafe('{駐車|ちゅうしゃ}', 'test-route');
    expect(result).toBe('{駐車|ちゅうしゃ}');
  });

  it('returns the value unsplit when splitting itself throws', async () => {
    mockSplitFuriganaDeep.mockImplementationOnce(() => {
      throw new Error('boom');
    });
    const result = await splitFuriganaSafe('{駐車|ちゅうしゃ}', 'test-route');
    expect(result).toBe('{駐車|ちゅうしゃ}');
  });
});
