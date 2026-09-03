import Box from '@mui/material/Box';
import type { useTranslations } from 'next-intl';

import { resolveTimeOfDay } from '@/lib/timeOfDay';

// The run below is nowrap, so an unspaced name never gets a break opportunity.
const MAX_NAME_CHARS = 16;

/**
 * Rich text so the `<n>` run keeps the name and its honorific on one line:
 * browsers may break Japanese between any two characters, splitting «Annaさ / ん».
 */
export function getGreeting(
  name: string,
  t: ReturnType<typeof useTranslations<'Home.greeting'>>,
): React.ReactNode {
  const shown =
    [...name].length > MAX_NAME_CHARS ? `${[...name].slice(0, MAX_NAME_CHARS).join('')}…` : name;
  return t.rich(resolveTimeOfDay(new Date()), {
    name: shown,
    n: (chunks) => (
      <>
        {/* WebKit honours no break after 「、」 under keep-all; U+200B is an
            explicit opportunity (UAX #14 class ZW) that keep-all cannot suppress. */}
        {'\u200b'}
        <Box component="span" sx={{ whiteSpace: 'nowrap' }}>
          {chunks}
        </Box>
      </>
    ),
  });
}
