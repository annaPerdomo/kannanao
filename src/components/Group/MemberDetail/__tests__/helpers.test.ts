import { describe, expect, it } from 'vitest';

import type { MemberDetail } from '@/hooks/useGroup';

import { handoutRefFromItem } from '../helpers';

function makeItem(
  overrides: Partial<MemberDetail['assignments']['items'][number]> = {},
): MemberDetail['assignments']['items'][number] {
  return {
    id: 'a1',
    title: 'Chapter 1',
    deckName: 'Animals',
    deckEmoji: '🐶',
    deckId: 'deck1',
    kanaSet: null,
    note: 'Practice daily',
    availableOn: '2026-09-10',
    dueDate: '2026-10-01',
    completedAt: null,
    createdAt: '2026-09-01T00:00:00Z',
    requiredAccuracy: 80,
    requiredMode: 'study',
    progressAccuracy: null,
    ...overrides,
  };
}

describe('handoutRefFromItem', () => {
  it('maps every field, preferring the title over the deck name', () => {
    const ref = handoutRefFromItem(makeItem());

    expect(ref).toEqual({
      deckId: 'deck1',
      kanaSet: null,
      name: 'Chapter 1',
      emoji: '🐶',
      note: 'Practice daily',
      availableOn: '2026-09-10',
      dueDate: '2026-10-01',
      requiredAccuracy: 80,
      requiredMode: 'study',
    });
  });

  it('falls back to the deck name when there is no title', () => {
    const ref = handoutRefFromItem(makeItem({ title: null }));

    expect(ref.name).toBe('Animals');
  });

  it('maps a kana item', () => {
    const ref = handoutRefFromItem(
      makeItem({
        title: null,
        deckId: null,
        kanaSet: 'hira-a',
        deckName: 'あ・い・う・え・お',
        deckEmoji: '🌸',
        requiredAccuracy: null,
        requiredMode: null,
      }),
    );

    expect(ref).toEqual({
      deckId: null,
      kanaSet: 'hira-a',
      name: 'あ・い・う・え・お',
      emoji: '🌸',
      note: 'Practice daily',
      availableOn: '2026-09-10',
      dueDate: '2026-10-01',
      requiredAccuracy: null,
      requiredMode: null,
    });
  });
});
