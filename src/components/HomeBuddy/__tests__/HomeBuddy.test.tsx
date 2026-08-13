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

function setViewport(width: number, height: number) {
  Object.defineProperty(window, 'innerWidth', { value: width, configurable: true });
  Object.defineProperty(window, 'innerHeight', { value: height, configurable: true });
}

function resizeTo(width: number, height: number) {
  setViewport(width, height);
  act(() => {
    window.dispatchEvent(new Event('resize'));
  });
}

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
    localStorage.clear();
    setViewport(1024, 768);
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

  it('remembers where the buddy was dropped', () => {
    const { container } = render(<HomeBuddy buddyKey="tango" />);
    const el = container.firstChild as Element;
    fireEvent.pointerDown(el, { clientX: 100, clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(el, { clientX: 180, clientY: 160, pointerId: 1 });
    fireEvent.pointerUp(el, { clientX: 180, clientY: 160, pointerId: 1 });

    // jsdom measures the widget at 0×0 in the top-left, so the drop is the bare
    // pointer delta: 80px right, 60px down off a 768px-tall viewport.
    expect(JSON.parse(localStorage.getItem('kannanao:buddy-position') ?? 'null')).toEqual({
      left: 80,
      bottom: 708,
    });
  });

  // The hearts chip stops pointerdown but not pointerup; without a matching
  // down, origin is stale and the release would spend the day's pet.
  it('ignores a pointerup with no pointerdown behind it', () => {
    const { container } = render(<HomeBuddy buddyKey="tango" />);
    fireEvent.pointerUp(container.firstChild as Element, {
      clientX: 100,
      clientY: 100,
      pointerId: 1,
    });
    expect(petBuddy).not.toHaveBeenCalled();
  });

  it('drops the drag when the system cancels the touch, and frees the next grab', async () => {
    const { container } = render(<HomeBuddy buddyKey="tango" />);
    const el = container.firstChild as HTMLElement;
    fireEvent.pointerDown(el, { clientX: 100, clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(el, { clientX: 180, clientY: 160, pointerId: 1 });
    fireEvent.pointerCancel(el, { clientX: 180, clientY: 160, pointerId: 1 });

    expect(el.style.transform).toBe('');
    expect(localStorage.getItem('kannanao:buddy-position')).toBeNull();
    // Still stuck in drag mode, the buddy would be mute and unpettable forever.
    tap(el);
    await waitFor(() => expect(petBuddy).toHaveBeenCalledTimes(1));
  });

  it('ignores a second finger landing mid-drag', () => {
    const { container } = render(<HomeBuddy buddyKey="tango" />);
    const el = container.firstChild as Element;
    fireEvent.pointerDown(el, { clientX: 100, clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(el, { clientX: 180, clientY: 160, pointerId: 1 });
    // Finger two: re-measuring origin here would commit the drop a drag-length off.
    fireEvent.pointerDown(el, { clientX: 400, clientY: 400, pointerId: 2 });
    fireEvent.pointerMove(el, { clientX: 500, clientY: 500, pointerId: 2 });
    fireEvent.pointerUp(el, { clientX: 180, clientY: 160, pointerId: 1 });

    expect(JSON.parse(localStorage.getItem('kannanao:buddy-position') ?? 'null')).toEqual({
      left: 80,
      bottom: 708,
    });
  });

  it('keeps the bubble up through a pet, entering drag mode only on real travel', () => {
    const { container } = render(<HomeBuddy buddyKey="tango" />);
    const el = container.firstChild as Element;
    fireEvent.pointerDown(el, { clientX: 100, clientY: 100, pointerId: 1 });
    // A press wobbles a pixel or two; blanking the bubble there made every pet blink.
    fireEvent.pointerMove(el, { clientX: 102, clientY: 101, pointerId: 1 });
    expect(screen.getByText('defaultPhrase')).toBeVisible();

    fireEvent.pointerMove(el, { clientX: 180, clientY: 160, pointerId: 1 });
    expect(screen.getByText('defaultPhrase')).not.toBeVisible();
  });

  it('restores the stored spot on mount, pulled back inside the viewport', () => {
    localStorage.setItem('kannanao:buddy-position', JSON.stringify({ left: 5000, bottom: 5000 }));
    const { container } = render(<HomeBuddy buddyKey="tango" />);
    const style = getComputedStyle(container.firstChild as Element);
    // jsdom measures the widget at 0×0, so the far corner of a 1024×768 viewport.
    expect(style.left).toBe('1016px');
    expect(style.bottom).toBe('760px');
  });

  it('re-clamps after the iPad is rotated', () => {
    localStorage.setItem('kannanao:buddy-position', JSON.stringify({ left: 900, bottom: 700 }));
    const { container } = render(<HomeBuddy buddyKey="tango" />);
    expect(getComputedStyle(container.firstChild as Element).left).toBe('900px');

    resizeTo(768, 1024);
    expect(getComputedStyle(container.firstChild as Element).left).toBe('760px');
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
