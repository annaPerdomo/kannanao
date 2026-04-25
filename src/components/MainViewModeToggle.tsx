'use client';
import { Box, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';

interface Props {
  value: 'hiragana' | 'kanji';
  onChange: (mode: 'hiragana' | 'kanji') => void;
}

export function MainModeToggle({ value, onChange }: Props) {
  const { palette } = useTheme();
  const { brand, accent } = palette;

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
        Test with:
      </Typography>
      <ToggleButtonGroup
        value={value}
        exclusive
        onChange={(_, v) => {
          if (v) onChange(v);
        }}
        size="small"
        sx={{
          '& .MuiToggleButton-root': {
            px: 2,
            py: 0.5,
            fontWeight: 700,
            fontSize: '0.85rem',
            border: `1.5px solid ${alpha(brand[300], 0.5)}`,
            color: 'text.secondary',
            '&.Mui-selected': {
              background: `linear-gradient(90deg, ${alpha(brand[100], 0.8)}, ${alpha(accent[100], 0.8)})`,
              color: brand[700],
              borderColor: alpha(brand[300], 0.7),
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
