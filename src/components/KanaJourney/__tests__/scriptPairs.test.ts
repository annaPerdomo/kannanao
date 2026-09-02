import { describe, expect, it } from 'vitest';

import { getKanaEntry } from '@/lib/kanaCurriculum';
import { hiraganaToKatakana } from '@/lib/reviewGames';

import { SCRIPT_MATCH_ROUND, scriptMatchPairs, sessionScriptPairs } from '../scriptPairs';

describe('scriptMatchPairs', () => {
  it('pairs each character with its counterpart in the other script', () => {
    const pairs = scriptMatchPairs(['ア', 'ヌ']);

    for (const pair of pairs) {
      expect(pair.katakana).toBe(hiraganaToKatakana(pair.hiragana));
      expect(pair.left).toBe(pair.hiragana);
      expect(pair.right).toBe(pair.katakana);
      expect(pair.key).toBe(pair.hiragana);
    }
    expect(pairs.map((p) => p.hiragana)).toContain('あ');
    expect(pairs.map((p) => p.hiragana)).toContain('ぬ');
  });

  it('normalises a hiragana pick to the same pair as its katakana', () => {
    expect(scriptMatchPairs(['し'])[0]).toMatchObject({ hiragana: 'し', katakana: 'シ' });
  });

  // A round of six unrelated characters is solvable by elimination.
  it('pulls a look-alike in beside each pick', () => {
    expect(scriptMatchPairs(['シ']).map((p) => p.katakana)).toEqual(['シ', 'ツ']);
    expect(scriptMatchPairs(['ク']).map((p) => p.katakana)).toEqual(['ク', 'タ']);
    expect(scriptMatchPairs(['ソ']).map((p) => p.katakana)).toContain('ン');
  });

  it('keeps the queue order when a character has no look-alike', () => {
    expect(scriptMatchPairs(['ケ', 'セ']).map((p) => p.katakana)).toEqual(['ケ', 'セ']);
  });

  it('never puts two characters with the same sound in one round', () => {
    const pairs = scriptMatchPairs(['じ', 'ぢ', 'ず', 'づ']);
    const romaji = pairs.map((p) => getKanaEntry(p.hiragana)?.romaji);

    expect(new Set(romaji).size).toBe(romaji.length);
    expect(pairs.map((p) => p.hiragana)).toEqual(['じ', 'ず']);
  });

  it('drops the characters with no sound of their own', () => {
    expect(scriptMatchPairs(['っ', 'ッ', 'ー'])).toEqual([]);
  });

  it('never deals more than one round, and never repeats a pair', () => {
    const pairs = scriptMatchPairs(['ア', 'イ', 'ウ', 'エ', 'オ', 'カ', 'キ', 'ク', 'ケ', 'あ']);

    expect(pairs.length).toBe(SCRIPT_MATCH_ROUND);
    expect(new Set(pairs.map((p) => p.key)).size).toBe(pairs.length);
  });

  it('leaves the read-aloud button off — both tiles are the same sound', () => {
    for (const pair of scriptMatchPairs(['ア', 'イ'])) {
      expect(pair.leftSpeak).toBeUndefined();
      expect(pair.rightSpeak).toBeUndefined();
    }
  });
});

describe('sessionScriptPairs', () => {
  it('sits the stage out until katakana is in the queue', () => {
    expect(sessionScriptPairs(['あ', 'い', 'う', 'え', 'お'])).toEqual([]);
  });

  it('runs for a katakana-only queue — that is the learner it is for', () => {
    expect(sessionScriptPairs(['ア', 'イ', 'ウ', 'エ']).length).toBeGreaterThanOrEqual(4);
  });

  it('runs when the queue spans both scripts', () => {
    expect(sessionScriptPairs(['あ', 'い', 'シ', 'ク']).length).toBeGreaterThanOrEqual(4);
  });

  it('sits out a board too small to be anything but elimination', () => {
    expect(sessionScriptPairs(['ケ', 'セ'])).toEqual([]);
  });
});
