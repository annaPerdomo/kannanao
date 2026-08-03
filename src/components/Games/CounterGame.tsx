'use client';

import { alpha, Box, ButtonBase, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useMemo, useRef, useState } from 'react';

import { CelebrationScreen } from '@/components/Practice/CelebrationScreen';
import { useGameSession } from '@/hooks/useGameSession';

import { buildCounterRounds } from './countersData';
import { GameShell } from './GameShell';

export function CounterGame() {
  const theme = useTheme();
  const { brand, surfaces } = theme.palette;
  const router = useRouter();
  const t = useTranslations('Games.counterGame');
  const { answer, finish, comboCount } = useGameSession('counter-quiz');

  const rounds = useMemo(() => buildCounterRounds(), []);
  const [index, setIndex] = useState(0);
  const [done, setDone] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const correctRef = useRef(0);

  const round = rounds[index];
  const itemLabel = t(`items.${round.item.id}`, { count: round.count });

  const handlePick = (option: string) => {
    if (picked) return;
    setPicked(option);
    const isCorrect = option === round.answer;
    if (isCorrect) correctRef.current += 1;
    void answer(isCorrect);
    setTimeout(() => {
      setPicked(null);
      if (index + 1 >= rounds.length) {
        setDone(true);
        finish();
      } else {
        setIndex(index + 1);
      }
    }, 1600);
  };

  if (done) {
    return (
      <CelebrationScreen
        heading={t('celebrationHeading')}
        subheading={t('celebrationSubheading', {
          correct: correctRef.current,
          total: rounds.length,
        })}
        mode="counter-quiz"
        onExit={() => router.push('/review')}
      />
    );
  }

  return (
    <GameShell
      title={t('title')}
      emoji="🧮"
      howTo={t('howTo')}
      current={index}
      total={rounds.length}
      comboCount={comboCount}
      onQuit={async () => {
        await finish();
        router.push('/review');
      }}
    >
      <Box sx={{ textAlign: 'center', mb: 3 }}>
        <Typography sx={{ fontFamily: (th) => th.fonts.jp, fontSize: '1.7rem' }}>
          {t(`question.${round.item.series}`)}
        </Typography>

        {/* One emoji per thing to count — the whole block is a single image to
            a screen reader ("3 apples"), never 3 separate announcements. */}
        <Box
          role="img"
          aria-label={itemLabel}
          sx={{
            mt: 2,
            mx: 'auto',
            maxWidth: 360,
            minHeight: 120,
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 1,
            p: 2,
            borderRadius: 4,
            bgcolor: alpha(brand[300], 0.12),
          }}
        >
          {Array.from({ length: round.count }, (_, i) => (
            <Box
              key={i}
              component="span"
              aria-hidden
              sx={{ fontSize: { xs: '2rem', sm: '2.4rem' }, lineHeight: 1 }}
            >
              {round.item.emoji}
            </Box>
          ))}
        </Box>

        <Typography
          variant="body2"
          sx={{ mt: 1.5, color: 'text.secondary', minHeight: 24 }}
          aria-live="polite"
        >
          {picked ? t('answerIs', { reading: round.answer, item: itemLabel }) : t('pickPrompt')}
        </Typography>
      </Box>

      {/* Answer chips */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(4, 1fr)' },
          gap: 1.5,
        }}
      >
        {round.options.map((option) => {
          const showResult = !!picked;
          const isAnswer = option === round.answer;
          const isPicked = picked === option;
          const borderColor =
            showResult && isAnswer
              ? 'success.main'
              : showResult && isPicked
                ? 'error.main'
                : alpha(brand[200], 0.7);
          const bgcolor =
            showResult && isAnswer
              ? alpha(theme.palette.success.main, 0.12)
              : showResult && isPicked
                ? alpha(theme.palette.error.main, 0.08)
                : surfaces.input;
          return (
            <ButtonBase
              key={option}
              disabled={showResult}
              onClick={() => handlePick(option)}
              sx={{
                p: 1.5,
                borderRadius: 3,
                border: '2px solid',
                borderColor,
                bgcolor,
                color: 'text.primary',
                transition: 'all 0.15s',
                '&.Mui-disabled': { color: 'text.primary' },
                '&:hover': { borderColor: brand[500], bgcolor: alpha(brand[300], 0.2) },
              }}
            >
              <Typography sx={{ fontFamily: (th) => th.fonts.jp, fontSize: '1.2rem' }}>
                {option}
              </Typography>
            </ButtonBase>
          );
        })}
      </Box>
    </GameShell>
  );
}
