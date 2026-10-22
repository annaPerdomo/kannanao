import { describe, expect, it } from 'vitest';

import { orderStickerSets } from '../orderStickerSets';

const owns =
  (...keys: string[]) =>
  (key: string) =>
    ['buddy_tango', ...keys].includes(key);

describe('orderStickerSets', () => {
  it('puts the active buddy first, then other owned sets, then locked ones', () => {
    const order = orderStickerSets('buddy_fox', owns('buddy_fox', 'buddy_bunny'));
    expect(order.slice(0, 3).map((s) => [s.set.buddyKey, s.owned])).toEqual([
      ['buddy_fox', true],
      ['buddy_tango', true],
      ['buddy_bunny', true],
    ]);
    expect(order.slice(3).every((s) => !s.owned)).toBe(true);
  });

  it('keeps every set, locked or not', () => {
    expect(orderStickerSets('buddy_tango', owns())).toHaveLength(11);
  });

  it('does not promote an active buddy the user no longer owns', () => {
    const order = orderStickerSets('buddy_fox', owns());
    expect(order[0].set.buddyKey).toBe('buddy_tango');
    expect(order.find((s) => s.set.buddyKey === 'buddy_fox')?.owned).toBe(false);
  });
});
