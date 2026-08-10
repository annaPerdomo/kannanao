import { render, screen } from '@testing-library/react';
import { act } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BuddyFriendshipProvider, useBuddyFriendshipCtx } from '@/contexts/BuddyFriendshipContext';

const clearLevelUpEvent = vi.fn();
let levelUpEvent: { buddyKey: string; level: number } | null = null;
let pathname = '/';

vi.mock('next/navigation', () => ({ usePathname: () => pathname }));

vi.mock('@/hooks/useBuddyFriendship', () => ({
  useBuddyFriendship: () => ({ friendships: {}, levelUpEvent, clearLevelUpEvent }),
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
});
