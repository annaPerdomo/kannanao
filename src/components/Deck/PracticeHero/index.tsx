'use client';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Box, Button, Collapse, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import type { PracticeMode } from '@/types/app';

import { PRACTICE_CONFIG } from '../constants';
import { Label } from '../Label';
import { MixedPracticeButton } from './MixedPracticeButton';
import { PracticeTile } from './PracticeTile';

/** Rotating cheer keys — picked per visit via cardCount so SSR and client agree. */
const CHEER_COUNT = 4;

interface PracticeHeroProps {
  cardCount: number;
  onStudy: () => void;
  onPractice: (mode: PracticeMode) => void;
  /** Kanji Reading practice is unlocked for this deck (deck settings). */
  readingUnlocked?: boolean;
  /** Start a mixed session. Absent (or on a deck too small) leaves the plain grid. */
  onMixedPractice?: () => void;
  /** The mixed session is being planned — the progress read has not landed yet. */
  mixedStarting?: boolean;
}

export function PracticeHero({
  cardCount,
  onStudy,
  onPractice,
  readingUnlocked = false,
  onMixedPractice,
  mixedStarting = false,
}: PracticeHeroProps) {
  const t = useTranslations('Deck.practiceHero');
  const tModes = useTranslations('Deck.practiceModes');
  const { brand } = useTheme().palette;
  const practiceDisabled = cardCount < 2;
  // Absent, not locked, until the owner unlocks it: kana comes long before kanji.
  const tiles = PRACTICE_CONFIG.filter((tile) => tile.mode !== 'reading' || readingUnlocked);
  const mixed = !!onMixedPractice && !practiceDisabled;
  // Demoted, never deleted: for some learners one game is the whole hook.
  const [gamesOpen, setGamesOpen] = useState(false);

  return (
    <Box sx={{ mb: 3 }}>
      {mixed && (
        <MixedPracticeButton
          label={t('mixedTitle')}
          description={t('mixedDescription')}
          cta={mixedStarting ? t('mixedStarting') : t('letsGo')}
          ariaLabel={t('startMixedAria')}
          busy={mixedStarting}
          onActivate={onMixedPractice}
        />
      )}

      {mixed && (
        <Button
          onClick={() => setGamesOpen((open) => !open)}
          aria-expanded={gamesOpen}
          aria-controls="practice-games"
          endIcon={
            <ExpandMoreIcon
              sx={{
                transition: 'transform 0.2s ease',
                transform: gamesOpen ? 'rotate(180deg)' : 'none',
              }}
            />
          }
          sx={{
            mb: 1.5,
            px: 1,
            color: 'text.secondary',
            fontWeight: 700,
            fontSize: '0.85rem',
            textTransform: 'none',
          }}
        >
          {t('moreGames')}
        </Button>
      )}

      <Collapse in={!mixed || gamesOpen} unmountOnExit id="practice-games">
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
      </Collapse>
    </Box>
  );
}
