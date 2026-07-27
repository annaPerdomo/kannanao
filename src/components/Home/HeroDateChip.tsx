'use client';
import Box from '@mui/material/Box';
import { alpha, useTheme } from '@mui/material/styles';
import { useLocale, useTranslations } from 'next-intl';

import FuriganaText from '@/components/FuriganaText';
import { japaneseDateParts } from '@/lib/japaneseDate';

/**
 * Today's date, in the corner of the home hero: a "Today" tab, then 月 · 日 ·
 * 曜日, each with its reading above it.
 *
 * It reads as chrome but it teaches — 一日 is «ついたち», not «いちにち», and this
 * is the one place in the app that says so every single day. The tab is there
 * because the Japanese alone doesn't say *which* day it is: a date with no label
 * could be a deadline or a filter, and this is neither.
 *
 * Screen readers get "Today, 26 July 2026" from the label on the <time> element
 * rather than three ruby fragments read as separate words.
 */
export function HeroDateChip({ date }: { date: Date }) {
  const { palette, radii } = useTheme();
  const { brand, accent } = palette;
  const locale = useLocale();
  const t = useTranslations('Home.heroDate');
  const { month, day, weekday } = japaneseDateParts(date);

  const divider = (
    <Box
      aria-hidden
      sx={{
        alignSelf: 'stretch',
        width: '1px',
        my: 0.75,
        flexShrink: 0,
        bgcolor: alpha(brand[300], 0.55),
      }}
    />
  );

  return (
    <Box
      component="time"
      dateTime={toIsoDate(date)}
      aria-label={`${t('today')}, ${new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(date)}`}
      sx={{
        position: 'absolute',
        top: { xs: 8, sm: 12 },
        right: { xs: 8, sm: 12 },
        zIndex: 2,
        display: 'flex',
        alignItems: 'stretch',
        overflow: 'hidden',
        borderRadius: radii.sm,
        bgcolor: 'background.paper',
        border: `1px solid ${alpha(brand[300], 0.5)}`,
        boxShadow: `0 6px 16px ${alpha(brand[900], 0.3)}`,
      }}
    >
      {/* The tab, not a word in the row: at this size a fourth cell of text
          would read as another date part rather than a label for them. */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          px: { xs: 0.75, sm: 0.875 },
          background: `linear-gradient(160deg, ${brand[400]}, ${accent[500]})`,
          color: '#fff',
          fontSize: { xs: '0.5rem', sm: '0.55rem' },
          fontWeight: 900,
          letterSpacing: '0.09em',
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
        }}
      >
        {t('today')}
      </Box>

      <Box
        aria-hidden
        sx={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: { xs: 0.625, sm: 1 },
          px: { xs: 0.75, sm: 1.25 },
          pt: 0.5,
          pb: 0.25,
          // The readings sit above the kanji, so the line box has to be tall
          // enough to hold both or the ruby clips against the chip's top edge.
          lineHeight: 1.9,
          fontSize: { xs: '0.72rem', sm: '0.95rem' },
          fontWeight: 700,
          color: 'text.primary',
          letterSpacing: '0.02em',
          '& rt': {
            fontSize: '0.44em',
            fontWeight: 700,
            color: accent[600],
            letterSpacing: '0.03em',
          },
        }}
      >
        <FuriganaText text={month} showFurigana />
        {divider}
        <FuriganaText text={day} showFurigana />
        {divider}
        <FuriganaText text={weekday} showFurigana />
      </Box>
    </Box>
  );
}

/** Local-calendar YYYY-MM-DD — `toISOString()` would shift the day in UTC−. */
function toIsoDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
