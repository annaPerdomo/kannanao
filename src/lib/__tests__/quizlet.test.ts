import { beforeEach, describe, expect, it } from 'vitest';

import {
  addToQueue,
  buildQuizletBookmarklet,
  cleanQuizletTitle,
  decodeQuizletHash,
  isReadyToSave,
  keptCards,
  loadQuizletQueue,
  mainViewModeFor,
  parseQuizletSet,
  QUIZLET_QUEUE_KEY,
  quizletCardToDraft,
  saveQuizletQueue,
  toBase64Url,
  toImportSet,
} from '@/lib/quizlet';

const SET_URL = 'https://quizlet.com/826640589/ch-5-new-vocabulary-flash-cards/';

function hashFor(payload: unknown): string {
  return `#quizlet=${toBase64Url(JSON.stringify(payload))}`;
}

describe('quizletCardToDraft', () => {
  it('keeps a kana-only term as the word with no reading', () => {
    const card = quizletCardToDraft({ front: 'しゅみ', back: 'Hobby' });
    expect(card).toMatchObject({
      word: 'しゅみ',
      reading: '',
      meaning: 'Hobby',
      cardType: 'word',
      include: true,
    });
  });

  it.each([
    ['あか 赤', '赤', 'あか'],
    ['赤 あか', '赤', 'あか'],
    ['なにいろ　何色', '何色', 'なにいろ'],
    ['赤（あか）', '赤', 'あか'],
    ['赤(あか)', '赤', 'あか'],
    ['じょうず（上手）', '上手', 'じょうず'],
  ])('splits %s into word + reading', (front, word, reading) => {
    expect(quizletCardToDraft({ front, back: 'red' })).toMatchObject({ word, reading });
  });

  it.each([['赤い りんご'], ['とても 好き'], ['大きい いぬ']])(
    'keeps %s as a phrase instead of reading one word as the other',
    (front) => {
      const card = quizletCardToDraft({ front, back: 'x' });
      expect(card).toMatchObject({ word: front, reading: '', cardType: 'phrase' });
    },
  );

  it.each([
    ['たべる 食べる', '食べる', 'たべる'],
    ['毎日 まいにち', '毎日', 'まいにち'],
    ['きょう 今日', '今日', 'きょう'],
  ])('still splits %s', (front, word, reading) => {
    expect(quizletCardToDraft({ front, back: 'x' })).toMatchObject({ word, reading });
  });

  it('marks sentences as phrases and keeps a Japanese back as the meaning', () => {
    const card = quizletCardToDraft({
      front: 'おかあさんの しゅみは なんですか。（Piano）',
      back: 'ははの しゅみは ピアノです。',
    });
    expect(card.cardType).toBe('phrase');
    expect(card.reading).toBe('');
    expect(card.meaning).toBe('ははの しゅみは ピアノです。');
  });

  it('swaps English-front sets so Japanese is always the word', () => {
    expect(quizletCardToDraft({ front: 'red', back: 'あか' })).toMatchObject({
      word: 'あか',
      meaning: 'red',
    });
  });

  it('carries the image and leaves half-empty cards unticked', () => {
    const card = quizletCardToDraft({
      front: 'え',
      back: '',
      image: 'https://o.quizlet.com/a.png',
    });
    expect(card.imageUrl).toBe('https://o.quizlet.com/a.png');
    expect(card.include).toBe(false);
  });
});

describe('mainViewModeFor', () => {
  it('shows the kanji only when there is a reading to put over it', () => {
    expect(mainViewModeFor('赤', 'あか')).toBe('kanji');
    expect(mainViewModeFor('赤', '')).toBe('hiragana');
    expect(mainViewModeFor('しゅみ', '')).toBe('hiragana');
  });
});

describe('parseQuizletSet', () => {
  it('cleans the title and whitespace', () => {
    const set = parseQuizletSet({
      title: 'Ch 5 New Vocabulary Flashcards | Quizlet',
      url: SET_URL,
      cards: [{ front: '  しゅみ ', back: 'Hobby\n' }],
    });
    expect(set).toEqual({
      title: 'Ch 5 New Vocabulary',
      url: SET_URL,
      cards: [{ front: 'しゅみ', back: 'Hobby' }],
    });
  });

  it.each([
    [
      'a non-Quizlet url',
      { url: 'https://evil.example/123/x', cards: [{ front: 'a', back: 'b' }] },
    ],
    ['a Quizlet page that is not a set', { url: 'https://quizlet.com/latest', cards: [] }],
    ['no cards', { url: SET_URL, cards: [] }],
    ['garbage', 'nope'],
  ])('rejects %s', (_, raw) => {
    expect(parseQuizletSet(raw)).toBeNull();
  });

  it('drops images that are not hosted by Quizlet', () => {
    const set = parseQuizletSet({
      url: SET_URL,
      cards: [
        { front: 'a', back: 'b', image: 'javascript:alert(1)' },
        { front: 'c', back: 'd', image: 'https://o.quizlet.com/x.jpg' },
      ],
    });
    expect(set?.cards).toEqual([
      { front: 'a', back: 'b' },
      { front: 'c', back: 'd', image: 'https://o.quizlet.com/x.jpg' },
    ]);
  });
});

describe('decodeQuizletHash', () => {
  it('round-trips Japanese text through base64url', () => {
    const set = decodeQuizletHash(
      hashFor({ title: '色', url: SET_URL, cards: [{ front: 'あか 赤', back: 'red' }] }),
    );
    expect(set?.cards[0].front).toBe('あか 赤');
    expect(set?.title).toBe('色');
  });

  it('returns null for a missing or corrupt payload', () => {
    expect(decodeQuizletHash('')).toBeNull();
    expect(decodeQuizletHash('#quizlet=%%%')).toBeNull();
  });
});

describe('cleanQuizletTitle', () => {
  it('strips the Quizlet suffix', () => {
    expect(cleanQuizletTitle('Ch5-5 Colors Flashcards | Quizlet')).toBe('Ch5-5 Colors');
    expect(cleanQuizletTitle('Colors')).toBe('Colors');
  });
});

describe('queue', () => {
  beforeEach(() => localStorage.clear());

  const draft = toImportSet({ title: 'A', url: SET_URL, cards: [{ front: 'a', back: 'b' }] });

  it('persists reviewed drafts and clears the key when empty', () => {
    const edited = { ...draft, name: 'Edited', cards: [{ ...draft.cards[0], include: false }] };
    saveQuizletQueue([edited]);
    expect(loadQuizletQueue()).toEqual([edited]);
    saveQuizletQueue([]);
    expect(localStorage.getItem(QUIZLET_QUEUE_KEY)).toBeNull();
  });

  it('ignores corrupt storage and drops non-Quizlet entries', () => {
    localStorage.setItem(QUIZLET_QUEUE_KEY, '{not json');
    expect(loadQuizletQueue()).toEqual([]);
    localStorage.setItem(
      QUIZLET_QUEUE_KEY,
      JSON.stringify([{ ...draft, url: 'https://x.test/1' }]),
    );
    expect(loadQuizletQueue()).toEqual([]);
  });

  it('replaces a re-sent set instead of duplicating it', () => {
    const updated = { ...draft, name: 'B' };
    expect(addToQueue([draft], updated)).toEqual([updated]);
  });

  it('counts only ticked cards with a word as ready to save', () => {
    expect(isReadyToSave(draft)).toBe(true);
    expect(keptCards({ ...draft, cards: [{ ...draft.cards[0], word: ' ' }] })).toEqual([]);
    expect(isReadyToSave({ ...draft, include: false })).toBe(false);
  });
});

describe('buildQuizletBookmarklet', () => {
  it('is a javascript: URL that targets the given origin', () => {
    const code = buildQuizletBookmarklet('https://www.tangodachi.app', {
      notASet: 'x',
      failed: 'y',
    });
    expect(code.startsWith('javascript:')).toBe(true);
    const source = decodeURIComponent(code.slice('javascript:'.length));
    expect(source).toContain('"https://www.tangodachi.app"');
    expect(source).toContain('/materials?tab=quizlet#quizlet=');
    expect(() => new Function(source)).not.toThrow();
  });
});
