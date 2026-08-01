'use client';
import { Box, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';
import { useTranslations } from 'next-intl';

import type { PracticeMode } from '@/types/app';

import { PRACTICE_CONFIG } from './constants';
import { Label } from './Label';

interface PracticeHeroProps {
  cardCount: number;
  onStudy: () => void;
  onPractice: (mode: PracticeMode) => void;
  /** Kanji Reading practice is unlocked for this deck (deck settings). */
  readingUnlocked?: boolean;
}

export function PracticeHero({
  cardCount,
  onStudy,
  onPractice,
  readingUnlocked = false,
}: PracticeHeroProps) {
  const t = useTranslations('Deck.practiceHero');
  const tModes = useTranslations('Deck.practiceModes');
  const { brand, accent } = useTheme().palette;
  const practiceDisabled = cardCount < 2;
  // Reading stays out of the grid until the deck's owner unlocks it: kana comes
  // long before kanji, and a locked tile is just a question a learner can't answer.
  const tiles = PRACTICE_CONFIG.filter((tile) => tile.mode !== 'reading' || readingUnlocked);

  return (
    <Box
      sx={{
        mb: 3,
      }}
    >
      <Label>{t('letsPractice')}</Label>
      <Box
        sx={{
          display: 'grid',
          // 8 tiles (Flashcards + 7 modes) — four per row fills both rows exactly.
          gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(4, 1fr)' },
          gap: { xs: 1.5, sm: 2 },
        }}
      >
        {/* Flashcards – primary CTA */}
        <Box
          role={cardCount > 0 ? 'button' : undefined}
          tabIndex={cardCount > 0 ? 0 : undefined}
          onClick={cardCount > 0 ? onStudy : undefined}
          onKeyDown={
            cardCount > 0
              ? (e: React.KeyboardEvent) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onStudy();
                  }
                }
              : undefined
          }
          aria-label={cardCount > 0 ? t('startFlashcardStudyAria') : undefined}
          sx={{
            cursor: cardCount > 0 ? 'pointer' : 'default',
            position: 'relative',
            overflow: 'hidden',
            borderRadius: (theme) => theme.radii.md,
            p: { xs: '20px 18px', sm: '24px 22px' },
            minHeight: 160,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            background:
              cardCount > 0
                ? `linear-gradient(145deg, ${brand[400]} 0%, ${brand[500]} 40%, ${accent[400]} 100%)`
                : 'rgba(200,200,200,0.3)',
            border: '1.5px solid transparent',
            opacity: cardCount > 0 ? 1 : 0.5,
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            boxShadow: cardCount > 0 ? `0 6px 24px ${alpha(brand[500], 0.35)}` : 'none',
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
              position: 'absolute',
              bottom: -16,
              right: 6,
              fontSize: '5.5rem',
              lineHeight: 1,
              opacity: 0.18,
              userSelect: 'none',
              fontFamily: (t) => t.fonts.jp,
              fontWeight: 900,
            }}
          >
            学
          </Typography>

          <Box>
            <Typography sx={{ fontSize: '2rem', lineHeight: 1, mb: 1 }}>✨</Typography>
            <Typography
              sx={{
                fontWeight: 900,
                fontSize: { xs: '1rem', sm: '1.05rem' },
                color: '#FFFFFF',
                lineHeight: 1.2,
                textShadow: '0 1px 4px rgba(0,0,0,0.15)',
              }}
            >
              {t('flashcardsTitle')}
            </Typography>
            <Typography
              sx={{
                fontSize: '0.72rem',
                color: 'rgba(255,255,255,0.85)',
                mt: 0.4,
              }}
            >
              {t('flashcardsDescription')}
            </Typography>
          </Box>

          <Box
            sx={{
              alignSelf: 'flex-end',
              position: 'relative',
              zIndex: 1,
              borderRadius: (theme) => theme.radii.lg,
              p: '2px',
              background: `linear-gradient(90deg, ${brand[200]}, ${accent[300]})`,
              boxShadow: '0 4px 16px rgba(0,0,0,0.22)',
            }}
          >
            <Box
              sx={{
                bgcolor: '#fff',
                borderRadius: (theme) => theme.radii.md,
                px: 1.75,
                py: 0.65,
              }}
            >
              <Typography
                sx={{
                  fontSize: '0.82rem',
                  fontWeight: 900,
                  color: brand[700],
                  fontFamily: (t) => t.fonts.cute,
                  letterSpacing: '0.02em',
                  lineHeight: 1,
                }}
              >
                {t('letsGo')}
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Practice mode tiles */}
        {tiles.map(
          ({
            mode,
            labelKey,
            descriptionKey,
            emoji,
            watermark,
            color,
            bg,
            border,
            shadowColor,
          }) => {
            const label = tModes(labelKey);
            const description = tModes(descriptionKey);
            return (
              <Box
                key={mode}
                role={!practiceDisabled ? 'button' : undefined}
                tabIndex={!practiceDisabled ? 0 : undefined}
                onClick={!practiceDisabled ? () => onPractice(mode) : undefined}
                onKeyDown={
                  !practiceDisabled
                    ? (e: React.KeyboardEvent) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onPractice(mode);
                        }
                      }
                    : undefined
                }
                aria-label={
                  !practiceDisabled ? t('startPracticeAria', { label }) : t('lockedAria', { label })
                }
                sx={{
                  cursor: practiceDisabled ? 'default' : 'pointer',
                  position: 'relative',
                  overflow: 'hidden',
                  borderRadius: (theme) => theme.radii.md,
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
                    position: 'absolute',
                    bottom: -16,
                    right: 6,
                    fontSize: '5.5rem',
                    lineHeight: 1,
                    color,
                    opacity: 0.08,
                    fontFamily: (t) => t.fonts.jp,
                    fontWeight: 900,
                    userSelect: 'none',
                  }}
                >
                  {watermark}
                </Typography>

                <Box>
                  <Typography sx={{ fontSize: '1.85rem', lineHeight: 1, mb: 1 }}>
                    {emoji}
                  </Typography>
                  <Typography
                    sx={{
                      fontWeight: 900,
                      fontSize: { xs: '0.92rem', sm: '0.98rem' },
                      color,
                      lineHeight: 1.2,
                    }}
                  >
                    {label}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: '0.7rem',
                      color: `${color}BB`,
                      mt: 0.4,
                    }}
                  >
                    {description}
                  </Typography>
                </Box>

                <Typography
                  sx={{
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    color: practiceDisabled ? 'text.disabled' : color,
                    letterSpacing: '0.04em',
                    opacity: practiceDisabled ? 0.5 : 0.8,
                    alignSelf: 'flex-end',
                  }}
                >
                  {practiceDisabled ? t('locked') : t('play')}
                </Typography>
              </Box>
            );
          },
        )}
      </Box>
      {practiceDisabled && cardCount > 0 && (
        <Typography
          sx={{
            fontSize: '0.7rem',
            color: 'text.secondary',
            mt: 1.5,
            textAlign: 'center',
          }}
        >
          {t('unlockHint')}
        </Typography>
      )}
    </Box>
  );
}
