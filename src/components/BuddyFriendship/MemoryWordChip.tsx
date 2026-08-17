'use client';

import Box from '@mui/material/Box';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';

import FuriganaText from '@/components/FuriganaText';
import { SpeakButton } from '@/components/SpeakButton';
import type { BuddyMemoryWord } from '@/lib/buddyPhrases';
import { furiganaFromReading } from '@/lib/furigana';

interface MemoryWordChipProps {
  word: BuddyMemoryWord;
}

export function MemoryWordChip({ word }: MemoryWordChipProps) {
  const t = useTranslations('Home.buddy.friendship');
  const { brand } = useTheme().palette;

  const ruby = word.reading ? (furiganaFromReading(word.jp, word.reading) ?? word.jp) : word.jp;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        alignSelf: 'flex-start',
        maxWidth: '100%',
        px: 1.5,
        py: 0.75,
        borderRadius: 3,
        bgcolor: alpha(brand[100], 0.55),
        border: `1.5px solid ${alpha(brand[300], 0.45)}`,
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography
          component="span"
          sx={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: brand[700] }}
        >
          {t('memories.word')}
        </Typography>
        <FuriganaText
          text={ruby}
          showFurigana
          sx={{
            display: 'block',
            fontSize: '1rem',
            fontWeight: 800,
            color: 'text.primary',
            lineHeight: 1.6,
          }}
        />
        {word.en && (
          <Typography sx={{ fontSize: '0.75rem', color: 'text.primary' }}>{word.en}</Typography>
        )}
      </Box>
      <SpeakButton text={word.reading || word.jp} iconSize="1.1rem" />
    </Box>
  );
}
