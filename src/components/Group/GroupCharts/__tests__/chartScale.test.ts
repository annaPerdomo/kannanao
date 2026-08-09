import { describe, expect, it } from 'vitest';

import { axisCeiling, dailyAccuracy, heatLevel, heatThresholds, lineSegments } from '../chartScale';

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

describe('dailyAccuracy', () => {
  it('divides correct by cards per day', () => {
    expect(dailyAccuracy([10, 4], [8, 1])).toEqual([80, 25]);
  });

  it('is null on a zero-card day, avoiding a divide-by-zero', () => {
    expect(dailyAccuracy([0, 5], [0, 5])).toEqual([null, 100]);
  });

  it('rounds to the nearest whole percent', () => {
    expect(dailyAccuracy([3], [1])).toEqual([33]);
  });
});

describe('lineSegments', () => {
  it('spaces points evenly across the width and flips y so higher is up', () => {
    expect(lineSegments([100, 0])).toEqual([
      [
        { x: 25, y: 0 },
        { x: 75, y: 100 },
      ],
    ]);
  });

  it('breaks the line into separate segments across a null (zero-card) day', () => {
    const segments = lineSegments([80, null, 60]);
    expect(segments).toHaveLength(2);
    expect(segments[0]).toHaveLength(1);
    expect(segments[0][0].x).toBeCloseTo(50 / 3);
    expect(segments[0][0].y).toBe(20);
    expect(segments[1]).toHaveLength(1);
    expect(segments[1][0].x).toBeCloseTo(250 / 3);
    expect(segments[1][0].y).toBe(40);
  });

  it('is empty when every day is null', () => {
    expect(lineSegments([null, null])).toEqual([]);
  });
});
