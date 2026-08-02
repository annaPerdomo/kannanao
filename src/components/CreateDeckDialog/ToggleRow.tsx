'use client';
import { Box, Switch, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';

interface ToggleRowProps {
  icon: React.ReactNode;
  title: string;
  helper: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  ariaLabel: string;
}

export function ToggleRow({
  icon,
  title,
  helper,
  checked,
  onChange,
  disabled = false,
  ariaLabel,
}: ToggleRowProps) {
  const { brand } = useTheme().palette;

  return (
    <Box
      component="label"
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        px: 1.5,
        py: 1,
        borderRadius: 3,
        border: `1.5px solid ${checked ? alpha(brand[400], 0.55) : alpha(brand[300], 0.3)}`,
        bgcolor: checked ? alpha(brand[50], 0.8) : 'transparent',
        transition: 'all 0.18s ease',
        cursor: disabled ? 'default' : 'pointer',
      }}
    >
      <Box sx={{ flexShrink: 0, display: 'grid', placeItems: 'center', minWidth: 20 }} aria-hidden>
        {icon}
      </Box>
      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <Typography
          sx={{
            fontSize: '0.78rem',
            fontWeight: 700,
            color: checked ? brand[700] : 'text.secondary',
            lineHeight: 1.2,
          }}
        >
          {title}
        </Typography>
        <Typography sx={{ fontSize: '0.68rem', color: 'text.secondary' }}>{helper}</Typography>
      </Box>
      <Switch
        size="small"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        slotProps={{ input: { 'aria-label': ariaLabel } }}
        sx={{
          '& .MuiSwitch-switchBase.Mui-checked': { color: brand[600] },
          '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: brand[400] },
        }}
      />
    </Box>
  );
}
