'use client';
import Box from '@mui/material/Box';
import type { SxProps, Theme } from '@mui/material/styles';

import { parseFurigana } from '@/lib/furigana';

interface FuriganaTextProps {
  text: string;
  showFurigana: boolean;
  sx?: SxProps<Theme>;
}

// Parsing lives in `@/lib/furigana` so every reader — this component, the speak
// button, the Kotoba highlighter — understands the same markup shapes.
export { furiganaToKana, stripFurigana } from '@/lib/furigana';

/** rt scaled for large card titles — the default 0.75em reads as a second word there. */
export const titleRubySx = {
  '& rt': { fontSize: '0.42em', fontWeight: 600, lineHeight: 1.1 },
} as const;

export default function FuriganaText({ text, showFurigana, sx }: FuriganaTextProps) {
  const segments = parseFurigana(text);
  return (
    <Box
      component="span"
      sx={{
        '& ruby': { rubyAlign: 'center' },
        '& rt': { fontSize: '0.75em', lineHeight: 1.2, fontWeight: 600 },
        ...sx,
      }}
    >
      {segments.map((seg, i) => {
        if (typeof seg === 'string') return <span key={i}>{seg}</span>;
        if (showFurigana) {
          return (
            <ruby key={i}>
              {seg.kanji}
              <rt>{seg.reading}</rt>
            </ruby>
          );
        }
        return <span key={i}>{seg.kanji}</span>;
      })}
    </Box>
  );
}
