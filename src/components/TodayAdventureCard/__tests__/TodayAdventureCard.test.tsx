import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TodayAdventureCard } from '@/components/TodayAdventureCard';
import { minutesFor } from '@/components/TodayAdventureCard/AdventureStates';
import { localDateString } from '@/lib/chest';
import { KANA_WAIT_MS } from '@/lib/quest';
import { renderWithProviders } from '@/test/renderWithProviders';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

const dueState = vi.fn();
vi.mock('@/hooks/useDueCount', () => ({ useDueCount: () => dueState() }));

const progressState = vi.fn();
vi.mock('@/contexts/ProgressContext', () => ({ useProgressCtx: () => progressState() }));

const friendshipState = vi.fn();
vi.mock('@/contexts/BuddyFriendshipContext', () => ({
  useBuddyFriendshipCtx: () => friendshipState(),
}));

const shopState = vi.fn();
vi.mock('@/contexts/ShopContext', () => ({ useShopCtx: () => shopState() }));

const kanaState = vi.fn();
vi.mock('@/hooks/useKanaProgress', () => ({
  useKanaProgress: (enabled?: boolean) => kanaState(enabled),
}));

const TODAY = localDateString(new Date());
const dayBefore = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return localDateString(d);
};

const due = (over: Partial<{ dueCount: number; loading: boolean; error: string | null }> = {}) => ({
  dueCount: 0,
  loading: false,
  error: null,
  ...over,
});

const session = (day: string) => ({ started_at: `${day}T10:00:00`, cards_studied: 12 });

const progress = (
  over: Partial<{ last_study_date: string | null; last_chest_date: string | null }> = {},
  sessions: Array<{ started_at: string; cards_studied: number }> = [],
) => ({
  progress: { last_study_date: TODAY, last_chest_date: null, ...over },
  recentSessions: sessions,
  loading: false,
});

/** Rows keyed by buddy, the shape the card reads the per-user cap out of. */
const friendship = (
  rows: Record<string, string | null> = {},
  loadState: 'idle' | 'loading' | 'loaded' | 'error' = 'loaded',
  equipped: { points: number } | null = null,
  goalsDone: Array<'adventure' | 'session' | 'pet'> = [],
) => ({
  friendships: Object.fromEntries(
    Object.entries(rows).map(([buddyKey, lastAdventureDate]) => [
      buddyKey,
      { buddyKey, lastAdventureDate },
    ]),
  ),
  equipped,
  todayGoals: (['adventure', 'session', 'pet'] as const).map((source) => ({
    source,
    points: source === 'adventure' ? 3 : 1,
    done: goalsDone.includes(source),
  })),
  loadState,
  ensureLoaded: vi.fn().mockResolvedValue(undefined),
});

/** Waits out the friendship load the card gates its render on. */
const settled = () => waitFor(() => expect(document.querySelector('.MuiSkeleton-root')).toBeNull());

describe('TodayAdventureCard', () => {
  beforeEach(() => {
    push.mockClear();
    dueState.mockReturnValue(due({ dueCount: 6 }));
    progressState.mockReturnValue(progress());
    friendshipState.mockReturnValue(friendship());
    shopState.mockReturnValue({ equipped: { study_buddy: 'buddy_bunny' } });
    kanaState.mockClear();
    kanaState.mockReturnValue({ byKana: new Map(), error: null });
  });

  // Row for row, not one guessed height — the hero clips an over-tall placeholder.
  it('should hold the space with a skeleton until the counts land', () => {
    dueState.mockReturnValue(due({ loading: true }));
    const { container } = renderWithProviders(<TodayAdventureCard />);
    const heights = [...container.querySelectorAll<HTMLElement>('.MuiSkeleton-root')].map((el) =>
      parseInt(el.style.height, 10),
    );

    expect(heights).toEqual([16, 16, 52, 22, 20, 36, 39, 14]);
  });

  // An unfetched map looks exactly like "no row yet", which hands the day to
  // the chest fallback on a false negative.
  it('should hold the skeleton until the friendship rows have actually loaded', () => {
    friendshipState.mockReturnValue(friendship({}, 'loading'));
    const { container } = renderWithProviders(<TodayAdventureCard />);
    expect(container.querySelector('.MuiSkeleton-root')).toBeInTheDocument();
  });

  it('should release the skeleton when the friendship load fails', async () => {
    progressState.mockReturnValue(progress({ last_chest_date: TODAY }));
    friendshipState.mockReturnValue(friendship({}, 'error'));
    renderWithProviders(<TodayAdventureCard />);
    await screen.findByText('Adventure complete!');
  });

  // 0-due and "we don't know" are different states; the calm copy would be a lie.
  it('should stand down rather than claim nothing is due when the count failed', async () => {
    dueState.mockReturnValue(due({ error: 'boom' }));
    const { container } = renderWithProviders(<TodayAdventureCard />);
    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });

  describe('state precedence', () => {
    it("should celebrate today's finished adventure even with cards still due", async () => {
      friendshipState.mockReturnValue(friendship({ buddy_bunny: TODAY }));
      renderWithProviders(<TodayAdventureCard />);
      await screen.findByText('Adventure complete!');
      expect(screen.queryByRole('button', { name: 'Start' })).toBeNull();
      expect(screen.getByText('+3 ❤️ with Tsuki')).toBeInTheDocument();
    });

    // The daily cap is per user, so hearts earned before a buddy swap still
    // close the day — otherwise equipping a fresh buddy reopens the adventure.
    it("should stay finished when the day's hearts went to a buddy since swapped out", async () => {
      shopState.mockReturnValue({ equipped: { study_buddy: 'buddy_tanuki' } });
      friendshipState.mockReturnValue(friendship({ buddy_bunny: TODAY }));
      renderWithProviders(<TodayAdventureCard />);
      await screen.findByText('Adventure complete!');
    });

    // Crediting the equipped buddy would name one whose total never moved.
    it("should credit the buddy that actually earned the day's hearts", async () => {
      shopState.mockReturnValue({ equipped: { study_buddy: 'buddy_tanuki' } });
      friendshipState.mockReturnValue(friendship({ buddy_bunny: TODAY }));
      renderWithProviders(<TodayAdventureCard />);
      expect(await screen.findByText('+3 ❤️ with Tsuki')).toBeInTheDocument();
      expect(screen.queryByText(/Ponta/)).toBeNull();
    });

    // Pre-friendship users have no row at all, so the daily chest stands in.
    it('should fall back to the daily chest when no friendship row exists yet', async () => {
      progressState.mockReturnValue(progress({ last_chest_date: TODAY }));
      renderWithProviders(<TodayAdventureCard />);
      await screen.findByText('Adventure complete!');
    });

    // The chest proves a cleared queue, not a paid heart.
    it('should not promise hearts on the chest fallback', async () => {
      progressState.mockReturnValue(progress({ last_chest_date: TODAY }));
      renderWithProviders(<TodayAdventureCard />);
      await screen.findByText('Adventure complete!');
      expect(screen.queryByText(/❤️/)).toBeNull();
    });

    it('should ignore the chest fallback once a friendship row exists', async () => {
      progressState.mockReturnValue(progress({ last_chest_date: TODAY }));
      friendshipState.mockReturnValue(friendship({ buddy_bunny: dayBefore(1) }));
      renderWithProviders(<TodayAdventureCard />);
      await screen.findByText('Help Tsuki!');
    });

    it('should invite the reader on the day’s mission when cards are due', async () => {
      friendshipState.mockReturnValue(friendship({}, 'loaded', { points: 15 }));
      renderWithProviders(<TodayAdventureCard />);
      await screen.findByText("Today's Adventure");
      expect(screen.getByText(/6 reviews · ~2 min/)).toBeInTheDocument();
    });

    it('should keep a route to the games hub after the adventure is done', async () => {
      friendshipState.mockReturnValue(friendship({ buddy_bunny: TODAY }));
      renderWithProviders(<TodayAdventureCard />);
      await screen.findByText('Adventure complete!');
      fireEvent.click(screen.getByRole('button', { name: 'Play a game' }));
      expect(push).toHaveBeenCalledWith('/review');
    });

    it('should stay calm and offer two side doors when nothing is due', async () => {
      dueState.mockReturnValue(due({ dueCount: 0 }));
      renderWithProviders(<TodayAdventureCard />);
      await screen.findByText('No reviews waiting today.');
      fireEvent.click(screen.getByRole('button', { name: 'Play a game' }));
      expect(push).toHaveBeenCalledWith('/review');
      fireEvent.click(screen.getByRole('button', { name: 'Practice a deck' }));
      expect(push).toHaveBeenCalledWith('/decks');
    });
  });

  describe('near-milestone hook', () => {
    // The promise takes the section label's line, never the count's: how much
    // work is waiting is the one thing this card exists to answer.
    it('should promise the memory without giving up the count', async () => {
      friendshipState.mockReturnValue(friendship({}, 'loaded', { points: 13 }));
      renderWithProviders(<TodayAdventureCard />);
      await screen.findByText('So close! Tsuki has something to tell you.');
      expect(screen.getByText(/6 reviews/)).toBeInTheDocument();
      expect(screen.queryByText("Today's Adventure")).toBeNull();
      fireEvent.click(screen.getByRole('button', { name: 'Start' }));
      expect(push).toHaveBeenCalledWith('/review/today');
    });

    it('should name the reward when the next milestone is a fact', async () => {
      shopState.mockReturnValue({ equipped: { study_buddy: 'buddy_tango' } });
      friendshipState.mockReturnValue(friendship({}, 'loaded', { points: 3 }));
      renderWithProviders(<TodayAdventureCard />);
      await screen.findByText("2 more hearts and you'll learn something new about Tango.");
    });

    it('should speak up for a milestone that is still reachable today', async () => {
      friendshipState.mockReturnValue(friendship({}, 'loaded', { points: 10 }));
      renderWithProviders(<TodayAdventureCard />);
      await screen.findByText('So close! Tsuki has something to tell you.');
    });

    it('should go quiet once the day no longer holds enough hearts to get there', async () => {
      friendshipState.mockReturnValue(friendship({}, 'loaded', { points: 10 }, ['session', 'pet']));
      renderWithProviders(<TodayAdventureCard />);
      await screen.findByText(/6 reviews · ~2 min/);
    });

    it('should keep the count line when the next milestone is far off', async () => {
      friendshipState.mockReturnValue(friendship({}, 'loaded', { points: 15 }));
      renderWithProviders(<TodayAdventureCard />);
      await screen.findByText(/6 reviews · ~2 min/);
      expect(screen.queryByText(/So close/)).toBeNull();
    });

    it('should promise nothing when the friendship rows never loaded', async () => {
      friendshipState.mockReturnValue(friendship({}, 'error', { points: 13 }));
      renderWithProviders(<TodayAdventureCard />);
      await screen.findByText(/6 reviews · ~2 min/);
    });
  });

  describe('welcome back', () => {
    it('should greet a reader returning after a gap', async () => {
      progressState.mockReturnValue(progress({ last_study_date: dayBefore(4) }));
      renderWithProviders(<TodayAdventureCard />);
      await screen.findByText('Welcome back! Tsuki saved your place.');
    });

    it('should stay quiet for someone who studied yesterday', async () => {
      progressState.mockReturnValue(progress({ last_study_date: dayBefore(1) }));
      renderWithProviders(<TodayAdventureCard />);
      await screen.findByText('Help Tsuki!');
      expect(screen.queryByText(/Welcome back/)).toBeNull();
    });

    it('should stay quiet for a brand-new reader who has never studied', async () => {
      progressState.mockReturnValue(progress({ last_study_date: null }));
      renderWithProviders(<TodayAdventureCard />);
      await screen.findByText('Help Tsuki!');
      expect(screen.queryByText(/Welcome back/)).toBeNull();
    });

    // The completed state is a celebration; a "you were away" line undercuts it.
    it('should stay quiet on a completed adventure', async () => {
      progressState.mockReturnValue(progress({ last_study_date: dayBefore(4) }));
      friendshipState.mockReturnValue(friendship({ buddy_bunny: TODAY }));
      renderWithProviders(<TodayAdventureCard />);
      await screen.findByText('Adventure complete!');
      expect(screen.queryByText(/Welcome back/)).toBeNull();
    });
  });

  describe('starting the adventure', () => {
    it('should go to the daily adventure from the Start button', async () => {
      renderWithProviders(<TodayAdventureCard />);
      fireEvent.click(await screen.findByRole('button', { name: 'Start' }));
      expect(push).toHaveBeenCalledWith('/review/today');
    });

    // A focusable button inside a role="button" makes its accessible name
    // presentational, so the card body stays a pointer-only shortcut.
    it('should not wrap the Start button in a second button role', async () => {
      const { container } = renderWithProviders(<TodayAdventureCard />);
      await screen.findByRole('button', { name: 'Start' });
      expect(container.querySelector('[role="button"]')).toBeNull();
      screen.getAllByRole('button').forEach((el) => expect(el.tagName).toBe('BUTTON'));
    });

    // The review hub holds the games, and this is the only way there from home
    // while cards are due.
    it('should reach the games hub without clearing the queue first', async () => {
      renderWithProviders(<TodayAdventureCard />);
      fireEvent.click(await screen.findByRole('button', { name: 'Play a game' }));
      expect(push).toHaveBeenCalledTimes(1);
      expect(push).toHaveBeenCalledWith('/review');
    });
  });

  describe('week dots', () => {
    // The fixtures below place sessions on Monday AND Tuesday, which is the
    // future when the suite runs on a Monday — so pin "now" to Wednesday of
    // the current week. shouldAdvanceTime keeps waitFor/settled() working.
    beforeEach(() => {
      const wednesday = new Date();
      wednesday.setDate(wednesday.getDate() - ((wednesday.getDay() + 6) % 7) + 2);
      vi.useFakeTimers({ now: wednesday, shouldAdvanceTime: true });
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should count the distinct study days this week', async () => {
      // Monday and Tuesday of the current week, so the fixture never straddles
      // a week boundary the way "N days ago" would.
      const monday = new Date();
      monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
      const tuesday = new Date(monday);
      tuesday.setDate(monday.getDate() + 1);
      progressState.mockReturnValue(
        progress({}, [
          session(localDateString(monday)),
          session(localDateString(monday)),
          session(localDateString(tuesday)),
        ]),
      );
      renderWithProviders(<TodayAdventureCard />);
      await settled();
      expect(screen.getByText('2 study days this week')).toBeInTheDocument();
    });

    it('should say one study day, not 1 study days', async () => {
      const monday = new Date();
      monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
      progressState.mockReturnValue(progress({}, [session(localDateString(monday))]));
      renderWithProviders(<TodayAdventureCard />);
      await settled();
      expect(screen.getByText('1 study day this week')).toBeInTheDocument();
    });

    // Empty dots carry a fresh week on their own; a literal zero is a scoreboard.
    it('should stay silent rather than report zero study days', async () => {
      progressState.mockReturnValue(
        progress({}, [{ started_at: `${TODAY}T10:00:00`, cards_studied: 0 }]),
      );
      renderWithProviders(<TodayAdventureCard />);
      await settled();
      expect(screen.queryByText(/study day/)).toBeNull();
      expect(screen.getByRole('img', { name: /Study days this week/ })).toBeInTheDocument();
    });
  });
  describe('characters she is quietly forgetting', () => {
    /** Three characters answered, all wrong — weak, and not "never seen". */
    const slipping = () =>
      new Map(
        ['ぬ', 'ね', 'ま'].map((kana) => [
          kana,
          {
            correctCount: 1,
            wrongCount: 4,
            intervalDays: 0,
            ease: 2.5,
            lastReviewedAt: dayBefore(9),
            nextReviewAt: dayBefore(8),
          },
        ]),
      );

    it('should not spend a query on the chart while cards are waiting', async () => {
      dueState.mockReturnValue(due({ dueCount: 6 }));
      renderWithProviders(<TodayAdventureCard />);
      await settled();
      expect(kanaState).toHaveBeenCalledWith(false);
      expect(screen.getByText('6 reviews · ~2 min')).toBeInTheDocument();
    });

    it('should offer the quest when the cards are clear but the reading is not', async () => {
      dueState.mockReturnValue(due({ dueCount: 0 }));
      kanaState.mockReturnValue({ byKana: slipping(), error: null });
      renderWithProviders(<TodayAdventureCard />);

      await screen.findByRole('button', { name: 'Start' });
      expect(screen.getByText('3 characters · ~2 min')).toBeInTheDocument();
      expect(screen.queryByText('No reviews waiting today.')).toBeNull();

      fireEvent.click(screen.getByRole('button', { name: 'Start' }));
      expect(push).toHaveBeenCalledWith('/review/today');
    });

    it('should still say all caught up when the reading is solid too', async () => {
      dueState.mockReturnValue(due({ dueCount: 0 }));
      renderWithProviders(<TodayAdventureCard />);
      await screen.findByText('No reviews waiting today.');
    });

    describe('when the chart read hangs', () => {
      beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
      afterEach(() => vi.useRealTimers());

      // getKanaProgress has no timeout — without the deadline the skeleton stays.
      it('should give up on the characters and show the card anyway', async () => {
        dueState.mockReturnValue(due({ dueCount: 0 }));
        kanaState.mockReturnValue({ byKana: null, error: null });
        renderWithProviders(<TodayAdventureCard />);
        expect(document.querySelector('.MuiSkeleton-root')).not.toBeNull();

        await act(async () => {
          vi.advanceTimersByTime(KANA_WAIT_MS);
        });
        expect(screen.getByText('No reviews waiting today.')).toBeInTheDocument();
      });
    });

    it('should stay hidden when the due count failed', async () => {
      dueState.mockReturnValue(due({ dueCount: 0, error: 'boom' }));
      kanaState.mockReturnValue({ byKana: slipping(), error: null });
      const { container } = renderWithProviders(<TodayAdventureCard />);
      await settled();
      expect(container).toBeEmptyDOMElement();
    });
  });
});

describe('minutesFor', () => {
  it('should round a part-minute queue up rather than promising zero', () => {
    expect(minutesFor(1)).toBe(1);
    expect(minutesFor(3)).toBe(1);
    expect(minutesFor(4)).toBe(2);
    expect(minutesFor(30)).toBe(10);
  });
});
