'use client';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import Box from '@mui/material/Box';
import Collapse from '@mui/material/Collapse';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import { alpha, useTheme } from '@mui/material/styles';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import { useState } from 'react';

import { FrequencyPicker } from './FrequencyPicker';

interface AddTodoInputProps {
  value: string;
  onChange: (value: string) => void;
  onAdd: () => void;
  disabled: boolean;
  frequencyDays: number[];
  onFrequencyChange: (days: number[]) => void;
  repeatUntilDone: boolean;
  onRepeatUntilDoneChange: (val: boolean) => void;
}

export function AddTodoInput({
  value,
  onChange,
  onAdd,
  disabled,
  frequencyDays,
  onFrequencyChange,
  repeatUntilDone,
  onRepeatUntilDoneChange,
}: AddTodoInputProps) {
  const theme = useTheme();
  const { brand, accent } = theme.palette;
  const [focused, setFocused] = useState(false);
  const showOptions = focused || value.length > 0;

  return (
    <Box>
      <Stack direction="row" spacing={0.75} alignItems="center">
        <TextField
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onAdd();
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Write a new to-do..."
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
        <Tooltip title="Add it!">
          <span>
            <IconButton
              onClick={onAdd}
              disabled={!value.trim() || disabled}
              sx={{
                background: `linear-gradient(135deg, ${brand[400]}, ${accent[300]})`,
                color: 'white',
                borderRadius: 2.5,
                width: 38,
                height: 38,
                flexShrink: 0,
                boxShadow: `0 4px 12px ${alpha(brand[400], 0.3)}`,
                '&:hover': {
                  background: `linear-gradient(135deg, ${brand[500]}, ${accent[400]})`,
                  transform: 'scale(1.1)',
                  boxShadow: `0 6px 16px ${alpha(brand[400], 0.4)}`,
                },
                '&:disabled': {
                  background: alpha(brand[200], 0.35),
                  color: alpha(brand[400], 0.3),
                  boxShadow: 'none',
                },
                transition: 'all 0.2s ease',
              }}
            >
              <AddRoundedIcon sx={{ fontSize: '1.2rem' }} />
            </IconButton>
          </span>
        </Tooltip>
      </Stack>
      <Collapse in={showOptions}>
        <Box mt={0.75}>
          <FrequencyPicker
            value={frequencyDays}
            onChange={onFrequencyChange}
            repeatUntilDone={repeatUntilDone}
            onRepeatUntilDoneChange={onRepeatUntilDoneChange}
          />
        </Box>
      </Collapse>
    </Box>
  );
}
