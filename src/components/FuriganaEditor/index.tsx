'use client';
import AutoFixHighRoundedIcon from '@mui/icons-material/AutoFixHighRounded';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';

import FuriganaText from '@/components/FuriganaText';
import { parseFurigana, stripFurigana } from '@/lib/furigana';
import { readingGroups, reflowReadings, segmentsToMarkup, withReading } from '@/lib/furiganaEdit';
import { formatFurigana } from '@/services/api';

import { ReadingGroupInput } from './ReadingGroupInput';

const stripBraceChars = (s: string) => s.replace(/[{|}]/g, '');

export interface FuriganaEditorProps {
  value: string;
  onChange: (markup: string) => void;
  label?: string;
  autoFill?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
}

export function FuriganaEditor({
  value,
  onChange,
  label,
  autoFill = true,
  disabled,
  autoFocus,
}: FuriganaEditorProps) {
  const t = useTranslations('FuriganaEditor');
  const [filling, setFilling] = useState(false);
  const [fillError, setFillError] = useState(false);
  const mounted = useRef(true);
  useEffect(
    () => () => {
      mounted.current = false;
    },
    [],
  );

  const plain = stripFurigana(value);
  // Reflow over the plain text, not parseFurigana(value) alone, so a run whose
  // reading was just cleared to '' keeps its segment (and input) instead of vanishing.
  const segments = reflowReadings(plain, parseFurigana(value));
  const groups = readingGroups(segments);

  const handleSentenceChange = (next: string) => {
    onChange(segmentsToMarkup(reflowReadings(stripBraceChars(next), segments)));
  };

  const handleReadingChange = (index: number, reading: string) => {
    onChange(segmentsToMarkup(withReading(segments, index, stripBraceChars(reading))));
  };

  const handleAutoFill = async () => {
    setFilling(true);
    setFillError(false);
    try {
      const [result] = await formatFurigana([value]);
      if (mounted.current && typeof result === 'string') onChange(result);
    } catch {
      if (mounted.current) setFillError(true);
    } finally {
      if (mounted.current) setFilling(false);
    }
  };

  return (
    <Stack spacing={1.5}>
      <TextField
        label={label ?? t('sentence')}
        value={plain}
        onChange={(e) => handleSentenceChange(e.target.value)}
        multiline
        fullWidth
        disabled={disabled}
        autoFocus={autoFocus}
      />

      {plain && (
        <Box
          role="status"
          aria-live="polite"
          sx={{ bgcolor: 'background.default', borderRadius: 2, p: 1.5 }}
        >
          <FuriganaText text={value} showFurigana />
        </Box>
      )}

      <Stack spacing={0.75}>
        <Typography variant="caption" color="text.secondary">
          {t('readings')}
        </Typography>
        {groups.length === 0 ? (
          <Typography variant="caption" color="text.secondary">
            {t('noKanji')}
          </Typography>
        ) : (
          <Stack direction="row" flexWrap="wrap" gap={1}>
            {groups.map((group, i) => (
              <ReadingGroupInput
                key={i}
                kanji={group.kanji}
                reading={group.reading}
                disabled={disabled}
                onChange={(reading) => handleReadingChange(i, reading)}
              />
            ))}
          </Stack>
        )}
      </Stack>

      {autoFill && (
        <Box>
          <Button
            variant="outlined"
            size="small"
            startIcon={filling ? <CircularProgress size={16} /> : <AutoFixHighRoundedIcon />}
            onClick={() => void handleAutoFill()}
            disabled={disabled || filling || !plain}
          >
            {t('autoFill')}
          </Button>
          {fillError && (
            <Alert severity="error" sx={{ mt: 1 }}>
              {t('autoFillFailed')}
            </Alert>
          )}
        </Box>
      )}
    </Stack>
  );
}
