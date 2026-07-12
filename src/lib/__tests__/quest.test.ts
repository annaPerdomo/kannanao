import { describe, expect, it } from 'vitest';

import { planQuest, planQuestNodes } from '@/lib/quest';
import type { Flashcard } from '@/types/flashcard';

function cards(n: number): Flashcard[] {
  return Array.from({ length: n }, (_, i) => ({ id: `c${i}` }) as Flashcard);
}

describe('planQuestNodes — sizing at the boundaries', () => {
  it('N = 0 → no map', () => {
    expect(planQuestNodes(0)).toEqual([]);
    expect(planQuestNodes(-3)).toEqual([]);
  });

  it('1 ≤ N < 4 → a single flip node covering every card (no boss)', () => {
    for (const n of [1, 2, 3]) {
      const nodes = planQuestNodes(n);
      expect(nodes.map((x) => x.type)).toEqual(['warmup']);
      expect(nodes[0].cardCount).toBe(n);
    }
  });

  it('N = 4 (boundary) → Warm-up → Boss, boss is the last 3', () => {
    const nodes = planQuestNodes(4);
    expect(nodes.map((x) => x.type)).toEqual(['warmup', 'boss']);
    expect(nodes[0].cardCount).toBe(1);
    expect(nodes[1].cardCount).toBe(3);
  });

  it('N = 7 (boundary, still two-node) → Warm-up(4) → Boss(3)', () => {
    const nodes = planQuestNodes(7);
    expect(nodes.map((x) => x.type)).toEqual(['warmup', 'boss']);
    expect(nodes[0].cardCount).toBe(4);
    expect(nodes[1].cardCount).toBe(3);
  });

  it('N = 8 (boundary) → three nodes: Warm-up(2) → Word Match(6) → Boss(3)', () => {
    const nodes = planQuestNodes(8);
    expect(nodes.map((x) => x.type)).toEqual(['warmup', 'match', 'boss']);
    expect(nodes[0].cardCount).toBe(2);
    expect(nodes[1].cardCount).toBe(6);
    expect(nodes[2].cardCount).toBe(3);
  });

  it('large N keeps the same three-node shape, growing only the warm-up', () => {
    const nodes = planQuestNodes(20);
    expect(nodes.map((x) => x.type)).toEqual(['warmup', 'match', 'boss']);
    expect(nodes[0].cardCount).toBe(14);
  });
});

describe('planQuest — card slices', () => {
  it('N = 0 → all slices empty', () => {
    expect(planQuest([])).toEqual({ nodes: [], warmup: [], match: [], boss: [] });
  });

  it('single-node quest puts every card in the warm-up', () => {
    const plan = planQuest(cards(3));
    expect(plan.warmup).toHaveLength(3);
    expect(plan.match).toHaveLength(0);
    expect(plan.boss).toHaveLength(0);
  });

  it('two-node quest splits warm-up then the final 3 into the boss', () => {
    const plan = planQuest(cards(6));
    expect(plan.warmup.map((c) => c.id)).toEqual(['c0', 'c1', 'c2']);
    expect(plan.boss.map((c) => c.id)).toEqual(['c3', 'c4', 'c5']);
    expect(plan.match).toHaveLength(0);
  });

  it('three-node quest: warm-up first N-6, match the last 6, boss the last 3', () => {
    const plan = planQuest(cards(10));
    expect(plan.warmup.map((c) => c.id)).toEqual(['c0', 'c1', 'c2', 'c3']);
    expect(plan.match.map((c) => c.id)).toEqual(['c4', 'c5', 'c6', 'c7', 'c8', 'c9']);
    // Boss overlaps the tail of the match set by design.
    expect(plan.boss.map((c) => c.id)).toEqual(['c7', 'c8', 'c9']);
  });

  it('nodes and slices always agree on counts', () => {
    for (const n of [1, 3, 4, 7, 8, 12]) {
      const plan = planQuest(cards(n));
      const byType = Object.fromEntries(plan.nodes.map((x) => [x.type, x.cardCount]));
      expect(plan.warmup).toHaveLength(byType.warmup ?? 0);
      if (byType.match) expect(plan.match).toHaveLength(byType.match);
      if (byType.boss) expect(plan.boss).toHaveLength(byType.boss);
    }
  });
});
