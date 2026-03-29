'use client';
import { useState } from 'react';
import { Box, Typography, Skeleton } from '@mui/material';
import type { Flashcard as FlashcardType } from '@/types/flashcard';

interface FlashcardProps {
  card: FlashcardType;
  width?: number | string;
  height?: number | string;
}

const PLACEHOLDER = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 280"%3E%3Crect fill="%231A1916" width="400" height="280"/%3E%3C/svg%3E';

export function Flashcard({ card, width = 320, height = 220 }: FlashcardProps) {
  const [flipped, setFlipped] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

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
      }}
    >
      <Box
        sx={{
          width: '100%',
          height: '100%',
          position: 'relative',
          transformStyle: 'preserve-3d',
          transition: 'transform 0.55s cubic-bezier(0.4, 0, 0.2, 1)',
          transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}
      >
        {/* Front */}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            borderRadius: 3,
            overflow: 'hidden',
            border: '1px solid rgba(249,168,212,0.25)',
            boxShadow: '0 16px 30px rgba(249,168,212,0.15)',
          }}
        >
          {!imgLoaded && (
            <Skeleton variant="rectangular" width="100%" height="100%" sx={{ bgcolor: 'rgba(200,169,126,0.06)' }} />
          )}
          <Box
            component="img"
            src={card.imageUrl ?? PLACEHOLDER}
            alt={card.word}
            onLoad={() => setImgLoaded(true)}
            sx={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: imgLoaded ? 'block' : 'none',
            }}
          />
          {/* Gradient overlay */}
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(to top, rgba(255, 242, 248, 0.96) 24%, rgba(249, 168, 212, 0.18) 68%)',
            }}
          />
          {/* Word + reading */}
          <Box
            sx={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              p: 2.5,
            }}
          >
            <Typography
              sx={{
                fontFamily: '"Noto Serif JP", serif',
                fontSize: '2rem',
                fontWeight: 600,
                color: '#4A2068',
                lineHeight: 1.1,
                textShadow: '0 2px 10px rgba(255,255,255,0.35)',
              }}
            >
              {card.word}
            </Typography>
            <Typography
              sx={{
                fontFamily: '"DM Mono", monospace',
                fontSize: '0.8rem',
                color: 'rgba(200,169,126,0.85)',
                mt: 0.5,
                letterSpacing: '0.05em',
              }}
            >
              {card.reading}
            </Typography>
            <Typography
              variant="caption"
              sx={{ color: '#A86C99', display: 'block', mt: 1.5, letterSpacing: '0.08em' }}
            >
              tap to flip
            </Typography>
          </Box>
        </Box>

        {/* Back */}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            borderRadius: 3,
            overflow: 'hidden',
            border: '1px solid rgba(249,168,212,0.35)',
            bgcolor: '#FFF1F8',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            p: 2.5,
            gap: 1.5,
          }}
        >
          <Box>
            <Typography
              variant="caption"
              sx={{ color: 'primary.main', letterSpacing: '0.12em', display: 'block', mb: 0.5 }}
            >
              MEANING
            </Typography>
            <Typography variant="h5" sx={{ color: '#5E2F6C', fontStyle: 'italic' }}>
              {card.meaning}
            </Typography>
          </Box>
          <Box
            sx={{
              borderTop: '1px solid',
              borderColor: 'divider',
              pt: 1.5,
            }}
          >
            <Typography variant="caption" sx={{ color: 'primary.main', letterSpacing: '0.12em', display: 'block', mb: 0.5 }}>
              EXAMPLE
            </Typography>
            <Typography
              sx={{
                fontFamily: '"Noto Serif JP", serif',
                fontSize: '0.95rem',
                color: 'text.primary',
                lineHeight: 1.7,
              }}
            >
              {card.example_jp}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5, fontStyle: 'italic' }}>
              {card.example_en}
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
