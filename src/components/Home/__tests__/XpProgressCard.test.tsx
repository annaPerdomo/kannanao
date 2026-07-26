import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { XpProgressCard } from '@/components/Home';
import { xpProgressInLevel } from '@/hooks/useProgress';
import { renderWithProviders } from '@/test/renderWithProviders';

const BASE = {
  level: 10,
  totalXp: 20708,
  onShopClick: () => {},
};

describe('XpProgressCard', () => {
  it('should show progress through the current level', () => {
    renderWithProviders(<XpProgressCard {...BASE} />);
    const { current, needed } = xpProgressInLevel(BASE.totalXp);
    expect(screen.getByText(`${current} / ${needed}`)).toBeInTheDocument();
  });

  it('should name the next level, not the current one', () => {
    renderWithProviders(<XpProgressCard {...BASE} level={10} />);
    expect(screen.getByText(/to level 11/)).toBeInTheDocument();
  });

  // The copy only ever names the *next* level, so the badge is the one place the
  // current one is stated — and it has to be readable, not decorative.
  it('should state the current level on the badge', () => {
    renderWithProviders(<XpProgressCard {...BASE} level={7} />);
    expect(screen.getByText('Level')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
  });

  it('should go to the shop on click', () => {
    const onShopClick = vi.fn();
    renderWithProviders(<XpProgressCard {...BASE} onShopClick={onShopClick} />);
    fireEvent.click(screen.getByRole('button', { name: /shop/i }));
    expect(onShopClick).toHaveBeenCalledTimes(1);
  });

  it('should go to the shop on Enter so it is reachable by keyboard', () => {
    const onShopClick = vi.fn();
    renderWithProviders(<XpProgressCard {...BASE} onShopClick={onShopClick} />);
    fireEvent.keyDown(screen.getByRole('button', { name: /shop/i }), { key: 'Enter' });
    expect(onShopClick).toHaveBeenCalledTimes(1);
  });
});
