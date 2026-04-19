'use client';
import { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import type { Flashcard as FlashcardType } from '@/types/flashcard';
import FuriganaText, { stripFurigana } from '@/components/FuriganaText';
import { SpeakButton } from '@/components/SpeakButton';
import { FONT_MONO, FONT_JP } from '@/theme';

interface IndexCardProps {
  card: FlashcardType;
  width?: number | string;
  height?: number | string;
}

const faceStyle = {
  position: 'absolute' as const,
  inset: 0,
  backfaceVisibility: 'hidden' as const,
  WebkitBackfaceVisibility: 'hidden' as const,
  borderRadius: '14px',
  border: '2px solid #e4e4ec',
  boxShadow: '0 4px 24px rgba(0,0,0,0.08), 0 1px 6px rgba(0,0,0,0.04)',
  display: 'flex',
  flexDirection: 'column' as const,
  overflow: 'hidden',
};

export function IndexCard({ card, width = '100%', height = 300 }: IndexCardProps) {
  const [flipped, setFlipped] = useState(false);
  useEffect(() => { setFlipped(false); }, [card]);

  const isKanji = card.mainViewMode === 'kanji';
  // Kanji front: show kanji without reading; hiragana front: show the reading
  const frontMainText = isKanji ? card.word : (card.reading || card.word);

  return (
    <Box
      onClick={() => setFlipped((f) => !f)}
      sx={{ width, height, cursor: 'pointer', perspective: '1200px', userSelect: 'none', flexShrink: 0 }}
    >
      <Box sx={{
        width: '100%', height: '100%',
        position: 'relative',
        transformStyle: 'preserve-3d',
        transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
        transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
      }}>

        {/* ── FRONT ── */}
        <Box sx={{ ...faceStyle, bgcolor: '#ffffff' }}>
          {/* Header */}
          <Box sx={{
            px: 2.5, py: 1.25,
            borderBottom: '1.5px solid #f0f0f5',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            {card.jlptLevel ? (
              <Box sx={{ px: 1, py: 0.3, borderRadius: '5px', bgcolor: '#f4f4f8', border: '1px solid #e0e0ea' }}>
                <Typography sx={{ fontSize: '0.62rem', color: '#777', letterSpacing: '0.08em', fontFamily: FONT_MONO }}>
                  JLPT {card.jlptLevel}
                </Typography>
              </Box>
            ) : <Box />}
            <SpeakButton text={frontMainText} />
          </Box>

          {/* Word — large, centered */}
          <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', px: 4 }}>
            <Typography sx={{
              fontFamily: FONT_JP,
              fontSize: '3rem', fontWeight: 700, color: '#111', lineHeight: 1.1, textAlign: 'center',
            }}>
              {frontMainText}
            </Typography>
          </Box>

          {/* Footer */}
          <Box sx={{ px: 2.5, py: 1, borderTop: '1.5px solid #f0f0f5', display: 'flex', justifyContent: 'center' }}>
            <Typography sx={{ fontSize: '0.6rem', color: '#999', letterSpacing: '0.15em', fontFamily: FONT_MONO, textTransform: 'uppercase' }}>
              click to flip
            </Typography>
          </Box>
        </Box>

        {/* ── BACK ── */}
        <Box sx={{ ...faceStyle, bgcolor: '#fafafa', transform: 'rotateY(180deg)' }}>
          {/* Header */}
          <Box sx={{ px: 2.5, py: 1.25, borderBottom: '1.5px solid #ebebef' }}>
            <Typography sx={{ fontSize: '0.65rem', color: '#777', textTransform: 'uppercase', letterSpacing: '0.12em', fontFamily: FONT_MONO }}>
              Answer
            </Typography>
          </Box>

          {/* Two-column content */}
          <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
            {/* Left: Reading (kanji) / Kanji (hiragana) + Meaning */}
            <Box sx={{
              flex: '0 0 44%',
              px: 2.5, py: 2.5,
              display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 2.5,
              borderRight: '1.5px solid #ebebef',
            }}>
              {isKanji && card.reading && (
                <Box>
                  <Typography sx={{ fontSize: '0.58rem', color: '#888', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: FONT_MONO, mb: 0.5 }}>
                    Reading
                  </Typography>
                  <Typography sx={{ fontFamily: FONT_JP, fontSize: '1.1rem', fontWeight: 600, color: '#333', whiteSpace: 'nowrap' }}>
                    {card.reading}
                  </Typography>
                </Box>
              )}
              {card.mainViewMode === 'hiragana' && (
                <Box>
                  <Typography sx={{ fontSize: '0.58rem', color: '#888', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: FONT_MONO, mb: 0.5 }}>
                    Kanji
                  </Typography>
                  <Typography sx={{ fontFamily: FONT_JP, fontSize: '1.1rem', fontWeight: 600, color: '#333', whiteSpace: 'nowrap' }}>
                    {card.word}
                  </Typography>
                </Box>
              )}
              <Box>
                <Typography sx={{ fontSize: '0.58rem', color: '#888', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: FONT_MONO, mb: 0.5 }}>
                  Meaning
                </Typography>
                <Typography sx={{ fontFamily: FONT_JP, fontSize: '1.1rem', fontWeight: 700, color: '#222', fontStyle: 'italic', lineHeight: 1.3, whiteSpace: 'nowrap' }}>
                  {card.meaning}
                </Typography>
              </Box>
            </Box>

            {/* Right: Example with furigana always shown */}
            <Box sx={{ flex: 1, px: 2.5, py: 2, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 0.75 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                <Typography sx={{ fontSize: '0.58rem', color: '#888', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: FONT_MONO }}>
                  Example
                </Typography>
                <SpeakButton text={stripFurigana(card.example_jp)} />
              </Box>
              <Typography component="div" sx={{ fontFamily: FONT_JP, fontSize: '0.95rem', color: '#222', lineHeight: 2.2 }}>
                <FuriganaText text={card.example_jp} showFurigana={true} />
              </Typography>
              <Typography sx={{ fontSize: '0.9rem', color: alpha('#000', 0.55), fontStyle: 'italic', lineHeight: 1.5 }}>
                {card.example_en}
              </Typography>
            </Box>
          </Box>
        </Box>

      </Box>
    </Box>
  );
}
