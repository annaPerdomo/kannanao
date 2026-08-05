import { describe, expect, it } from 'vitest';

import type { KnownWord } from '@/lib/knownWords';
import {
  buildLessonPlanPrompt,
  buildSentencePrompt,
  MAX_SENTENCES,
  sentenceCountFor,
} from '@/lib/lessonPrompts';

const DECK_WORDS = [
  { word: 'ねこ', reading: 'ねこ', meaning: 'cat' },
  { word: '本', reading: 'ほん', meaning: 'book' },
];

const KNOWN: KnownWord[] = [
  { word: 'ホームワーク', reading: 'ホームワーク', meaning: 'homework', correctCount: 6 },
];

describe('buildSentencePrompt', () => {
  it('embeds every deck word', () => {
    const prompt = buildSentencePrompt({ deckWords: DECK_WORDS, knownWords: [], sentenceCount: 8 });

    for (const w of DECK_WORDS) {
      expect(prompt).toContain(`- ${w.word} (${w.reading}) = ${w.meaning}`);
    }
    expect(prompt).toContain('exactly 8 Japanese sentences');
  });

  it('adds the known-vocabulary block and the reuse rule when known words exist', () => {
    const prompt = buildSentencePrompt({
      deckWords: DECK_WORDS,
      knownWords: KNOWN,
      sentenceCount: 10,
    });

    expect(prompt).toContain('KNOWN VOCABULARY');
    expect(prompt).toContain('ホームワーク');
    expect(prompt).toContain('RULE (reuse)');
  });

  it('keeps the N5 level and counter rules in every prompt', () => {
    const prompt = buildSentencePrompt({ deckWords: DECK_WORDS, knownWords: [], sentenceCount: 8 });

    expect(prompt).toContain('RULE (level)');
    expect(prompt).toContain('RULE (counters)');
  });

  it('leaves no dangling known-vocabulary block when there are no known words', () => {
    const prompt = buildSentencePrompt({ deckWords: DECK_WORDS, knownWords: [], sentenceCount: 8 });

    expect(prompt).not.toContain('KNOWN VOCABULARY');
    expect(prompt).not.toContain('RULE (reuse)');
  });

  it('keeps the furigana rule and the JSON contract', () => {
    const prompt = buildSentencePrompt({ deckWords: DECK_WORDS, knownWords: [], sentenceCount: 8 });

    expect(prompt).toContain('{kanji|reading}');
    expect(prompt).toContain('particle_index');
    expect(prompt).toContain('source_words');
  });
});

describe('buildLessonPlanPrompt', () => {
  it('says nothing about a reference document by default', () => {
    const prompt = buildLessonPlanPrompt({
      goal: 'Food words',
      weeks: 2,
      cardsPerDeck: 10,
      knownWords: [],
    });

    expect(prompt).not.toContain('reference document');
  });

  it('tells the model to prefer the attached document when one is present', () => {
    const prompt = buildLessonPlanPrompt({
      goal: 'Food words',
      weeks: 2,
      cardsPerDeck: 10,
      knownWords: [],
      hasDocument: true,
    });

    expect(prompt).toContain('reference document is attached');
  });
});

describe('sentenceCountFor', () => {
  it('clamps at both ends and doubles in between', () => {
    expect(sentenceCountFor(3)).toBe(8);
    expect(sentenceCountFor(7)).toBe(14);
    expect(sentenceCountFor(30)).toBe(MAX_SENTENCES);
  });
});
