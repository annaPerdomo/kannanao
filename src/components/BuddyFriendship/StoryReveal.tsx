'use client';

import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';

import { StoryBubble } from './StoryBubble';

interface StoryRevealProps {
  lines: string[];
  onDone?: () => void;
}

/** The level-up story, revealed one line per tap. */
export function StoryReveal({ lines, onDone }: StoryRevealProps) {
  const t = useTranslations('Home.buddy.friendship');
  const [shown, setShown] = useState(1);
  const more = shown < lines.length;

  const advance = useCallback(() => setShown((n) => Math.min(n + 1, lines.length)), [lines.length]);

  useEffect(() => {
    if (!more) onDone?.();
  }, [more, onDone]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, width: '100%' }}>
      {/* The story is read, not operated: wrapping it in the tap target would
          make it presentational and leave screen readers with the hint alone. */}
      <Box
        role="presentation"
        aria-live="polite"
        onClick={more ? advance : undefined}
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
          cursor: more ? 'pointer' : 'default',
        }}
      >
        {lines.slice(0, shown).map((line, i) => (
          <StoryBubble key={i} text={line} animate={i === shown - 1} />
        ))}
      </Box>
      {more && (
        <ButtonBase
          onClick={advance}
          sx={{
            alignSelf: 'center',
            mt: 0.25,
            px: 1,
            py: 0.25,
            borderRadius: 99,
            fontSize: '0.72rem',
            color: 'text.secondary',
          }}
        >
          {t('continueHint')}
        </ButtonBase>
      )}
    </Box>
  );
}
