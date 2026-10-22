import { STICKER_SETS, type StickerSet } from '@/lib/stickers';

export interface OrderedStickerSet {
  set: StickerSet;
  owned: boolean;
}

export function orderStickerSets(
  activeBuddy: string,
  ownsItem: (key: string) => boolean,
): OrderedStickerSet[] {
  const all = STICKER_SETS.map((set) => ({ set, owned: ownsItem(set.buddyKey) }));
  const rank = ({ set, owned }: OrderedStickerSet) =>
    owned && set.buddyKey === activeBuddy ? 0 : owned ? 1 : 2;
  return all
    .map((entry, i) => ({ entry, i }))
    .sort((a, b) => rank(a.entry) - rank(b.entry) || a.i - b.i)
    .map(({ entry }) => entry);
}
