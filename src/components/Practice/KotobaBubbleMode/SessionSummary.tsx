'use client';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Collapse from '@mui/material/Collapse';
import Divider from '@mui/material/Divider';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { stripFurigana } from '@/components/FuriganaText';
import { SpeakButton } from '@/components/SpeakButton';
import type { QuestHandoff } from '@/contexts/QuestHandoffContext';
import type { PracticeSentence } from '@/types/practiceSentence';

import { NextUpCard } from '../CelebrationScreen';
import { PARTICLE_HINTS } from './constants';

interface SentenceResult {
  sentence: PracticeSentence;
  correct: boolean;
}

interface SessionSummaryProps {
  results: SentenceResult[];
  totalCorrect: number;
  total: number;
  bestStreak: number;
  handoff: QuestHandoff | null;
  onRestart: () => void;
  onExit: () => void;
}

function ResultRow({ r }: { r: SentenceResult }) {
  const t = useTranslations('Practice.kotobaBubble');
  const { brand } = useTheme().palette;
  const plain = stripFurigana(r.sentence.sentenceJp);
  return (
    <Paper
      elevation={0}
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 1.5,
        p: 2,
        borderRadius: 3,
        border: `1px solid ${alpha(r.correct ? brand[200] : '#EF4444', 0.4)}`,
        bgcolor: alpha(r.correct ? brand[50] : '#EF4444', 0.04),
      }}
    >
      {r.correct ? (
        <CheckCircleOutlineIcon sx={{ color: brand[500], fontSize: 22, mt: 0.3, flexShrink: 0 }} />
      ) : (
        <HighlightOffIcon sx={{ color: '#EF4444', fontSize: 22, mt: 0.3, flexShrink: 0 }} />
      )}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          sx={{ fontSize: '0.95rem', fontWeight: 600, color: 'text.primary', lineHeight: 1.5 }}
        >
          {plain}
        </Typography>
        <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary', lineHeight: 1.4 }}>
          {r.sentence.sentenceEn}
        </Typography>
        <Typography
          sx={{
            fontSize: '0.8rem',
            mt: 0.5,
            color: r.correct ? brand[500] : '#EF4444',
            fontWeight: 600,
          }}
        >
          {t('particleLabel', { particle: r.sentence.targetParticle })}
          {!r.correct &&
            PARTICLE_HINTS[r.sentence.targetParticle] &&
            ` — ${PARTICLE_HINTS[r.sentence.targetParticle]}`}
        </Typography>
      </Box>
      <SpeakButton text={plain} iconSize="1.1rem" />
    </Paper>
  );
}

export function SessionSummary({
  results,
  totalCorrect,
  total,
  bestStreak,
  handoff,
  onRestart,
  onExit,
}: SessionSummaryProps) {
  const t = useTranslations('Practice.kotobaBubble');
  const tCommon = useTranslations('Practice.common');
  const tQuest = useTranslations('AssignmentQuest');
  const [showCorrect, setShowCorrect] = useState(false);

  const missed = results.filter((r) => !r.correct);
  const correct = results.filter((r) => r.correct);

  return (
    <Box sx={{ py: 2 }}>
      <Box sx={{ textAlign: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 800, mb: 0.5 }}>
          {t('sentenceReview')}
        </Typography>
        <Typography color="text.secondary">
          {tCommon('correctSummary', { correct: totalCorrect, total })}
          {bestStreak >= 3 ? t('bestStreakInline', { count: bestStreak }) : ''}
        </Typography>
      </Box>

      <Stack spacing={1.5} sx={{ mb: 3 }}>
        {missed.map((r, i) => (
          <ResultRow key={r.sentence.id + i} r={r} />
        ))}

        {missed.length > 0 && (
          <Button
            onClick={() => setShowCorrect((s) => !s)}
            size="small"
            aria-expanded={showCorrect}
            aria-controls="kotoba-correct-sentences"
            sx={{ textTransform: 'none', alignSelf: 'center' }}
          >
            {t('showCorrect', { count: correct.length })}
          </Button>
        )}

        <Collapse in={missed.length === 0 || showCorrect} unmountOnExit>
          <Stack id="kotoba-correct-sentences" spacing={1.5}>
            {correct.map((r, i) => (
              <ResultRow key={r.sentence.id + i} r={r} />
            ))}
          </Stack>
        </Collapse>
      </Stack>

      <Divider sx={{ mb: 2.5 }} />

      {handoff && !handoff.final && <NextUpCard handoff={handoff} surface="page" />}

      <Stack direction="row" spacing={2} justifyContent="center" sx={{ mt: 2.5 }}>
        <Button
          variant="contained"
          onClick={onRestart}
          sx={{ borderRadius: 3, textTransform: 'none', fontWeight: 700 }}
        >
          {t('practiceAgain')}
        </Button>
        <Button
          variant="outlined"
          onClick={handoff ? handoff.onNext : onExit}
          sx={{ borderRadius: 3, textTransform: 'none' }}
        >
          {handoff?.label ?? tCommon('backToDeck')}
        </Button>
        {handoff && (
          <Button onClick={handoff.onStop} sx={{ textTransform: 'none' }}>
            {tQuest('stopForNow')}
          </Button>
        )}
      </Stack>
    </Box>
  );
}
