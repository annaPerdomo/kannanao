'use client';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import { useTranslations } from 'next-intl';

import { KANA_READING_ANSWERS, type KanaReadingAnswer } from '@/lib/kanaGaps';

import type { LessonSetForm } from './constants';

interface ReadingQuestionProps {
  value: LessonSetForm['readingLevel'];
  onChange: (readingLevel: LessonSetForm['readingLevel']) => void;
}

/** Request-scoped, like the level: what the group can read decides which rows a plan carries. */
export function ReadingQuestion({ value, onChange }: ReadingQuestionProps) {
  const t = useTranslations('Materials');

  const select = (track: 'hiragana' | 'katakana', label: string) => (
    <TextField
      select
      label={label}
      value={value[track]}
      onChange={(e) => onChange({ ...value, [track]: e.target.value as KanaReadingAnswer })}
    >
      {KANA_READING_ANSWERS.map((answer) => (
        <MenuItem key={answer} value={answer}>
          {t(`readingAnswer.${answer}`)}
        </MenuItem>
      ))}
    </TextField>
  );

  return (
    <>
      {select('hiragana', t('readingHiraganaLabel'))}
      {select('katakana', t('readingKatakanaLabel'))}
    </>
  );
}
