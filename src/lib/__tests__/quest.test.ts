import { describe, expect, it } from 'vitest';

import { allKana, getSet, isContextualKana, setsForTrack } from '@/lib/kanaCurriculum';
import {
  gradeQuestKana,
  INTRO_CHARS_PER_QUEST,
  KANA_MAX_DUE,
  KANA_MIN_CHARS,
  KANA_NODE_CHARS,
  pickQuestKana,
  planQuest,
  planQuestNodes,
} from '@/lib/quest';
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
    expect(planQuest([])).toEqual({ nodes: [], warmup: [], match: [], boss: [], kana: [] });
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

describe('the kana node — when it appears and how big it gets', () => {
  const weak = (n: number) => Array.from({ length: n }, (_, i) => `k${i}`);

  it('no cards due but kana slipping → a kana-only quest (the 🎉 would be a lie)', () => {
    const nodes = planQuestNodes(0, KANA_NODE_CHARS);
    expect(nodes.map((x) => x.type)).toEqual(['kana']);
    expect(nodes[0].cardCount).toBe(KANA_NODE_CHARS);
  });

  it('nothing due and kana strong → still no quest at all', () => {
    expect(planQuestNodes(0, 0)).toEqual([]);
  });

  it('too few weak characters to be worth a node', () => {
    for (let weakCount = 0; weakCount < KANA_MIN_CHARS; weakCount += 1) {
      expect(planQuestNodes(6, weakCount).map((x) => x.type)).toEqual(['warmup', 'boss']);
    }
    expect(planQuestNodes(6, KANA_MIN_CHARS).map((x) => x.type)).toEqual([
      'warmup',
      'kana',
      'boss',
    ]);
  });

  it('sits after the warm-up and never displaces the boss finale', () => {
    expect(planQuestNodes(6, 4).map((x) => x.type)).toEqual(['warmup', 'kana', 'boss']);
    expect(planQuestNodes(10, 4).map((x) => x.type)).toEqual(['warmup', 'kana', 'match', 'boss']);
    expect(planQuestNodes(2, 4).map((x) => x.type)).toEqual(['warmup', 'kana']);
  });

  it('the cap holds however far behind the learner is', () => {
    for (const weakCount of [KANA_NODE_CHARS, 12, 40, 200]) {
      const kana = planQuestNodes(5, weakCount).find((x) => x.type === 'kana');
      expect(kana?.cardCount).toBe(KANA_NODE_CHARS);
    }
  });

  it('a long card queue takes the day — the kana node yields', () => {
    expect(planQuestNodes(KANA_MAX_DUE, 4).map((x) => x.type)).toContain('kana');
    expect(planQuestNodes(KANA_MAX_DUE + 1, 4).map((x) => x.type)).toEqual([
      'warmup',
      'match',
      'boss',
    ]);
  });

  it('the card nodes keep exactly the shape they had before kana existed', () => {
    for (const n of [0, 1, 3, 4, 7, 8, 20]) {
      const withKana = planQuestNodes(n, 4).filter((x) => x.type !== 'kana');
      expect(withKana).toEqual(planQuestNodes(n));
    }
  });

  it('planQuest slices the characters to the node size and leaves the cards alone', () => {
    const plan = planQuest(cards(6), weak(30));
    expect(plan.kana).toHaveLength(KANA_NODE_CHARS);
    expect(plan.kana).toEqual(weak(30).slice(0, KANA_NODE_CHARS));
    expect(planQuest(cards(6), weak(30)).warmup).toEqual(planQuest(cards(6)).warmup);
    expect(planQuest(cards(6), weak(30)).boss).toEqual(planQuest(cards(6)).boss);
  });

  it('planQuest hands back no characters when the node is not in the plan', () => {
    expect(planQuest(cards(6), weak(2)).kana).toEqual([]);
    expect(planQuest(cards(30), weak(10)).kana).toEqual([]);
    expect(planQuest([], weak(1)).nodes).toEqual([]);
  });

  it('a kana-only quest carries its characters and no cards', () => {
    const plan = planQuest([], weak(5));
    expect(plan.nodes.map((x) => x.type)).toEqual(['kana']);
    expect(plan.kana).toHaveLength(KANA_NODE_CHARS);
    expect(plan.warmup).toEqual([]);
    expect(plan.match).toEqual([]);
    expect(plan.boss).toEqual([]);
  });
});

describe('pickQuestKana — maintains reading and starts it', () => {
  const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();

  const slipping = (kana: string[]) =>
    new Map(
      kana.map((k) => [
        k,
        {
          correctCount: 1,
          wrongCount: 4,
          intervalDays: 0,
          ease: 2.5,
          lastReviewedAt: daysAgo(9),
          nextReviewAt: daysAgo(8),
        },
      ]),
    );

  const mastered = (kana: string[]) =>
    new Map(
      kana.map((k) => [
        k,
        {
          correctCount: 5,
          wrongCount: 0,
          intervalDays: 30,
          ease: 2.5,
          lastReviewedAt: daysAgo(1),
          nextReviewAt: daysAgo(-20),
        },
      ]),
    );

  const hiraganaBase = setsForTrack('hiragana')
    .filter((set) => set.kind === 'base')
    .flatMap((set) => set.entries.map((e) => e.kana));
  const katakanaBase = setsForTrack('katakana')
    .filter((set) => set.kind === 'base')
    .flatMap((set) => set.entries.map((e) => e.kana));

  it('an empty map introduces the first INTRO_CHARS_PER_QUEST hiragana, in curriculum order', () => {
    expect(pickQuestKana(new Map())).toEqual(allKana('hiragana').slice(0, INTRO_CHARS_PER_QUEST));
    expect(pickQuestKana(new Map())).toEqual(['あ', 'い', 'う']);
  });

  it('never introduces a contextual character — they have no romaji to ask for', () => {
    const picked = pickQuestKana(slipping(['ぬ', 'ね', 'ま', 'っ', 'ッ', 'ー']));
    expect(picked.some(isContextualKana)).toBe(false);
    expect(new Set(picked.slice(0, 3))).toEqual(new Set(['ぬ', 'ね', 'ま']));
  });

  it('puts weak, already-seen characters first and fills only the remaining slots with new ones', () => {
    const picked = pickQuestKana(slipping(['ぬ', 'ね']));
    expect(new Set(picked.slice(0, 2))).toEqual(new Set(['ぬ', 'ね']));
    expect(picked.slice(2)).toEqual(['あ', 'い', 'う']);
  });

  it('caps the introduction at INTRO_CHARS_PER_QUEST, however many characters are unseen', () => {
    // The whole hiragana chart (well over 40 characters) is unseen here.
    expect(hiraganaBase.length + katakanaBase.length).toBeGreaterThan(40);
    const picked = pickQuestKana(new Map());
    expect(picked).toHaveLength(INTRO_CHARS_PER_QUEST);
  });

  it('keeps katakana out of the introduction while hiragana is not yet "reads"', () => {
    const picked = pickQuestKana(slipping(['ぬ', 'ね']));
    expect(picked.some((k) => katakanaBase.includes(k))).toBe(false);
  });

  it('introduces katakana once hiragana reads', () => {
    const picked = pickQuestKana(mastered(hiraganaBase));
    expect(picked).toEqual(katakanaBase.slice(0, INTRO_CHARS_PER_QUEST));
  });

  it('lets an open kana assignment lead the introduction, in either script, regardless of the gate', () => {
    const assignedRow = getSet('kata-a')!.entries.map((e) => e.kana);
    const picked = pickQuestKana(new Map(), ['kata-a']);
    expect(picked).toEqual(assignedRow.slice(0, INTRO_CHARS_PER_QUEST));
  });

  it('fills any budget left after the assigned row from the curriculum', () => {
    // ヤ already mastered (dropped as "strong"), leaving ユ・ヨ as the only
    // unseen characters in the assigned row — one slot short of the cap.
    const byKana = mastered(['ヤ']);
    expect(pickQuestKana(byKana, ['kata-ya'])).toEqual(['ユ', 'ヨ', 'あ']);
  });

  it('a learner who reads both tracks fully and has nothing weak gets no node', () => {
    const byKana = mastered([...hiraganaBase, ...katakanaBase]);
    expect(pickQuestKana(byKana)).toEqual([]);
    expect(planQuestNodes(6, pickQuestKana(byKana).length).map((x) => x.type)).toEqual([
      'warmup',
      'boss',
    ]);
  });
  it('never repeats a character an assigned row already contributed', () => {
    const picked = pickQuestKana(mastered(['あ', 'い', 'う']), ['hira-a']);
    expect(new Set(picked).size).toBe(picked.length);
  });

  it('dedupes two open assignments that overlap on the same row', () => {
    const picked = pickQuestKana(new Map(), ['hira-a', 'hira-a']);
    expect(new Set(picked).size).toBe(picked.length);
  });

  it('still introduces one new character when the backlog would fill the node', () => {
    const backlog = hiraganaBase.slice(0, 8);
    const node = planQuest([], pickQuestKana(slipping(backlog))).kana;
    expect(node).toHaveLength(KANA_NODE_CHARS);
    expect(node.filter((k) => !backlog.includes(k))).toHaveLength(1);
  });
});

describe('gradeQuestKana — credit for meeting a character for the first time', () => {
  it('credits easier, still-unseen row-mates on a first-ever hit', () => {
    const grade = gradeQuestKana('き', true, new Map());
    expect(grade.correct[0]).toBe('き');
    expect(grade.correct.length).toBeGreaterThan(1);
    expect(grade.wrong).toEqual([]);
  });

  it('credits nothing extra for a character she has already met', () => {
    const seen = new Map([['き', { correctCount: 2, wrongCount: 1 }]]);
    expect(gradeQuestKana('き', true, seen)).toEqual({ correct: ['き'], wrong: [] });
  });

  it('credits nothing on a miss', () => {
    expect(gradeQuestKana('き', false, new Map())).toEqual({ correct: [], wrong: ['き'] });
  });
});
