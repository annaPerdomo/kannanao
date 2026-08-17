import { describe, expect, it } from 'vitest';

import { SHOP_ITEMS } from '@/hooks/useShop';
import {
  awardLine,
  buddyFacts,
  memoryTeaser,
  memoryTitle,
  phraseLines,
  storyLines,
} from '@/lib/buddyPhrases';
import { MINOR_MILESTONES } from '@/lib/friendshipMilestones';

import en from '../en.json';
import ja from '../ja.json';

// Spelled out, not Object.keys: a derived list passes vacuously if copy is lost.
const EQUIPPABLE = [
  'buddy_tango',
  'buddy_bunny',
  'buddy_penguin',
  'buddy_panda',
  'buddy_otter',
  'buddy_fox',
  'buddy_lucky_cat',
  'buddy_pink_cat',
  'buddy_kappa',
  'buddy_tanuki',
  'buddy_red_panda',
] as const;

const STORY_LEVELS = [2, 3, 4, 5];

const CATALOGS = { en, ja } as const;

function friendshipCopy(catalog: (typeof CATALOGS)[keyof typeof CATALOGS], key: string): unknown {
  const buddies = catalog.Shop.buddies as Record<string, { friendship?: unknown }>;
  return buddies[key]?.friendship;
}

describe('buddy friendship copy', () => {
  it('covers every equippable buddy', () => {
    const shipped = SHOP_ITEMS.filter((i) => i.category === 'study_buddy' && !i.comingSoon).map(
      (i) => i.key,
    );
    expect([...shipped].sort()).toEqual([...EQUIPPABLE].sort());
  });

  describe.each(Object.entries(CATALOGS))('%s catalog', (_locale, catalog) => {
    it.each(EQUIPPABLE)('%s has a friendship object', (key) => {
      expect(friendshipCopy(catalog, key)).toBeTypeOf('object');
    });

    it.each(EQUIPPABLE)('%s has a full memory for every level', (key) => {
      const copy = friendshipCopy(catalog, key);
      for (const level of STORY_LEVELS) {
        expect(memoryTitle(copy, level), `l${level} title`).toBeTruthy();
        expect(memoryTeaser(copy, level), `l${level} teaser`).toBeTruthy();
        expect(storyLines(copy, level).length, `l${level} story`).toBeGreaterThan(0);
        expect(phraseLines(copy, level).length, `l${level} phrases`).toBeGreaterThan(0);
      }
    });

    it.each(EQUIPPABLE)('%s has one fact per minor milestone', (key) => {
      const facts = buddyFacts(friendshipCopy(catalog, key));
      expect(facts).toHaveLength(MINOR_MILESTONES.length);
      expect(facts.filter((fact) => !fact)).toEqual([]);
    });

    it.each(EQUIPPABLE)('%s has a line for every award source', (key) => {
      const copy = friendshipCopy(catalog, key);
      expect(awardLine(copy, 'adventure')).toBeTruthy();
      expect(awardLine(copy, 'session')).toBeTruthy();
      expect(awardLine(copy, 'pet')).toBeTruthy();
    });
  });
});
