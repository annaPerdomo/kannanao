'use client';
import { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';
import type { Flashcard as FlashcardType } from '@/types/flashcard';
import FuriganaText from '@/components/FuriganaText';

interface EmbedFlashcardProps {
  card: FlashcardType;
  width?: number | string;
  height?: number | string;
}

export function EmbedFlashcard({ card, width = '100%', height = 300 }: EmbedFlashcardProps) {
  const theme = useTheme();
  const { brand, accent } = theme.palette;
  const [flipped, setFlipped] = useState(false);

  useEffect(() => { setFlipped(false); }, [card]);

  const isKanji = card.mainViewMode === 'kanji';
  const typeGradient = isKanji
    ? `linear-gradient(135deg, ${accent[400]} 0%, ${accent[600]} 100%)`
    : `linear-gradient(135deg, ${brand[400]} 0%, ${brand[600]} 100%)`;
  const typeAccent = isKanji ? accent[400] : brand[400];

  // Kanji front: show kanji without reading hint; hiragana front: show the reading
  const frontMainText = isKanji ? card.word : (card.reading || card.word);

  const CARD_FRAME = `linear-gradient(145deg,
    ${brand[300]}  0%,
    #ffd700        10%,
    ${accent[300]} 22%,
    #7dd3fc        35%,
    #6ee7b7        48%,
    ${brand[400]}  60%,
    #ffd700        72%,
    ${accent[400]} 84%,
    ${brand[300]}  100%
  )`;

  const frameStyle = {
    position: 'absolute' as const,
    inset: 0,
    backfaceVisibility: 'hidden' as const,
    WebkitBackfaceVisibility: 'hidden' as const,
    background: CARD_FRAME,
    backgroundSize: '350% 350%',
    animation: 'holoFrame 7s ease infinite',
    borderRadius: '20px',
    p: '5px',
    boxShadow: `0 8px 40px rgba(0,0,0,0.18), 0 4px 12px ${alpha(brand[400], 0.28)}`,
  };

  const innerStyle = {
    width: '100%',
    height: '100%',
    bgcolor: brand[50],
    borderRadius: '15px',
    overflow: 'hidden',
    border: '2.5px solid rgba(255,255,255,0.92)',
    display: 'flex',
    flexDirection: 'column' as const,
    position: 'relative' as const,
  };

  return (
    <Box
      onClick={() => setFlipped((f) => !f)}
      sx={{
        width,
        height,
        cursor: 'pointer',
        perspective: '1200px',
        userSelect: 'none',
        flexShrink: 0,
        '@keyframes holoFrame': {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
      }}
    >
      <Box
        sx={{
          width: '100%',
          height: '100%',
          position: 'relative',
          transformStyle: 'preserve-3d',
          transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
          transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}
      >

        {/* ── FRONT ── */}
        <Box sx={frameStyle}>
          <Box sx={innerStyle}>
            {/* Top bar: type label + JLPT */}
            <Box sx={{
              px: 2, py: 1,
              background: typeGradient,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              flexShrink: 0,
            }}>
              <Typography sx={{ fontSize: '0.7rem', fontWeight: 900, color: 'white', textTransform: 'uppercase', letterSpacing: '0.08em', textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>
                {isKanji ? '漢字' : 'かな'}
              </Typography>
              {card.jlptLevel && (
                <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, color: 'rgba(255,255,255,0.92)', letterSpacing: '0.06em', textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>
                  JLPT {card.jlptLevel}
                </Typography>
              )}
            </Box>

            {/* Word — centered, no reading hint for kanji mode */}
            <Box sx={{
              flex: 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              px: 3,
              borderBottom: `2.5px solid ${typeAccent}`,
            }}>
              <Typography sx={{
                fontFamily: '"Noto Serif JP", serif',
                fontSize: '3rem', fontWeight: 700, color: '#111', lineHeight: 1.1, textAlign: 'center',
              }}>
                {frontMainText}
              </Typography>
            </Box>

            {/* Tap hint */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 1 }}>
              <Typography sx={{ fontSize: '0.6rem', color: alpha(brand[500], 0.55), letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                ✦ tap to flip ✦
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* ── BACK ── */}
        <Box sx={{ ...frameStyle, transform: 'rotateY(180deg)' }}>
          <Box sx={{ ...innerStyle, flexDirection: 'column' }}>
            {/* Top bar */}
            <Box sx={{
              px: 2, py: 1,
              background: `linear-gradient(135deg, ${brand[400]} 0%, ${accent[400]} 100%)`,
              flexShrink: 0,
            }}>
              <Typography sx={{ fontSize: '0.7rem', fontWeight: 900, color: 'white', textTransform: 'uppercase', letterSpacing: '0.08em', textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>
                Answer
              </Typography>
            </Box>

            {/* Two-column content */}
            <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
              {/* Left: Reading (kanji mode) or Kanji (hiragana mode) + Meaning */}
              <Box sx={{
                flex: '0 0 44%',
                px: 2.5, py: 2,
                display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 2.5,
                borderRight: `1.5px solid ${alpha(brand[300], 0.25)}`,
              }}>
                {isKanji && card.reading && (
                  <Box>
                    <Typography sx={{ fontFamily: '"DM Mono", monospace', fontSize: '0.58rem', color: brand[500], letterSpacing: '0.12em', fontWeight: 700, mb: 0.5, textTransform: 'uppercase' }}>
                      ★ Reading
                    </Typography>
                    <Typography sx={{ fontFamily: '"Noto Serif JP", serif', fontSize: '1.6rem', fontWeight: 700, color: '#111', lineHeight: 1.2 }}>
                      {card.reading}
                    </Typography>
                  </Box>
                )}
                {card.mainViewMode === 'hiragana' && (
                  <Box>
                    <Typography sx={{ fontFamily: '"DM Mono", monospace', fontSize: '0.58rem', color: brand[500], letterSpacing: '0.12em', fontWeight: 700, mb: 0.5, textTransform: 'uppercase' }}>
                      ★ Kanji
                    </Typography>
                    <Typography sx={{ fontFamily: '"Noto Serif JP", serif', fontSize: '1.6rem', fontWeight: 700, color: '#111', lineHeight: 1.2 }}>
                      {card.word}
                    </Typography>
                  </Box>
                )}
                <Box>
                  <Typography sx={{ fontFamily: '"DM Mono", monospace', fontSize: '0.58rem', color: brand[500], letterSpacing: '0.12em', fontWeight: 700, mb: 0.5, textTransform: 'uppercase' }}>
                    ★ Meaning
                  </Typography>
                  <Typography sx={{ fontFamily: '"Noto Serif JP", serif', fontSize: '1.3rem', fontWeight: 700, color: '#111', fontStyle: 'italic', lineHeight: 1.3 }}>
                    {card.meaning}
                  </Typography>
                </Box>
              </Box>

              {/* Right: Example with furigana always shown */}
              <Box sx={{ flex: 1, px: 2, py: 1.5, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 0.5 }}>
                <Typography sx={{ fontFamily: '"DM Mono", monospace', fontSize: '0.58rem', color: brand[500], letterSpacing: '0.12em', fontWeight: 700, mb: 0.5, textTransform: 'uppercase' }}>
                  ★ Example
                </Typography>
                <Typography component="div" sx={{ fontFamily: '"Noto Serif JP", serif', fontSize: '0.88rem', color: '#111', lineHeight: 2.2 }}>
                  <FuriganaText text={card.example_jp} showFurigana={true} />
                </Typography>
                <Typography sx={{ fontSize: '0.78rem', color: alpha('#000', 0.5), fontStyle: 'italic', lineHeight: 1.5 }}>
                  {card.example_en}
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>

      </Box>
    </Box>
  );
}
