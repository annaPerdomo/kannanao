import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FriendshipAwardToast } from '@/components/HomeBuddy/FriendshipAwardToast';
import type { BuddyStoryRequest } from '@/contexts/BuddyFriendshipContext';
import type { FriendshipAwardEvent } from '@/hooks/useBuddyFriendship';
import type { BuddyWord } from '@/lib/buddyWords';
import { renderWithProviders as render } from '@/test/renderWithProviders';

const clearAwardEvent = vi.fn();
let awardEvent: FriendshipAwardEvent | null = null;
let storyRequest: BuddyStoryRequest | null = null;
let levelUpEvent: { buddyKey: string; level: number } | null = null;
let pathname = '/';
let recentWords: BuddyWord[] = [];

vi.mock('next/navigation', () => ({ usePathname: () => pathname }));

vi.mock('@/contexts/BuddyFriendshipContext', () => ({
  useBuddyFriendshipCtx: () => ({
    awardEvent,
    clearAwardEvent,
    storyRequest,
    levelUpEvent,
    recentWords,
  }),
}));

describe('FriendshipAwardToast', () => {
  beforeEach(() => {
    clearAwardEvent.mockClear();
    awardEvent = null;
    storyRequest = null;
    levelUpEvent = null;
    pathname = '/';
    recentWords = [];
  });

  it('should stay out of the way when no heart was paid', () => {
    render(<FriendshipAwardToast />);
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });

  // Momo has no authored copy in messages/*.json. If she ever gets lines,
  // repoint these at whichever buddy is still unauthored.
  it('should celebrate an award once and consume the event', () => {
    awardEvent = { buddyKey: 'buddy_axolotl', source: 'session', awarded: 1, words: [] };
    render(<FriendshipAwardToast />);

    expect(screen.getByRole('status')).toHaveTextContent('+1 ❤️ Momo is glad you kept practicing.');
    expect(clearAwardEvent).toHaveBeenCalledTimes(1);
  });

  it('should pick the copy for the source that paid', () => {
    awardEvent = { buddyKey: 'buddy_axolotl', source: 'pet', awarded: 1, words: [] };
    render(<FriendshipAwardToast />);

    expect(screen.getByRole('status')).toHaveTextContent('+1 ❤️ Momo was happy to see you.');
  });

  it('should send one heart per point on the adventure award', () => {
    awardEvent = { buddyKey: 'buddy_axolotl', source: 'adventure', awarded: 3, words: [] };
    const { container } = render(<FriendshipAwardToast />);

    expect(screen.getByRole('status')).toHaveTextContent(
      '+3 ❤️ Momo loved studying with you today!',
    );
    expect(container.querySelectorAll('[data-award-hearts] > *')).toHaveLength(3);
  });

  it("should speak in the buddy's own voice when that line is written", () => {
    awardEvent = { buddyKey: 'buddy_tango', source: 'pet', awarded: 1, words: [] };
    const { container } = render(<FriendshipAwardToast />);

    expect(container).toHaveTextContent('~leans into your hand~');
    expect(screen.getByRole('status')).toHaveTextContent('1 heart earned. ~leans into your hand~');
  });

  it('should send one heart per point on an authored adventure line', () => {
    awardEvent = { buddyKey: 'buddy_bunny', source: 'adventure', awarded: 3, words: [] };
    const { container } = render(<FriendshipAwardToast />);

    expect(screen.getByRole('status')).toHaveTextContent(
      '3 hearts earned. Tsuki hopped so high she surprised herself.',
    );
    expect(container.querySelectorAll('[data-award-hearts] > *')).toHaveLength(3);
  });

  it('should name the word the session just taught, when the buddy has that line', () => {
    awardEvent = {
      buddyKey: 'buddy_tango',
      source: 'session',
      awarded: 1,
      words: [{ word: '犬', reading: 'いぬ' }],
    };
    const { container } = render(<FriendshipAwardToast />);

    expect(container).toHaveTextContent("いぬ… that one's ours now.");
  });

  // Speech practice and the grammar games end sessions with no cards behind them.
  it('should fall back to the plain line when the session left no word', () => {
    recentWords = [{ word: '犬', reading: 'いぬ' }];
    awardEvent = { buddyKey: 'buddy_tango', source: 'session', awarded: 1, words: [] };
    const { container } = render(<FriendshipAwardToast />);

    expect(container).toHaveTextContent('Nice practice. Tango is extremely proud of you.');
    expect(container).not.toHaveTextContent('いぬ');
  });

  it('should suppress itself while the friendship dialog is open, without stranding the event', () => {
    storyRequest = { mode: 'levelUp', buddyKey: 'buddy_bunny', level: 2 };
    awardEvent = { buddyKey: 'buddy_bunny', source: 'adventure', awarded: 3, words: [] };
    render(<FriendshipAwardToast />);

    expect(screen.getByRole('status')).toBeEmptyDOMElement();
    expect(clearAwardEvent).toHaveBeenCalledTimes(1);
  });

  it('should stand down for a level-up the dialog is about to celebrate', () => {
    levelUpEvent = { buddyKey: 'buddy_bunny', level: 2 };
    awardEvent = { buddyKey: 'buddy_bunny', source: 'pet', awarded: 1, words: [] };
    render(<FriendshipAwardToast />);

    expect(screen.getByRole('status')).toBeEmptyDOMElement();
    expect(clearAwardEvent).toHaveBeenCalledTimes(1);
  });

  it('should still celebrate an award that lands mid-session', () => {
    pathname = '/review/today';
    levelUpEvent = { buddyKey: 'buddy_bunny', level: 2 };
    awardEvent = { buddyKey: 'buddy_bunny', source: 'adventure', awarded: 3, words: [] };
    render(<FriendshipAwardToast />);

    expect(screen.getByRole('status')).toHaveTextContent(
      '3 hearts earned. Tsuki hopped so high she surprised herself.',
    );
  });
});
