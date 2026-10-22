import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/test/renderWithProviders';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

const shopState = {
  owned: [] as string[],
  equipped: {} as Record<string, string>,
  loading: false,
  loadError: false,
};
vi.mock('@/contexts/ShopContext', () => ({
  useShopCtx: () => ({
    ownsItem: (key: string) => key === 'buddy_tango' || shopState.owned.includes(key),
    equipped: shopState.equipped,
    loading: shopState.loading,
    loadError: shopState.loadError,
  }),
}));

import { StickerPanel } from '../StickerPanel';

const onSelect = vi.fn();
const onClose = vi.fn();

function open() {
  return renderWithProviders(<StickerPanel onSelect={onSelect} onClose={onClose} />);
}

describe('StickerPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    shopState.owned = [];
    shopState.equipped = {};
    shopState.loading = false;
    shopState.loadError = false;
  });

  it('opens on the equipped buddy and sends its stickers', () => {
    shopState.owned = ['buddy_fox'];
    shopState.equipped = { study_buddy: 'buddy_fox' };
    open();

    fireEvent.click(screen.getByLabelText('Inari sticker 3'));

    expect(onSelect).toHaveBeenCalledWith('fox-3');
    expect(onClose).toHaveBeenCalled();
  });

  it('still offers Tango to everyone', () => {
    open();

    fireEvent.click(screen.getByLabelText('Hello'));

    expect(onSelect).toHaveBeenCalledWith('wave');
  });

  it('shows locked buddies as a preview with a way to the shop, not as stickers', () => {
    open();

    fireEvent.click(screen.getByLabelText('Inari stickers (locked)'));

    expect(screen.queryByLabelText('Inari sticker 3')).toBeNull();
    expect(screen.getByText(/Make friends with Inari/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /40,000 XP/ }));
    expect(mockPush).toHaveBeenCalledWith('/shop');
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('says it could not check ownership instead of offering a buddy they may own', () => {
    shopState.loadError = true;
    open();

    fireEvent.click(screen.getByLabelText('Inari stickers (locked)'));

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /XP/ })).toBeNull();
  });

  it('waits for the shop before claiming anything is locked', () => {
    shopState.loading = true;
    open();

    expect(screen.queryByLabelText(/locked/)).toBeNull();
    expect(screen.queryByLabelText('Hello')).toBeNull();
  });
});
