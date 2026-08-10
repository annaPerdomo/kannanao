import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ActivityFeed } from '@/components/Group/ActivityFeed';
import type { FeedItem } from '@/hooks/useGroup';
import { renderWithProviders } from '@/test/renderWithProviders';

const DAY = 24 * 60 * 60 * 1000;

function items(count: number): FeedItem[] {
  return Array.from({ length: count }, (_, i) => ({
    type: 'perfect_score' as const,
    memberId: `m${i}`,
    memberName: `Member ${i}`,
    description: 'got a perfect score!',
    emoji: '💯',
    timestamp: new Date(Date.now() - (i + 1) * DAY).toISOString(),
  }));
}

describe('ActivityFeed', () => {
  it('renders the rows in the order given, newest first', () => {
    renderWithProviders(<ActivityFeed items={items(3)} />);

    const names = screen.getAllByText(/^Member \d$/).map((el) => el.textContent);
    expect(names).toEqual(['Member 0', 'Member 1', 'Member 2']);
  });

  it('collapses past ten rows and reveals the rest on click', () => {
    renderWithProviders(<ActivityFeed items={items(16)} />);

    expect(screen.getAllByText(/^Member \d+$/)).toHaveLength(10);

    fireEvent.click(screen.getByRole('button', { name: 'Show all 16' }));
    expect(screen.getAllByText(/^Member \d+$/)).toHaveLength(16);

    fireEvent.click(screen.getByRole('button', { name: 'Show less' }));
    expect(screen.getAllByText(/^Member \d+$/)).toHaveLength(10);
  });

  it('shows no toggle when the feed fits', () => {
    renderWithProviders(<ActivityFeed items={items(9)} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('shows the empty state with no activity', () => {
    renderWithProviders(<ActivityFeed items={[]} />);
    expect(screen.getByText('No recent activity yet.')).toBeInTheDocument();
  });
});
