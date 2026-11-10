'use client';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';

import type { Flashcard } from '@/types/flashcard';

import { ChoiceGrid } from '../ChoiceGrid';
import { MiniCalendar } from './MiniCalendar';
import type { PickQuestion } from './questions';

interface PickPromptProps {
  card: Flashcard;
  question: PickQuestion;
  selected: string | null;
  onSelect: (choice: string) => void;
}

export function PickPrompt({ card, question, selected, onSelect }: PickPromptProps) {
  const t = useTranslations('Practice.readingPickMode');
  const onCalendar = question.weekday !== null;

  return (
    <>
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          gap: 1.5,
          py: { xs: 1.5, sm: 2 },
        }}
      >
        <Typography
          variant="overline"
          sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: 1 }}
        >
          {onCalendar ? t('calendarPrompt') : t('prompt')}
        </Typography>
        {onCalendar ? (
          <MiniCalendar
            highlight={question.weekday!}
            label={t('calendarAria', { word: card.word })}
          />
        ) : (
          <Typography
            lang="ja"
            sx={{ fontSize: { xs: '3rem', sm: '3.75rem' }, fontWeight: 700, lineHeight: 1.2 }}
          >
            {card.word}
          </Typography>
        )}
        <Typography sx={{ color: 'text.secondary', minHeight: '1.5em' }}>
          {selected ? card.meaning : ''}
        </Typography>
      </Box>

      <Box sx={{ flexShrink: 0 }} lang="ja">
        <ChoiceGrid
          choices={question.choices}
          correct={question.answer}
          selected={selected}
          onSelect={onSelect}
        />
      </Box>
    </>
  );
}
