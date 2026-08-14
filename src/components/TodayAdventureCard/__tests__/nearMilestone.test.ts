import { describe, expect, it } from 'vitest';

import { type FriendshipDates, todayOpportunities } from '@/lib/friendship';

import { nearMilestoneHook } from '../nearMilestone';

const TODAY = '2026-08-13';

const AUTHORED = {
  facts: ['Loves bread', 'Hums while walking', 'Afraid of thunder'],
  l2: { story: ['A rainy afternoon.'] },
  l3: { story: ['The bento box.'] },
};

const goals = (dates: FriendshipDates) => todayOpportunities(dates, TODAY);
const nothingEarnedYet = goals({});
const everythingEarnedToday = goals({ adventure: TODAY, session: TODAY, pet: TODAY });

describe('nearMilestoneHook', () => {
  it('should promise the memory two hearts before a level lands', () => {
    expect(nearMilestoneHook(AUTHORED, 13, nothingEarnedYet, TODAY)).toEqual({
      kind: 'memory',
      heartsAway: 2,
    });
  });

  it('should promise the next written fact when one comes first', () => {
    expect(nearMilestoneHook(AUTHORED, 3, nothingEarnedYet, TODAY)).toEqual({
      kind: 'fact',
      heartsAway: 2,
    });
  });

  it('should stay quiet for a buddy whose milestone has nothing written behind it', () => {
    expect(nearMilestoneHook(null, 13, nothingEarnedYet, TODAY)).toBeNull();
    expect(nearMilestoneHook({ facts: [] }, 13, nothingEarnedYet, TODAY)).toBeNull();
  });

  // Milestones sit 5 hearts apart, so skipping an unwritten fact slot always
  // pushes the next real one past today's reach.
  it('should skip a fact slot this buddy never had written', () => {
    const sparse = { facts: ['Loves bread'], l2: { story: ['A rainy afternoon.'] } };
    expect(nearMilestoneHook(sparse, 8, nothingEarnedYet, TODAY)).toBeNull();
  });

  it('should stay quiet when the milestone is out of reach today', () => {
    expect(
      nearMilestoneHook({ l3: { story: ['The bento box.'] } }, 0, nothingEarnedYet, TODAY),
    ).toBeNull();
  });

  it('should still speak up within a few hearts once today’s goals are spent', () => {
    expect(nearMilestoneHook(AUTHORED, 13, everythingEarnedToday, TODAY)).toEqual({
      kind: 'memory',
      heartsAway: 2,
    });
  });

  it('should stay quiet at max hearts', () => {
    expect(nearMilestoneHook(AUTHORED, 140, nothingEarnedYet, TODAY)).toBeNull();
  });
});
