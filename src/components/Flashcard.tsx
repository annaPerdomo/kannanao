'use client';
import { useState, useEffect, useRef } from 'react';
import { Box, Typography, Skeleton } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';
import type { Flashcard as FlashcardType } from '@/types/flashcard';
import { getFlashcardDisplayText } from '@/lib/flashcardUtils';
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
  const { brand } = theme.palette;

  const [flipped, setFlipped] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => { setFlipped(false); setImgLoaded(false); }, [card]);

  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth > 0) setImgLoaded(true);
  }, [card]);

  const { titleText, subtitleText } = getFlashcardDisplayText(card);

  const cardEdgeSx = {
    position: 'absolute', inset: 0, backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
    borderRadius: 5, overflow: 'hidden',
    border: `1.5px solid ${alpha(brand[300], 0.35)}`,
    boxShadow: `0 4px 6px ${alpha(brand[300], 0.08)}, 0 20px 50px ${alpha(brand[300], 0.22)}, 0 0 0 1px rgba(255,255,255,0.6) inset`,
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
        <Box sx={cardEdgeSx}>
          {!imgLoaded && (
            <Skeleton variant="rectangular" width="100%" height="100%"
              sx={{ bgcolor: alpha(brand[300], 0.1), position: 'absolute', inset: 0 }} />
          )}
          <Box component="img" ref={imgRef} src={card.imageUrl ?? PLACEHOLDER} alt={card.word}
            onLoad={() => setImgLoaded(true)} onError={() => setImgLoaded(true)}
            sx={{ width: '100%', height: '100%', objectFit: 'cover', display: imgLoaded ? 'block' : 'none' }}
          />

          {/* Gradient overlay */}
          <Box sx={{
            position: 'absolute', inset: 0,
            background: `linear-gradient(to top, ${alpha(brand[50], 0.98)} 32%, ${alpha(brand[100], 0.55)} 60%, transparent 100%)`,
          }} />

          {/* Decorative blob */}
          <Box sx={{
            position: 'absolute', top: -40, right: -40, width: 160, height: 160,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${alpha(brand[300], 0.35)} 0%, transparent 70%)`,
            filter: 'blur(24px)', pointerEvents: 'none',
          }} />

          <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, p: { xs: 3, sm: 4 } }}>
            {subtitleText && (
              <Box sx={{
                display: 'inline-flex', alignItems: 'center', px: 1.5, py: 0.4, borderRadius: 99, mb: 1.5,
                bgcolor: alpha(brand[300], 0.22), border: `1px solid ${alpha(brand[300], 0.4)}`,
              }}>
                <Typography sx={{ fontFamily: '"DM Mono", monospace', fontSize: '0.72rem', color: brand[700], letterSpacing: '0.1em', fontWeight: 600 }}>
                  {subtitleText}
                </Typography>
              </Box>
            )}

            <Typography sx={{
              fontFamily: '"Noto Serif JP", serif', fontSize: { xs: '2.6rem', sm: '3.2rem' },
              fontWeight: 700, color: 'text.primary', lineHeight: 1.05, letterSpacing: '-0.01em',
              textShadow: '0 2px 16px rgba(255,255,255,0.5)',
            }}>
              {titleText}
            </Typography>

            <Typography variant="caption" sx={{
              color: alpha(brand[700], 0.55), display: 'block', mt: 2,
              letterSpacing: '0.12em', fontSize: '0.7rem', textTransform: 'uppercase',
            }}>
              tap to flip
            </Typography>
          </Box>
        </Box>

        {/* ── BACK ── */}
        <Box sx={{
          ...cardEdgeSx,
          transform: 'rotateY(180deg)',
          bgcolor: brand[50],
          display: 'flex', flexDirection: 'column', justifyContent: 'center',
          p: { xs: 3, sm: 4.5 }, gap: 2.5,
        }}>
          {/* Decorative blob */}
          <Box sx={{
            position: 'absolute', bottom: -60, left: -60, width: 220, height: 220,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${alpha(brand[300], 0.2)} 0%, transparent 70%)`,
            filter: 'blur(32px)', pointerEvents: 'none',
          }} />

          {/* Kanji section */}
          {card.mainViewMode === 'hiragana' && (
            <Box>
              <Typography sx={{ fontFamily: '"DM Mono", monospace', fontSize: '0.68rem', color: brand[500], letterSpacing: '0.14em', fontWeight: 700, mb: 0.75, textTransform: 'uppercase' }}>
                Kanji
              </Typography>
              <Typography sx={{ fontFamily: '"Noto Serif JP", serif', fontSize: '2rem', fontWeight: 600, color: 'text.primary', lineHeight: 1.2 }}>
                {card.word}
              </Typography>
            </Box>
          )}

          {/* Meaning */}
          <Box>
            <Typography sx={{ fontFamily: '"DM Mono", monospace', fontSize: '0.68rem', color: brand[500], letterSpacing: '0.14em', fontWeight: 700, mb: 0.75, textTransform: 'uppercase' }}>
              Meaning
            </Typography>
            <Typography sx={{ fontFamily: '"Noto Serif JP", serif', fontSize: { xs: '1.6rem', sm: '2rem' }, fontWeight: 600, color: 'text.primary', fontStyle: 'italic', lineHeight: 1.25 }}>
              {card.meaning}
            </Typography>
          </Box>

          {/* Example */}
          <Box sx={{ borderTop: `1.5px solid ${alpha(brand[300], 0.3)}`, pt: 2.5 }}>
            <Typography sx={{ fontFamily: '"DM Mono", monospace', fontSize: '0.68rem', color: brand[500], letterSpacing: '0.14em', fontWeight: 700, mb: 1, textTransform: 'uppercase' }}>
              Example
            </Typography>
            <Typography component="div" sx={{ fontFamily: '"Noto Serif JP", serif', fontSize: '1.05rem', color: 'text.primary', lineHeight: 1.8 }}>
              <FuriganaText text={card.example_jp} showFurigana={card.mainViewMode === 'hiragana'} />
            </Typography>
            <Typography sx={{ fontSize: '0.9rem', color: alpha(theme.palette.text.primary, 0.6), mt: 0.75, fontStyle: 'italic', lineHeight: 1.6 }}>
              {card.example_en}
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
