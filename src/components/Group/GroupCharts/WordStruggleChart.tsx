'use client';
import Box from '@mui/material/Box';
import { alpha, useTheme } from '@mui/material/styles';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

export interface StruggleBar {
  id: string;
  /** The word itself. */
  label: string;
  /** Reading and meaning, or whatever context fits on one muted line. */
  sublabel?: string;
  /** Share of the members who tried it who keep missing it, 0–100. */
  pct: number;
  /** The plain sentence behind the bar — hover, focus, and screen readers. */
  detail: string;
}

interface WordStruggleChartProps {
  words: StruggleBar[];
}

/**
 * How much of the group is stuck on each word, worst first. One series, so one
 * color for every bar: the length is the value, and tinting by size would spend
 * the only free channel restating it.
 */
export function WordStruggleChart({ words }: WordStruggleChartProps) {
  const theme = useTheme();
  const { brand } = theme.palette;
  const track = alpha(theme.palette.text.primary, 0.07);

  return (
    <Box>
      {words.map((word) => (
        <Tooltip key={word.id} title={word.detail}>
          <Box
            tabIndex={0}
            aria-label={`${word.label} — ${word.detail}`}
            sx={{
              py: 0.9,
              borderRadius: theme.radii.sm,
              '&:focus-visible': { outline: `2px solid ${brand[500]}`, outlineOffset: 2 },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
              <Typography
                sx={{ fontWeight: 700, fontSize: '0.92rem', color: 'text.primary', flexShrink: 0 }}
                noWrap
              >
                {word.label}
              </Typography>
              {word.sublabel && (
                <Typography sx={{ flex: 1, fontSize: '0.76rem', color: 'text.secondary' }} noWrap>
                  {word.sublabel}
                </Typography>
              )}
              <Typography
                sx={{
                  ml: 'auto',
                  flexShrink: 0,
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  fontVariantNumeric: 'tabular-nums',
                  color: 'text.primary',
                }}
              >
                {word.pct}%
              </Typography>
            </Box>
            <Box sx={{ mt: 0.5, height: 8, borderRadius: '4px', bgcolor: track }}>
              <Box
                sx={{
                  width: `${Math.min(100, Math.max(0, word.pct))}%`,
                  height: '100%',
                  bgcolor: brand[400],
                  borderRadius: '0 4px 4px 0',
                }}
              />
            </Box>
          </Box>
        </Tooltip>
      ))}
    </Box>
  );
}
