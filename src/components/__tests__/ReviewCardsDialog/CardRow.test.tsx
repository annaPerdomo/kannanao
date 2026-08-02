import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { CardRow, type PendingCard } from '@/components/ReviewCardsDialog/CardRow';
import { renderWithProviders } from '@/test/renderWithProviders';

vi.mock('@/services/api', () => ({
  deleteStorageImage: vi.fn(),
  decodeUnsplashAttribution: vi.fn((url: string) =>
    url.includes('#unsplash:')
      ? {
          name: 'Hu Chen',
          photographerUrl: 'https://unsplash.com/@huchenme',
          photoPageUrl: 'https://unsplash.com/photos/abc',
        }
      : null,
  ),
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
  const onToggleExpand = vi.fn();
  return {
    onToggleExpand,
    ...renderWithProviders(
      <CardRow
        card={card(over)}
        originalExampleJp=""
        index={0}
        expanded={false}
        onToggleExpand={onToggleExpand}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
      />,
    ),
  };
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

  // Unsplash's API guidelines want the credit wherever the photo shows, and a
  // collapsed row shows it as a thumbnail.
  it('credits the photographer next to the thumbnail', () => {
    renderRow({ imageUrl: 'https://images.unsplash.com/photo-1?w=400#unsplash:name=Hu%20Chen' });
    expect(screen.getByRole('link', { name: 'Hu Chen' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Unsplash' })).toBeInTheDocument();
  });

  it('shows no credit for an uploaded picture', () => {
    renderRow({ imageUrl: 'https://storage.example.com/upload.png' });
    expect(screen.queryByRole('link', { name: 'Unsplash' })).not.toBeInTheDocument();
  });

  it('does not expand the row when the credit is followed', () => {
    const { onToggleExpand } = renderRow({
      imageUrl: 'https://images.unsplash.com/photo-1?w=400#unsplash:name=Hu%20Chen',
    });

    fireEvent.click(screen.getByRole('link', { name: 'Hu Chen' }));
    fireEvent.click(screen.getByRole('link', { name: 'Unsplash' }));

    expect(onToggleExpand).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText('入居者'));
    expect(onToggleExpand).toHaveBeenCalled();
  });
});
