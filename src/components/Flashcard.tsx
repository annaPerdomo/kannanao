'use client';
import { useState, useEffect, useRef } from 'react';
import { Box, Typography, Skeleton } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';
import type { Flashcard as FlashcardType } from '@/types/flashcard';
import { getFlashcardDisplayText, cardXp } from '@/lib/flashcardUtils';
import FuriganaText from '@/components/FuriganaText';

interface FlashcardProps {
  card: FlashcardType;
  width?: number | string;
  height?: number | string;
}

const PLACEHOLDER =
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400"%3E%3Crect fill="%23FFF0F6" width="600" height="400"/%3E%3C/svg%3E';



export function Flashcard({ card, width = '100%', height = 420 }: FlashcardProps) {
  const theme = useTheme();
  const { brand, accent } = theme.palette;
  const CARD_FRAME = `linear-gradient(145deg, ${brand[100]} 0%, ${brand[300]} 25%, ${brand[50]} 50%, ${brand[400]} 75%, ${brand[100]} 100%)`;

  const [flipped, setFlipped] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => { setFlipped(false); setImgLoaded(false); }, [card]);
  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth > 0) setImgLoaded(true);
  }, [card]);

  const { titleText, subtitleText } = getFlashcardDisplayText(card);
  const isKanji = card.mainViewMode === 'kanji';
  const typeGradient = isKanji
    ? `linear-gradient(135deg, ${accent[400]} 0%, ${accent[600]} 100%)`
    : `linear-gradient(135deg, ${brand[400]} 0%, ${brand[600]} 100%)`;
  const typeAccent = isKanji ? accent[400] : brand[400];

  const frameBox = {
    position: 'absolute', inset: 0, backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
    background: CARD_FRAME,
    borderRadius: '20px', p: { xs: '5px', sm: '6px' },
    boxShadow: `0 8px 40px rgba(0,0,0,0.18), 0 4px 12px ${alpha(brand[400], 0.28)}`,
  } as const;

  const innerCard = {
    width: '100%', height: '100%',
    bgcolor: brand[50], borderRadius: '15px', overflow: 'hidden',
    border: '2.5px solid rgba(255,255,255,0.9)',
    display: 'flex', flexDirection: 'column',
  } as const;

  return (
    <Box onClick={() => setFlipped((f) => !f)} sx={{ width, height, cursor: 'pointer', perspective: '1400px', userSelect: 'none', flexShrink: 0 }}>
      <Box sx={{
        width: '100%', height: '100%', position: 'relative',
        transformStyle: 'preserve-3d',
        transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
        transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
      }}>

        {/* ── FRONT ── */}
        <Box sx={frameBox}>
          <Box sx={innerCard}>
            {/* Top bar */}
            <Box sx={{
              px: { xs: 2, sm: 2.5 }, py: { xs: 0.9, sm: 1.1 },
              background: typeGradient,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              flexShrink: 0,
            }}>
              <Typography sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' }, fontWeight: 900, color: 'white', textTransform: 'uppercase', letterSpacing: '0.08em', textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>
                {isKanji ? '漢字' : 'かな'}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: '2px' }}>
                <Typography sx={{ fontSize: '0.55rem', fontWeight: 700, color: 'rgba(255,255,255,0.82)' }}>HP</Typography>
                <Typography sx={{ fontSize: { xs: '0.78rem', sm: '0.88rem' }, fontWeight: 900, color: 'white', textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>
                  {cardXp(card.jlptLevel)}
                </Typography>
              </Box>
            </Box>

            {/* Art frame */}
            <Box sx={{
              mx: { xs: '8px', sm: '10px' }, mt: { xs: '6px', sm: '8px' },
              borderRadius: '7px', overflow: 'hidden',
              border: '2px solid rgba(0,0,0,0.18)', boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.12)',
              flexShrink: 0, position: 'relative',
            }}>
              {!imgLoaded && (
                <Skeleton variant="rectangular" width="100%" height={200}
                  sx={{ bgcolor: alpha(brand[300], 0.1), position: 'absolute', inset: 0 }} />
              )}
              <Box
                component="img" ref={imgRef} src={card.imageUrl ?? PLACEHOLDER} alt={card.word}
                onLoad={() => setImgLoaded(true)} onError={() => setImgLoaded(true)}
                sx={{ width: '100%', height: { xs: 180, sm: 210 }, objectFit: 'cover', display: imgLoaded ? 'block' : 'none' }}
              />
            </Box>

            {/* Card name */}
            <Box sx={{ px: { xs: 2, sm: 2.5 }, pt: { xs: 1.25, sm: 1.5 }, pb: 1, borderBottom: `2.5px solid ${typeAccent}`, flexShrink: 0 }}>
              {subtitleText && (
                <Typography sx={{ fontFamily: '"DM Mono", monospace', fontSize: '0.65rem', color: '#888', letterSpacing: '0.08em', mb: 0.25, lineHeight: 1 }}>
                  {subtitleText}
                </Typography>
              )}
              <Typography sx={{
                fontFamily: '"Noto Serif JP", serif',
                fontSize: { xs: '2.2rem', sm: '2.8rem' },
                fontWeight: 700, color: '#111', lineHeight: 1.05,
              }}>
                {titleText}
              </Typography>
            </Box>

            {/* Tap hint */}
            <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', px: 2 }}>
              <Typography sx={{ fontSize: '0.63rem', color: alpha(brand[500], 0.55), letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                ✦ tap to flip ✦
              </Typography>
            </Box>

            {/* Footer */}
            <Box sx={{ px: { xs: 2, sm: 2.5 }, pb: { xs: 1, sm: 1.25 }, display: 'flex', justifyContent: 'space-between', borderTop: `1px solid ${alpha(brand[300], 0.25)}`, pt: 0.75 }}>
              {card.jlptLevel && (
                <Typography sx={{ fontSize: '0.52rem', color: alpha(brand[600], 0.7), fontFamily: '"DM Mono", monospace', letterSpacing: '0.06em' }}>
                  JLPT {card.jlptLevel}
                </Typography>
              )}
              <Typography sx={{ fontSize: '0.52rem', color: alpha(brand[500], 0.5), fontFamily: '"DM Mono", monospace' }}>★</Typography>
            </Box>
          </Box>
        </Box>

        {/* ── BACK ── */}
        <Box sx={{ ...frameBox, transform: 'rotateY(180deg)' }}>
          <Box sx={innerCard}>
            {/* Top bar */}
            <Box sx={{
              px: { xs: 2, sm: 2.5 }, py: { xs: 0.9, sm: 1.1 },
              background: `linear-gradient(135deg, ${brand[400]} 0%, ${accent[400]} 100%)`,
              flexShrink: 0,
            }}>
              <Typography sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' }, fontWeight: 900, color: 'white', textTransform: 'uppercase', letterSpacing: '0.08em', textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>
                Answer
              </Typography>
            </Box>

            {/* Content */}
            <Box sx={{ flex: 1, px: { xs: 2, sm: 2.5 }, py: { xs: 1.5, sm: 2 }, display: 'flex', flexDirection: 'column', gap: { xs: 1.5, sm: 2 }, overflow: 'auto', position: 'relative' }}>
              <Box sx={{ position: 'absolute', bottom: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: `radial-gradient(circle, ${alpha(brand[300], 0.14)} 0%, transparent 70%)`, filter: 'blur(24px)', pointerEvents: 'none' }} />

              {card.mainViewMode === 'hiragana' && (
                <Box>
                  <Typography sx={{ fontFamily: '"DM Mono", monospace', fontSize: '0.62rem', color: brand[500], letterSpacing: '0.14em', fontWeight: 700, mb: 0.5, textTransform: 'uppercase' }}>
                    ★ Kanji
                  </Typography>
                  <Typography sx={{ fontFamily: '"Noto Serif JP", serif', fontSize: { xs: '1.8rem', sm: '2.1rem' }, fontWeight: 700, color: '#111', lineHeight: 1.2 }}>
                    {card.word}
                  </Typography>
                </Box>
              )}

              <Box>
                <Typography sx={{ fontFamily: '"DM Mono", monospace', fontSize: '0.62rem', color: brand[500], letterSpacing: '0.14em', fontWeight: 700, mb: 0.5, textTransform: 'uppercase' }}>
                  ★ Meaning
                </Typography>
                <Typography sx={{ fontFamily: '"Noto Serif JP", serif', fontSize: { xs: '1.5rem', sm: '1.9rem' }, fontWeight: 700, color: '#111', fontStyle: 'italic', lineHeight: 1.25 }}>
                  {card.meaning}
                </Typography>
              </Box>

              <Box sx={{ borderTop: `2px solid ${alpha(brand[300], 0.22)}`, pt: { xs: 1.25, sm: 1.75 } }}>
                <Typography sx={{ fontFamily: '"DM Mono", monospace', fontSize: '0.62rem', color: brand[500], letterSpacing: '0.14em', fontWeight: 700, mb: 0.75, textTransform: 'uppercase' }}>
                  ★ Example
                </Typography>
                <Typography component="div" sx={{ fontFamily: '"Noto Serif JP", serif', fontSize: { xs: '0.95rem', sm: '1.05rem' }, color: '#111', lineHeight: 1.8 }}>
                  <FuriganaText text={card.example_jp} showFurigana={card.mainViewMode === 'hiragana'} />
                </Typography>
                <Typography sx={{ fontSize: { xs: '0.82rem', sm: '0.9rem' }, color: alpha('#000', 0.5), mt: 0.75, fontStyle: 'italic', lineHeight: 1.6 }}>
                  {card.example_en}
                </Typography>
              </Box>
            </Box>

            {/* Footer */}
            <Box sx={{ px: { xs: 2, sm: 2.5 }, pb: { xs: 1, sm: 1.25 }, borderTop: `1px solid ${alpha(brand[300], 0.25)}`, pt: 0.75, display: 'flex', justifyContent: 'space-between', flexShrink: 0 }}>
              {card.jlptLevel && (
                <Typography sx={{ fontSize: '0.52rem', color: alpha(brand[600], 0.7), fontFamily: '"DM Mono", monospace', letterSpacing: '0.06em' }}>
                  JLPT {card.jlptLevel}
                </Typography>
              )}
              <Typography sx={{ fontSize: '0.52rem', color: alpha(brand[500], 0.5), fontFamily: '"DM Mono", monospace' }}>tap to flip back</Typography>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
