'use client';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';

interface SwitchRowProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  hint: string;
}

export function SwitchRow({ checked, onChange, label, hint }: SwitchRowProps) {
  return (
    <Stack direction="row" sx={{ alignItems: 'flex-start', gap: 1 }}>
      <Switch
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        slotProps={{ input: { 'aria-label': label } }}
      />
      <Box sx={{ pt: 0.75 }}>
        <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: 'text.primary' }}>
          {label}
        </Typography>
        <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>{hint}</Typography>
      </Box>
    </Stack>
  );
}
