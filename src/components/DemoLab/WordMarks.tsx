'use client';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import { alpha, type Theme, useTheme } from '@mui/material/styles';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

import { SectionCard } from '@/components/Group/SectionCard';
import { type CardStrength, cardStrength } from '@/lib/cardStrength';
import { DEMO_CARDS, type DemoSimulation } from '@/lib/demo';

export type WordMark = 'right' | 'wrong';

interface WordMarksProps {
  sim: DemoSimulation;
  marks: Record<string, WordMark>;
  onMark: (cardId: string, mark: WordMark) => void;
  onFinish: () => void;
  finished: boolean;
}

function strengthColor(strength: CardStrength, theme: Theme): string {
  if (strength === 'strong') return theme.palette.success.main;
  if (strength === 'learning') return theme.palette.warning.main;
  return theme.palette.text.disabled;
}

export function WordMarks({ sim, marks, onMark, onFinish, finished }: WordMarksProps) {
  const t = useTranslations('DemoLab');
  const tStrength = useTranslations('Group.handoutDetail.strength');
  const theme = useTheme();

  const cardsById = useMemo(() => new Map(DEMO_CARDS.map((card) => [card.id, card])), []);
  const progressById = useMemo(
    () => new Map(sim.progress.map((row) => [row.cardId, row])),
    [sim.progress],
  );

  const reviewIds = sim.today.reviewCardIds;
  const sessionIds = sim.today.sessionCardIds.filter((id) => !reviewIds.includes(id));
  const allIds = [...reviewIds, ...sessionIds];

  const renderWord = (cardId: string) => {
    const card = cardsById.get(cardId);
    if (!card) return null;
    const strength = cardStrength(progressById.get(cardId));
    const mark: WordMark = marks[cardId] ?? 'right';

    return (
      <Stack
        key={cardId}
        direction="row"
        spacing={1}
        alignItems="center"
        justifyContent="space-between"
        sx={{ py: 0.75, flexWrap: 'wrap', gap: 0.5 }}
      >
        <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
          <Typography sx={{ fontWeight: 700, color: 'text.primary' }}>{card.word}</Typography>
          <Chip
            size="small"
            label={tStrength(strength)}
            sx={{ color: 'text.primary', bgcolor: alpha(strengthColor(strength, theme), 0.15) }}
          />
        </Stack>
        <ToggleButtonGroup
          value={mark}
          exclusive
          size="small"
          disabled={finished}
          aria-label={t('wordAria', { word: card.word })}
          onChange={(_, value: WordMark | null) => {
            if (value) onMark(cardId, value);
          }}
        >
          <ToggleButton value="right" sx={{ textTransform: 'none' }}>
            {t('answerRight')}
          </ToggleButton>
          <ToggleButton value="wrong" sx={{ textTransform: 'none' }}>
            {t('answerWrong')}
          </ToggleButton>
        </ToggleButtonGroup>
      </Stack>
    );
  };

  return (
    <SectionCard title={t('reviewWordsHeading')}>
      {reviewIds.length > 0 && (
        <Stack divider={<Divider flexItem />}>{reviewIds.map(renderWord)}</Stack>
      )}

      {sessionIds.length > 0 && (
        <>
          <Typography
            sx={{ fontWeight: 700, fontSize: '0.85rem', color: 'text.primary', mt: 2, mb: 0.5 }}
          >
            {t('sessionWordsHeading')}
          </Typography>
          <Stack divider={<Divider flexItem />}>{sessionIds.map(renderWord)}</Stack>
        </>
      )}

      <Button
        variant="contained"
        disabled={finished || allIds.length === 0}
        onClick={onFinish}
        sx={{ mt: 2, textTransform: 'none', fontWeight: 700 }}
      >
        {t('finish')}
      </Button>
      <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', mt: 0.75 }}>
        {t('finishNote')}
      </Typography>
    </SectionCard>
  );
}
