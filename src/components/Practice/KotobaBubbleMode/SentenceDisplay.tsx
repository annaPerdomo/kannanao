'use client';
import Box from '@mui/material/Box';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';

import FuriganaText, { stripFurigana } from '@/components/FuriganaText';
import type { PracticeSentence } from '@/types/practiceSentence';

interface SentenceDisplayProps {
  sentence: PracticeSentence;
  revealed: boolean;
  showFurigana: boolean;
  /** Deck vocabulary words to highlight in the sentence */
  deckWords?: string[];
}

/**
 * Splits an annotated furigana string at a plain-text index.
 * Particles are always plain hiragana, never inside {kanji|reading} blocks.
 * Returns [beforeAnnotated, particleText, afterAnnotated].
 */
function splitAnnotatedAt(
  annotated: string,
  plainIdx: number,
  plainLen: number,
): [string, string, string] {
  const regex = /\{([^|{}]+)\|[^|{}]+\}/g;
  let plainPos = 0;
  let prevEnd = 0;
  let annotStart = -1;
  let match;

  while ((match = regex.exec(annotated)) !== null) {
    const gapLen = match.index - prevEnd;
    if (annotStart < 0 && plainPos + gapLen > plainIdx) {
      annotStart = prevEnd + (plainIdx - plainPos);
    }
    plainPos += gapLen;
    plainPos += match[1].length; // kanji chars count in plain text
    prevEnd = regex.lastIndex;
  }

  // Remaining text after last match
  if (annotStart < 0) {
    annotStart = prevEnd + (plainIdx - plainPos);
  }

  const annotEnd = annotStart + plainLen;

  return [
    annotated.slice(0, annotStart),
    annotated.slice(annotStart, annotEnd),
    annotated.slice(annotEnd),
  ];
}

/** Maps a plain-text position to the corresponding annotated-string position. */
function plainToAnnotatedPos(annotated: string, targetPlainPos: number): number {
  const regex = /\{([^|{}]+)\|[^|{}]+\}/g;
  let plainPos = 0;
  let prevEnd = 0;
  let match;

  while ((match = regex.exec(annotated)) !== null) {
    const gapLen = match.index - prevEnd;
    if (plainPos + gapLen >= targetPlainPos) {
      return prevEnd + (targetPlainPos - plainPos);
    }
    plainPos += gapLen + match[1].length;
    prevEnd = regex.lastIndex;
  }
  return prevEnd + (targetPlainPos - plainPos);
}

/**
 * Finds all deck word positions in plain text and returns merged ranges.
 */
function findDeckWordRanges(plain: string, deckWords: string[]): { start: number; end: number }[] {
  const ranges: { start: number; end: number }[] = [];
  for (const word of deckWords) {
    if (!word) continue;
    let idx = plain.indexOf(word);
    while (idx !== -1) {
      ranges.push({ start: idx, end: idx + word.length });
      idx = plain.indexOf(word, idx + 1);
    }
  }
  ranges.sort((a, b) => a.start - b.start);
  const merged: { start: number; end: number }[] = [];
  for (const r of ranges) {
    const last = merged[merged.length - 1];
    if (last && r.start <= last.end) {
      last.end = Math.max(last.end, r.end);
    } else {
      merged.push({ ...r });
    }
  }
  return merged;
}

/**
 * Displays a Japanese sentence with the target particle replaced by a blank.
 * Shows furigana based on deck view mode. Highlights only the actual deck
 * vocabulary words (not surrounding text) with a colored background.
 * English translation always visible to provide context.
 */
export function SentenceDisplay({
  sentence,
  revealed,
  showFurigana,
  deckWords = [],
}: SentenceDisplayProps) {
  const theme = useTheme();
  const { brand, accent } = theme.palette;

  const annotated = sentence.sentenceJp;
  const plain = stripFurigana(annotated);
  const pIdx = sentence.particleIndex;
  const pLen = sentence.targetParticle.length;

  // Split annotated string around the particle
  const [beforeAnnot, , afterAnnot] = splitAnnotatedAt(annotated, pIdx, pLen);
  const beforePlain = plain.slice(0, pIdx);
  const afterPlain = plain.slice(pIdx + pLen);

  // Find deck word positions in the full plain text
  const deckWordRanges = findDeckWordRanges(plain, deckWords);
  const hasDeckWords = deckWordRanges.some((r) => r.end <= pIdx || r.start >= pIdx + pLen);

  const highlightBg = alpha(accent[300], 0.25);
  const highlightBorder = alpha(accent[400], 0.6);

  const textSx = {
    fontSize: { xs: '1.6rem', sm: '2rem' },
    fontWeight: 700,
    fontFamily: (t: any) => t.fonts.jp, // eslint-disable-line @typescript-eslint/no-explicit-any
    lineHeight: 2,
    color: 'text.primary',
  };

  /**
   * Renders an annotated segment, splitting it into sub-fragments so only
   * the actual deck words get highlighted — not the whole segment.
   */
  const renderSegment = (segAnnotated: string, segPlain: string, segPlainOffset: number) => {
    // Find deck word ranges relative to this segment
    const localRanges = deckWordRanges
      .map((r) => ({
        start: Math.max(r.start - segPlainOffset, 0),
        end: Math.min(r.end - segPlainOffset, segPlain.length),
      }))
      .filter((r) => r.start < r.end);

    if (localRanges.length === 0) {
      return (
        <FuriganaText
          text={segAnnotated}
          showFurigana={showFurigana}
          sx={{ fontSize: 'inherit' }}
        />
      );
    }

    // Build fragments — alternating plain and highlighted
    const fragments: React.ReactNode[] = [];
    let pos = 0;

    for (const range of localRanges) {
      if (range.start > pos) {
        const aStart = plainToAnnotatedPos(segAnnotated, pos);
        const aEnd = plainToAnnotatedPos(segAnnotated, range.start);
        fragments.push(
          <FuriganaText
            key={`t-${pos}`}
            text={segAnnotated.slice(aStart, aEnd)}
            showFurigana={showFurigana}
            sx={{ fontSize: 'inherit' }}
          />,
        );
      }
      const aStart = plainToAnnotatedPos(segAnnotated, range.start);
      const aEnd = plainToAnnotatedPos(segAnnotated, range.end);
      fragments.push(
        <Box
          key={`h-${range.start}`}
          component="span"
          sx={{
            bgcolor: highlightBg,
            borderBottom: `2.5px solid ${highlightBorder}`,
            borderRadius: '4px',
            px: '3px',
            mx: '1px',
          }}
        >
          <FuriganaText
            text={segAnnotated.slice(aStart, aEnd)}
            showFurigana={showFurigana}
            sx={{ fontSize: 'inherit' }}
          />
        </Box>,
      );
      pos = range.end;
    }

    if (pos < segPlain.length) {
      const aStart = plainToAnnotatedPos(segAnnotated, pos);
      fragments.push(
        <FuriganaText
          key={`t-${pos}`}
          text={segAnnotated.slice(aStart)}
          showFurigana={showFurigana}
          sx={{ fontSize: 'inherit' }}
        />,
      );
    }

    return <>{fragments}</>;
  };

  return (
    <Box sx={{ textAlign: 'center' }}>
      <Typography sx={textSx}>
        {renderSegment(beforeAnnot, beforePlain, 0)}
        {revealed ? (
          <Box
            component="span"
            sx={{
              color: brand[500],
              fontWeight: 900,
              textDecoration: 'underline',
              textDecorationColor: brand[400],
              textUnderlineOffset: 4,
            }}
          >
            {sentence.targetParticle}
          </Box>
        ) : (
          <Box
            component="span"
            sx={{
              display: 'inline-block',
              minWidth: { xs: 40, sm: 48 },
              borderBottom: `3px dashed ${brand[400]}`,
              mx: 0.5,
              textAlign: 'center',
              color: brand[400],
              fontSize: '0.7em',
              verticalAlign: 'baseline',
            }}
          >
            ？
          </Box>
        )}
        {renderSegment(afterAnnot, afterPlain, pIdx + pLen)}
      </Typography>
      <Typography
        sx={{
          fontSize: { xs: '0.95rem', sm: '1.05rem' },
          color: brand[500],
          mt: 1,
          fontStyle: 'italic',
        }}
      >
        {sentence.sentenceEn}
      </Typography>
      {hasDeckWords && (
        <Typography
          sx={{
            fontSize: '0.72rem',
            color: 'text.disabled',
            mt: 1.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 0.5,
          }}
        >
          <Box
            component="span"
            sx={{
              display: 'inline-block',
              width: 8,
              height: 8,
              borderRadius: '2px',
              bgcolor: highlightBg,
              border: `1.5px solid ${highlightBorder}`,
            }}
          />
          from your deck
        </Typography>
      )}
    </Box>
  );
}
