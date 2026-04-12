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
    <Box sx={{
      p: 1.25, borderRadius: 3,
      background: `linear-gradient(135deg, ${alpha(brand[50], 0.8)}, ${alpha(accent[50], 0.6)})`,
      border: `1.5px solid ${alpha(brand[300], 0.2)}`,
    }}>
      <Typography sx={{
        fontSize: '0.72rem', fontWeight: 800, color: brand[600],
        textTransform: 'uppercase', letterSpacing: 0.5, mb: 0.85,
      }}>
        ✅ Tasks
      </Typography>
      <Stack direction="row" spacing={0.75} alignItems="center">
        <TextField
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') onAdd(); }}
          placeholder="Add a task… 🌸"
          size="small"
          fullWidth
          disabled={disabled}
          slotProps={{ htmlInput: { maxLength: 200 } }}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 3,
              fontSize: '0.88rem',
              fontWeight: 600,
              bgcolor: alpha('#fff', 0.9),
              '& fieldset': { borderColor: alpha(brand[400], 0.4), borderWidth: 1.5 },
              '&:hover fieldset': { borderColor: brand[500] },
              '&.Mui-focused fieldset': { borderColor: brand[500], borderWidth: 2 },
              '&.Mui-disabled': { bgcolor: alpha('#fff', 0.5) },
            },
            '& .MuiInputBase-input::placeholder': { color: brand[400], opacity: 1 },
          }}
        />
        <Tooltip title="Add (Enter)">
          <span>
            <IconButton
              onClick={onAdd}
              disabled={!value.trim() || disabled}
              sx={{
                background: `linear-gradient(135deg, ${brand[400]}, ${accent[300]})`,
                color: 'white', borderRadius: 2.5, width: 38, height: 38, flexShrink: 0,
                boxShadow: `0 4px 12px ${alpha(brand[400], 0.3)}`,
                '&:hover': {
                  background: `linear-gradient(135deg, ${brand[500]}, ${accent[400]})`,
                  transform: 'scale(1.1)',
                  boxShadow: `0 6px 16px ${alpha(brand[400], 0.4)}`,
                },
                '&:disabled': { background: alpha(brand[200], 0.35), color: alpha(brand[400], 0.3), boxShadow: 'none' },
                transition: 'all 0.2s ease',
              }}
            >
              <AddRoundedIcon sx={{ fontSize: '1.2rem' }} />
            </IconButton>
          </span>
        </Tooltip>
      </Stack>
      <Box mt={0.85}>
        <FrequencyPicker value={frequencyDays} onChange={onFrequencyChange} />
      </Box>
    </Box>
  );
}
