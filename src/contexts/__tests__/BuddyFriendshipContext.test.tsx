import { render, screen } from '@testing-library/react';
import { act, useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BuddyFriendshipProvider, useBuddyFriendshipCtx } from '@/contexts/BuddyFriendshipContext';

const clearLevelUpEvent = vi.fn();
let levelUpEvent: { buddyKey: string; level: number } | null = null;
let pathname = '/';
let user: { id: string } | null = { id: 'user-1' };

vi.mock('next/navigation', () => ({ usePathname: () => pathname }));

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user }) }));

// Holds the event in real state so clearing it actually re-renders the
// provider — the effect that opens the dialog keys off that.
vi.mock('@/hooks/useBuddyFriendship', () => ({
  useBuddyFriendship: () => {
    const [event, setEvent] = useState(() => levelUpEvent);
    return {
      friendships: {},
      // The real hook drops a held event on sign-out; mirrored so the provider
      // is tested against what it actually receives.
      levelUpEvent: user ? event : null,
      clearLevelUpEvent: () => {
        clearLevelUpEvent();
        setEvent(null);
      },
    };
  },
}));

function Probe() {
  const { storyRequest, openStories, closeStories } = useBuddyFriendshipCtx();
  return (
    <>
      <span data-testid="request">{storyRequest ? JSON.stringify(storyRequest) : 'none'}</span>
      <button onClick={() => openStories('buddy_fox')}>open</button>
      <button onClick={closeStories}>close</button>
    </>
  );
}

function renderProvider() {
  return render(
    <BuddyFriendshipProvider>
      <Probe />
    </BuddyFriendshipProvider>,
  );
}

const request = () => screen.getByTestId('request').textContent;

describe('BuddyFriendshipProvider story dialog', () => {
  beforeEach(() => {
    clearLevelUpEvent.mockClear();
    levelUpEvent = null;
    pathname = '/';
    user = { id: 'user-1' };
  });

  it('asks for the celebration as soon as a level-up lands outside a session', () => {
    levelUpEvent = { buddyKey: 'buddy_tango', level: 3 };
    renderProvider();
    expect(request()).toBe(JSON.stringify({ mode: 'levelUp', buddyKey: 'buddy_tango', level: 3 }));
  });

  it('holds the celebration until the user leaves a running session', () => {
    levelUpEvent = { buddyKey: 'buddy_tango', level: 3 };
    pathname = '/deck/abc/practice/typing';
    const { rerender } = renderProvider();
    expect(request()).toBe('none');
    // The event is deliberately left unconsumed while they practise.
    expect(clearLevelUpEvent).not.toHaveBeenCalled();

    pathname = '/decks';
    rerender(
      <BuddyFriendshipProvider>
        <Probe />
      </BuddyFriendshipProvider>,
    );
    expect(request()).toContain('levelUp');
  });

  it('consumes the level-up event when the celebration is closed', () => {
    levelUpEvent = { buddyKey: 'buddy_tango', level: 3 };
    renderProvider();
    act(() => screen.getByText('close').click());
    expect(request()).toBe('none');
    expect(clearLevelUpEvent).toHaveBeenCalledTimes(1);
  });

  it('opens a browse request without touching a held level-up', () => {
    levelUpEvent = { buddyKey: 'buddy_tango', level: 3 };
    pathname = '/deck/abc/practice';
    renderProvider();
    act(() => screen.getByText('open').click());
    expect(request()).toBe(JSON.stringify({ mode: 'browse', buddyKey: 'buddy_fox' }));

    act(() => screen.getByText('close').click());
    expect(request()).toBe('none');
    expect(clearLevelUpEvent).not.toHaveBeenCalled();
  });

  // Swapping a dialog's content out from under the reader is worse than making
  // the celebration wait its turn.
  it('should leave an open browse alone when a held level-up is released', () => {
    levelUpEvent = { buddyKey: 'buddy_tango', level: 3 };
    pathname = '/deck/abc/practice';
    const { rerender } = renderProvider();
    act(() => screen.getByText('open').click());
    expect(request()).toContain('browse');

    pathname = '/decks';
    rerender(
      <BuddyFriendshipProvider>
        <Probe />
      </BuddyFriendshipProvider>,
    );
    expect(request()).toContain('browse');

    // …and it gets its turn the moment the browse is closed.
    act(() => screen.getByText('close').click());
    expect(request()).toContain('levelUp');
  });

  it('should drop an open dialog on sign-out rather than show it to the next user', () => {
    levelUpEvent = { buddyKey: 'buddy_tango', level: 3 };
    const { rerender } = renderProvider();
    expect(request()).toContain('levelUp');

    user = null;
    rerender(
      <BuddyFriendshipProvider>
        <Probe />
      </BuddyFriendshipProvider>,
    );
    expect(request()).toBe('none');
  });
});
