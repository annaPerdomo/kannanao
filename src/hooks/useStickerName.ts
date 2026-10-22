'use client';

import { useTranslations } from 'next-intl';
import { useCallback } from 'react';

import type { Sticker } from '@/lib/stickers';

export function useStickerName(): (sticker: Sticker) => string {
  const tNames = useTranslations('Messages.stickerNames');
  const tPicker = useTranslations('Messages.stickerPicker');
  const tShop = useTranslations('Shop.items');

  return useCallback(
    (sticker: Sticker) =>
      sticker.number
        ? tPicker('buddySticker', {
            name: tShop(`${sticker.buddyKey}.name`),
            number: sticker.number,
          })
        : tNames(sticker.id),
    [tNames, tPicker, tShop],
  );
}
