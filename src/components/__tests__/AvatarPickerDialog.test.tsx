import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/test/renderWithProviders';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockUpdateAvatar = vi.fn().mockResolvedValue({ error: null });
const authState = { avatar: null as string | null };
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    avatar: authState.avatar,
    updateAvatar: mockUpdateAvatar,
    displayName: 'Hana',
    user: { email: 'hana@kannanao.local' },
  }),
}));

const shopState = {
  owned: [] as string[],
  loading: false,
  error: null as string | null,
};
vi.mock('@/contexts/ShopContext', () => ({
  useShopCtx: () => ({
    ownsItem: (key: string) => shopState.owned.includes(key),
    loading: shopState.loading,
    error: shopState.error,
  }),
}));

import { AvatarPickerDialog } from '@/components/AvatarPickerDialog';

function open() {
  return renderWithProviders(<AvatarPickerDialog open onClose={vi.fn()} />);
}

/** Face buttons carry an aria-label; the "use my initial" row does not. */
function faceButtons() {
  return screen
    .queryAllByRole('button')
    .filter((b) => /face \d/.test(b.getAttribute('aria-label') ?? ''));
}

describe('AvatarPickerDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateAvatar.mockResolvedValue({ error: null });
    authState.avatar = null;
    shopState.owned = [];
    shopState.loading = false;
    shopState.error = null;
  });

  it('shows only the faces of buddies the user owns', () => {
    shopState.owned = ['buddy_fox'];
    open();

    expect(screen.getByText('Inari')).toBeInTheDocument();
    expect(screen.queryByText('Goro')).toBeNull();
    // 8 face variants for the one owned buddy, and no others.
    expect(faceButtons()).toHaveLength(8);
  });

  it('saves the tapped face as "<key>:<variant>"', async () => {
    shopState.owned = ['buddy_fox'];
    open();

    fireEvent.click(screen.getByLabelText('Inari face 3'));

    expect(mockUpdateAvatar).toHaveBeenCalledWith('buddy_fox:3');
  });

  it('clears the avatar when "use my initial" is tapped', () => {
    shopState.owned = ['buddy_fox'];
    authState.avatar = 'buddy_fox:3';
    open();

    fireEvent.click(screen.getByText('Use my initial'));

    expect(mockUpdateAvatar).toHaveBeenCalledWith(null);
  });

  it('does not re-save the face that is already selected', () => {
    shopState.owned = ['buddy_fox'];
    authState.avatar = 'buddy_fox:3';
    open();

    fireEvent.click(screen.getByLabelText('Inari face 3'));

    expect(mockUpdateAvatar).not.toHaveBeenCalled();
  });

  it('surfaces a failed save', async () => {
    shopState.owned = ['buddy_fox'];
    mockUpdateAvatar.mockResolvedValue({ error: 'db down' });
    open();

    fireEvent.click(screen.getByLabelText('Inari face 1'));

    expect(await screen.findByText('db down')).toBeInTheDocument();
  });

  it('offers the shop only while some buddies are still locked', () => {
    shopState.owned = ['buddy_fox'];
    const { unmount } = open();
    expect(screen.getByText(/Unlock more buddies/)).toBeInTheDocument();
    unmount();

    shopState.owned = [
      'buddy_tango',
      'buddy_bunny',
      'buddy_penguin',
      'buddy_panda',
      'buddy_fox',
      'buddy_pink_cat',
      'buddy_otter',
      'buddy_lucky_cat',
      'buddy_kappa',
      'buddy_tanuki',
      'buddy_red_panda',
    ];
    open();
    expect(screen.queryByText(/Unlock more buddies/)).toBeNull();
  });

  // The owned list comes from a client-side shop fetch. Rendering it early would
  // tell a user who owns ten buddies that they own none.
  it('waits for the shop instead of claiming the user owns nothing', () => {
    shopState.owned = ['buddy_fox'];
    shopState.loading = true;
    open();

    expect(faceButtons()).toHaveLength(0);
    expect(screen.queryByText(/Unlock more buddies/)).toBeNull();
  });

  it('reports a failed shop load rather than showing an empty picker', () => {
    shopState.error = 'network';
    open();

    expect(screen.getByText(/Couldn't load your buddies/)).toBeInTheDocument();
    expect(faceButtons()).toHaveLength(0);
  });
});
