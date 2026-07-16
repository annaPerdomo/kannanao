'use client';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import FormControl from '@mui/material/FormControl';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Select from '@mui/material/Select';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Loading } from '@/components/Loading';
import type { Deck } from '@/types/deck';

import { useItemAnalysis } from '../../hooks/useItemAnalysis';

interface ReteachPanelProps {
  /** The organizer's own decks (already filtered to non-shared). */
  decks: Deck[];
}

/**
 * Turns one card's stats into a plain sentence a busy teacher can act on.
 * `t` is optional so this stays a pure, easily-testable function in English;
 * the panel always passes its translator so the rendered copy is localized.
 */
export function reteachSentence(
  struggling: number,
  attempts: number,
  t?: ReturnType<typeof useTranslations<'Group.reteachPanel'>>,
): string {
  if (struggling === attempts) {
    return t
      ? t('allStudentsStruggling', { attempts })
      : `All ${attempts} student${attempts === 1 ? '' : 's'} who tried it keep missing this word.`;
  }
  return t
    ? t('someStudentsStruggling', { struggling, attempts })
    : `${struggling} of ${attempts} students who tried it keep missing this word.`;
}

/**
 * "What to reteach" — a deck picker plus a worst-first list of the words the
 * class is struggling with, phrased as plain sentences (no stat tables, no
 * charts). Organizer dashboard only; data is organizer-gated server-side.
 */
export function ReteachPanel({ decks }: ReteachPanelProps) {
  const t = useTranslations('Group.reteachPanel');
  const theme = useTheme();
  const { brand, error: errorColor } = theme.palette;
  const [deckId, setDeckId] = useState<string>('');
  const { analysis, loading, error } = useItemAnalysis(deckId || null);

  if (decks.length === 0) return null;

  // Only words at least one student is struggling with are worth reteaching.
  const tricky = (analysis?.cards ?? []).filter((c) => c.strugglingCount > 0);

  return (
    <Box sx={{ mt: 4 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 1,
          mb: 1.5,
        }}
      >
        <Typography
          sx={{
            fontWeight: 800,
            fontSize: '0.85rem',
            color: brand[700],
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}
        >
          {t('heading')}
        </Typography>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <Select
            value={deckId}
            onChange={(e) => setDeckId(e.target.value)}
            displayEmpty
            aria-label={t('pickDeckAriaLabel')}
            sx={{
              borderRadius: 2.5,
              fontSize: '0.85rem',
              fontWeight: 600,
              color: brand[800],
              bgcolor: alpha('#FFFFFF', 0.6),
              '& .MuiOutlinedInput-notchedOutline': { borderColor: alpha(brand[400], 0.4) },
            }}
          >
            <MenuItem value="" disabled>
              {t('pickDeckPlaceholder')}
            </MenuItem>
            {decks.map((d) => (
              <MenuItem key={d.id} value={d.id} sx={{ fontSize: '0.85rem' }}>
                {d.emoji || '📚'} {d.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {!deckId ? (
        <Paper
          elevation={0}
          sx={{
            p: 3,
            textAlign: 'center',
            border: `1.5px dashed ${alpha(brand[300], 0.4)}`,
            borderRadius: 3,
            bgcolor: alpha(brand[50], 0.6),
          }}
        >
          <MenuBookIcon sx={{ fontSize: 32, color: alpha(brand[400], 0.5), mb: 0.5 }} />
          <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
            {t('pickDeckBody')}
          </Typography>
        </Paper>
      ) : loading ? (
        <Loading message={t('checkingMessage')} />
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : tricky.length === 0 ? (
        <Paper
          elevation={0}
          sx={{
            p: 3,
            textAlign: 'center',
            border: `1.5px dashed ${alpha(brand[300], 0.4)}`,
            borderRadius: 3,
            bgcolor: alpha(brand[50], 0.6),
          }}
        >
          <Typography sx={{ fontSize: '1.75rem', mb: 0.5 }}>🎉</Typography>
          <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
            {t('noTrickyWords')}
          </Typography>
        </Paper>
      ) : (
        <Box>
          {tricky.map((c) => (
            <Paper
              key={c.cardId}
              elevation={0}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 1.5,
                p: 1.5,
                mb: 0.75,
                border: `1px solid ${alpha(brand[300], 0.25)}`,
                borderRadius: 2.5,
                bgcolor: alpha('#FFFFFF', 0.5),
              }}
            >
              <Box sx={{ minWidth: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.75 }}>
                  <Typography sx={{ fontWeight: 800, fontSize: '1rem', color: brand[800] }} noWrap>
                    {c.word}
                  </Typography>
                  {c.reading && (
                    <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }} noWrap>
                      {c.reading}
                    </Typography>
                  )}
                  {c.meaning && (
                    <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }} noWrap>
                      — {c.meaning}
                    </Typography>
                  )}
                </Box>
                <Typography sx={{ fontSize: '0.78rem', color: errorColor.main, fontWeight: 600 }}>
                  {reteachSentence(c.strugglingCount, c.attemptCount, t)}
                </Typography>
              </Box>
              <Typography
                sx={{
                  flexShrink: 0,
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: 'text.secondary',
                }}
              >
                {t('percentRight', { percent: c.classAccuracy })}
              </Typography>
            </Paper>
          ))}
        </Box>
      )}
    </Box>
  );
}
