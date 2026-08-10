import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BuddyPreviewModal } from '@/components/Shop/BuddyPreviewModal';
import { renderWithProviders } from '@/test/renderWithProviders';
import type { ShopItem } from '@/types/shop';

const ownsItem = vi.fn((_key: string) => true);
vi.mock('@/contexts/ShopContext', () => ({
  useShopCtx: () => ({ ownsItem: (key: string) => ownsItem(key) }),
}));

const friendshipState = vi.fn();
vi.mock('@/contexts/BuddyFriendshipContext', () => ({
  useBuddyFriendshipCtx: () => friendshipState(),
}));

const ITEM = { key: 'buddy_bunny', name: 'Tsuki', cost: 0 } as unknown as ShopItem;

const friendship = (
  points: number,
  loadState: 'idle' | 'loading' | 'loaded' | 'error' = 'loaded',
) => ({
  friendships: { buddy_bunny: { buddyKey: 'buddy_bunny', points } },
  loadState,
  ensureLoaded: vi.fn().mockResolvedValue(undefined),
});

describe('BuddyPreviewModal friendship meter', () => {
  beforeEach(() => {
    ownsItem.mockReturnValue(true);
    friendshipState.mockReturnValue(friendship(45));
  });

  it('should show the owned buddy’s level once the rows land', () => {
    renderWithProviders(<BuddyPreviewModal open onClose={vi.fn()} item={ITEM} />);
    expect(screen.getByRole('img', { name: /Good Friend/ })).toBeInTheDocument();
  });

  // A meter that starts at "New Friend, 0/15" and then snaps up reads as lost
  // progress — every other friendship surface waits for the rows.
  it('should show nothing rather than a false zero while the rows load', () => {
    friendshipState.mockReturnValue(friendship(45, 'loading'));
    renderWithProviders(<BuddyPreviewModal open onClose={vi.fn()} item={ITEM} />);
    expect(screen.queryByRole('img', { name: /Friendship:/ })).toBeNull();
  });

  it('should not tease the mechanic on a buddy that is not owned', () => {
    ownsItem.mockReturnValue(false);
    renderWithProviders(<BuddyPreviewModal open onClose={vi.fn()} item={ITEM} />);
    expect(screen.queryByRole('img', { name: /Friendship:/ })).toBeNull();
  });
});
