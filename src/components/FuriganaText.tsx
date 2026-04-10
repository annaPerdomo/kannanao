'use client';
import Box from '@mui/material/Box';
import type { SxProps, Theme } from '@mui/material/styles';

interface FuriganaTextProps {
  text: string;
  showFurigana: boolean;
  sx?: SxProps<Theme>;
}

// Parse {kanji|reading} format into segments
function parseSegments(text: string) {
  const segments: Array<{ kanji: string; reading: string } | string> = [];
  const regex = /\{([^|{}]+)\|([^|{}]+)\}/g;
  let last = 0;
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) segments.push(text.slice(last, match.index));
    segments.push({ kanji: match[1], reading: match[2] });
    last = regex.lastIndex;
  }
  if (last < text.length) segments.push(text.slice(last));
  return segments;
}

// Strip furigana markup, leaving plain kanji text
export function stripFurigana(text: string): string {
  return text.replace(/\{([^|{}]+)\|[^|{}]+\}/g, '$1');
}

export default function FuriganaText({ text, showFurigana, sx }: FuriganaTextProps) {
  const segments = parseSegments(text);
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
