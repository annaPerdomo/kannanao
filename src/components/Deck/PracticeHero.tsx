'use client';
import { Box, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';
import { FONT_JP } from '@/theme';
import { PRACTICE_CONFIG } from './constants';
import { Label } from './Label';
import type { PracticeMode } from '@/types/app';

interface PracticeHeroProps {
  cardCount: number;
  onStudy: () => void;
  onPractice: (mode: PracticeMode) => void;
}

export function PracticeHero({ cardCount, onStudy, onPractice }: PracticeHeroProps) {
  const { brand, accent } = useTheme().palette;
  const practiceDisabled = cardCount < 2;

  return (
    <Box
      sx={{
        background: `linear-gradient(135deg, ${brand[50]} 0%, ${accent[50]} 100%)`,
        borderRadius: '20px',
        border: `1.5px solid ${alpha(brand[300], 0.35)}`,
        p: { xs: 2.5, sm: 3.5 },
        mb: 3,
      }}
    >
      <Label>Let&apos;s practice!</Label>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(4, 1fr)' },
          gap: { xs: 1.5, sm: 2 },
        }}
      >
        {/* Flashcards – primary CTA */}
        <Box
          onClick={cardCount > 0 ? onStudy : undefined}
          sx={{
            cursor: cardCount > 0 ? 'pointer' : 'default',
            position: 'relative',
            overflow: 'hidden',
            borderRadius: '18px',
            p: { xs: '20px 18px', sm: '24px 22px' },
            minHeight: 160,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            background: cardCount > 0
              ? `linear-gradient(145deg, ${brand[400]} 0%, ${brand[500]} 40%, ${accent[400]} 100%)`
              : 'rgba(200,200,200,0.3)',
            border: '1.5px solid transparent',
            opacity: cardCount > 0 ? 1 : 0.5,
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            boxShadow: cardCount > 0
              ? `0 6px 24px ${alpha(brand[500], 0.35)}`
              : 'none',
            ...(cardCount > 0 && {
              '&:hover': {
                transform: 'translateY(-5px) scale(1.02)',
                boxShadow: `0 14px 36px ${alpha(brand[500], 0.45)}`,
              },
            }),
          }}
        >
          <Typography
            aria-hidden
            sx={{
              position: 'absolute', bottom: -16, right: 6,
              fontSize: '5.5rem', lineHeight: 1, opacity: 0.18,
              userSelect: 'none', fontFamily: FONT_JP, fontWeight: 900,
            }}
          >
            学
          </Typography>

          <Box>
            <Typography sx={{ fontSize: '2rem', lineHeight: 1, mb: 1 }}>✨</Typography>
            <Typography
              sx={{
                fontWeight: 900, fontSize: { xs: '1rem', sm: '1.05rem' },
                color: '#FFFFFF',
                lineHeight: 1.2, textShadow: '0 1px 4px rgba(0,0,0,0.15)',
              }}
            >
              Flashcards
            </Typography>
            <Typography
              sx={{
                fontSize: '0.72rem', color: 'rgba(255,255,255,0.85)',
                mt: 0.4,
              }}
            >
              Flip & learn every card
            </Typography>
          </Box>

          <Typography
            sx={{
              fontSize: '0.72rem', fontWeight: 800,
              color: 'rgba(255,255,255,0.9)',
              letterSpacing: '0.04em', alignSelf: 'flex-end',
            }}
          >
            Let&apos;s go →
          </Typography>
        </Box>

        {/* Practice mode tiles */}
        {PRACTICE_CONFIG.map(({ mode, label, description, emoji, watermark, color, bg, border, shadowColor }) => (
          <Box
            key={mode}
            onClick={!practiceDisabled ? () => onPractice(mode) : undefined}
            sx={{
              cursor: practiceDisabled ? 'default' : 'pointer',
              position: 'relative',
              overflow: 'hidden',
              borderRadius: '18px',
              p: { xs: '20px 18px', sm: '24px 22px' },
              minHeight: 160,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              background: bg,
              border: '1.5px solid',
              borderColor: border,
              opacity: practiceDisabled ? 0.45 : 1,
              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              ...(!practiceDisabled && {
                '&:hover': {
                  transform: 'translateY(-5px) scale(1.02)',
                  boxShadow: `0 12px 32px ${shadowColor}`,
                },
              }),
            }}
          >
            <Typography
              aria-hidden
              sx={{
                position: 'absolute', bottom: -16, right: 6,
                fontSize: '5.5rem', lineHeight: 1, color, opacity: 0.08,
                fontFamily: FONT_JP, fontWeight: 900, userSelect: 'none',
              }}
            >
              {watermark}
            </Typography>

            <Box>
              <Typography sx={{ fontSize: '1.85rem', lineHeight: 1, mb: 1 }}>{emoji}</Typography>
              <Typography
                sx={{
                  fontWeight: 900, fontSize: { xs: '0.92rem', sm: '0.98rem' },
                  color, lineHeight: 1.2,
                }}
              >
                {label}
              </Typography>
              <Typography
                sx={{
                  fontSize: '0.7rem', color: `${color}BB`,
                  mt: 0.4,
                }}
              >
                {description}
              </Typography>
            </Box>

            <Typography
              sx={{
                fontSize: '0.7rem', fontWeight: 800,
                color: practiceDisabled ? 'text.disabled' : color,
                letterSpacing: '0.04em',
                opacity: practiceDisabled ? 0.5 : 0.8, alignSelf: 'flex-end',
              }}
            >
              {practiceDisabled ? 'Locked 🔒' : 'Play →'}
            </Typography>
          </Box>
        ))}
      </Box>
      {practiceDisabled && cardCount > 0 && (
        <Typography
          sx={{
            fontSize: '0.7rem', color: 'text.secondary',
            mt: 1.5, textAlign: 'center',
          }}
        >
          Add at least 2 cards to unlock practice modes.
        </Typography>
      )}
    </Box>
  );
}
