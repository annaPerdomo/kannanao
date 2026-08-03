/**
 * Starter/fallback content for the review games, taken from the Level 3
 * class homework (June 2026). The word games prefer the user's own decks
 * (see gameWords.ts) and fall back to these sets; the grammar games
 * (question words, particles) always use this content.
 */
import type { SentenceSegment } from '@/lib/reviewGames';

// ── Katakana Builder ─────────────────────────────────────────────────────────
// Words are stored in hiragana; the katakana target is derived with
// hiraganaToKatakana() so the two can never drift apart.

export interface KatakanaWord {
  hiragana: string;
  english: string;
  emoji: string;
}

export const KATAKANA_WORDS: KatakanaWord[] = [
  { hiragana: 'ういるす', english: 'virus', emoji: '🦠' },
  { hiragana: 'いーぐる', english: 'eagle', emoji: '🦅' },
  { hiragana: 'おれんじ', english: 'orange', emoji: '🍊' },
  { hiragana: 'はむ', english: 'ham', emoji: '🍖' },
  { hiragana: 'たいや', english: 'tire', emoji: '🛞' },
  { hiragana: 'めだる', english: 'medal', emoji: '🏅' },
  { hiragana: 'よーぐると', english: 'yogurt', emoji: '🥣' },
  { hiragana: 'はむすたー', english: 'hamster', emoji: '🐹' },
  { hiragana: 'よっと', english: 'yacht', emoji: '⛵' },
  { hiragana: 'もでる', english: 'model', emoji: '💃' },
  { hiragana: 'よーよー', english: 'yo-yo', emoji: '🪀' },
  { hiragana: 'ふるーつ', english: 'fruit', emoji: '🍇' },
  { hiragana: 'さいれん', english: 'siren', emoji: '🚨' },
  { hiragana: 'らじお', english: 'radio', emoji: '📻' },
  { hiragana: 'てすと', english: 'test', emoji: '📝' },
];

// ── Word Match (semester vocabulary + classroom phrases) ─────────────────────

export interface VocabWord {
  jp: string;
  english: string;
  emoji: string;
}

export const VOCAB_WORDS: VocabWord[] = [
  { jp: 'へや', english: 'room', emoji: '🛏️' },
  { jp: 'おんど', english: 'temperature', emoji: '🌡️' },
  { jp: 'ひこうき', english: 'airplane', emoji: '✈️' },
  { jp: 'おとな', english: 'adult', emoji: '🧑' },
  { jp: 'てんき', english: 'weather', emoji: '⛅' },
  { jp: 'どこ', english: 'where?', emoji: '📍' },
  { jp: 'ひと', english: 'person / people', emoji: '🧍' },
  { jp: 'きせつ', english: 'season', emoji: '🍂' },
  { jp: 'けいたい', english: 'cell phone', emoji: '📱' },
  { jp: 'ほうき', english: 'broom', emoji: '🧹' },
  { jp: 'ゆうがた', english: 'early evening', emoji: '🌆' },
  { jp: 'こども', english: 'child', emoji: '🧒' },
  { jp: 'つき', english: 'moon', emoji: '🌙' },
  { jp: 'いとこ', english: 'cousin', emoji: '👫' },
  { jp: 'ふうせん', english: 'balloon', emoji: '🎈' },
  { jp: 'へんじ', english: 'reply / respond', emoji: '💬' },
  { jp: 'いろ', english: 'color', emoji: '🎨' },
  { jp: 'はた', english: 'flag', emoji: '🚩' },
  { jp: 'にほん', english: 'Japan', emoji: '🗾' },
  { jp: 'ふゆ', english: 'winter', emoji: '⛄' },
  { jp: 'うみ', english: 'beach / ocean', emoji: '🌊' },
  { jp: 'のみもの', english: 'drink', emoji: '🥤' },
  { jp: 'まんが', english: 'comic', emoji: '📚' },
  { jp: 'やさい', english: 'vegetable', emoji: '🥦' },
  { jp: 'にく', english: 'meat', emoji: '🥩' },
  { jp: 'さいふ', english: 'wallet', emoji: '👛' },
  { jp: 'おかね', english: 'money', emoji: '💰' },
  { jp: 'せっけん', english: 'soap', emoji: '🧼' },
  { jp: 'たべもの', english: 'food', emoji: '🍱' },
  { jp: 'うんどうかい', english: 'sports meeting', emoji: '🏃' },
  { jp: 'だれ', english: 'who?', emoji: '❓' },
  { jp: 'さくら', english: 'cherry blossom', emoji: '🌸' },
  { jp: 'うどん', english: 'udon noodle', emoji: '🍜' },
  { jp: 'さむい', english: 'cold', emoji: '🥶' },
  { jp: 'ごはん', english: 'steamed rice', emoji: '🍚' },
  { jp: 'あに', english: 'older brother', emoji: '👦' },
  { jp: 'いしゃ', english: 'doctor', emoji: '🧑‍⚕️' },
  { jp: 'しごと', english: 'job', emoji: '💼' },
  { jp: 'なに', english: 'what?', emoji: '❔' },
  { jp: 'きのう', english: 'yesterday', emoji: '⏪' },
  { jp: 'きょう', english: 'today', emoji: '📅' },
  { jp: 'あした', english: 'tomorrow', emoji: '⏩' },
  { jp: 'ゆき', english: 'snow', emoji: '❄️' },
  { jp: 'はれ', english: 'sunny / clear', emoji: '☀️' },
  { jp: 'わすれました', english: 'I forgot!', emoji: '😅' },
  { jp: 'すみません', english: 'excuse me', emoji: '🙋' },
  { jp: 'まってください', english: 'wait a minute', emoji: '✋' },
  { jp: 'もういちど', english: 'one more time', emoji: '🔁' },
];

// ── Question Quest (question-word Q&A) ───────────────────────────────────────

export interface QaItem {
  question: string;
  questionEn: string;
  correct: string;
  correctEn: string;
  distractors: string[];
}

export const QA_ITEMS: QaItem[] = [
  {
    question: 'なんさい ですか。',
    questionEn: 'How old are you?',
    correct: 'じゅっさい です。',
    correctEn: "I'm 10 years old.",
    distractors: ['みっつ です。', 'むいか です。'],
  },
  {
    question: 'なんにん ですか。',
    questionEn: 'How many people?',
    correct: 'さんにん です。',
    correctEn: 'Three people.',
    distractors: ['ななさい です。', 'ここのか です。'],
  },
  {
    question: 'なにいろ ですか。',
    questionEn: 'What color is it?',
    correct: 'きいろ です。',
    correctEn: "It's yellow.",
    distractors: ['ごにん です。', 'つき です。'],
  },
  {
    question: 'だれ ですか。',
    questionEn: 'Who is it?',
    correct: 'ぼくのちち です。',
    correctEn: "It's my dad.",
    distractors: ['すいようび です。', 'にんじん です。'],
  },
  {
    question: 'なんにち ですか。',
    questionEn: 'What day of the month?',
    correct: 'ふつか です。',
    correctEn: "It's the 2nd.",
    distractors: ['ほん です。', 'にちようび です。'],
  },
  {
    question: 'なんようび ですか。',
    questionEn: 'What day of the week?',
    correct: 'げつようび です。',
    correctEn: "It's Monday.",
    distractors: ['しろ です。', 'いえ です。'],
  },
  {
    question: 'なん ですか。',
    questionEn: 'What is it?',
    correct: 'ねこ です。',
    correctEn: "It's a cat.",
    distractors: ['なのか です。', 'ちこく です。'],
  },
  {
    question: 'なにを のみますか。',
    questionEn: 'What do you drink?',
    correct: 'みずを のみます。',
    correctEn: 'I drink water.',
    distractors: ['いちごを たべます。', 'ほしが みえます。'],
  },
];

// ── Particle Picker ──────────────────────────────────────────────────────────

export const PARTICLE_CHOICES = ['は', 'が', 'を', 'に', 'の', 'か', 'も', 'へ', 'と', 'で'];

export interface ParticleSentence {
  english: string;
  segments: SentenceSegment[];
}

export const PARTICLE_SENTENCES: ParticleSentence[] = [
  {
    english: 'I like steamed rice.',
    segments: ['わたし', { answers: ['は'] }, 'ごはん', { answers: ['が'] }, 'すきです。'],
  },
  {
    english: 'This is my pencil.',
    segments: ['これ', { answers: ['は'] }, 'わたし', { answers: ['の'] }, 'えんぴつです。'],
  },
  {
    english: 'I go to school.',
    segments: ['ぼく', { answers: ['は'] }, 'がっこう', { answers: ['に', 'へ'] }, 'いきます。'],
  },
  {
    english: 'Do (you) go to Japan?',
    segments: ['にほん', { answers: ['に', 'へ'] }, 'いきます', { answers: ['か'] }, '。'],
  },
  {
    english: 'My mother eats egg.',
    segments: [
      'ぼく',
      { answers: ['の'] },
      'はは',
      { answers: ['は'] },
      'たまご',
      { answers: ['を'] },
      'たべます。',
    ],
  },
  {
    english: 'My shoes are white.',
    segments: ['わたし', { answers: ['の'] }, 'くつ', { answers: ['は'] }, 'しろです。'],
  },
  {
    english: 'My family has five members.',
    segments: ['ぼく', { answers: ['の'] }, 'かぞく', { answers: ['は'] }, 'ごにんです。'],
  },
  {
    english: 'I am a student.',
    segments: ['ぼく', { answers: ['は'] }, 'せいとです。'],
  },
  {
    english: 'I am a student, too.',
    segments: ['わたし', { answers: ['も'] }, 'せいとです。'],
  },
  {
    english: 'My father drinks tea.',
    segments: [
      'わたし',
      { answers: ['の'] },
      'ちち',
      { answers: ['は'] },
      'おちゃ',
      { answers: ['を'] },
      'のみます。',
    ],
  },
  {
    english: 'I go to the park with my dad.',
    segments: ['ちち', { answers: ['と'] }, 'こうえん', { answers: ['に', 'へ'] }, 'いきます。'],
  },
  {
    english: 'I eat ramen and sushi.',
    segments: ['ラーメン', { answers: ['と'] }, 'すし', { answers: ['を'] }, 'たべます。'],
  },
  {
    english: 'Taro and Jiro are friends.',
    segments: ['たろう', { answers: ['と'] }, 'じろう', { answers: ['は'] }, 'ともだちです。'],
  },
  {
    english: 'I speak English at home.',
    segments: ['いえ', { answers: ['で'] }, 'えいご', { answers: ['を'] }, 'はなします。'],
  },
  {
    english: 'I study at school.',
    segments: ['がっこう', { answers: ['で'] }, 'べんきょう', { answers: ['を'] }, 'します。'],
  },
  {
    english: 'I woke up at six o’clock.',
    segments: ['ろくじ', { answers: ['に'] }, 'おきました。'],
  },
];
