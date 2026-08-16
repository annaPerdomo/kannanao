'use client';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import Stack from '@mui/material/Stack';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';
import { type KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useReducedMotion } from '@/hooks/useReducedMotion';
import { memoryTitle, phraseLines, storyLines } from '@/lib/buddyPhrases';

import { stageFade, stageIn } from './animations';
import { BuddyArt } from './BuddyArt';
import { CelebrationBurst } from './CelebrationBurst';
import { LevelUpMeter } from './LevelUpMeter';
import { hasAnyUnlock, LevelUpUnlocks } from './LevelUpUnlocks';
import { StoryReveal } from './StoryReveal';

type Stage = 'meter' | 'title' | 'unlocks' | 'memory' | 'done';

interface LevelUpSequenceProps {
  buddyKey: string;
  name: string;
  copy: unknown;
  /** The level reached, from the event — never re-derived from live points. */
  level: number;
  onBrowse: () => void;
  onClose: () => void;
}

export function LevelUpSequence({
  buddyKey,
  name,
  copy,
  level,
  onBrowse,
  onClose,
}: LevelUpSequenceProps) {
  const t = useTranslations('Home.buddy.friendship');
  const { brand } = useTheme().palette;
  const reduced = useReducedMotion();

  const lines = useMemo(() => storyLines(copy, level), [copy, level]);
  const title = memoryTitle(copy, level);
  const phraseCount = phraseLines(copy, level).length;

  const hasMemory = lines.length > 0;
  const unlocks = { hasMemory, phraseCount };

  const stages: Stage[] = [
    'meter',
    'title',
    ...(hasAnyUnlock(unlocks) ? (['unlocks'] as const) : []),
    ...(hasMemory ? (['memory'] as const) : []),
    'done',
  ];

  const [index, setIndex] = useState(0);
  const [storyDone, setStoryDone] = useState(false);
  const stage = stages[Math.min(index, stages.length - 1)];
  const canAdvance = stage !== 'done' && (stage !== 'memory' || storyDone);

  const advance = useCallback(
    () => setIndex((i) => Math.min(i + 1, stages.length - 1)),
    [stages.length],
  );
  const onStoryDone = useCallback(() => setStoryDone(true), []);

  const containerRef = useRef<HTMLDivElement>(null);
  // The continue hint unmounts on the transitions it triggers, dropping focus
  // to <body> mid-celebration.
  useEffect(() => {
    containerRef.current?.focus();
  }, [stage]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    if (!canAdvance || (event.key !== 'Enter' && event.key !== ' ')) return;
    event.preventDefault();
    advance();
  };

  return (
    <Box
      // Not role="button": that flattens the whole celebration to one label for
      // a screen reader. The continue hint below is the real control.
      role="group"
      ref={containerRef}
      tabIndex={0}
      aria-label={t(`celebration.stageAria.${stage}`, { name })}
      onClick={canAdvance ? advance : undefined}
      onKeyDown={onKeyDown}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 1.75,
        width: '100%',
        borderRadius: 3,
        cursor: canAdvance ? 'pointer' : 'default',
        outline: 'none',
        '&:focus-visible': { outline: `2px solid ${brand[400]}`, outlineOffset: 4 },
      }}
    >
      <Box sx={{ position: 'relative', width: '100%' }}>
        <BuddyArt buddyKey={buddyKey} size={stage === 'meter' ? 132 : 104} />
        {stage === 'meter' && !reduced && <CelebrationBurst />}
      </Box>

      <Box
        key={stage}
        sx={{
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 1.25,
          animation: `${reduced ? stageFade : stageIn} 0.3s ease-out`,
        }}
      >
        {stage === 'meter' && <LevelUpMeter level={level} reduced={reduced} />}

        {stage === 'title' && (
          <Box sx={{ textAlign: 'center' }}>
            <Typography sx={{ fontSize: '1.05rem', fontWeight: 900, color: brand[800] }}>
              {t('celebration.grew')}
            </Typography>
            <Typography sx={{ fontSize: '0.95rem', fontWeight: 700, color: 'text.primary' }}>
              {t('celebration.levelChange', { name, levelName: t(`levelNames.${level}`) })}
            </Typography>
          </Box>
        )}

        {stage === 'unlocks' && <LevelUpUnlocks name={name} memoryTitle={title} {...unlocks} />}

        {stage === 'memory' && (
          <>
            <Typography
              sx={{ fontSize: '0.88rem', fontWeight: 700, color: brand[700], alignSelf: 'center' }}
            >
              {t('celebration.memoryIntro', { name })}
            </Typography>
            <StoryReveal lines={lines} onDone={onStoryDone} />
          </>
        )}

        {stage === 'done' && (
          <>
            <Typography
              sx={{
                fontSize: '0.9rem',
                fontWeight: 700,
                color: 'text.primary',
                textAlign: 'center',
              }}
            >
              {hasMemory ? t('celebration.saved') : t('celebration.savedNoMemory', { name })}
            </Typography>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1}
              sx={{ width: '100%', justifyContent: 'center', alignItems: 'center' }}
            >
              <Button variant="contained" size="small" onClick={onBrowse}>
                {t('celebration.seeMemories')}
              </Button>
              <Button variant="text" size="small" onClick={onClose}>
                {t('celebration.backHome')}
              </Button>
            </Stack>
          </>
        )}
      </Box>

      {canAdvance && (
        <ButtonBase
          onClick={(event) => {
            event.stopPropagation();
            advance();
          }}
          sx={{
            mt: -0.5,
            px: 1,
            py: 0.25,
            borderRadius: 99,
            fontSize: '0.72rem',
            color: 'text.secondary',
          }}
        >
          {t('continueHint')}
        </ButtonBase>
      )}
    </Box>
  );
}
