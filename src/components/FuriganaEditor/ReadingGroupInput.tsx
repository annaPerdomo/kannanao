'use client';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';

import { isKana } from '@/lib/furiganaEdit';

interface ReadingGroupInputProps {
  kanji: string;
  reading: string;
  onChange: (reading: string) => void;
  disabled?: boolean;
}

export function ReadingGroupInput({ kanji, reading, onChange, disabled }: ReadingGroupInputProps) {
  const t = useTranslations('FuriganaEditor');
  const valid = isKana(reading);

  return (
    <Stack alignItems="center" spacing={0.5}>
      <Typography variant="h6" sx={{ fontFamily: (theme) => theme.fonts.jp }}>
        {kanji}
      </Typography>
      <TextField
        value={reading}
        onChange={(e) => onChange(e.target.value)}
        size="small"
        disabled={disabled}
        error={!valid}
        helperText={valid ? undefined : t('kanaOnly')}
        placeholder={t('readingHint')}
        inputProps={{ 'aria-label': t('readingFor', { kanji }) }}
        sx={{ width: 100 }}
      />
    </Stack>
  );
}
