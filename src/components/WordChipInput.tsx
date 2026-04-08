'use client';
import { type KeyboardEvent } from 'react';
import { Box, Chip, TextField } from '@mui/material';

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
  const addWord = () => {
    const trimmed = input.trim();
    if (trimmed && !words.includes(trimmed)) {
      onWordsChange([...words, trimmed]);
    }
    onInputChange('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addWord();
    }
    if (e.key === 'Backspace' && !input && words.length > 0) {
      onWordsChange(words.slice(0, -1));
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 0.5,
        p: '9px 11px',
        border: '1.5px solid',
        borderColor: disabled ? 'rgba(249,168,212,0.3)' : 'rgba(249,168,212,0.5)',
        borderRadius: '10px',
        minHeight: 46,
        cursor: disabled ? 'default' : 'text',
        mb: 1.25,
        bgcolor: disabled ? 'rgba(255,255,255,0.5)' : '#FFFFFF',
        transition: 'border-color 0.18s, background-color 0.18s',
        '&:focus-within': {
          borderColor: disabled ? 'rgba(249,168,212,0.3)' : '#F472B6',
          boxShadow: disabled ? 'none' : '0 0 0 3px rgba(244,114,182,0.1)',
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
            fontFamily: '"Nunito", sans-serif',
            fontWeight: 700,
            bgcolor: '#FCE7F3',
            color: '#BE185D',
            border: '1px solid rgba(244,114,182,0.4)',
            '& .MuiChip-deleteIcon': { fontSize: 13, color: '#F472B6' },
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
            fontFamily: '"Nunito", sans-serif',
            fontWeight: 600,
            fontSize: '0.82rem',
            color: '#5E2F6C',
            '&:before, &:after': { display: 'none' },
          },
          '& input': { p: 0.25 },
          '& input::placeholder': { color: '#C2709A', opacity: 1, fontSize: '0.8rem' },
        }}
        slotProps={{ input: { disableUnderline: true } }}
      />
    </Box>
  );
}
