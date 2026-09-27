import { describe, expect, it } from 'vitest';

import { groupForLineBreaks } from '@/lib/lineBreak';

const groups = (items: string[]) => groupForLineBreaks(items, (s) => s).map((g) => g.join(''));

describe('groupForLineBreaks', () => {
  it('keeps closing punctuation on the line before it', () => {
    expect(groups(['た', '。'])).toEqual(['た。']);
    expect(groups(['上', 'に', '、', '置'])).toEqual(['上', 'に、', '置']);
  });

  it('keeps small kana and the long-vowel mark with the previous character', () => {
    expect(groups(['し', 'ょ', 'う'])).toEqual(['しょ', 'う']);
    expect(groups(['ラ', 'ー', 'メ', 'ン'])).toEqual(['ラー', 'メ', 'ン']);
  });

  it('keeps an opening bracket with the character after it', () => {
    expect(groups(['と', '「', 'は', 'い', '」'])).toEqual(['と', '「は', 'い」']);
  });

  it('chains glue across several items', () => {
    expect(groups(['す', '。', '」'])).toEqual(['す。」']);
  });

  it('never glues the first item to nothing', () => {
    expect(groups(['。', 'あ'])).toEqual(['。', 'あ']);
  });
});
