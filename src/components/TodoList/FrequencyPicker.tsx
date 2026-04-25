'use client';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import { alpha, useTheme } from '@mui/material/styles';

import { DAY_INDEX_TO_JS, DAY_LABELS } from './helpers';

interface FrequencyPickerProps {
  value: number[];
  onChange: (days: number[]) => void;
  repeatUntilDone: boolean;
  onRepeatUntilDoneChange: (val: boolean) => void;
  showRepeatUntilDone?: boolean;
}

export function FrequencyPicker({
  value,
  onChange,
  repeatUntilDone,
  onRepeatUntilDoneChange,
  showRepeatUntilDone = true,
}: FrequencyPickerProps) {
  const theme = useTheme();
  const { brand, accent } = theme.palette;

  const presets = [
    ...(showRepeatUntilDone
      ? [{ label: 'Until done', isUntilDone: true, days: [] as number[] }]
      : []),
    { label: 'Every day', isUntilDone: false, days: [0, 1, 2, 3, 4, 5, 6] },
    { label: 'Weekdays', isUntilDone: false, days: [1, 2, 3, 4, 5] },
    { label: 'Weekends', isUntilDone: false, days: [0, 6] },
  ];

  function toggleDay(jsDay: number) {
    const next = value.includes(jsDay) ? value.filter((d) => d !== jsDay) : [...value, jsDay];
    onChange(next);
  }

  function isDaysPresetActive(days: number[]) {
    return !repeatUntilDone && days.length === value.length && days.every((d) => value.includes(d));
  }

  function handlePreset(isUntilDone: boolean, days: number[]) {
    if (isUntilDone) {
      const turningOn = !repeatUntilDone;
      onRepeatUntilDoneChange(turningOn);
      if (turningOn) onChange([]);
    } else {
      if (repeatUntilDone) onRepeatUntilDoneChange(false);
      onChange(isDaysPresetActive(days) ? [] : days);
    }
  }

  return (
    <Stack spacing={0.6}>
      {/* Preset chips row */}
      <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
        {presets.map(({ label, isUntilDone, days }) => {
          const active = isUntilDone ? repeatUntilDone : isDaysPresetActive(days);
          return (
            <Box
              key={label}
              component="button"
              onClick={() => handlePreset(isUntilDone, days)}
              sx={{
                height: 24,
                px: 1,
                borderRadius: 2,
                border: '2px solid',
                borderColor: active ? accent[400] : alpha(brand[300], 0.7),
                background: active
                  ? `linear-gradient(135deg, ${accent[200]}, ${brand[200]})`
                  : alpha(brand[50], 0.9),
                color: active ? brand[800] : brand[500],
                fontSize: '0.65rem',
                fontWeight: 800,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                '&:hover': { borderColor: accent[400], transform: 'scale(1.05)' },
              }}
            >
              {label}
            </Box>
          );
        })}
      </Stack>

      {/* Individual day buttons — hidden when "Until done" is active */}
      {!repeatUntilDone && (
        <Stack direction="row" spacing={0.4} alignItems="center" flexWrap="wrap" useFlexGap>
          {DAY_LABELS.map((label, i) => {
            const jsDay = DAY_INDEX_TO_JS[i];
            const active = value.includes(jsDay);
            return (
              <Box
                key={i}
                component="button"
                onClick={() => toggleDay(jsDay)}
                sx={{
                  height: 28,
                  px: 0.85,
                  borderRadius: 2,
                  border: '2px solid',
                  borderColor: active ? brand[400] : alpha(brand[300], 0.7),
                  background: active
                    ? `linear-gradient(135deg, ${brand[300]}, ${accent[200]})`
                    : alpha(brand[50], 0.9),
                  color: active ? brand[800] : brand[500],
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    transform: 'scale(1.12)',
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
      )}
    </Stack>
  );
}
