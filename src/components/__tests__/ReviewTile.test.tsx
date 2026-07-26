import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ReviewTile } from '@/components/ReviewTile';
import { renderWithProviders } from '@/test/renderWithProviders';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

const dueCount = vi.fn();
vi.mock('@/hooks/useDueCount', () => ({ useDueCount: () => dueCount() }));

const state = (
  over: Partial<{ dueCount: number; loading: boolean; error: string | null }> = {},
) => ({
  dueCount: 0,
  loading: false,
  error: null,
  ...over,
});

describe('ReviewTile', () => {
  beforeEach(() => {
    push.mockClear();
    dueCount.mockReturnValue(state({ dueCount: 24 }));
  });

  it('should stay hidden until the count is known', () => {
    dueCount.mockReturnValue(state({ loading: true }));
    const { container } = renderWithProviders(<ReviewTile />);
    expect(container).toBeEmptyDOMElement();
  });

  // Rendering "all caught up" off a failed request would tell the reader their
  // review queue is empty when we simply don't know.
  it('should stay hidden when the count failed to load', () => {
    dueCount.mockReturnValue(state({ error: 'boom' }));
    const { container } = renderWithProviders(<ReviewTile />);
    expect(container).toBeEmptyDOMElement();
  });

  it('should invite the reader in when cards are due', () => {
    renderWithProviders(<ReviewTile />);
    expect(screen.getByText(/24 words waiting/)).toBeInTheDocument();
  });

  it('should stay calm when nothing is due', () => {
    dueCount.mockReturnValue(state({ dueCount: 0 }));
    renderWithProviders(<ReviewTile />);
    expect(screen.getByText(/All caught up/)).toBeInTheDocument();
  });

  it('should go to the review hub on click', () => {
    renderWithProviders(<ReviewTile />);
    fireEvent.click(screen.getByRole('button'));
    expect(push).toHaveBeenCalledWith('/review');
  });

  it('should go to the review hub on Space so it is reachable by keyboard', () => {
    renderWithProviders(<ReviewTile />);
    fireEvent.keyDown(screen.getByRole('button'), { key: ' ' });
    expect(push).toHaveBeenCalledWith('/review');
  });

  describe('compact', () => {
    it('should lead with the due count', () => {
      renderWithProviders(<ReviewTile compact />);
      expect(screen.getByText(/24 cards due today/)).toBeInTheDocument();
    });

    it('should say one card, not 1 cards', () => {
      dueCount.mockReturnValue(state({ dueCount: 1 }));
      renderWithProviders(<ReviewTile compact />);
      expect(screen.getByText(/1 card due today/)).toBeInTheDocument();
    });

    it('should keep the same destination and label as the full tile', () => {
      renderWithProviders(<ReviewTile compact />);
      const pill = screen.getByRole('button', { name: 'Review — 24 due today' });
      fireEvent.click(pill);
      expect(push).toHaveBeenCalledWith('/review');
    });

    it('should hold the caught-up state too', () => {
      dueCount.mockReturnValue(state({ dueCount: 0 }));
      renderWithProviders(<ReviewTile compact />);
      expect(screen.getByRole('button', { name: 'Review — all caught up' })).toBeInTheDocument();
    });
  });
});
