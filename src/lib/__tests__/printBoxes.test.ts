import { describe, expect, it } from 'vitest';

import { writingBoxSvg } from '@/lib/printBoxes';

function parse(svg: string): Element {
  return new DOMParser().parseFromString(svg, 'image/svg+xml').documentElement;
}

describe('writingBoxSvg', () => {
  it('sizes the svg to sizeMm', () => {
    const el = parse(writingBoxSvg({ sizeMm: 12 }));
    expect(el.getAttribute('width')).toBe('12mm');
    expect(el.getAttribute('height')).toBe('12mm');
  });

  it('omits the trace text when no trace is given', () => {
    const el = parse(writingBoxSvg({ sizeMm: 12 }));
    expect(el.querySelector('text')).toBeNull();
  });

  it('draws the trace text centred and escaped', () => {
    const el = parse(writingBoxSvg({ sizeMm: 12, trace: '<b>' }));
    const text = el.querySelector('text');
    expect(text?.textContent).toBe('<b>');
    expect(text?.getAttribute('text-anchor')).toBe('middle');
  });
});
