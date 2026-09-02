import { fireEvent, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/test/renderWithProviders';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => new URLSearchParams('games=1'),
}));
vi.mock('@/hooks/useDailyPractice', () => ({
  useDailyFocus: () => ({
    dueCount: 0,
    kanaDue: false,
    focus: null,
    empty: true,
    loading: false,
    error: null,
    retry: vi.fn(),
  }),
}));

import ReviewHubPage from '@/app/(app)/review/page';

beforeEach(() => vi.clearAllMocks());

describe('Review hub — Learn Kana tile', () => {
  it('should open the kana journey when tapped', () => {
    renderWithProviders(<ReviewHubPage />);
    fireEvent.click(screen.getByRole('button', { name: /^Learn Kana —/ }));
    expect(mockPush).toHaveBeenCalledWith('/review/learn-kana');
  });

  it('should open it from the keyboard', () => {
    renderWithProviders(<ReviewHubPage />);
    fireEvent.keyDown(screen.getByRole('button', { name: /^Learn Kana —/ }), { key: 'Enter' });
    expect(mockPush).toHaveBeenCalledWith('/review/learn-kana');
  });

  it('should no longer promise one row at a time, which the chart replaced', () => {
    renderWithProviders(<ReviewHubPage />);
    const tile = screen.getByRole('button', { name: /^Learn Kana —/ });
    expect(tile).toHaveAccessibleName(/brush up the ones going rusty/);
    expect(tile).not.toHaveAccessibleName(/one row at a time/);
  });

  it('should sit ahead of the arcade games', () => {
    const { container } = renderWithProviders(<ReviewHubPage />);
    const tiles = within(container).getAllByRole('button', { name: /—/ });
    expect(tiles[0]).toHaveAccessibleName(/^Learn Kana —/);
    expect(tiles.some((t) => /^Word Match —/.test(t.getAttribute('aria-label') ?? ''))).toBe(true);
  });
});
