'use client';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Popover from '@mui/material/Popover';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';
import { useId } from 'react';

import { readingCutOptions, type ReadingGroup } from '@/lib/furiganaEdit';
import { isUsualReading, type KanjiReadingDict, splitReading } from '@/lib/kanjiReadings';

interface SplitPickerProps {
  group: ReadingGroup;
  at: number;
  anchor: HTMLElement;
  dict: KanjiReadingDict | null;
  onPick: (readings: [string, string]) => void;
  onClose: () => void;
}

function plausible(kanji: string, reading: string, dict: KanjiReadingDict | null) {
  if (!dict) return false;
  return Array.from(kanji).length === 1
    ? isUsualReading(kanji, reading, dict) === true
    : splitReading(kanji, reading, dict) !== null;
}

export function SplitPicker({ group, at, anchor, dict, onPick, onClose }: SplitPickerProps) {
  const t = useTranslations('FuriganaEditor');
  const titleId = useId();
  const chars = Array.from(group.kanji);
  const left = chars.slice(0, at).join('');
  const right = chars.slice(at).join('');
  const options = readingCutOptions(group.reading)
    .map((cut) => ({
      cut,
      match: plausible(left, cut[0], dict) && plausible(right, cut[1], dict),
    }))
    .sort((a, b) => Number(b.match) - Number(a.match));

  return (
    <Popover
      open
      anchorEl={anchor}
      onClose={onClose}
      disableRestoreFocus
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      transformOrigin={{ vertical: 'top', horizontal: 'center' }}
      slotProps={{
        paper: {
          role: 'dialog',
          'aria-labelledby': titleId,
          sx: { p: 1.5, borderRadius: '12px', minWidth: 220 },
        },
      }}
    >
      <Typography variant="subtitle2" id={titleId} sx={{ mb: 1, fontWeight: 800 }}>
        {t('splitWhere', { kanji: left })}
      </Typography>
      <Stack spacing={0.75} role="group" aria-labelledby={titleId}>
        {options.map(({ cut, match }) => (
          <Button
            key={cut[0]}
            variant="outlined"
            onClick={() => onPick(cut)}
            endIcon={match ? <CheckCircleRoundedIcon color="success" /> : undefined}
            aria-label={`${left} ${cut[0]}, ${right} ${cut[1]}${match ? ` (${t('dictionaryMatch')})` : ''}`}
            sx={{ justifyContent: 'space-between', textTransform: 'none', gap: 1.5 }}
          >
            <Box component="span" sx={{ display: 'flex', gap: 1.5 }}>
              <SplitSide kanji={left} reading={cut[0]} />
              <SplitSide kanji={right} reading={cut[1]} />
            </Box>
          </Button>
        ))}
        <Button size="small" onClick={() => onPick(['', ''])} sx={{ alignSelf: 'flex-start' }}>
          {t('splitTypeMyself')}
        </Button>
      </Stack>
    </Popover>
  );
}

function SplitSide({ kanji, reading }: ReadingGroup) {
  return (
    <Box
      component="span"
      sx={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center' }}
    >
      <Box component="span" sx={{ fontSize: '0.72rem', fontWeight: 700, lineHeight: 1.2 }}>
        {reading}
      </Box>
      <Box
        component="span"
        sx={{ fontSize: '1.1rem', fontWeight: 700, lineHeight: 1.3, color: 'text.primary' }}
      >
        {kanji}
      </Box>
    </Box>
  );
}
