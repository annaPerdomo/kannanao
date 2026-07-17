import { describe, expect, it } from 'vitest';

import { answerMatches, maskWord } from '@/components/Practice/FillMode';

// ─── maskWord ─────────────────────────────────────────────────────────────────

describe('maskWord', () => {
  it('masks the word in the sentence', () => {
    expect(maskWord('猫がいます。', '猫', 'ねこ')).toBe('＿がいます。');
  });

  it('masks EVERY occurrence, not just the first', () => {
    expect(maskWord('猫と猫がいます。', '猫', 'ねこ')).toBe('＿と＿がいます。');
  });

  it('masks the reading when the sentence uses kana instead of the word', () => {
    expect(maskWord('ねこがいます。', '猫', 'ねこ')).toBe('＿＿がいます。');
  });

  it('masks both the word and the reading when both appear', () => {
    expect(maskWord('猫はねこと読みます。', '猫', 'ねこ')).toBe('＿は＿＿と読みます。');
  });

  it('returns the sentence unchanged when neither form appears (inflected usage)', () => {
    expect(maskWord('食べます。', '食べる', 'たべる')).toBe('食べます。');
  });
});

// ─── answerMatches ────────────────────────────────────────────────────────────

describe('answerMatches', () => {
  it('accepts the word and the reading exactly', () => {
    expect(answerMatches('猫', '猫', 'ねこ')).toBe(true);
    expect(answerMatches('ねこ', '猫', 'ねこ')).toBe(true);
  });

  it('rejects a wrong answer', () => {
    expect(answerMatches('犬', '猫', 'ねこ')).toBe(false);
  });

  it('ignores half-width and full-width whitespace on either side', () => {
    expect(answerMatches('  猫 ', '猫', 'ねこ')).toBe(true);
    expect(answerMatches('ねこ　', '猫', 'ねこ')).toBe(true);
    expect(answerMatches('ね こ', '猫', 'ねこ')).toBe(true);
  });

  it('treats hiragana and katakana input as the same answer', () => {
    expect(answerMatches('ネコ', '猫', 'ねこ')).toBe(true);
    expect(answerMatches('ちーず', 'チーズ')).toBe(true);
  });

  it('ignores stored whitespace on the card fields', () => {
    expect(answerMatches('ねこ', '猫 ', ' ねこ')).toBe(true);
  });

  it('never accepts an empty or whitespace-only input', () => {
    expect(answerMatches('', '猫', 'ねこ')).toBe(false);
    expect(answerMatches('   ', '猫', 'ねこ')).toBe(false);
  });

  it('does not match the reading when the card has none', () => {
    expect(answerMatches('ねこ', '猫')).toBe(false);
  });
});
