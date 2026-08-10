import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { HomeBuddy } from '@/components/HomeBuddy';
import { renderWithProviders as render } from '@/test/renderWithProviders';

vi.mock('next-intl', () => ({
  useTranslations: () => {
    const t = (key: string) => key;
    t.raw = () => {
      throw new Error('missing');
    };
    return t;
  },
}));

vi.mock('@/components/NavBar/BottomNav', () => ({ BOTTOM_NAV_HEIGHT: 56 }));

vi.mock('@/contexts/BuddyReactionContext', () => ({
  useBuddyReaction: () => ({ reactionEvent: null }),
}));

const petBuddy = vi.fn(async () => ({ awarded: 1, points: 13, leveledUp: false, newLevel: 1 }));
const ensureLoaded = vi.fn(async () => {});
let canPetToday = true;
let points = 12;

vi.mock('@/contexts/BuddyFriendshipContext', () => ({
  useBuddyFriendshipCtx: () => ({
    equipped: { buddyKey: 'tango', points },
    friendships: {},
    petBuddy,
    canPetToday,
    ensureLoaded,
  }),
}));

function tap(el: Element) {
  fireEvent.pointerDown(el, { clientX: 100, clientY: 100, pointerId: 1 });
  fireEvent.pointerUp(el, { clientX: 100, clientY: 100, pointerId: 1 });
}

describe('HomeBuddy', () => {
  beforeAll(() => {
    HTMLElement.prototype.setPointerCapture = vi.fn();
  });

  beforeEach(() => {
    petBuddy.mockClear();
    canPetToday = true;
    points = 12;
  });

  it('shows the friendship hearts total', () => {
    render(<HomeBuddy buddyKey="tango" />);
    expect(screen.getByText('12')).toBeInTheDocument();
  });

  it('pets the buddy once on tap when the daily pet is available', async () => {
    const { container } = render(<HomeBuddy buddyKey="tango" />);
    tap(container.firstChild as Element);
    await waitFor(() => expect(petBuddy).toHaveBeenCalledTimes(1));
  });

  it('does not call petBuddy when already petted today', () => {
    canPetToday = false;
    const { container } = render(<HomeBuddy buddyKey="tango" />);
    tap(container.firstChild as Element);
    expect(petBuddy).not.toHaveBeenCalled();
  });

  it('does not treat a drag as a tap', () => {
    const { container } = render(<HomeBuddy buddyKey="tango" />);
    const el = container.firstChild as Element;
    fireEvent.pointerDown(el, { clientX: 100, clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(el, { clientX: 180, clientY: 160, pointerId: 1 });
    fireEvent.pointerUp(el, { clientX: 180, clientY: 160, pointerId: 1 });
    expect(petBuddy).not.toHaveBeenCalled();
  });

  it('re-keys the hearts chip when the total increases so it pops', () => {
    const { rerender } = render(<HomeBuddy buddyKey="tango" />);
    const before = screen.getByText('12');
    points = 13;
    rerender(<HomeBuddy buddyKey="tango" />);
    const after = screen.getByText('13');
    // key={points} forces a fresh node, which restarts the pop animation
    expect(after).not.toBe(before);
  });
});
