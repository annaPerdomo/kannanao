import { act, fireEvent, screen, waitFor } from '@testing-library/react';
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
const clearLevelUpEvent = vi.fn();
let canPetToday = true;
let points = 12;
let loadState = 'loaded';
let levelUpEvent: { buddyKey: string; level: number } | null = null;

vi.mock('@/contexts/BuddyFriendshipContext', () => ({
  useBuddyFriendshipCtx: () => ({
    equipped: { buddyKey: 'tango', points },
    friendships: {},
    loadState,
    petBuddy,
    canPetToday,
    ensureLoaded,
    levelUpEvent,
    clearLevelUpEvent,
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
    clearLevelUpEvent.mockClear();
    canPetToday = true;
    points = 12;
    loadState = 'loaded';
    levelUpEvent = null;
  });

  it('shows the friendship hearts total', () => {
    render(<HomeBuddy buddyKey="tango" />);
    expect(screen.getByText('12')).toBeInTheDocument();
  });

  it('shows no hearts chip at all until the rows have loaded', () => {
    loadState = 'loading';
    render(<HomeBuddy buddyKey="tango" />);
    expect(screen.queryByText('0')).toBeNull();
    expect(screen.queryByText('12')).toBeNull();
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

  it('pets the buddy from the keyboard', async () => {
    render(<HomeBuddy buddyKey="tango" />);
    fireEvent.keyDown(screen.getByRole('button', { name: 'petAria' }), { key: 'Enter' });
    await waitFor(() => expect(petBuddy).toHaveBeenCalledTimes(1));
  });

  it('announces a level-up and clears the event once it has been said', async () => {
    vi.useFakeTimers();
    levelUpEvent = { buddyKey: 'tango', level: 2 };
    render(<HomeBuddy buddyKey="tango" />);
    expect(screen.getByText('friendship.levelUp')).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(3000));
    expect(clearLevelUpEvent).toHaveBeenCalled();
    vi.useRealTimers();
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
