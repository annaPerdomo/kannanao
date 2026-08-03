import { describe, expect, it } from 'vitest';

import { axisCeiling, heatLevel, heatThresholds } from '../chartScale';

describe('axisCeiling', () => {
  it('rounds up to a clean tick', () => {
    expect(axisCeiling(37)).toBe(50);
    expect(axisCeiling(52)).toBe(100);
    expect(axisCeiling(8)).toBe(10);
    expect(axisCeiling(210)).toBe(250);
  });

  it('leaves an already-clean maximum alone', () => {
    expect(axisCeiling(100)).toBe(100);
    expect(axisCeiling(20)).toBe(20);
  });

  it('has no ceiling for an empty series', () => {
    expect(axisCeiling(0)).toBe(0);
  });

  // The chart labels ceiling/2 as its middle tick, and half of 25 is 12.5.
  it('never picks a ceiling whose midpoint tick is fractional', () => {
    expect(axisCeiling(23)).toBe(50);
    expect(axisCeiling(1)).toBe(2);
    expect(axisCeiling(4)).toBe(10);
  });
});

describe('heatThresholds', () => {
  it('ignores empty days when splitting the ramp', () => {
    expect(heatThresholds([0, 0, 4, 8, 12, 16])).toEqual([4, 8, 12]);
  });

  it('collapses to zeros when nobody studied', () => {
    expect(heatThresholds([0, 0, 0])).toEqual([0, 0, 0]);
  });
});

describe('heatLevel', () => {
  const thresholds: [number, number, number] = [4, 8, 12];

  it('gives an empty day the neutral track, never the palest tint', () => {
    expect(heatLevel(0, thresholds)).toBe(0);
  });

  it('steps through the ramp by quartile', () => {
    expect(heatLevel(2, thresholds)).toBe(1);
    expect(heatLevel(6, thresholds)).toBe(2);
    expect(heatLevel(10, thresholds)).toBe(3);
    expect(heatLevel(40, thresholds)).toBe(4);
  });

  // One heavy studier must not push a steady member down to "did nothing".
  it('does not scale to the busiest cell', () => {
    expect(heatLevel(12, heatThresholds([4, 8, 12, 200]))).toBe(3);
  });

  it('uses one mid step when every studied day is equal', () => {
    expect(heatLevel(10, [10, 10, 10])).toBe(3);
  });
});
