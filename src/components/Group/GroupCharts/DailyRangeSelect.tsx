'use client';
import MenuItem from '@mui/material/MenuItem';
import Select, { type SelectChangeEvent } from '@mui/material/Select';
import { alpha, useTheme } from '@mui/material/styles';
import { useTranslations } from 'next-intl';

/** Only 14 is wired today; the API already caps at 31, so 30 slots in as a single new option later. */
export type ActivityRangeDays = 14;

const OPTIONS: ActivityRangeDays[] = [14];

interface DailyRangeSelectProps {
  value: ActivityRangeDays;
  onChange: (days: ActivityRangeDays) => void;
}

export function DailyRangeSelect({ value, onChange }: DailyRangeSelectProps) {
  const theme = useTheme();
  const { brand } = theme.palette;
  const t = useTranslations('Group.charts');

  const handleChange = (e: SelectChangeEvent<number>) => {
    onChange(Number(e.target.value) as ActivityRangeDays);
  };

  return (
    <Select
      value={value}
      onChange={handleChange}
      size="small"
      aria-label={t('rangeLabel')}
      sx={{
        fontSize: '0.78rem',
        fontWeight: 600,
        color: 'text.primary',
        borderRadius: theme.radii.sm,
        '& .MuiSelect-select': { py: 0.5, px: 1.25 },
        '& .MuiOutlinedInput-notchedOutline': { borderColor: alpha(brand[400], 0.4) },
      }}
    >
      {OPTIONS.map((days) => (
        <MenuItem key={days} value={days} sx={{ fontSize: '0.8rem' }}>
          {t('rangeLast14Days')}
        </MenuItem>
      ))}
    </Select>
  );
}
