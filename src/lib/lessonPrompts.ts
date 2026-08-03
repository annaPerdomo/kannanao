import type { KnownWord } from './knownWords';

export interface PromptWord {
  word: string;
  reading: string;
  meaning: string;
}

export const MAX_SENTENCES = 20;
const MIN_SENTENCES = 8;

/** Sentences to ask for given a deck's size — two per card, clamped. */
export function sentenceCountFor(cardCount: number): number {
  return Math.min(Math.max(cardCount * 2, MIN_SENTENCES), MAX_SENTENCES);
}

function wordListText(words: PromptWord[]): string {
  return words.map((w) => `- ${w.word} (${w.reading}) = ${w.meaning}`).join('\n');
}

function knownVocabularyBlock(knownWords: KnownWord[]): string {
  if (knownWords.length === 0) return '';

  return `
KNOWN VOCABULARY (optional, use freely) — words this learner has already studied:
${wordListText(knownWords)}

RULE (reuse): every sentence must still contain at least one DECK word verbatim. Where it is natural, ALSO use a known word — a sentence that pairs a new word with one the learner already owns is worth more than one that stands alone. Aim for at least half the sentences to do this. Never force it: a bent sentence teaches nothing.
`;
}

const LEVEL_RULES = `
RULE (level): use ONLY words from the deck list, the known list, and everyday N5 vocabulary (numbers, days, common verbs like います/あります/します/たべます/いきます, common adjectives). Do NOT introduce N4+ words such as 得意, 苦手, 刺身, 大嫌い. If you cannot say it with N5 words, write a simpler sentence.

RULE (counters): when a sentence counts things, prefer the counters the learner is drilling — ～つ, ～まい, ～にん — written as 三まい / 二つ / 五にん.
`;

/**
 * The single home for the Kotoba Bubble sentence prompt. Routes import it;
 * prompt text never lives in two places.
 */
export function buildSentencePrompt(args: {
  deckWords: PromptWord[];
  knownWords: KnownWord[];
  sentenceCount: number;
}): string {
  const { deckWords, knownWords, sentenceCount } = args;

  return `You are a Japanese language teacher creating practice material for beginning Japanese learners (roughly JLPT N5 level).

Given these vocabulary words from a study deck:
${wordListText(deckWords)}

Generate exactly ${sentenceCount} Japanese sentences grouped into natural mini-conversations (2-3 sentences each). These will be used in a game where the learner picks the correct particle (は, が, を, に, で, へ, と, も, の, か) to complete the sentence.

CRITICAL — VOCABULARY CONSTRAINT:
Every sentence MUST contain at least one word from the deck list above, used VERBATIM (the exact Japanese word or its reading). Do NOT substitute with synonyms, related words, or specific examples. For instance, if the deck has "のみもの" (drink), you must use "のみもの" in the sentence — do NOT replace it with "ジュース", "おちゃ", or any other specific drink. The whole point is for the student to practice with the exact words they are studying. If you cannot naturally fit a deck word into a sentence, skip that sentence and make one that does use a deck word.
${knownVocabularyBlock(knownWords)}${LEVEL_RULES}
IMPORTANT RULES:
1. Every sentence must use at least one vocabulary word from the deck list EXACTLY as written
2. Mix questions and responses — learners absorb grammar better through dialogue. Example conversation:
   - Q: "What does Sakura like?" → A: "Sakura likes cats."
3. Keep grammar simple and natural — suitable for a beginning learner (short sentences, common structures, plain or polite form consistently within a conversation)
4. Each sentence must have ONE clearly identifiable target particle to test
5. Wrap every kanji or kanji compound with furigana using {kanji|reading} format. Example: {猫|ねこ}が{好|す}きです. Each group holds exactly one reading — never split a compound's reading with extra pipes ({無関係|むかんけい} or {無|む}{関|かん}{係|けい}, never {無関係|む|かん|けい}).
6. Pure hiragana/katakana words need no wrapping
7. Provide 2-3 plausible distractor particles for each sentence (wrong but reasonable alternatives)
8. particle_index is the character position of the target particle in the PLAIN text (after removing all {x|y} markup, counting from 0)
9. Try to cover different particles across the set — don't repeat the same particle too many times
10. source_words: list the EXACT vocabulary words (from the deck) that appear in each sentence — these must match the deck words verbatim

Output a JSON array of objects with these exact fields:
- sentence_jp: the full Japanese sentence with {kanji|reading} furigana markup
- sentence_en: English translation
- target_particle: the particle being tested (e.g. "は", "が", "を")
- particle_index: character index of the target particle in the plain text (0-based)
- distractors: array of 2-3 wrong particle options
- sentence_type: "question", "response", or "statement"
- conversation_group: integer grouping sentences into conversations (1, 2, 3, ...)
- sort_order: order within the conversation group (1, 2, 3)
- source_words: array of vocabulary words used from the deck`;
}
