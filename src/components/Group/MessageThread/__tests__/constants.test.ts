import { describe, expect, it } from 'vitest';

import { splitLinks } from '@/components/Group/MessageThread/constants';

describe('splitLinks', () => {
  it('returns the whole string as one plain segment when there is no URL', () => {
    expect(splitLinks('just a plain message')).toEqual([
      { text: 'just a plain message', isLink: false },
    ]);
  });

  it('splits out a bare URL as its own link segment', () => {
    expect(splitLinks('https://example.com/page')).toEqual([
      { text: 'https://example.com/page', isLink: true },
    ]);
  });

  it('splits text around an embedded URL', () => {
    expect(splitLinks('check this out: https://example.com/page cool right?')).toEqual([
      { text: 'check this out: ', isLink: false },
      { text: 'https://example.com/page', isLink: true },
      { text: ' cool right?', isLink: false },
    ]);
  });

  it('strips trailing sentence punctuation from the link', () => {
    expect(splitLinks('see https://example.com/page.')).toEqual([
      { text: 'see ', isLink: false },
      { text: 'https://example.com/page', isLink: true },
      { text: '.', isLink: false },
    ]);
  });

  it('handles multiple URLs in one message', () => {
    const result = splitLinks('https://a.com then https://b.com');
    expect(result.filter((s) => s.isLink).map((s) => s.text)).toEqual([
      'https://a.com',
      'https://b.com',
    ]);
  });

  it('does not treat a javascript: URL as a link', () => {
    const result = splitLinks('click javascript:alert(1) now');
    expect(result.every((s) => !s.isLink)).toBe(true);
  });
});
