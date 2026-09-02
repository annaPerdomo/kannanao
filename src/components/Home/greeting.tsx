import Box from '@mui/material/Box';
import type { useTranslations } from 'next-intl';

import { resolveTimeOfDay } from '@/lib/timeOfDay';

/**
 * Rich text so the `<n>` run keeps the name and its honorific on one line:
 * browsers may break Japanese between any two characters, splitting «Annaさ / ん».
 */
export function getGreeting(
  name: string,
  t: ReturnType<typeof useTranslations<'Home.greeting'>>,
): React.ReactNode {
  return t.rich(resolveTimeOfDay(new Date()), {
    name,
    n: (chunks) => (
      <Box component="span" sx={{ whiteSpace: 'nowrap' }}>
        {chunks}
      </Box>
    ),
  });
}
