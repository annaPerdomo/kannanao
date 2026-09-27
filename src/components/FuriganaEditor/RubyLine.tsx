'use client';
import Box from '@mui/material/Box';
import type { ReactNode } from 'react';

import type { FuriganaSegment } from '@/lib/furigana';
import { groupForLineBreaks } from '@/lib/lineBreak';

import { ReadingGroupInput } from './ReadingGroupInput';
import { SeamButton } from './SeamButton';
import { type FuriganaSize, kanjiSx, type ReadingTone } from './styles';

export interface RubyLineProps {
  segments: FuriganaSegment[];
  tones: ReadingTone[];
  onReadingChange: (groupIndex: number, reading: string) => void;
  onJoin: (groupIndex: number) => void;
  onSplit: (groupIndex: number, at: number, anchor: HTMLElement) => void;
  size: FuriganaSize;
  disabled?: boolean;
}

export function RubyLine({
  segments,
  tones,
  onReadingChange,
  onJoin,
  onSplit,
  size,
  disabled,
}: RubyLineProps) {
  const units: { text: string; nodes: ReactNode[] }[] = [];
  let groupIndex = -1;

  segments.forEach((seg, i) => {
    if (typeof seg === 'string') {
      Array.from(seg).forEach((char, j) =>
        units.push({
          text: char,
          nodes: [
            <Box
              key={`${i}-${j}`}
              component="span"
              aria-hidden
              sx={{ ...kanjiSx(size), fontWeight: 500, whiteSpace: 'pre' }}
            >
              {char}
            </Box>,
          ],
        }),
      );
      return;
    }
    const index = ++groupIndex;
    const prev = segments[i - 1];
    const joinsPrev = prev && typeof prev !== 'string';
    const nodes: ReactNode[] = [];
    if (joinsPrev) {
      nodes.push(
        <SeamButton
          key={`join-${i}`}
          kind="join"
          left={prev.kanji}
          right={seg.kanji}
          onClick={() => onJoin(index - 1)}
          size={size}
          disabled={disabled}
        />,
      );
    }
    nodes.push(
      <ReadingGroupInput
        key={i}
        kanji={seg.kanji}
        reading={seg.reading}
        tone={tones[index]}
        disabled={disabled}
        size={size}
        onChange={(reading) => onReadingChange(index, reading)}
        onSplit={(at, anchor) => onSplit(index, at, anchor)}
      />,
    );
    if (joinsPrev) {
      const last = units[units.length - 1];
      last.text += seg.kanji;
      last.nodes.push(...nodes);
    } else {
      units.push({ text: seg.kanji, nodes });
    }
  });

  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', rowGap: 1, mt: 0.5 }}>
      {groupForLineBreaks(units, (unit) => unit.text).map((group, i) => (
        <Box key={i} sx={{ display: 'inline-flex', alignItems: 'flex-end' }}>
          {group.flatMap((unit) => unit.nodes)}
        </Box>
      ))}
    </Box>
  );
}
