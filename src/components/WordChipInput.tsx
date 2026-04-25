'use client';
import { Box, Chip, TextField } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';
import { type KeyboardEvent } from 'react';

interface WordChipInputProps {
  words: string[];
  onWordsChange: (words: string[]) => void;
  input: string;
  onInputChange: (input: string) => void;
  disabled?: boolean;
  inputId?: string;
}

export function WordChipInput({
  words,
  onWordsChange,
  input,
  onInputChange,
  disabled = false,
  inputId = 'word-chip-input',
}: WordChipInputProps) {
  const theme = useTheme();
  const { brand } = theme.palette;

  const addWord = () => {
    const trimmed = input.trim();
    if (trimmed && !words.includes(trimmed)) onWordsChange([...words, trimmed]);
    onInputChange('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addWord();
    }
    if (e.key === 'Backspace' && !input && words.length > 0) onWordsChange(words.slice(0, -1));
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 0.5,
        p: '9px 11px',
        border: '1.5px solid',
        borderColor: disabled ? alpha(brand[300], 0.3) : alpha(brand[300], 0.5),
        borderRadius: '10px',
        minHeight: 46,
        cursor: disabled ? 'default' : 'text',
        mb: 1.25,
        bgcolor: disabled ? alpha('#fff', 0.5) : '#fff',
        transition: 'border-color 0.18s, background-color 0.18s',
        '&:focus-within': {
          borderColor: disabled ? alpha(brand[300], 0.3) : brand[400],
          boxShadow: disabled ? 'none' : `0 0 0 3px ${alpha(brand[400], 0.1)}`,
        },
      }}
      onClick={() => !disabled && document.getElementById(inputId)?.focus()}
    >
      {words.map((w) => (
        <Chip
          key={w}
          label={w}
          size="small"
          onDelete={disabled ? undefined : () => onWordsChange(words.filter((x) => x !== w))}
          sx={{
            height: 22,
            fontSize: '0.72rem',
            fontWeight: 700,
            bgcolor: theme.palette.surfaces.chip,
            color: brand[700],
            border: `1px solid ${alpha(brand[400], 0.4)}`,
            '& .MuiChip-deleteIcon': { fontSize: 13, color: brand[400] },
          }}
        />
      ))}
      <TextField
        id={inputId}
        value={input}
        onChange={(e) => !disabled && onInputChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={words.length === 0 ? 'Type words or phrases, press Enter…' : ''}
        variant="standard"
        size="small"
        disabled={disabled}
        sx={{
          flexGrow: 1,
          minWidth: 90,
          '& .MuiInput-root': {
            fontWeight: 600,
            fontSize: '0.82rem',
            color: 'text.primary',
            '&:before, &:after': { display: 'none' },
          },
          '& input': { p: 0.25 },
          '& input::placeholder': { color: 'text.secondary', opacity: 1, fontSize: '0.8rem' },
        }}
        slotProps={{ input: { disableUnderline: true } }}
      />
    </Box>
  );
}
