'use client';

import { alpha, Box, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useMemo, useRef, useState } from 'react';

import { CelebrationScreen } from '@/components/Practice/CelebrationScreen';
import { useGameSession } from '@/hooks/useGameSession';
import { countBlanks, isBlankAnswer, shuffle } from '@/lib/reviewGames';

import { PARTICLE_CHOICES, PARTICLE_SENTENCES } from './data';
import { GameShell } from './GameShell';

export function ParticlePicker() {
  const theme = useTheme();
  const { brand, surfaces } = theme.palette;
  const router = useRouter();
  const t = useTranslations('Games.particlePicker');
  const { answer, finish, comboCount } = useGameSession('particle-quiz');

  const sentences = useMemo(() => shuffle(PARTICLE_SENTENCES), []);
  const [index, setIndex] = useState(0);
  const [done, setDone] = useState(false);
  // Particles filled so far for the current sentence (by blank position)
  const [filled, setFilled] = useState<string[]>([]);
  const [wrongChip, setWrongChip] = useState<string | null>(null);
  // First tap per blank counts toward score
  const attemptedRef = useRef(false);
  const correctRef = useRef(0);
  const totalBlanks = useMemo(
    () => sentences.reduce((n, s) => n + countBlanks(s.segments), 0),
    [sentences],
  );

  const sentence = sentences[index];
  const blanks = countBlanks(sentence.segments);
  const sentenceDone = filled.length === blanks;

  const handleChip = (particle: string) => {
    if (sentenceDone || wrongChip) return;
    // Locate the segment for the current blank
    let blankIdx = -1;
    const segment = sentence.segments.find((s) => {
      if (typeof s === 'string') return false;
      blankIdx += 1;
      return blankIdx === filled.length;
    })!;

    const isCorrect = isBlankAnswer(segment, particle);
    if (!attemptedRef.current) {
      attemptedRef.current = true;
      if (isCorrect) correctRef.current += 1;
      void answer(isCorrect);
    }

    if (isCorrect) {
      attemptedRef.current = false;
      const nextFilled = [...filled, particle];
      setFilled(nextFilled);
      if (nextFilled.length === blanks) {
        setTimeout(() => {
          setFilled([]);
          if (index + 1 >= sentences.length) {
            setDone(true);
            finish();
          } else {
            setIndex(index + 1);
          }
        }, 1100);
      }
    } else {
      setWrongChip(particle);
      setTimeout(() => setWrongChip(null), 600);
    }
  };

  if (done) {
    return (
      <CelebrationScreen
        heading={t('celebrationHeading')}
        subheading={t('celebrationSubheading', {
          correct: correctRef.current,
          total: totalBlanks,
        })}
        mode="particle-quiz"
        onExit={() => router.push('/review')}
      />
    );
  }

  // Render the sentence with filled/active/pending blanks
  let blankCursor = -1;
  return (
    <GameShell
      title={t('title')}
      emoji="🎏"
      howTo={t('howTo')}
      current={index}
      total={sentences.length}
      comboCount={comboCount}
      onQuit={async () => {
        await finish();
        router.push('/review');
      }}
    >
      <Box sx={{ textAlign: 'center', mb: 3 }}>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
          “{sentence.english}”
        </Typography>
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            alignItems: 'center',
            rowGap: 1.5,
            columnGap: 0.25,
          }}
        >
          {sentence.segments.map((seg, i) => {
            if (typeof seg === 'string') {
              return (
                <Typography
                  key={i}
                  sx={{ fontFamily: '"Noto Serif JP", serif', fontSize: '1.5rem' }}
                >
                  {seg}
                </Typography>
              );
            }
            blankCursor += 1;
            const isFilled = blankCursor < filled.length;
            const isActive = blankCursor === filled.length && !sentenceDone;
            return (
              <Box
                key={i}
                sx={{
                  width: 44,
                  height: 44,
                  mx: 0.5,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 2,
                  border: '2px dashed',
                  borderColor: isFilled
                    ? 'success.main'
                    : isActive
                      ? 'primary.main'
                      : alpha(brand[300], 0.5),
                  bgcolor: isFilled
                    ? alpha(theme.palette.success.main, 0.12)
                    : isActive
                      ? alpha(brand[300], 0.14)
                      : 'transparent',
                  transition: 'all 0.15s',
                }}
              >
                <Typography sx={{ fontFamily: '"Noto Serif JP", serif', fontSize: '1.3rem' }}>
                  {isFilled ? filled[blankCursor] : ''}
                </Typography>
              </Box>
            );
          })}
        </Box>
        {sentenceDone && (
          <Typography sx={{ mt: 1.5, color: 'success.main', fontWeight: 600 }}>
            {t('correct')}
          </Typography>
        )}
      </Box>

      {/* Particle chips */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 1 }}>
        {PARTICLE_CHOICES.map((p) => {
          const isWrong = wrongChip === p;
          return (
            <Box
              key={p}
              role="button"
              tabIndex={0}
              onClick={() => handleChip(p)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleChip(p);
                }
              }}
              sx={{
                width: 56,
                height: 56,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 3,
                border: '2px solid',
                borderColor: isWrong ? 'error.main' : alpha(brand[200], 0.7),
                bgcolor: isWrong ? alpha(theme.palette.error.main, 0.08) : surfaces.input,
                cursor: 'pointer',
                transition: 'all 0.15s',
                animation: isWrong ? 'chipShake 0.4s' : 'none',
                '@keyframes chipShake': {
                  '0%, 100%': { transform: 'translateX(0)' },
                  '25%': { transform: 'translateX(-6px)' },
                  '75%': { transform: 'translateX(6px)' },
                },
                '&:hover': { borderColor: brand[500], bgcolor: alpha(brand[300], 0.2) },
              }}
            >
              <Typography sx={{ fontFamily: '"Noto Serif JP", serif', fontSize: '1.5rem' }}>
                {p}
              </Typography>
            </Box>
          );
        })}
      </Box>
    </GameShell>
  );
}
