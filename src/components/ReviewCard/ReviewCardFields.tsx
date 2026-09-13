'use client';

import Box from '@mui/material/Box';
import { useTranslations } from 'next-intl';

import { FuriganaField } from '@/components/FuriganaField';

import type { ReviewCardValue } from './ReviewCardRow';
import { SmallField } from './SmallField';

interface ReviewCardFieldsProps {
  value: ReviewCardValue;
  onChange: (patch: Partial<ReviewCardValue>) => void;
  disabled?: boolean;
  labels?: { word?: string };
}

export function ReviewCardFields({ value, onChange, disabled, labels }: ReviewCardFieldsProps) {
  const t = useTranslations('ReviewCard');

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
        <SmallField
          label={labels?.word ?? t('word')}
          value={value.word}
          onChange={(e) => onChange({ word: e.target.value })}
          disabled={disabled}
        />
        <SmallField
          label={t('reading')}
          value={value.reading}
          onChange={(e) => onChange({ reading: e.target.value })}
          disabled={disabled}
        />
      </Box>
      <SmallField
        label={t('meaning')}
        value={value.meaning}
        onChange={(e) => onChange({ meaning: e.target.value })}
        disabled={disabled}
      />
      <FuriganaField
        value={value.exampleJp}
        onChange={(exampleJp) => onChange({ exampleJp })}
        label={t('exampleJp')}
        disabled={disabled}
      />
      <SmallField
        label={t('exampleEn')}
        value={value.exampleEn}
        onChange={(e) => onChange({ exampleEn: e.target.value })}
        multiline
        disabled={disabled}
      />
    </Box>
  );
}
