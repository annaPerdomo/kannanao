'use client';
import Box from '@mui/material/Box';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';

import { HIRAGANA_SETS, type KanaSet, KATAKANA_SETS } from '@/lib/kanaCurriculum';

interface KanaSetPickerProps {
  value: string | null;
  onChange: (setId: string) => void;
}

export function KanaSetPicker({ value, onChange }: KanaSetPickerProps) {
  const theme = useTheme();
  const t = useTranslations('Group.createAssignment');
  const { brand } = theme.palette;

  const group = (heading: string, sets: KanaSet[]) => (
    <Box key={heading}>
      <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: brand[600], mb: 0.5 }}>
        {heading}
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
        {sets.map((set) => {
          const selected = value === set.id;
          const label = set.entries.map((e) => e.kana).join(' · ');
          return (
            <Box
              key={set.id}
              role="button"
              tabIndex={0}
              aria-pressed={selected}
              onClick={() => onChange(set.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onChange(set.id);
                }
              }}
              sx={{
                px: 1.25,
                py: 0.6,
                borderRadius: 2,
                border: `1.5px solid ${selected ? brand[500] : alpha(brand[300], 0.4)}`,
                bgcolor: selected ? alpha(brand[100], 0.8) : 'transparent',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                '&:hover': { borderColor: brand[400] },
              }}
            >
              <Typography sx={{ fontSize: '0.85rem', fontWeight: 600, color: brand[800] }}>
                {label}
              </Typography>
            </Box>
          );
        })}
      </Box>
    </Box>
  );

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5,
        maxHeight: 260,
        overflowY: 'auto',
        pr: 0.5,
      }}
    >
      {group(t('hiragana'), HIRAGANA_SETS)}
      {group(t('katakana'), KATAKANA_SETS)}
    </Box>
  );
}
