'use client';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useTheme, alpha } from '@mui/material/styles';
import { DAY_LABELS_SHORT, DAY_INDEX_TO_JS } from './helpers';

interface FrequencyPickerProps {
  value: number[];
  onChange: (days: number[]) => void;
}

export function FrequencyPicker({ value, onChange }: FrequencyPickerProps) {
  const theme = useTheme();
  const { brand, accent } = theme.palette;

  function toggleDay(jsDay: number) {
    const next = value.includes(jsDay)
      ? value.filter((d) => d !== jsDay)
      : [...value, jsDay];
    onChange(next);
  }

  return (
    <Stack spacing={0.5}>
      <Stack direction="row" alignItems="center" spacing={0.75}>
        <Typography sx={{ fontSize: '0.68rem', fontWeight: 800, color: value.length > 0 ? brand[600] : 'text.disabled' }}>
          {value.length > 0 ? '🔁 Repeats on:' : '📅 One-time task'}
        </Typography>
        {value.length === 0 && (
          <Typography sx={{ fontSize: '0.62rem', color: 'text.disabled', fontStyle: 'italic' }}>
            tap a day to repeat
          </Typography>
        )}
      </Stack>
      <Stack direction="row" spacing={0.5} alignItems="center">
      {DAY_LABELS_SHORT.map((label, i) => {
        const jsDay = DAY_INDEX_TO_JS[i];
        const active = value.includes(jsDay);
        return (
          <Box
            key={i}
            component="button"
            onClick={() => toggleDay(jsDay)}
            sx={{
              width: 28, height: 28, borderRadius: '50%',
              border: '2px solid',
              borderColor: active ? brand[400] : alpha(brand[200], 0.5),
              background: active
                ? `linear-gradient(135deg, ${brand[300]}, ${accent[200]})`
                : alpha(brand[50], 0.7),
              color: active ? brand[800] : alpha(brand[400], 0.5),
              fontSize: '0.7rem', fontWeight: 800, cursor: 'pointer',
              transition: 'all 0.2s ease',
              '&:hover': {
                transform: 'scale(1.18)',
                borderColor: brand[400],
                boxShadow: `0 2px 8px ${alpha(brand[300], 0.3)}`,
              },
            }}
          >
            {label}
          </Box>
        );
      })}
      </Stack>
    </Stack>
  );
}
