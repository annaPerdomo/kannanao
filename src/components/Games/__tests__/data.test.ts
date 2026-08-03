import { describe, expect, it } from 'vitest';

import { countBlanks } from '@/lib/reviewGames';

import {
  KATAKANA_WORDS,
  PARTICLE_CHOICES,
  PARTICLE_SENTENCES,
  QA_ITEMS,
  VOCAB_WORDS,
} from '../data';

describe('Review games content data', () => {
  it('has no duplicate vocabulary words', () => {
    const jp = VOCAB_WORDS.map((w) => w.jp);
    expect(new Set(jp).size).toBe(jp.length);
  });

  it('katakana words are pure hiragana (plus ー) so conversion is well-defined', () => {
    for (const w of KATAKANA_WORDS) {
      expect(w.hiragana).toMatch(/^[ぁ-ゖー]+$/);
    }
  });

  it('every Q&A item has two distractors distinct from the correct answer', () => {
    for (const item of QA_ITEMS) {
      expect(item.distractors).toHaveLength(2);
      expect(item.distractors).not.toContain(item.correct);
    }
  });

  it('every particle blank only accepts particles that appear as chips', () => {
    for (const sentence of PARTICLE_SENTENCES) {
      expect(countBlanks(sentence.segments)).toBeGreaterThan(0);
      for (const seg of sentence.segments) {
        if (typeof seg === 'string') continue;
        expect(seg.answers.length).toBeGreaterThan(0);
        for (const particle of seg.answers) {
          expect(PARTICLE_CHOICES).toContain(particle);
        }
      }
    }
  });

  it.each(['と', 'で'])('drills the %s particle in at least one sentence', (particle) => {
    const drilled = PARTICLE_SENTENCES.filter((s) =>
      s.segments.some((seg) => typeof seg !== 'string' && seg.answers.includes(particle)),
    );
    expect(drilled.length).toBeGreaterThan(0);
    expect(PARTICLE_CHOICES).toContain(particle);
  });
});
