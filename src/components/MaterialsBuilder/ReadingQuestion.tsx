'use client';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import { useTranslations } from 'next-intl';

import { KANA_READING_ANSWERS, type KanaReadingAnswer } from '@/lib/kanaGaps';

import type { LessonSetForm } from './constants';

interface ReadingQuestionProps {
  value: LessonSetForm['readingLevel'];
  onChange: (readingLevel: LessonSetForm['readingLevel']) => void;
  kanji: KanaReadingAnswer;
  onKanjiChange: (kanjiLevel: KanaReadingAnswer) => void;
}

/** Request-scoped, like the level: what the group can read decides which rows a plan carries. */
export function ReadingQuestion({ value, onChange, kanji, onKanjiChange }: ReadingQuestionProps) {
  const t = useTranslations('Materials');

  const select = (
    label: string,
    answer: KanaReadingAnswer,
    onAnswer: (answer: KanaReadingAnswer) => void,
    helperText?: string,
  ) => (
    <TextField
      select
      label={label}
      value={answer}
      helperText={helperText}
      onChange={(e) => onAnswer(e.target.value as KanaReadingAnswer)}
    >
      {KANA_READING_ANSWERS.map((option) => (
        <MenuItem key={option} value={option}>
          {t(`readingAnswer.${option}`)}
        </MenuItem>
      ))}
    </TextField>
  );

  return (
    <>
      {select(t('readingHiraganaLabel'), value.hiragana, (hiragana) =>
        onChange({ ...value, hiragana }),
      )}
      {select(t('readingKatakanaLabel'), value.katakana, (katakana) =>
        onChange({ ...value, katakana }),
      )}
      {select(t('readingKanjiLabel'), kanji, onKanjiChange, t('readingKanjiHint'))}
    </>
  );
}
