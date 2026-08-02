import { describe, expect, it } from 'vitest';

import { type ColorScheme, createAppTheme } from '@/theme';

/**
 * A disabled primary button used to inherit the root's `opacity: 0.45`, which
 * washed white-on-gradient text down to roughly the same value as the fill
 * behind it — the label vanished. These assert the replacement stays readable
 * in every scheme, since the fix lives in the shared theme.
 */

const SCHEMES: ColorScheme[] = ['sakura'];

function toRgb(color: string): [number, number, number] {
  const hex = color.trim();
  if (hex.startsWith('#')) {
    const h =
      hex.length === 4
        ? hex
            .slice(1)
            .split('')
            .map((c) => c + c)
            .join('')
        : hex.slice(1);
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  const nums = hex.match(/[\d.]+/g)!.map(Number);
  return [nums[0], nums[1], nums[2]];
}

function alphaOf(color: string): number {
  const nums = color.match(/[\d.]+/g);
  return color.startsWith('rgba') && nums?.length === 4 ? Number(nums[3]) : 1;
}

/** Flatten a translucent fill onto whatever sits behind it. */
function composite(fg: string, bg: string): [number, number, number] {
  const a = alphaOf(fg);
  const [fr, fg_, fb] = toRgb(fg);
  const [br, bg_, bb] = toRgb(bg);
  return [fr * a + br * (1 - a), fg_ * a + bg_ * (1 - a), fb * a + bb * (1 - a)];
}

function luminance([r, g, b]: [number, number, number]): number {
  const [R, G, B] = [r, g, b].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

function contrast(a: [number, number, number], b: [number, number, number]): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe.each(SCHEMES)('disabled contained button (%s)', (scheme) => {
  const theme = createAppTheme(scheme);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const contained = (theme.components?.MuiButton?.styleOverrides as any)?.contained({ theme });
  const disabled = contained['&.Mui-disabled'];

  it('should not lean on opacity to look disabled', () => {
    // Opacity fades the label and the fill together, which is what hid the text.
    expect(disabled.opacity).toBe(1);
  });

  it('should keep the label readable against its own fill', () => {
    const surface = theme.palette.brand[50];
    // Both fill and label are translucent, so each is flattened onto what is
    // behind it before the ratio means anything.
    const fillHex = composite(disabled.background, surface);
    const fill = `rgb(${fillHex.map(Math.round).join(',')})`;
    const label = composite(disabled.color, fill);
    expect(contrast(fillHex, label)).toBeGreaterThanOrEqual(4.5);
  });
});
