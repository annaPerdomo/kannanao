import { alpha, type Theme } from '@mui/material/styles';

export type FuriganaSize = 'small' | 'medium';

export const SIZES = {
  medium: { text: '0.95rem', kanjiRem: 1.3, readingRem: 0.8, legend: '0.62rem', radius: '10px' },
  small: { text: '0.8rem', kanjiRem: 1.1, readingRem: 0.72, legend: '0.56rem', radius: '8px' },
} as const;

export const frameSx = (size: FuriganaSize) => (theme: Theme) => ({
  m: 0,
  minWidth: 0,
  px: size === 'small' ? 1.25 : 1.75,
  pt: 0.25,
  pb: size === 'small' ? 0.75 : 1,
  border: `1.5px solid ${alpha(theme.palette.brand[300], 0.5)}`,
  borderRadius: SIZES[size].radius,
  bgcolor: theme.palette.surfaces.input,
  transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
  '& > legend': {
    px: 0.5,
    ml: -0.5,
    fontSize: SIZES[size].legend,
    fontWeight: 700,
    lineHeight: 1,
    color: theme.palette.brand[700],
  },
});

export const workbenchSx = (theme: Theme) => ({
  mt: 0.75,
  px: 1.25,
  pt: 0.75,
  pb: 1.25,
  borderRadius: '8px',
  bgcolor: alpha(theme.palette.brand[100], theme.palette.mode === 'dark' ? 0.08 : 0.45),
  border: `1px dashed ${alpha(theme.palette.brand[300], 0.45)}`,
});

export type ReadingTone = 'ok' | 'warning' | 'error';

const toneColor = (theme: Theme, tone: ReadingTone) =>
  tone === 'error'
    ? theme.palette.error.main
    : tone === 'warning'
      ? theme.palette.warning.main
      : theme.palette.brand[400];

export const readingInputSx =
  (size: FuriganaSize, readingLength: number, tone: ReadingTone) => (theme: Theme) => {
    const { readingRem } = SIZES[size];
    const empty = readingLength === 0;
    const ok = tone === 'ok';
    return {
      alignSelf: 'stretch',
      minWidth: `calc(${empty ? 2.5 : readingLength} * ${readingRem}rem + 10px)`,
      fontSize: `${readingRem}rem`,
      fontWeight: 700,
      color: 'text.primary',
      bgcolor: theme.palette.surfaces.input,
      borderRadius: '6px',
      border: `1px ${empty ? 'dashed' : 'solid'} ${
        ok ? alpha(theme.palette.brand[300], empty ? 0.8 : 0.5) : toneColor(theme, tone)
      }`,
      transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
      '&.Mui-focused': {
        borderColor: toneColor(theme, tone),
        boxShadow: `0 0 0 3px ${alpha(ok ? theme.palette.brand[300] : toneColor(theme, tone), 0.22)}`,
      },
      '& input': { textAlign: 'center', py: '2px', px: '3px', width: '100%' },
      '& input::placeholder': { color: theme.palette.text.secondary, opacity: 0.6 },
    };
  };

export const seamSx = (size: FuriganaSize) => (theme: Theme) => ({
  width: 24,
  minWidth: 24,
  height: `max(24px, ${SIZES[size].kanjiRem * 1.5}rem)`,
  borderRadius: '6px',
  color: theme.palette.brand[600],
  opacity: 0.7,
  transition: 'opacity 0.15s ease, background-color 0.15s ease',
  '&:hover, &:focus-visible': { opacity: 1, bgcolor: alpha(theme.palette.brand[300], 0.18) },
  '& svg': { fontSize: 14 },
});

export const kanjiSx = (size: FuriganaSize) => ({
  fontSize: `${SIZES[size].kanjiRem}rem`,
  fontWeight: 700,
  lineHeight: 1.5,
});
