'use client';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import { useTheme, alpha } from '@mui/material/styles';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import { FrequencyPicker } from './FrequencyPicker';

interface AddTodoInputProps {
  value: string;
  onChange: (value: string) => void;
  onAdd: () => void;
  disabled: boolean;
  frequencyDays: number[];
  onFrequencyChange: (days: number[]) => void;
}

export function AddTodoInput({ value, onChange, onAdd, disabled, frequencyDays, onFrequencyChange }: AddTodoInputProps) {
  const theme = useTheme();
  const { brand, accent } = theme.palette;

  return (
    <Stack spacing={0.75}>
      <Stack direction="row" spacing={0.75} alignItems="center">
        <TextField
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') onAdd(); }}
          placeholder="What will you do today? 🌸"
          size="small"
          fullWidth
          disabled={disabled}
          slotProps={{ htmlInput: { maxLength: 200 } }}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 3,
              fontSize: '0.85rem',
              fontWeight: 600,
              bgcolor: alpha('#fff', 0.85),
              '& fieldset': { borderColor: alpha(brand[300], 0.35), borderWidth: 2 },
              '&:hover fieldset': { borderColor: brand[400] },
              '&.Mui-focused fieldset': { borderColor: brand[400] },
            },
          }}
        />
        <Tooltip title="Add (Enter)">
          <span>
            <IconButton
              onClick={onAdd}
              disabled={!value.trim() || disabled}
              sx={{
                background: `linear-gradient(135deg, ${brand[400]}, ${accent[300]})`,
                color: 'white', borderRadius: 2.5, width: 36, height: 36, flexShrink: 0,
                '&:hover': { background: `linear-gradient(135deg, ${brand[500]}, ${accent[400]})`, transform: 'scale(1.08)' },
                '&:disabled': { background: alpha(brand[200], 0.3), color: alpha(brand[400], 0.3) },
                transition: 'all 0.2s ease',
              }}
            >
              <AddRoundedIcon sx={{ fontSize: '1.15rem' }} />
            </IconButton>
          </span>
        </Tooltip>
      </Stack>
      <FrequencyPicker value={frequencyDays} onChange={onFrequencyChange} />
    </Stack>
  );
}
