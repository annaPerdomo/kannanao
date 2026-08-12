'use client';
import Box from '@mui/material/Box';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import FuriganaText, { titleRubySx } from '@/components/FuriganaText';

interface TitleFuriganaProps {
  /** `{漢字|かんじ}` markup for the card title. */
  markup: string;
  /** Mastery gate: hides the reading (space kept) until the learner taps the word. */
  masked?: boolean;
}

const maskedRubySx = {
  ...titleRubySx,
  '& rt': { ...titleRubySx['& rt'], visibility: 'hidden' },
} as const;

/**
 * While `masked` the reading is invisible but still reserves its line, and
 * tapping the word toggles a peek. The tap is swallowed so a peek on the
 * study card doesn't also flip it.
 */
export default function TitleFurigana({ markup, masked = false }: TitleFuriganaProps) {
  const t = useTranslations('Common');
  const [peeked, setPeeked] = useState(false);
  useEffect(() => setPeeked(false), [markup, masked]);

  if (!masked) return <FuriganaText text={markup} showFurigana sx={titleRubySx} />;

  return (
    <Box
      component="span"
      role="button"
      tabIndex={0}
      aria-label={t(peeked ? 'hideReading' : 'showReading')}
      onClick={(e) => {
        e.stopPropagation();
        setPeeked((p) => !p);
      }}
      onKeyDown={(e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();
        e.stopPropagation();
        setPeeked((p) => !p);
      }}
      sx={{ cursor: 'pointer' }}
    >
      <FuriganaText text={markup} showFurigana sx={peeked ? titleRubySx : maskedRubySx} />
    </Box>
  );
}
