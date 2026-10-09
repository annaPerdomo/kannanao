'use client';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { StyledDialog } from '@/components/StyledDialog';
import { type KanaTrack, setCharacters, setsForTrack } from '@/lib/kanaCurriculum';
import { LESSON_KANA_MAX, sortKanaSets } from '@/lib/lessonKana';

interface KanaRowPickerProps {
  open: boolean;
  onClose: () => void;
  selected: string[];
  onDone: (ids: string[]) => void;
}

const TRACKS: { track: KanaTrack; titleKey: 'soundsHiragana' | 'soundsKatakana' }[] = [
  { track: 'hiragana', titleKey: 'soundsHiragana' },
  { track: 'katakana', titleKey: 'soundsKatakana' },
];

export function KanaRowPicker({ open, onClose, selected, onDone }: KanaRowPickerProps) {
  const t = useTranslations('Materials.handoutPage');
  const tCommon = useTranslations('Common');
  const [picked, setPicked] = useState<string[]>(selected);

  useEffect(() => {
    if (open) setPicked(selected);
  }, [open, selected]);

  const atMax = picked.length >= LESSON_KANA_MAX;

  const toggle = (id: string) => {
    setPicked((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= LESSON_KANA_MAX) return prev;
      return [...prev, id];
    });
  };

  const handleDone = () => {
    onDone(sortKanaSets(picked));
    onClose();
  };

  return (
    <StyledDialog
      open={open}
      onClose={onClose}
      title={t('soundsBrowse')}
      titleId="kana-row-picker-title"
      maxWidth="sm"
      actions={
        <Button
          variant="contained"
          onClick={handleDone}
          sx={{ textTransform: 'none', fontWeight: 700 }}
        >
          {tCommon('done')}
        </Button>
      }
    >
      <Stack spacing={2}>
        {atMax && (
          <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
            {t('soundsMax', { max: LESSON_KANA_MAX })}
          </Typography>
        )}
        {TRACKS.map(({ track, titleKey }, index) => (
          <Box key={track}>
            {index > 0 && <Divider sx={{ mb: 2 }} />}
            <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', mb: 1 }}>
              {t(titleKey)}
            </Typography>
            <Stack direction="row" sx={{ gap: 0.75, flexWrap: 'wrap' }}>
              {setsForTrack(track).map((set) => {
                const isSelected = picked.includes(set.id);
                return (
                  <Tooltip key={set.id} title={setCharacters(set.id) ?? ''} enterTouchDelay={0}>
                    <Chip
                      label={set.label}
                      onClick={() => toggle(set.id)}
                      color={isSelected ? 'primary' : 'default'}
                      variant={isSelected ? 'filled' : 'outlined'}
                      disabled={!isSelected && atMax}
                      aria-pressed={isSelected}
                      sx={{ fontWeight: 700 }}
                    />
                  </Tooltip>
                );
              })}
            </Stack>
          </Box>
        ))}
      </Stack>
    </StyledDialog>
  );
}
