import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { HomeBuddy } from '@/components/HomeBuddy';
import { renderWithProviders as render } from '@/test/renderWithProviders';

let buddyCopy: Record<string, unknown> = {};

vi.mock('next-intl', () => ({
  useTranslations: () => {
    const t = (key: string, params?: Record<string, unknown>) =>
      params ? `${key}|${Object.values(params).join(',')}` : key;
    t.raw = (key: string) => {
      const field = key.split('.').slice(1).join('.');
      if (field in buddyCopy) return buddyCopy[field];
      throw new Error(`missing: ${key}`);
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
const openStories = vi.fn();
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
    openStories,
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
    openStories.mockClear();
    canPetToday = true;
    points = 12;
    loadState = 'loaded';
    levelUpEvent = null;
    buddyCopy = {};
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

  it('announces a level-up, and leaves the event for the story dialog to consume', () => {
    vi.useFakeTimers();
    levelUpEvent = { buddyKey: 'tango', level: 2 };
    render(<HomeBuddy buddyKey="tango" />);
    expect(screen.getByText('friendship.levelUp|friendship.levelNames.2')).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(3000));
    expect(screen.queryByText('friendship.levelUp|friendship.levelNames.2')).toBeNull();
    // Clearing it here would drop a celebration that is being held until the
    // user leaves their session.
    expect(clearLevelUpEvent).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('opens the buddy stories from the hearts chip without also petting', () => {
    render(<HomeBuddy buddyKey="tango" />);
    const chip = screen.getByRole('button', { name: 'storiesAria|tango.name,12' });

    tap(chip);
    fireEvent.click(chip);
    expect(openStories).toHaveBeenCalledWith('tango');
    expect(petBuddy).not.toHaveBeenCalled();
    // Nested inside the pet button the chip would be presentational, and the
    // only way into the stories would be gone for screen readers.
    expect(screen.getByRole('button', { name: 'petAria' })).not.toContainElement(chip);
  });

  it('blends the phrases a friendship level unlocked into the rotation', () => {
    buddyCopy = {
      homePhrases: ['home one'],
      friendship: { l2: { phrases: ['level two idle'] } },
    };
    points = 15;
    const { container } = render(<HomeBuddy buddyKey="tango" />);
    expect(screen.getByText('home one')).toBeInTheDocument();

    tap(container.firstChild as Element);
    expect(screen.getByText('level two idle')).toBeInTheDocument();
  });

  it('keeps the base pool for a buddy still at the starting level', () => {
    buddyCopy = {
      homePhrases: ['home one'],
      friendship: { l2: { phrases: ['level two idle'] } },
    };
    const { container } = render(<HomeBuddy buddyKey="tango" />);

    tap(container.firstChild as Element);
    expect(screen.getByText('home one')).toBeInTheDocument();
    expect(screen.queryByText('level two idle')).toBeNull();
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
