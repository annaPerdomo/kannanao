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

let reactionEvent: { key: number; reaction: string } | null = null;

vi.mock('@/contexts/BuddyReactionContext', () => ({
  useBuddyReaction: () => ({ reactionEvent, triggerReaction: vi.fn() }),
}));

const petBuddy = vi.fn(async () => ({ awarded: 1, points: 13, leveledUp: false, newLevel: 1 }));
const ensureLoaded = vi.fn(async () => {});
const clearLevelUpEvent = vi.fn();
const openStories = vi.fn();
let canPetToday = true;
let points = 12;
let loadState = 'loaded';
let levelUpEvent: { buddyKey: string; level: number } | null = null;
let stamps: Record<string, string | null> = {};
let todayGoals: { source: string; points: number; done: boolean }[] = [];
let recentWords: { word: string; reading?: string }[] = [];

vi.mock('@/contexts/BuddyFriendshipContext', () => ({
  useBuddyFriendshipCtx: () => ({
    equipped: { buddyKey: 'tango', points },
    friendships: {},
    stamps,
    todayGoals,
    loadState,
    petBuddy,
    canPetToday,
    ensureLoaded,
    levelUpEvent,
    clearLevelUpEvent,
    openStories,
    recentWords,
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
    reactionEvent = null;
    stamps = {};
    todayGoals = [];
    recentWords = [];
    buddyCopy = {};
    localStorage.clear();
    setViewport(1024, 768);
  });

  it('shows the friendship hearts total', () => {
    render(<HomeBuddy buddyKey="tango" />);
    expect(screen.getByText('12')).toBeInTheDocument();
  });

  it('drops the "until something new" promise from the chip at max friendship', () => {
    points = 140;
    render(<HomeBuddy buddyKey="tango" />);
    expect(
      screen.getByRole('button', { name: 'chipAriaMax|tango.name,levelNames.5,140' }),
    ).toBeInTheDocument();
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

    // jsdom measures the widget at 0×0, so the drop is the bare pointer delta.
    expect(JSON.parse(localStorage.getItem('kannanao:buddy-position') ?? 'null')).toEqual({
      left: 80,
      bottom: 708,
    });
  });

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
    tap(el);
    await waitFor(() => expect(petBuddy).toHaveBeenCalledTimes(1));
  });

  it('ignores a second finger landing mid-drag', () => {
    const { container } = render(<HomeBuddy buddyKey="tango" />);
    const el = container.firstChild as Element;
    fireEvent.pointerDown(el, { clientX: 100, clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(el, { clientX: 180, clientY: 160, pointerId: 1 });
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
    fireEvent.pointerMove(el, { clientX: 102, clientY: 101, pointerId: 1 });
    expect(screen.getByText('defaultPhrase')).toBeVisible();

    fireEvent.pointerMove(el, { clientX: 180, clientY: 160, pointerId: 1 });
    expect(screen.getByText('defaultPhrase')).not.toBeVisible();
  });

  it('restores the stored spot on mount, pulled back inside the viewport', () => {
    localStorage.setItem('kannanao:buddy-position', JSON.stringify({ left: 5000, bottom: 5000 }));
    const { container } = render(<HomeBuddy buddyKey="tango" />);
    const style = getComputedStyle(container.firstChild as Element);
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
    const chip = screen.getByRole('button', { name: 'chipAria|tango.name,levelNames.1,12,3' });

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

  it('drops a word-slot phrase in the buddy’s own words once a session has left one', () => {
    buddyCopy = {
      homePhrases: ['home one'],
      friendship: { l2: { phrases: ['still thinking about {word}'] } },
    };
    points = 15;
    recentWords = [{ word: '犬', reading: 'いぬ' }];
    const { container } = render(<HomeBuddy buddyKey="tango" />);

    tap(container.firstChild as Element);
    expect(screen.getByText('still thinking about いぬ')).toBeInTheDocument();
  });

  // A refilled pool must not read as a new one and reset the rotation.
  it('keeps the session-end line up when that session’s words reach the rotation', async () => {
    const { publishSessionEnd } = await import('@/lib/sessionSignal');
    todayGoals = [{ source: 'session', points: 1, done: true }];
    buddyCopy = {
      homePhrases: ['home one'],
      friendship: { l2: { phrases: ['still thinking about {word}'] } },
      'reactions.sessionComplete': ['Good session!'],
    };
    points = 15;
    const { rerender } = render(<HomeBuddy buddyKey="tango" />);
    act(() => publishSessionEnd(10));
    expect(screen.getByText('Good session!')).toBeInTheDocument();

    recentWords = [{ word: '犬', reading: 'いぬ' }];
    rerender(<HomeBuddy buddyKey="tango" />);
    expect(screen.getByText('Good session!')).toBeInTheDocument();
  });

  it('leaves the slot phrase out entirely before there are any words', () => {
    buddyCopy = {
      homePhrases: ['home one'],
      friendship: { l2: { phrases: ['still thinking about {word}'] } },
    };
    points = 15;
    const { container } = render(<HomeBuddy buddyKey="tango" />);

    tap(container.firstChild as Element);
    expect(screen.getByText('home one')).toBeInTheDocument();
    expect(screen.queryByText(/still thinking about/)).toBeNull();
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

  it('opens the day with a state-picked greeting instead of phrase one', () => {
    buddyCopy = { 'greetings.adventureNotDone': ['Adventure time!'] };
    render(<HomeBuddy buddyKey="tango" />);
    expect(screen.getByText('Adventure time!')).toBeInTheDocument();
    expect(screen.queryByText('defaultPhrase')).toBeNull();
  });

  it('prefers the buddy’s own greeting copy over the chrome fallback', () => {
    buddyCopy = {
      friendship: { greetings: { adventureNotDone: ['Tango special'] } },
      'greetings.adventureNotDone': ['generic'],
    };
    render(<HomeBuddy buddyKey="tango" />);
    expect(screen.getByText('Tango special')).toBeInTheDocument();
  });

  it('greets only once per day', async () => {
    const { localDateString } = await import('@/lib/chest');
    localStorage.setItem('kannanao:buddy-greeting-date', localDateString(new Date()));
    buddyCopy = { 'greetings.adventureNotDone': ['Adventure time!'] };
    render(<HomeBuddy buddyKey="tango" />);
    expect(screen.queryByText('Adventure time!')).toBeNull();
    expect(screen.getByText('defaultPhrase')).toBeInTheDocument();
  });

  it('says a warm word when a session ends after the daily heart is already paid', async () => {
    const { publishSessionEnd } = await import('@/lib/sessionSignal');
    todayGoals = [{ source: 'session', points: 1, done: true }];
    buddyCopy = { 'reactions.sessionComplete': ['Good session!'] };
    render(<HomeBuddy buddyKey="tango" />);
    act(() => publishSessionEnd(10));
    expect(screen.getByText('Good session!')).toBeInTheDocument();
  });

  it('keeps the session-end line up past the last answer’s hide timer', async () => {
    const { publishSessionEnd } = await import('@/lib/sessionSignal');
    vi.useFakeTimers();
    todayGoals = [{ source: 'session', points: 1, done: true }];
    buddyCopy = { 'reactions.sessionComplete': ['Good session!'] };
    reactionEvent = { key: 7, reaction: 'correct' };
    render(<HomeBuddy buddyKey="tango" />);

    act(() => vi.advanceTimersByTime(2000));
    act(() => publishSessionEnd(10));
    act(() => vi.advanceTimersByTime(1000));

    expect(screen.getByText('Good session!')).toBeVisible();
    vi.useRealTimers();
  });

  it('stays quiet on session end when the award toast will speak instead', async () => {
    const { publishSessionEnd } = await import('@/lib/sessionSignal');
    todayGoals = [{ source: 'session', points: 1, done: false }];
    buddyCopy = { 'reactions.sessionComplete': ['Good session!'] };
    render(<HomeBuddy buddyKey="tango" />);
    act(() => publishSessionEnd(10));
    expect(screen.queryByText('Good session!')).toBeNull();
  });

  it('speaks friendship copy for a comeback reaction', () => {
    buddyCopy = { 'reactions.comeback': ['Comeback line!'] };
    reactionEvent = { key: 1, reaction: 'comeback' };
    render(<HomeBuddy buddyKey="tango" />);
    expect(screen.getByText('Comeback line!')).toBeInTheDocument();
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
