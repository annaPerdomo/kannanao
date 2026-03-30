// components/TestModeToggle.tsx
'use client';
import { ToggleButton, ToggleButtonGroup, Typography, Box } from '@mui/material';

interface Props {
  value: 'hiragana' | 'kanji';
  onChange: (mode: 'hiragana' | 'kanji') => void;
}

export function MainModeToggle({ value, onChange }: Props) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
        Test with:
      </Typography>
      <ToggleButtonGroup
        value={value}
        exclusive
        onChange={(_, v) => { if (v) onChange(v); }}
        size="small"
        sx={{
          '& .MuiToggleButton-root': {
            px: 2,
            py: 0.5,
            fontWeight: 700,
            fontSize: '0.85rem',
            border: '1.5px solid rgba(249,168,212,0.5)',
            color: 'text.secondary',
            '&.Mui-selected': {
              background: 'linear-gradient(90deg, #fce7f3, #ede9fe)',
              color: '#be185d',
              borderColor: 'rgba(249,168,212,0.7)',
            },
          },
        }}
      >
        <ToggleButton value="hiragana">ひらがな</ToggleButton>
        <ToggleButton value="kanji">漢字</ToggleButton>
      </ToggleButtonGroup>
    </Box>
  );
}