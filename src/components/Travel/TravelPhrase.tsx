'use client';

import { Box, Typography } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import { useTheme } from '@mui/material/styles';

import FuriganaText, { stripFurigana } from '@/components/FuriganaText';
import { useTravelDisplay } from '@/contexts/TravelDisplayContext';

interface TravelPhraseProps {
  /** Japanese text — may contain {kanji|reading} furigana syntax */
  japanese: string;
  /** Romaji pronunciation */
  romaji: string;
  /** Font size for the primary (large) text */
  primarySize?: string;
  /** Font size for the secondary (small) text */
  secondarySize?: string;
  /** sx overrides for the root Box */
  sx?: SxProps<Theme>;
  /** Layout direction — 'column' stacks vertically, 'row' puts them inline */
  layout?: 'column' | 'row';
}

/**
 * Renders japanese + romaji text according to the travel display mode.
 *
 * - `hiragana` (default): furigana reading guides above kanji + romaji
 * - `romaji`: romaji pronunciation highlighted
 * - `kanji`: plain Japanese characters, romaji small below/beside
 */
export function TravelPhrase({
  japanese,
  romaji,
  primarySize = '1rem',
  secondarySize = '0.72rem',
  sx: sxOverride,
  layout = 'column',
}: TravelPhraseProps) {
  const { palette } = useTheme();
  const { brand } = palette;
  const { mode } = useTravelDisplay();

  const isRow = layout === 'row';
  const plainJapanese = stripFurigana(japanese);

  // Hiragana mode: render Japanese with ruby reading guides above kanji
  if (mode === 'hiragana') {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: isRow ? 'row' : 'column',
          alignItems: isRow ? 'baseline' : 'flex-start',
          gap: isRow ? 1 : 0,
          flexWrap: isRow ? 'wrap' : undefined,
          ...((sxOverride ?? {}) as Record<string, unknown>),
        }}
      >
        <FuriganaText
          text={japanese}
          showFurigana
          sx={{
            fontFamily: (t: Theme) => t.fonts.jp,
            fontSize: primarySize,
            fontWeight: 500,
            color: 'text.primary',
            lineHeight: 2.2,
            '& rt': {
              fontSize: '0.7em',
              fontWeight: 600,
              color: brand[500],
              letterSpacing: '0.02em',
            },
          }}
        />
        <Typography
          component="span"
          sx={{
            fontSize: secondarySize,
            color: brand[600],
            fontStyle: 'italic',
          }}
        >
          {romaji}
        </Typography>
      </Box>
    );
  }

  // Romaji mode: Japanese text on top, romaji highlighted underneath
  if (mode === 'romaji') {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: isRow ? 'row' : 'column',
          alignItems: isRow ? 'baseline' : 'flex-start',
          gap: isRow ? 1 : 0,
          flexWrap: isRow ? 'wrap' : undefined,
          ...((sxOverride ?? {}) as Record<string, unknown>),
        }}
      >
        <Typography
          component="span"
          sx={{
            fontFamily: (t: Theme) => t.fonts.jp,
            fontSize: primarySize,
            fontWeight: 500,
            color: 'text.primary',
          }}
        >
          {plainJapanese}
        </Typography>
        <Typography
          component="span"
          sx={{
            fontSize: secondarySize,
            fontWeight: 600,
            color: brand[700],
            bgcolor: `${brand[50]}`,
            px: 0.75,
            py: 0.125,
            borderRadius: 0.75,
          }}
        >
          {romaji}
        </Typography>
      </Box>
    );
  }

  // Kanji mode (default fallback): plain Japanese, romaji small below/beside
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: isRow ? 'row' : 'column',
        alignItems: isRow ? 'baseline' : 'flex-start',
        gap: isRow ? 1 : 0,
        flexWrap: isRow ? 'wrap' : undefined,
        ...((sxOverride ?? {}) as Record<string, unknown>),
      }}
    >
      <Typography
        component="span"
        sx={{
          fontFamily: (t: Theme) => t.fonts.jp,
          fontSize: primarySize,
          fontWeight: 500,
          color: 'text.primary',
        }}
      >
        {plainJapanese}
      </Typography>
      <Typography
        component="span"
        sx={{
          fontSize: secondarySize,
          color: brand[600],
          fontStyle: 'italic',
        }}
      >
        {romaji}
      </Typography>
    </Box>
  );
}
