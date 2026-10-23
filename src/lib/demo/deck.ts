import type { Assignment } from '@/hooks/useAssignments';
import { GOAL_MODES } from '@/lib/assignmentMastery';
import { MIN_SENTENCES } from '@/lib/mixedPractice';
import type { Deck } from '@/types/deck';
import type { Flashcard } from '@/types/flashcard';
import type { DbPracticeSentence } from '@/types/practiceSentence';

import { dateKey, DAY_MS } from './time';

export const DEMO_DECK_KEY = 'demo-days';

interface DemoCardSeed {
  id: string;
  word: string;
  reading: string;
  meaning: string;
  example_jp: string;
  example_en: string;
}

const CARD_SEEDS: DemoCardSeed[] = [
  {
    id: 'demo-card-getsuyoubi',
    word: '月よう日',
    reading: 'げつようび',
    meaning: 'Monday',
    example_jp: '{月|げつ}ようびに がっこうへ いきます。',
    example_en: 'I go to school on Monday.',
  },
  {
    id: 'demo-card-kayoubi',
    word: '火よう日',
    reading: 'かようび',
    meaning: 'Tuesday',
    example_jp: '{火|か}ようびに テストが あります。',
    example_en: 'There is a test on Tuesday.',
  },
  {
    id: 'demo-card-suiyoubi',
    word: '水よう日',
    reading: 'すいようび',
    meaning: 'Wednesday',
    example_jp: 'きょうは {水|すい}ようびです。',
    example_en: 'Today is Wednesday.',
  },
  {
    id: 'demo-card-mokuyoubi',
    word: '木よう日',
    reading: 'もくようび',
    meaning: 'Thursday',
    example_jp: '{木|もく}ようびに しゅくだいを します。',
    example_en: 'I do homework on Thursday.',
  },
  {
    id: 'demo-card-kinyoubi',
    word: '金よう日',
    reading: 'きんようび',
    meaning: 'Friday',
    example_jp: 'あしたは {金|きん}ようびです。',
    example_en: 'Tomorrow is Friday.',
  },
  {
    id: 'demo-card-doyoubi',
    word: '土よう日',
    reading: 'どようび',
    meaning: 'Saturday',
    example_jp: '{土|ど}ようびは しゅうまつです。',
    example_en: 'Saturday is part of the weekend.',
  },
  {
    id: 'demo-card-nichiyoubi',
    word: '日よう日',
    reading: 'にちようび',
    meaning: 'Sunday',
    example_jp: '{日|にち}ようびに やすみます。',
    example_en: 'I rest on Sunday.',
  },
  {
    id: 'demo-card-kyou',
    word: 'きょう',
    reading: 'きょう',
    meaning: 'today',
    example_jp: 'きょうは あついです。',
    example_en: 'Today is hot.',
  },
  {
    id: 'demo-card-ashita',
    word: 'あした',
    reading: 'あした',
    meaning: 'tomorrow',
    example_jp: 'あした あいましょう。',
    example_en: "Let's meet tomorrow.",
  },
  {
    id: 'demo-card-kinou',
    word: 'きのう',
    reading: 'きのう',
    meaning: 'yesterday',
    example_jp: 'きのう べんきょうしました。',
    example_en: 'I studied yesterday.',
  },
  {
    id: 'demo-card-ima',
    word: 'いま',
    reading: 'いま',
    meaning: 'now',
    example_jp: 'いま なんじですか。',
    example_en: 'What time is it now?',
  },
  {
    id: 'demo-card-ji',
    word: '～じ',
    reading: 'じ',
    meaning: "o'clock (time counter)",
    example_jp: 'いま さん{時|じ}です。',
    example_en: "It's three o'clock now.",
  },
  {
    id: 'demo-card-fun',
    word: '～ふん',
    reading: 'ふん',
    meaning: 'minutes (time counter)',
    example_jp: 'ごじゅう{分|ふん}かかります。',
    example_en: 'It takes fifty minutes.',
  },
  {
    id: 'demo-card-shuumatsu',
    word: 'しゅうまつ',
    reading: 'しゅうまつ',
    meaning: 'weekend',
    example_jp: 'しゅうまつに やすみます。',
    example_en: 'I rest on the weekend.',
  },
];

export const DEMO_CARDS: Flashcard[] = CARD_SEEDS.map((seed, position) => ({
  id: seed.id,
  word: seed.word,
  reading: seed.reading,
  romaji: '',
  meaning: seed.meaning,
  image_query: '',
  example_jp: seed.example_jp,
  example_en: seed.example_en,
  imageUrl: undefined,
  deckId: DEMO_DECK_KEY,
  mainViewMode: 'hiragana',
  cardType: 'word',
  jlptLevel: 'N5',
  position,
}));

const SENTENCE_SEEDS: {
  id: string;
  sentence_jp: string;
  sentence_en: string;
  target_particle: string;
  distractors: string[];
  sentence_type: DbPracticeSentence['sentence_type'];
  conversation_group: number;
  sort_order: number;
  source_card_ids: string[];
}[] = [
  {
    id: 'demo-sentence-1',
    sentence_jp: 'げつようびに がっこうへ いきます',
    sentence_en: 'I go to school on Monday.',
    target_particle: 'に',
    distractors: ['で', 'を'],
    sentence_type: 'statement',
    conversation_group: 1,
    sort_order: 0,
    source_card_ids: ['demo-card-getsuyoubi'],
  },
  {
    id: 'demo-sentence-2',
    sentence_jp: 'きょうは すいようびです',
    sentence_en: 'Today is Wednesday.',
    target_particle: 'は',
    distractors: ['が', 'も'],
    sentence_type: 'statement',
    conversation_group: 1,
    sort_order: 1,
    source_card_ids: ['demo-card-kyou', 'demo-card-suiyoubi'],
  },
  {
    id: 'demo-sentence-3',
    sentence_jp: 'あしたは きんようびです',
    sentence_en: 'Tomorrow is Friday.',
    target_particle: 'は',
    distractors: ['が', 'も'],
    sentence_type: 'statement',
    conversation_group: 2,
    sort_order: 0,
    source_card_ids: ['demo-card-ashita', 'demo-card-kinyoubi'],
  },
  {
    id: 'demo-sentence-4',
    sentence_jp: 'しゅうまつに やすみます',
    sentence_en: 'I rest on the weekend.',
    target_particle: 'に',
    distractors: ['で', 'を'],
    sentence_type: 'statement',
    conversation_group: 2,
    sort_order: 1,
    source_card_ids: ['demo-card-shuumatsu'],
  },
];

export const DEMO_SENTENCES: DbPracticeSentence[] = SENTENCE_SEEDS.map((seed) => ({
  id: seed.id,
  deck_id: DEMO_DECK_KEY,
  sentence_jp: seed.sentence_jp,
  sentence_en: seed.sentence_en,
  target_particle: seed.target_particle,
  particle_index: seed.sentence_jp.indexOf(seed.target_particle),
  distractors: seed.distractors,
  sentence_type: seed.sentence_type,
  conversation_group: seed.conversation_group,
  sort_order: seed.sort_order,
  source_card_ids: seed.source_card_ids,
  created_at: new Date(0).toISOString(),
}));

if (DEMO_SENTENCES.length < MIN_SENTENCES) {
  throw new Error('DEMO_SENTENCES must have at least MIN_SENTENCES rows');
}

export const DEMO_DECK: Deck = {
  id: DEMO_DECK_KEY,
  name: 'Days of the week',
  createdAt: 0,
  cardCount: DEMO_CARDS.length,
  ownerId: 'demo-teacher',
  emoji: '📅',
  position: 0,
};

function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * DAY_MS);
}

export function demoAssignment(now: Date): Assignment {
  const requiredMode = (GOAL_MODES as readonly string[]).includes('quiz') ? 'quiz' : 'fill';
  return {
    id: 'demo-assignment',
    organizer_id: 'demo-teacher',
    member_id: 'demo-member',
    deck_id: DEMO_DECK_KEY,
    kana_set: null,
    title: 'Days of the week',
    note: null,
    due_date: dateKey(addDays(now, 7)),
    available_on: dateKey(addDays(now, -14)),
    completed_at: null,
    created_at: addDays(now, -14).toISOString(),
    required_accuracy: 80,
    required_mode: requiredMode,
    progress_accuracy: null,
    baseline_accuracy: 0,
    goal_met_at: null,
  };
}
