'use client';

import type { EmojiClickData, Theme as EprTheme } from 'emoji-picker-react';
import dynamic from 'next/dynamic';

/**
 * `emoji-picker-react` ships a ~300KB minified bundle. It was statically
 * imported by DeckCard, TodoItem and other components that render on the home
 * dashboard, pulling the whole library into the initial JS payload even though
 * the picker only appears after a user clicks an emoji button.
 *
 * This wrapper loads the library on demand via `next/dynamic` so it lands in a
 * separate chunk fetched only when a picker actually mounts. Consumers should
 * import `EmojiPicker`, `EmojiClickData`, and `Theme` from here instead of from
 * `emoji-picker-react` directly — importing the real module anywhere in the
 * initial render path would drag the library back into the main bundle.
 */
const EmojiPicker = dynamic(() => import('emoji-picker-react'), {
  ssr: false,
  loading: () => null,
});

export default EmojiPicker;
export type { EmojiClickData };

// Mirror emoji-picker-react's string `Theme` enum without a runtime import of
// the library (`import type` above is erased at compile time). The values match
// the enum exactly, so they're accepted by the `theme` prop.
export const Theme = {
  DARK: 'dark' as EprTheme,
  LIGHT: 'light' as EprTheme,
  AUTO: 'auto' as EprTheme,
};
