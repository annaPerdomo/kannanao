import { fireEvent, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BuddyFriendshipDialog } from '@/components/BuddyFriendship';
import type { BuddyStoryRequest } from '@/contexts/BuddyFriendshipContext';
import { renderWithProviders as render } from '@/test/renderWithProviders';

const FRIENDSHIP_COPY: Record<string, unknown> = {
  buddy_tango: {
    l2: {
      title: 'A Rainy Afternoon',
      teaser: 'tango teaser two',
      story: ['tango line one', 'tango line two'],
      phrases: ['tango idle two'],
    },
    l3: {
      title: 'The Mail Carrier',
      teaser: 'tango teaser three',
      story: ['tango level three'],
      phrases: ['tango idle three'],
    },
    facts: ['tango fact one', 'tango fact two'],
  },
};

vi.mock('next-intl', () => ({
  useTranslations: (namespace: string) => {
    const t = (key: string, params?: Record<string, unknown>) =>
      params ? `${key}|${Object.values(params).join(',')}` : key;
    t.raw = (key: string) => {
      const [buddyKey, field] = key.split('.');
      if (namespace === 'Shop.buddies' && field === 'friendship' && FRIENDSHIP_COPY[buddyKey]) {
        return FRIENDSHIP_COPY[buddyKey];
      }
      throw new Error(`missing message: ${key}`);
    };
    return t;
  },
}));

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

vi.mock('@/components/BuddyFriendship/LevelUpMeter', () => ({ LevelUpMeter: () => null }));
vi.mock('@/components/BuddyFriendship/CelebrationBurst', () => ({ CelebrationBurst: () => null }));

const closeStories = vi.fn();
const openStories = vi.fn();
const clearLevelUpEvent = vi.fn();
const petBuddy = vi.fn();
let storyRequest: BuddyStoryRequest | null = null;
type Row = { buddyKey: string; points: number };
type Goal = { source: string; points: number; done: boolean };
let friendships: Record<string, Row> = {};
let todayGoals: Goal[] = [];
let heartsToday = 0;

vi.mock('@/contexts/BuddyFriendshipContext', () => ({
  useBuddyFriendshipCtx: () => ({
    storyRequest,
    closeStories,
    openStories,
    clearLevelUpEvent,
    friendships,
    todayGoals,
    heartsToday,
    petBuddy,
  }),
}));

function tapContinue() {
  fireEvent.click(screen.getByRole('button', { name: 'continueHint' }));
}

function row(buddyKey: string, points: number): Row {
  return { buddyKey, points };
}

function goals(done: Partial<Record<string, boolean>> = {}): Goal[] {
  return [
    { source: 'adventure', points: 3, done: !!done.adventure },
    { source: 'session', points: 1, done: !!done.session },
    { source: 'pet', points: 1, done: !!done.pet },
  ];
}

describe('BuddyFriendshipDialog', () => {
  beforeEach(() => {
    closeStories.mockClear();
    openStories.mockClear();
    clearLevelUpEvent.mockClear();
    push.mockClear();
    petBuddy.mockClear();
    storyRequest = null;
    friendships = { buddy_tango: row('buddy_tango', 20) };
    todayGoals = goals();
    heartsToday = 0;
  });

  it('stays out of the way while nothing has asked for it', () => {
    render(<BuddyFriendshipDialog />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('celebrates the level a level-up asked it to, and labels itself with the title', () => {
    storyRequest = { mode: 'levelUp', buddyKey: 'buddy_tango', level: 2 };
    render(<BuddyFriendshipDialog />);

    const title = screen.getByText('levelUpTitle|buddy_tango.name,levelNames.2');
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-labelledby', title.id);
  });

  it('opens on the meter, holding the story back until the ceremony reaches it', () => {
    storyRequest = { mode: 'levelUp', buddyKey: 'buddy_tango', level: 2 };
    render(<BuddyFriendshipDialog />);

    expect(screen.getByRole('group')).toHaveAttribute(
      'aria-label',
      'celebration.stageAria.meter|buddy_tango.name',
    );
    expect(screen.queryByText('tango line one')).toBeNull();
  });

  it('walks the ceremony from the meter to the memory, one tap per stage', () => {
    storyRequest = { mode: 'levelUp', buddyKey: 'buddy_tango', level: 2 };
    render(<BuddyFriendshipDialog />);

    tapContinue();
    expect(screen.getByText('celebration.grew')).toBeInTheDocument();
    expect(
      screen.getByText('celebration.levelChange|buddy_tango.name,levelNames.2'),
    ).toBeInTheDocument();

    tapContinue();
    expect(screen.getByText('celebration.unlocksHeading')).toBeInTheDocument();
    expect(screen.getByText('celebration.unlockMemory|A Rainy Afternoon')).toBeInTheDocument();
    expect(screen.getByText('celebration.unlockPhrases|1,buddy_tango.name')).toBeInTheDocument();

    tapContinue();
    expect(screen.getByText('celebration.memoryIntro|buddy_tango.name')).toBeInTheDocument();
    expect(screen.getByText('tango line one')).toBeInTheDocument();
    expect(screen.queryByText('tango line two')).toBeNull();

    tapContinue();
    expect(screen.getByText('tango line two')).toBeInTheDocument();
    expect(screen.queryByText('celebration.saved')).toBeNull();

    tapContinue();
    expect(screen.getByText('celebration.saved')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'continueHint' })).toBeNull();
  });

  it('advances from the keyboard without a pointer', () => {
    storyRequest = { mode: 'levelUp', buddyKey: 'buddy_tango', level: 2 };
    render(<BuddyFriendshipDialog />);

    const sequence = screen.getByRole('group');
    fireEvent.keyDown(sequence, { key: 'Enter' });
    expect(screen.getByText('celebration.grew')).toBeInTheDocument();

    fireEvent.keyDown(sequence, { key: ' ' });
    expect(screen.getByText('celebration.unlocksHeading')).toBeInTheDocument();
  });

  it('keeps the story outside the continue control, where a reader can hear it', () => {
    storyRequest = { mode: 'levelUp', buddyKey: 'buddy_tango', level: 2 };
    render(<BuddyFriendshipDialog />);

    tapContinue();
    tapContinue();
    tapContinue();

    const advance = screen.getByRole('button', { name: 'continueHint' });
    expect(advance.tagName).toBe('BUTTON');
    expect(within(advance).queryByText('tango line one')).toBeNull();
  });

  it('leaves the ending to the sequence rather than a standing Close', () => {
    storyRequest = { mode: 'levelUp', buddyKey: 'buddy_tango', level: 2 };
    render(<BuddyFriendshipDialog />);

    const closers = screen.getAllByRole('button', { name: 'close' });
    expect(closers).toHaveLength(1);
    fireEvent.click(closers[0]);
    expect(closeStories).toHaveBeenCalledTimes(1);
  });

  it('consumes the event before browsing, so the celebration cannot re-pop', () => {
    storyRequest = { mode: 'levelUp', buddyKey: 'buddy_tango', level: 2 };
    render(<BuddyFriendshipDialog />);

    for (let i = 0; i < 5; i++) tapContinue();

    fireEvent.click(screen.getByRole('button', { name: 'celebration.seeMemories' }));
    expect(clearLevelUpEvent).toHaveBeenCalledTimes(1);
    expect(openStories).toHaveBeenCalledWith('buddy_tango');
    expect(clearLevelUpEvent.mock.invocationCallOrder[0]).toBeLessThan(
      openStories.mock.invocationCallOrder[0],
    );
  });

  it('goes home on the secondary way out, which is what consumes the event', () => {
    storyRequest = { mode: 'levelUp', buddyKey: 'buddy_tango', level: 2 };
    render(<BuddyFriendshipDialog />);

    for (let i = 0; i < 5; i++) tapContinue();

    fireEvent.click(screen.getByRole('button', { name: 'celebration.backHome' }));
    expect(closeStories).toHaveBeenCalledTimes(1);
    expect(openStories).not.toHaveBeenCalled();
  });

  it('celebrates the level it was handed, even after more hearts landed', () => {
    friendships = { buddy_tango: row('buddy_tango', 140) };
    storyRequest = { mode: 'levelUp', buddyKey: 'buddy_tango', level: 2 };
    render(<BuddyFriendshipDialog />);

    tapContinue();
    expect(
      screen.getByText('celebration.levelChange|buddy_tango.name,levelNames.2'),
    ).toBeInTheDocument();

    tapContinue();
    tapContinue();
    expect(screen.getByText('tango line one')).toBeInTheDocument();
    expect(screen.queryByText('tango level three')).toBeNull();
  });

  it('skips the unlocks and the memory when a level-up has no copy to show', () => {
    friendships = { buddy_fox: row('buddy_fox', 15) };
    storyRequest = { mode: 'levelUp', buddyKey: 'buddy_fox', level: 2 };
    render(<BuddyFriendshipDialog />);

    expect(screen.getByText('levelUpTitle|buddy_fox.name,levelNames.2')).toBeInTheDocument();

    tapContinue();
    expect(screen.getByText('celebration.grew')).toBeInTheDocument();

    tapContinue();
    expect(screen.getByText('celebration.savedNoMemory|buddy_fox.name')).toBeInTheDocument();
    expect(screen.queryByText('celebration.unlocksHeading')).toBeNull();
    expect(screen.queryByText('celebration.memoryIntro|buddy_fox.name')).toBeNull();
    expect(screen.queryByText('celebration.saved')).toBeNull();
  });

  it('opens on the friendship, not the story list', () => {
    storyRequest = { mode: 'browse', buddyKey: 'buddy_tango' };
    render(<BuddyFriendshipDialog />);

    const title = screen.getByText('friendshipTitle|buddy_tango.name');
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-labelledby', title.id);
    expect(screen.getAllByText('levelNames.2').length).toBeGreaterThan(0);
    expect(screen.getByText('levelTone.2|buddy_tango.name')).toBeInTheDocument();
    expect(screen.getByLabelText('meterAria|levelNames.2,5,25')).toBeInTheDocument();
  });

  it('promises the next authored fact when one is waiting', () => {
    friendships = { buddy_tango: row('buddy_tango', 3) };
    storyRequest = { mode: 'browse', buddyKey: 'buddy_tango' };
    render(<BuddyFriendshipDialog />);

    expect(screen.getByText('milestone.fact|2,buddy_tango.name')).toBeInTheDocument();
  });

  it('skips ahead of fact milestones this buddy has no copy for', () => {
    storyRequest = { mode: 'browse', buddyKey: 'buddy_tango' };
    render(<BuddyFriendshipDialog />);

    expect(screen.getByText('milestone.memory|20,buddy_tango.name')).toBeInTheDocument();
  });

  it('promises the level instead when nothing ahead is authored', () => {
    friendships = { buddy_fox: row('buddy_fox', 20) };
    storyRequest = { mode: 'browse', buddyKey: 'buddy_fox' };
    render(<BuddyFriendshipDialog />);

    expect(screen.getByText('milestone.level|20,buddy_fox.name,levelNames.3')).toBeInTheDocument();
  });

  it('lands on a warm state at max friendship instead of an empty one', () => {
    friendships = { buddy_tango: row('buddy_tango', 140) };
    storyRequest = { mode: 'browse', buddyKey: 'buddy_tango' };
    render(<BuddyFriendshipDialog />);

    expect(screen.getByText('milestone.max|buddy_tango.name')).toBeInTheDocument();
  });

  it('lists today’s three ways to grow closer, adventure first', () => {
    storyRequest = { mode: 'browse', buddyKey: 'buddy_tango' };
    render(<BuddyFriendshipDialog />);

    expect(screen.getByText('today.heading|buddy_tango.name')).toBeInTheDocument();
    ['adventure', 'session', 'pet'].forEach((source) => {
      expect(screen.getByText(`today.${source}.title|buddy_tango.name`)).toBeInTheDocument();
    });
    expect(screen.getByText('today.footer|0,5')).toBeInTheDocument();
  });

  it('marks a done goal with a check instead of a button', () => {
    todayGoals = goals({ adventure: true });
    heartsToday = 3;
    storyRequest = { mode: 'browse', buddyKey: 'buddy_tango' };
    render(<BuddyFriendshipDialog />);

    expect(screen.getByText('today.footer|3,5')).toBeInTheDocument();
    expect(screen.getByTitle('today.done')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'today.adventure.cta|buddy_tango.name' }),
    ).toBeNull();
    expect(
      screen.getByRole('button', { name: 'today.session.cta|buddy_tango.name' }),
    ).toBeInTheDocument();
  });

  it('sends the adventure row to the review queue and closes on the way out', () => {
    storyRequest = { mode: 'browse', buddyKey: 'buddy_tango' };
    render(<BuddyFriendshipDialog />);

    fireEvent.click(screen.getByRole('button', { name: 'today.adventure.cta|buddy_tango.name' }));
    expect(push).toHaveBeenCalledWith('/review/today');
    expect(closeStories).toHaveBeenCalledTimes(1);
  });

  it('pays the pet heart from its own row rather than sending anyone away', () => {
    storyRequest = { mode: 'browse', buddyKey: 'buddy_tango' };
    render(<BuddyFriendshipDialog />);

    fireEvent.click(screen.getByRole('button', { name: 'today.pet.cta|buddy_tango.name' }));
    expect(petBuddy).toHaveBeenCalledTimes(1);
    expect(push).not.toHaveBeenCalled();
    expect(closeStories).not.toHaveBeenCalled();
  });

  it('shows only the facts the hearts have unlocked', () => {
    storyRequest = { mode: 'browse', buddyKey: 'buddy_tango' };
    render(<BuddyFriendshipDialog />);

    expect(screen.getByText('about.heading|buddy_tango.name')).toBeInTheDocument();
    expect(screen.getByText('tango fact one')).toBeInTheDocument();
    expect(screen.getByText('tango fact two')).toBeInTheDocument();
  });

  it('hides the about section for a buddy with nothing learned yet', () => {
    friendships = { buddy_tango: row('buddy_tango', 4) };
    storyRequest = { mode: 'browse', buddyKey: 'buddy_tango' };
    render(<BuddyFriendshipDialog />);

    expect(screen.queryByText('about.heading|buddy_tango.name')).toBeNull();
  });

  it('collects earned memories and teases the locked ones without leaking them', () => {
    storyRequest = { mode: 'browse', buddyKey: 'buddy_tango' };
    render(<BuddyFriendshipDialog />);

    expect(screen.getByText('A Rainy Afternoon')).toBeInTheDocument();
    expect(screen.getByText('tango line one')).toBeInTheDocument();

    expect(screen.getByText('The Mail Carrier')).toBeInTheDocument();
    expect(screen.getByText('tango teaser three')).toBeInTheDocument();
    expect(screen.queryByText('tango level three')).toBeNull();
    expect(screen.getByText('memories.locked|levelNames.3')).toBeInTheDocument();
  });

  it('browses off the buddy’s live hearts, not the level it was opened with', () => {
    friendships = { buddy_tango: row('buddy_tango', 40) };
    storyRequest = { mode: 'browse', buddyKey: 'buddy_tango' };
    render(<BuddyFriendshipDialog />);

    expect(screen.getByText('tango level three')).toBeInTheDocument();
    expect(screen.queryByText('memories.locked|levelNames.3')).toBeNull();
  });

  it('degrades to meter, goals and blank locked rows for a copyless buddy', () => {
    friendships = { buddy_fox: row('buddy_fox', 20) };
    storyRequest = { mode: 'browse', buddyKey: 'buddy_fox' };
    render(<BuddyFriendshipDialog />);

    expect(screen.getByText('friendshipTitle|buddy_fox.name')).toBeInTheDocument();
    expect(screen.getByLabelText('meterAria|levelNames.2,5,25')).toBeInTheDocument();
    expect(screen.getByText('today.heading|buddy_fox.name')).toBeInTheDocument();
    expect(screen.getAllByText('memories.lockedTitle')).toHaveLength(3);
    expect(screen.getByText('memories.locked|levelNames.3')).toBeInTheDocument();
  });

  it('drops the memories section when there is nothing left to scrapbook', () => {
    friendships = { buddy_fox: row('buddy_fox', 140) };
    storyRequest = { mode: 'browse', buddyKey: 'buddy_fox' };
    render(<BuddyFriendshipDialog />);

    expect(screen.queryByText('memories.heading')).toBeNull();
  });
});
