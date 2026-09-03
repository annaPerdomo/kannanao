import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BuddyMoment } from '@/components/Practice/CelebrationScreen/BuddyMoment';
import { renderWithProviders as render } from '@/test/renderWithProviders';

const petBuddy = vi.fn();
const ensureLoaded = vi.fn();
let canPetToday = true;
let loadState = 'loaded';

vi.mock('@/contexts/ShopContext', () => ({
  useShopCtx: () => ({ equipped: { study_buddy: 'buddy_tango' } }),
}));

vi.mock('@/contexts/BuddyFriendshipContext', () => ({
  useBuddyFriendshipCtx: () => ({
    equipped: { buddyKey: 'buddy_tango', points: 12 },
    loadState,
    ensureLoaded,
    heartsToday: 4,
    canPetToday,
    petBuddy,
  }),
}));

describe('BuddyMoment', () => {
  beforeEach(() => {
    petBuddy.mockReset().mockResolvedValue({ awarded: 1 });
    ensureLoaded.mockClear();
    canPetToday = true;
    loadState = 'loaded';
  });

  it('shows the hearts so far and what the next ones unlock', () => {
    render(<BuddyMoment textColor="#000" subTextColor="#333" />);
    expect(screen.getByText('4 of 5 hearts today')).toBeInTheDocument();
    expect(screen.getByText(/3 more hearts/)).toBeInTheDocument();
    expect(ensureLoaded).toHaveBeenCalled();
  });

  it('pays the pat from the button and confirms it', async () => {
    render(<BuddyMoment textColor="#000" subTextColor="#333" />);
    fireEvent.click(screen.getByRole('button', { name: 'Give Tango a pat' }));
    expect(petBuddy).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('+1 ❤️'));
    expect(screen.queryByRole('button', { name: 'Give Tango a pat' })).not.toBeInTheDocument();
  });

  it('hides the pat once today paid', () => {
    canPetToday = false;
    render(<BuddyMoment textColor="#000" subTextColor="#333" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders nothing before the hearts land', () => {
    loadState = 'loading';
    const { container } = render(<BuddyMoment textColor="#000" subTextColor="#333" />);
    expect(container).toBeEmptyDOMElement();
  });
});
