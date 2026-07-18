'use client';

import { alpha, Box, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useMemo, useRef, useState } from 'react';

import { CelebrationScreen } from '@/components/Practice/CelebrationScreen';
import { SpeakButton } from '@/components/SpeakButton';
import { useGameSession } from '@/hooks/useGameSession';
import { buildQuizOptions, type QuizOption, shuffle } from '@/lib/reviewGames';

import { QA_ITEMS } from './data';
import { GameShell } from './GameShell';

export function QuestionQuest() {
  const theme = useTheme();
  const { brand, surfaces } = theme.palette;
  const router = useRouter();
  const t = useTranslations('Games.questionQuest');
  const { answer, finish, comboCount } = useGameSession('question-quiz');

  const items = useMemo(() => shuffle(QA_ITEMS), []);
  const [index, setIndex] = useState(0);
  const [done, setDone] = useState(false);
  const [picked, setPicked] = useState<QuizOption | null>(null);
  const correctRef = useRef(0);

  const item = items[index];
  const options = useMemo(
    () => buildQuizOptions(items[index].correct, items[index].distractors),
    [items, index],
  );

  const handlePick = (opt: QuizOption) => {
    if (picked) return;
    setPicked(opt);
    if (opt.correct) correctRef.current += 1;
    void answer(opt.correct);
    setTimeout(() => {
      setPicked(null);
      if (index + 1 >= items.length) {
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
          total: items.length,
        })}
        mode="question-quiz"
        onExit={() => router.push('/review')}
      />
    );
  }

  return (
    <GameShell
      title={t('title')}
      emoji="❓"
      howTo={t('howTo')}
      current={index}
      total={items.length}
      comboCount={comboCount}
      onQuit={async () => {
        await finish();
        router.push('/review');
      }}
    >
      {/* Question */}
      <Box sx={{ textAlign: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
          <Typography sx={{ fontFamily: (t) => t.fonts.jp, fontSize: '1.7rem' }}>
            {item.question}
          </Typography>
          <SpeakButton text={item.question} iconSize="1rem" />
        </Box>
        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
          {picked ? item.questionEn : t('pickPrompt')}
        </Typography>
      </Box>

      {/* Options */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {options.map((opt) => {
          const showResult = !!picked;
          const isPicked = picked?.text === opt.text;
          const borderColor =
            showResult && opt.correct
              ? 'success.main'
              : showResult && isPicked && !opt.correct
                ? 'error.main'
                : alpha(brand[200], 0.7);
          const bgcolor =
            showResult && opt.correct
              ? alpha(theme.palette.success.main, 0.12)
              : showResult && isPicked && !opt.correct
                ? alpha(theme.palette.error.main, 0.08)
                : surfaces.input;
          return (
            <Box
              key={opt.text}
              role="button"
              tabIndex={picked ? -1 : 0}
              aria-disabled={!!picked || undefined}
              onClick={() => handlePick(opt)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handlePick(opt);
                }
              }}
              sx={{
                p: 2,
                borderRadius: 3,
                border: '2px solid',
                borderColor,
                bgcolor,
                cursor: picked ? 'default' : 'pointer',
                textAlign: 'center',
                transition: 'all 0.15s',
                '&:hover': !picked
                  ? { borderColor: brand[500], bgcolor: alpha(brand[300], 0.2) }
                  : {},
              }}
            >
              <Typography sx={{ fontFamily: (t) => t.fonts.jp, fontSize: '1.25rem' }}>
                {opt.text}
              </Typography>
              {showResult && opt.correct && (
                <Typography variant="caption" sx={{ color: 'success.main', fontWeight: 600 }}>
                  {item.correctEn}
                </Typography>
              )}
            </Box>
          );
        })}
      </Box>
    </GameShell>
  );
}
