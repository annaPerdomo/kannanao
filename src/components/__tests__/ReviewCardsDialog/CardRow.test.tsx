import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { CardRow, type PendingCard } from '@/components/ReviewCardsDialog/CardRow';
import { renderWithProviders } from '@/test/renderWithProviders';

vi.mock('@/services/api', () => ({
  deleteStorageImage: vi.fn(),
  encodeUnsplashUrl: vi.fn(),
  fetchImage: vi.fn(),
  formatFurigana: vi.fn(),
  isStorageImage: vi.fn(() => false),
  triggerUnsplashDownload: vi.fn(),
  uploadImage: vi.fn(),
}));

const card = (over: Partial<PendingCard> = {}): PendingCard => ({
  word: '入居者',
  reading: 'にゅうきょしゃ',
  romaji: 'nyuukyosha',
  meaning: 'resident, tenant',
  image_query: 'apartment',
  example_jp: '{入居者|にゅうきょしゃ}が{増|ふ}えた。',
  example_en: 'The number of residents increased.',
  mainViewMode: 'hiragana',
  cardType: 'word',
  ...over,
});

function renderRow(over: Partial<PendingCard> = {}) {
  return renderWithProviders(
    <CardRow
      card={card(over)}
      originalExampleJp=""
      index={0}
      expanded={false}
      onToggleExpand={vi.fn()}
      onUpdate={vi.fn()}
      onDelete={vi.fn()}
    />,
  );
}

describe('CardRow summary', () => {
  it('shows the word, the reading and the meaning together', () => {
    renderRow();
    // All three at once: the summary used to pick two of them based on
    // mainViewMode, so scanning the list could never confirm a card was right.
    expect(screen.getByText('入居者')).toBeInTheDocument();
    expect(screen.getByText('にゅうきょしゃ')).toBeInTheDocument();
    expect(screen.getByText('resident, tenant')).toBeInTheDocument();
  });

  it('keeps showing the word and meaning in kanji mode', () => {
    renderRow({ mainViewMode: 'kanji' });
    expect(screen.getByText('入居者')).toBeInTheDocument();
    expect(screen.getByText('resident, tenant')).toBeInTheDocument();
  });

  it('shows spaced romaji as the pronunciation in romaji mode', () => {
    renderRow({ mainViewMode: 'romaji', romaji: 'nyuukyo sha' });
    expect(screen.getByText('nyuukyo sha')).toBeInTheDocument();
  });

  it('does not repeat the word when it is already kana', () => {
    renderRow({ word: 'ことば', reading: 'ことば' });
    expect(screen.getAllByText('ことば')).toHaveLength(1);
  });

  it('labels a card that came back without a meaning', () => {
    renderRow({ meaning: '' });
    expect(screen.getByText('No meaning yet')).toBeInTheDocument();
  });
});
