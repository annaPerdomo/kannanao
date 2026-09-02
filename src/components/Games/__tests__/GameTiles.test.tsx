import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/test/renderWithProviders';

import { GameTiles } from '../GameTiles';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }));

describe('GameTiles', () => {
  it('renders every built-in game tile', () => {
    renderWithProviders(<GameTiles />);
    expect(screen.getAllByRole('button')).toHaveLength(5);
  });

  it('renders leading cards ahead of the games, in the same grid', () => {
    renderWithProviders(
      <GameTiles
        leading={[
          {
            title: 'Learn Kana',
            description: 'Read hiragana and katakana.',
            jpTitle: 'かなをまなぶ',
            emoji: '🌸',
            gradient: 'linear-gradient(135deg, #ec4899, #be185d)',
            href: '/review/learn-kana',
          },
        ]}
      />,
    );
    const tiles = screen.getAllByRole('button');
    expect(tiles).toHaveLength(6);
    expect(tiles[0]).toHaveAttribute('aria-label', expect.stringContaining('Learn Kana'));
  });

  it('navigates to the game on click', () => {
    renderWithProviders(<GameTiles />);
    fireEvent.click(screen.getAllByRole('button')[0]);
    expect(mockPush).toHaveBeenCalledWith('/review/match');
  });
});
