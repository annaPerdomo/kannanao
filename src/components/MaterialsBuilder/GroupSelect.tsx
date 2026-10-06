'use client';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import { useTranslations } from 'next-intl';

interface GroupSelectProps {
  groups: { id: string; name: string; emoji?: string | null }[];
  value: string;
  onChange: (id: string) => void;
  size?: 'small' | 'medium';
  disabled?: boolean;
}

/** Hidden with a single group — there's nothing to switch between. */
export function GroupSelect({ groups, value, onChange, size, disabled }: GroupSelectProps) {
  const t = useTranslations('Materials');

  if (groups.length <= 1) return null;

  return (
    <TextField
      select
      size={size}
      label={t('groupLabel')}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      sx={{ maxWidth: 320 }}
    >
      {groups.map((g) => (
        <MenuItem key={g.id} value={g.id}>
          {g.emoji ? `${g.emoji} ${g.name}` : g.name}
        </MenuItem>
      ))}
    </TextField>
  );
}
