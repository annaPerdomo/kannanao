'use client';
import { Box, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { useTranslations } from 'next-intl';

import type { PracticeMode } from '@/types/app';

import { PRACTICE_CONFIG } from './constants';
import { Label } from './Label';

// Tiles keep light pastel surfaces in every color scheme, dark ones included, so
// in-tile text needs a fixed ink — theme text tokens would invert underneath it.
const TILE_INK = '#1F1B24';

/** Rotating cheer keys — picked per visit via cardCount so SSR and client agree. */
const CHEER_COUNT = 4;

interface PracticeTileProps {
  kanji: string;
  color: string;
  label: string;
  description: string;
  cta: string;
  ctaFilled?: boolean;
  disabled?: boolean;
  ariaLabel: string;
  onActivate: () => void;
}

function PracticeTile({
  kanji,
  color,
  label,
  description,
  cta,
  ctaFilled = false,
  disabled = false,
  ariaLabel,
  onActivate,
}: PracticeTileProps) {
  const theme = useTheme();
  const { brand, accent } = theme.palette;

  return (
    <Box
      role={!disabled ? 'button' : undefined}
      tabIndex={!disabled ? 0 : undefined}
      onClick={!disabled ? onActivate : undefined}
      onKeyDown={
        !disabled
          ? (e: React.KeyboardEvent) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onActivate();
              }
            }
          : undefined
      }
      aria-label={ariaLabel}
      sx={{
        cursor: disabled ? 'default' : 'pointer',
        position: 'relative',
        overflow: 'hidden',
        borderRadius: theme.radii.lg,
        p: { xs: '18px 14px', sm: '22px 18px' },
        minHeight: 190,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        textAlign: 'center',
        background: `linear-gradient(150deg, #FFFFFF 0%, ${alpha(color, 0.07)} 55%, ${alpha(color, 0.17)} 100%)`,
        border: `1.5px solid ${alpha(color, 0.35)}`,
        boxShadow: `0 3px 12px ${alpha(color, 0.08)}`,
        opacity: disabled ? 0.45 : 1,
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        ...(!disabled && {
          '&:hover': {
            transform: 'translateY(-5px) scale(1.02)',
            boxShadow: `0 14px 32px ${alpha(color, 0.25)}`,
            '& .tile-badge': { transform: 'rotate(3deg) scale(1.12)' },
            '& .tile-sparkle': { opacity: 0.75, transform: 'scale(1.35) rotate(20deg)' },
            '& .tile-cta': ctaFilled
              ? { boxShadow: `0 5px 16px ${alpha(brand[500], 0.5)}` }
              : { bgcolor: alpha(color, 0.1) },
          },
        }),
      }}
    >
      <Typography
        aria-hidden
        sx={{
          position: 'absolute',
          bottom: -18,
          right: 2,
          fontSize: '5rem',
          lineHeight: 1,
          fontFamily: theme.fonts.jp,
          fontWeight: 900,
          color,
          opacity: 0.08,
          userSelect: 'none',
        }}
      >
        {kanji}
      </Typography>
      <Box
        aria-hidden
        className="tile-sparkle"
        sx={{
          position: 'absolute',
          top: 10,
          right: 12,
          fontSize: '0.85rem',
          lineHeight: 1,
          color,
          opacity: 0.3,
          userSelect: 'none',
          transition: 'opacity 0.2s ease, transform 0.25s ease',
        }}
      >
        ✦
      </Box>

      <Box
        sx={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Box
          className="tile-badge"
          sx={{
            width: 56,
            height: 56,
            borderRadius: theme.radii.md,
            display: 'grid',
            placeItems: 'center',
            background: `linear-gradient(135deg, ${alpha(color, 0.2)}, ${alpha(color, 0.08)})`,
            border: `1.5px solid ${alpha(color, 0.25)}`,
            transform: 'rotate(-4deg)',
            transition: 'transform 0.25s ease',
            mb: 1.25,
          }}
        >
          <Typography
            aria-hidden
            sx={{
              fontFamily: theme.fonts.jp,
              fontWeight: 900,
              fontSize: '1.75rem',
              lineHeight: 1,
              color,
              userSelect: 'none',
              transform: 'rotate(4deg)',
            }}
          >
            {kanji}
          </Typography>
        </Box>
        <Typography
          sx={{
            fontWeight: 900,
            fontSize: { xs: '0.95rem', sm: '1rem' },
            color,
            lineHeight: 1.2,
          }}
        >
          {label}
        </Typography>
        <Typography
          sx={{
            fontSize: '0.72rem',
            color: alpha(TILE_INK, 0.62),
            mt: 0.5,
            lineHeight: 1.35,
          }}
        >
          {description}
        </Typography>
      </Box>

      <Typography
        className="tile-cta"
        sx={{
          position: 'relative',
          mt: 1.5,
          width: '100%',
          maxWidth: 170,
          px: 2,
          py: '5px',
          borderRadius: theme.radii.pill,
          fontSize: '0.78rem',
          fontWeight: 800,
          lineHeight: 1.4,
          fontFamily: theme.fonts.cute,
          letterSpacing: '0.02em',
          transition: 'background-color 0.2s ease, box-shadow 0.2s ease',
          // `disabled` gates the filled branch too: without it an empty deck
          // left Flashcards reading "Let's go →" in full brand gradient while
          // every locked tile beside it went grey.
          ...(ctaFilled && !disabled
            ? {
                border: '1.5px solid transparent',
                background: `linear-gradient(135deg, ${brand[400]}, ${accent[400]})`,
                color: '#FFFFFF',
                boxShadow: `0 3px 10px ${alpha(brand[500], 0.35)}`,
              }
            : {
                border: `1.5px solid ${disabled ? alpha(TILE_INK, 0.2) : alpha(color, 0.45)}`,
                color: disabled ? alpha(TILE_INK, 0.4) : color,
                bgcolor: alpha('#FFFFFF', 0.55),
              }),
        }}
      >
        {cta}
      </Typography>
    </Box>
  );
}

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
  const { brand } = useTheme().palette;
  const practiceDisabled = cardCount < 2;
  // Absent, not locked, until the owner unlocks it: kana comes long before kanji.
  const tiles = PRACTICE_CONFIG.filter((tile) => tile.mode !== 'reading' || readingUnlocked);

  return (
    <Box sx={{ mb: 3 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 1,
        }}
      >
        <Label>{t('choosePractice')}</Label>
        <Typography
          sx={{
            fontSize: '0.72rem',
            fontWeight: 700,
            fontFamily: (th) => th.fonts.cute,
            color: brand[700],
            bgcolor: alpha(brand[100], 0.7),
            border: `1.5px solid ${alpha(brand[300], 0.5)}`,
            borderRadius: (th) => th.radii.pill,
            px: 1.5,
            py: '3px',
            whiteSpace: 'nowrap',
          }}
        >
          {t(`cheer${cardCount % CHEER_COUNT}`)}
        </Typography>
      </Box>
      <Box
        sx={{
          display: 'grid',
          // 8 tiles (Flashcards + 7 modes) — four per row fills both rows exactly.
          gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(4, 1fr)' },
          gap: { xs: 1.5, sm: 2 },
        }}
      >
        <PracticeTile
          kanji="学"
          color={brand[600]}
          label={t('flashcardsTitle')}
          description={t('flashcardsDescription')}
          cta={t('letsGo')}
          ctaFilled
          disabled={cardCount === 0}
          ariaLabel={t('startFlashcardStudyAria')}
          onActivate={onStudy}
        />
        {tiles.map(({ mode, labelKey, descriptionKey, kanji, color }) => {
          const label = tModes(labelKey);
          return (
            <PracticeTile
              key={mode}
              kanji={kanji}
              color={color}
              label={label}
              description={tModes(descriptionKey)}
              cta={practiceDisabled ? t('locked') : t('play')}
              disabled={practiceDisabled}
              ariaLabel={
                practiceDisabled ? t('lockedAria', { label }) : t('startPracticeAria', { label })
              }
              onActivate={() => onPractice(mode)}
            />
          );
        })}
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
