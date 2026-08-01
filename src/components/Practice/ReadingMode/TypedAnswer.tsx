'use client';
import { Button, Stack, TextField } from '@mui/material';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toKana } from 'wanakana';

interface TypedAnswerProps {
  /** Answered already: the field keeps the answer visible but goes read-only. */
  locked: boolean;
  onSubmit: (guess: string) => void;
}

export function TypedAnswer({ locked, onSubmit }: TypedAnswerProps) {
  const t = useTranslations('Practice.readingMode');
  const [value, setValue] = useState('');

  const submit = () => {
    if (!locked && value.trim()) onSubmit(value);
  };

  return (
    <Stack direction="row" spacing={1.5} alignItems="center" sx={{ maxWidth: 420, mx: 'auto' }}>
      <TextField
        value={value}
        // IMEMode converts romaji to kana as they type, and leaves a half-typed
        // syllable ("ky") alone until it resolves — so no Japanese keyboard needed.
        onChange={(e) => setValue(toKana(e.target.value, { IMEMode: true }))}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit();
        }}
        label={t('typedLabel')}
        placeholder={t('typedPlaceholder')}
        disabled={locked}
        fullWidth
        size="small"
        autoFocus
        slotProps={{
          htmlInput: { lang: 'ja', autoCapitalize: 'off', autoCorrect: 'off', spellCheck: false },
        }}
      />
      {!locked && (
        <Button
          variant="contained"
          onClick={submit}
          disabled={!value.trim()}
          sx={{ flexShrink: 0 }}
        >
          {t('check')}
        </Button>
      )}
    </Stack>
  );
}
