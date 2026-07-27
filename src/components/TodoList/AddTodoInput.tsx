'use client';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import Box from '@mui/material/Box';
import Collapse from '@mui/material/Collapse';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import { alpha, useTheme } from '@mui/material/styles';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import { useTranslations } from 'next-intl';
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
  const t = useTranslations('Todo.addTodoInput');
  const [focused, setFocused] = useState(false);
  const showOptions = focused || value.length > 0;

  return (
    <Box>
      <Stack direction="row" spacing={1} alignItems="center">
        <TextField
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onAdd();
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={t('placeholder')}
          size="small"
          fullWidth
          disabled={disabled}
          slotProps={{ htmlInput: { maxLength: 200 } }}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: '10px',
              fontSize: '0.9rem',
              fontWeight: 700,
              bgcolor: alpha(brand[50], 0.4),
              '& fieldset': { borderColor: alpha(brand[200], 0.9), borderWidth: 1.5 },
              '&:hover fieldset': { borderColor: brand[400] },
              '&.Mui-focused fieldset': { borderColor: brand[500], borderWidth: 2 },
              '&.Mui-disabled': { bgcolor: alpha('#fff', 0.5) },
            },
            '& .MuiOutlinedInput-input': { px: 2, py: 1.375 },
            '& .MuiInputBase-input::placeholder': { color: brand[400], opacity: 1 },
          }}
        />
        <Tooltip title={t('addTooltip')}>
          <span>
            <IconButton
              onClick={onAdd}
              disabled={!value.trim() || disabled}
              sx={{
                background: `linear-gradient(135deg, ${brand[400]}, ${accent[300]})`,
                color: 'white',
                borderRadius: '10px',
                width: 44,
                height: 44,
                flexShrink: 0,
                boxShadow: `0 8px 18px -8px ${alpha(brand[500], 0.6)}`,
                '&:hover': {
                  background: `linear-gradient(135deg, ${brand[500]}, ${accent[400]})`,
                  transform: 'scale(1.06)',
                  boxShadow: `0 10px 22px -8px ${alpha(brand[500], 0.7)}`,
                },
                '&:disabled': {
                  background: alpha(brand[200], 0.35),
                  color: alpha(brand[400], 0.3),
                  boxShadow: 'none',
                },
                transition: 'all 0.2s ease',
              }}
            >
              <AddRoundedIcon sx={{ fontSize: '1.35rem' }} />
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
