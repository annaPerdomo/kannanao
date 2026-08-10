import { fireEvent, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BuddyStoryDialog } from '@/components/BuddyStoryDialog';
import type { BuddyStoryRequest } from '@/contexts/BuddyFriendshipContext';
import { renderWithProviders as render } from '@/test/renderWithProviders';

const FRIENDSHIP_COPY: Record<string, unknown> = {
  buddy_tango: {
    l2: { story: ['tango line one', 'tango line two'], phrases: ['tango idle two'] },
    l3: { story: ['tango level three'], phrases: ['tango idle three'] },
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

const closeStories = vi.fn();
let storyRequest: BuddyStoryRequest | null = null;
let friendships: Record<string, { buddyKey: string; points: number }> = {};

vi.mock('@/contexts/BuddyFriendshipContext', () => ({
  useBuddyFriendshipCtx: () => ({ storyRequest, closeStories, friendships }),
}));

describe('BuddyStoryDialog', () => {
  beforeEach(() => {
    closeStories.mockClear();
    storyRequest = null;
    friendships = { buddy_tango: { buddyKey: 'buddy_tango', points: 20 } };
  });

  it('stays out of the way while nothing has asked for it', () => {
    render(<BuddyStoryDialog />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('celebrates the level a level-up asked it to, and labels itself with the title', () => {
    storyRequest = { mode: 'levelUp', buddyKey: 'buddy_tango', level: 2 };
    render(<BuddyStoryDialog />);

    const title = screen.getByText('levelUpTitle|buddy_tango.name,levelNames.2');
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-labelledby', title.id);
  });

  it('reveals the level-up story one line at a time', () => {
    storyRequest = { mode: 'levelUp', buddyKey: 'buddy_tango', level: 2 };
    render(<BuddyStoryDialog />);

    expect(screen.getByText('tango line one')).toBeInTheDocument();
    expect(screen.queryByText('tango line two')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'continueHint' }));
    expect(screen.getByText('tango line two')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'continueHint' })).toBeNull();
  });

  it('keeps the story outside the continue control, where a reader can hear it', () => {
    storyRequest = { mode: 'levelUp', buddyKey: 'buddy_tango', level: 2 };
    render(<BuddyStoryDialog />);

    const advance = screen.getByRole('button', { name: 'continueHint' });
    // A real <button> so Enter and Space work without a handler of our own.
    expect(advance.tagName).toBe('BUTTON');
    expect(within(advance).queryByText('tango line one')).toBeNull();
  });

  it('hands the close back to the context, which is what consumes the event', () => {
    storyRequest = { mode: 'levelUp', buddyKey: 'buddy_tango', level: 2 };
    render(<BuddyStoryDialog />);

    // The header's × and the footer button both close it.
    const closers = screen.getAllByRole('button', { name: 'close' });
    expect(closers).toHaveLength(2);
    closers.forEach((button) => fireEvent.click(button));
    expect(closeStories).toHaveBeenCalledTimes(2);
  });

  it('lists the stories already earned and keeps the rest ahead of the reader', () => {
    // 20 hearts is level 2, so only the level-2 story has been told.
    storyRequest = { mode: 'browse', buddyKey: 'buddy_tango' };
    render(<BuddyStoryDialog />);

    expect(screen.getByText('storiesTitle|buddy_tango.name')).toBeInTheDocument();
    expect(screen.getByText('tango line one')).toBeInTheDocument();
    expect(screen.getByText('tango line two')).toBeInTheDocument();
    expect(screen.queryByText('tango level three')).toBeNull();
    expect(screen.getByText('lockedStory|levelNames.3')).toBeInTheDocument();
    expect(screen.getByText('lockedStory|levelNames.5')).toBeInTheDocument();
  });

  it('browses off the buddy’s live hearts, not the level it was opened with', () => {
    friendships = { buddy_tango: { buddyKey: 'buddy_tango', points: 40 } };
    storyRequest = { mode: 'browse', buddyKey: 'buddy_tango' };
    render(<BuddyStoryDialog />);

    expect(screen.getByText('tango level three')).toBeInTheDocument();
    expect(screen.queryByText('lockedStory|levelNames.3')).toBeNull();
  });

  it('renders a buddy with no story copy as meter and locked rows only', () => {
    friendships = { buddy_fox: { buddyKey: 'buddy_fox', points: 20 } };
    storyRequest = { mode: 'browse', buddyKey: 'buddy_fox' };
    render(<BuddyStoryDialog />);

    expect(screen.getByText('storiesTitle|buddy_fox.name')).toBeInTheDocument();
    expect(screen.getByLabelText('meterAria|levelNames.2,5,25')).toBeInTheDocument();
    expect(screen.getByText('lockedStory|levelNames.3')).toBeInTheDocument();
  });

  it('skips the story area entirely when a level-up has no copy to show', () => {
    friendships = { buddy_fox: { buddyKey: 'buddy_fox', points: 15 } };
    storyRequest = { mode: 'levelUp', buddyKey: 'buddy_fox', level: 2 };
    render(<BuddyStoryDialog />);

    expect(screen.getByText('levelUpTitle|buddy_fox.name,levelNames.2')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'continueHint' })).toBeNull();
    expect(screen.queryByText(/lockedStory/)).toBeNull();
  });
});
