import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  clampPosition,
  measureChromeInsets,
  readStoredPosition,
  writeStoredPosition,
} from '@/components/HomeBuddy/buddyPosition';

const SIZE = { width: 64, height: 96 };
const VIEWPORT = { width: 1024, height: 768 };

describe('clampPosition', () => {
  it('leaves a position that already fits alone', () => {
    expect(clampPosition({ left: 200, bottom: 120 }, SIZE, VIEWPORT)).toEqual({
      left: 200,
      bottom: 120,
    });
  });

  it('pulls a position back inside after a rotation shrinks the viewport', () => {
    expect(clampPosition({ left: 900, bottom: 700 }, SIZE, { width: 768, height: 1024 })).toEqual({
      left: 696,
      bottom: 700,
    });
  });

  it('keeps the buddy off the edges', () => {
    expect(clampPosition({ left: -40, bottom: -10 }, SIZE, VIEWPORT)).toEqual({
      left: 8,
      bottom: 8,
    });
  });

  it('falls back to the margin when the buddy is taller than the viewport', () => {
    expect(clampPosition({ left: 10, bottom: 500 }, SIZE, { width: 320, height: 60 })).toEqual({
      left: 10,
      bottom: 8,
    });
  });

  it('lifts the buddy off the bottom nav and out from under the app bar', () => {
    const insets = { top: 72, right: 8, bottom: 64, left: 8 };
    expect(clampPosition({ left: 200, bottom: 10 }, SIZE, VIEWPORT, insets).bottom).toBe(64);
    expect(clampPosition({ left: 200, bottom: 700 }, SIZE, VIEWPORT, insets).bottom).toBe(600);
  });
});

describe('measureChromeInsets', () => {
  function addChrome(edge: 'top' | 'bottom', height: number) {
    const el = document.createElement('div');
    el.dataset.appChrome = edge;
    el.getBoundingClientRect = () => ({ height }) as DOMRect;
    document.body.append(el);
  }

  afterEach(() => {
    document.querySelectorAll('[data-app-chrome]').forEach((el) => el.remove());
  });

  it('reserves the height of whichever bars are on screen', () => {
    addChrome('top', 64);
    addChrome('bottom', 78);
    expect(measureChromeInsets()).toEqual({ top: 72, right: 8, bottom: 86, left: 8 });
  });

  it('reserves nothing where the app renders no chrome', () => {
    expect(measureChromeInsets()).toEqual({ top: 8, right: 8, bottom: 8, left: 8 });
  });
});

describe('stored position', () => {
  beforeEach(() => localStorage.clear());

  it('round-trips a dropped position', () => {
    writeStoredPosition({ left: 42, bottom: 84 });
    expect(readStoredPosition()).toEqual({ left: 42, bottom: 84 });
  });

  it('returns nothing when the buddy has never been moved', () => {
    expect(readStoredPosition()).toBeNull();
  });

  it('ignores junk rather than positioning the buddy at NaN', () => {
    localStorage.setItem('kannanao:buddy-position', '{"left":"x"}');
    expect(readStoredPosition()).toBeNull();
    localStorage.setItem('kannanao:buddy-position', 'not json');
    expect(readStoredPosition()).toBeNull();
  });
});
