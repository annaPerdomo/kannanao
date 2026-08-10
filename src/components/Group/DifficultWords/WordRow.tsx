'use client';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Box from '@mui/material/Box';
import Collapse from '@mui/material/Collapse';
import Stack from '@mui/material/Stack';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import type { DifficultWord } from '@/hooks/useDifficultWords';

import { REASON_SEVERITY } from './constants';

interface WordRowProps {
  word: DifficultWord;
}

/** Small tinted pill. `tone` null means the neutral deck chip. */
function Pill({ label, tone }: { label: string; tone: 'error' | 'warning' | 'info' | null }) {
  const theme = useTheme();
  const bg = tone ? alpha(theme.palette[tone].main, 0.18) : alpha(theme.palette.brand[300], 0.28);

  return (
    <Box
      sx={{
        px: 0.9,
        py: 0.25,
        borderRadius: theme.radii.sm,
        bgcolor: bg,
        // text.primary rather than the palette colour: it is the only value
        // guaranteed to clear AA on these light tints in both themes.
        color: 'text.primary',
        fontSize: '0.7rem',
        fontWeight: 700,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </Box>
  );
}

export function WordRow({ word }: WordRowProps) {
  const theme = useTheme();
  const t = useTranslations('Group.difficultWords');
  const [open, setOpen] = useState(false);

  const detailId = `difficult-word-detail-${word.cardId}`;
  const reasonLabel = t(`reason.${word.reason}`);

  return (
    <Box sx={{ py: 1.25 }}>
      <Box
        role="button"
        tabIndex={0}
        aria-expanded={open}
        aria-controls={detailId}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setOpen((v) => !v);
          }
        }}
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 1.5,
          cursor: 'pointer',
          borderRadius: theme.radii.sm,
          '&:focus-visible': {
            outline: `2px solid ${theme.palette.brand[500]}`,
            outlineOffset: 3,
          },
        }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, flexWrap: 'wrap' }}>
            <Typography sx={{ fontWeight: 800, fontSize: '1.05rem', color: 'text.primary' }}>
              {word.word}
            </Typography>
            {word.reading && (
              <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
                {word.reading}
              </Typography>
            )}
            {word.meaning && (
              <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
                — {word.meaning}
              </Typography>
            )}
          </Box>

          <Stack direction="row" spacing={0.75} sx={{ mt: 0.6, flexWrap: 'wrap', rowGap: 0.75 }}>
            <Pill label={`${word.deckEmoji || '📚'} ${word.deckName}`} tone={null} />
            <Pill label={reasonLabel} tone={REASON_SEVERITY[word.reason]} />
          </Stack>

          <Typography sx={{ mt: 0.6, fontSize: '0.78rem', color: 'text.secondary' }}>
            {t('learnersAffected', {
              affected: word.learnersAffected,
              total: word.learnerCount,
            })}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0, pt: 0.25 }}>
          <Typography
            sx={{
              fontSize: '0.85rem',
              fontWeight: 700,
              fontVariantNumeric: 'tabular-nums',
              color: 'text.primary',
            }}
          >
            {t('percentRight', { percent: word.classAccuracy })}
          </Typography>
          <ExpandMoreIcon
            aria-hidden
            sx={{
              fontSize: 20,
              color: 'text.secondary',
              transform: open ? 'rotate(180deg)' : 'none',
              transition: theme.transitions.create('transform'),
            }}
          />
        </Box>
      </Box>

      <Collapse in={open} id={detailId}>
        <Box sx={{ mt: 1, pl: 0.25 }}>
          <Typography sx={{ fontSize: '0.82rem', color: 'text.primary' }}>
            {t(`detail.${word.reason}`, {
              affected: word.learnersAffected,
              total: word.learnerCount,
            })}
          </Typography>
          <Typography sx={{ mt: 0.25, fontSize: '0.78rem', color: 'text.secondary' }}>
            {t('attempts', { count: word.attemptCount })}
          </Typography>
        </Box>
      </Collapse>
    </Box>
  );
}
