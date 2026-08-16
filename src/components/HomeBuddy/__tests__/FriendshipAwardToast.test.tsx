import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FriendshipAwardToast } from '@/components/HomeBuddy/FriendshipAwardToast';
import type { BuddyStoryRequest } from '@/contexts/BuddyFriendshipContext';
import type { FriendshipAwardEvent } from '@/hooks/useBuddyFriendship';
import { renderWithProviders as render } from '@/test/renderWithProviders';

const clearAwardEvent = vi.fn();
let awardEvent: FriendshipAwardEvent | null = null;
let storyRequest: BuddyStoryRequest | null = null;
let levelUpEvent: { buddyKey: string; level: number } | null = null;
let pathname = '/';

vi.mock('next/navigation', () => ({ usePathname: () => pathname }));

vi.mock('@/contexts/BuddyFriendshipContext', () => ({
  useBuddyFriendshipCtx: () => ({ awardEvent, clearAwardEvent, storyRequest, levelUpEvent }),
}));

describe('FriendshipAwardToast', () => {
  beforeEach(() => {
    clearAwardEvent.mockClear();
    awardEvent = null;
    storyRequest = null;
    levelUpEvent = null;
    pathname = '/';
  });

  it('should stay out of the way when no heart was paid', () => {
    render(<FriendshipAwardToast />);
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });

  // Momo has no authored copy, so these cover the chrome fallback. If she ever
  // gets lines, repoint them at whichever buddy is still unauthored.
  it('should celebrate an award once and consume the event', () => {
    awardEvent = { buddyKey: 'buddy_axolotl', source: 'session', awarded: 1 };
    render(<FriendshipAwardToast />);

    expect(screen.getByRole('status')).toHaveTextContent('+1 ❤️ Momo is glad you kept practicing.');
    expect(clearAwardEvent).toHaveBeenCalledTimes(1);
  });

  it('should pick the copy for the source that paid', () => {
    awardEvent = { buddyKey: 'buddy_axolotl', source: 'pet', awarded: 1 };
    render(<FriendshipAwardToast />);

    expect(screen.getByRole('status')).toHaveTextContent('+1 ❤️ Momo was happy to see you.');
  });

  it('should send one heart per point on the adventure award', () => {
    awardEvent = { buddyKey: 'buddy_axolotl', source: 'adventure', awarded: 3 };
    const { container } = render(<FriendshipAwardToast />);

    expect(screen.getByRole('status')).toHaveTextContent(
      '+3 ❤️ Momo loved studying with you today!',
    );
    expect(container.querySelectorAll('[data-award-hearts] > *')).toHaveLength(3);
  });

  it("should speak in the buddy's own voice when that line is written", () => {
    awardEvent = { buddyKey: 'buddy_tango', source: 'pet', awarded: 1 };
    const { container } = render(<FriendshipAwardToast />);

    expect(container).toHaveTextContent('~leans into your hand~');
    expect(screen.getByRole('status')).toHaveTextContent('1 heart earned. ~leans into your hand~');
  });

  it('should send one heart per point on an authored adventure line', () => {
    awardEvent = { buddyKey: 'buddy_bunny', source: 'adventure', awarded: 3 };
    const { container } = render(<FriendshipAwardToast />);

    expect(screen.getByRole('status')).toHaveTextContent(
      '3 hearts earned. Tsuki hopped so high she surprised herself.',
    );
    expect(container.querySelectorAll('[data-award-hearts] > *')).toHaveLength(3);
  });

  it('should suppress itself while the friendship dialog is open, without stranding the event', () => {
    storyRequest = { mode: 'levelUp', buddyKey: 'buddy_bunny', level: 2 };
    awardEvent = { buddyKey: 'buddy_bunny', source: 'adventure', awarded: 3 };
    render(<FriendshipAwardToast />);

    expect(screen.getByRole('status')).toBeEmptyDOMElement();
    expect(clearAwardEvent).toHaveBeenCalledTimes(1);
  });

  it('should stand down for a level-up the dialog is about to celebrate', () => {
    levelUpEvent = { buddyKey: 'buddy_bunny', level: 2 };
    awardEvent = { buddyKey: 'buddy_bunny', source: 'pet', awarded: 1 };
    render(<FriendshipAwardToast />);

    expect(screen.getByRole('status')).toBeEmptyDOMElement();
    expect(clearAwardEvent).toHaveBeenCalledTimes(1);
  });

  it('should still celebrate an award that lands mid-session', () => {
    pathname = '/review/today';
    levelUpEvent = { buddyKey: 'buddy_bunny', level: 2 };
    awardEvent = { buddyKey: 'buddy_bunny', source: 'adventure', awarded: 3 };
    render(<FriendshipAwardToast />);

    expect(screen.getByRole('status')).toHaveTextContent(
      '3 hearts earned. Tsuki hopped so high she surprised herself.',
    );
  });
});
