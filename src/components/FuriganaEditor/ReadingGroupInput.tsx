'use client';
import Box from '@mui/material/Box';
import InputBase from '@mui/material/InputBase';
import { alpha } from '@mui/material/styles';
import { useTranslations } from 'next-intl';
import { Fragment } from 'react';

import { SeamButton } from './SeamButton';
import { type FuriganaSize, kanjiSx, readingInputSx, type ReadingTone } from './styles';

interface ReadingGroupInputProps {
  kanji: string;
  reading: string;
  tone: ReadingTone;
  onChange: (reading: string) => void;
  onSplit: (at: number, anchor: HTMLElement) => void;
  disabled?: boolean;
  size: FuriganaSize;
}

export function ReadingGroupInput({
  kanji,
  reading,
  tone,
  onChange,
  onSplit,
  disabled,
  size,
}: ReadingGroupInputProps) {
  const t = useTranslations('FuriganaEditor');
  const chars = Array.from(kanji);

  return (
    <Box
      sx={(theme) => ({
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 0.25,
        px: 0.375,
        pt: 0.25,
        borderRadius: '8px',
        transition: 'background-color 0.15s ease',
        '&:focus-within': { bgcolor: alpha(theme.palette.brand[300], 0.16) },
      })}
    >
      <InputBase
        value={reading}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={t('readingHint')}
        inputProps={{
          'aria-label': t('readingFor', { kanji }),
          'aria-invalid': tone === 'error',
          spellCheck: false,
          autoComplete: 'off',
          size: 1,
          'data-reading-input': true,
        }}
        sx={readingInputSx(size, reading.length, tone)}
      />
      <Box sx={{ display: 'flex', alignItems: 'flex-end' }}>
        {chars.map((char, i) => (
          <Fragment key={i}>
            {i > 0 && (
              <SeamButton
                kind="split"
                left={chars.slice(0, i).join('')}
                right={chars.slice(i).join('')}
                onClick={(anchor) => onSplit(i, anchor)}
                size={size}
                disabled={disabled}
              />
            )}
            <Box component="span" aria-hidden sx={kanjiSx(size)}>
              {char}
            </Box>
          </Fragment>
        ))}
      </Box>
    </Box>
  );
}
