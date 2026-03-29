'use client';
import { useState, type KeyboardEvent } from 'react';
import {
  Box,
  TextField,
  Chip,
  Button,
  Typography,
  CircularProgress,
  Alert,
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';

interface GenerateFormProps {
  onGenerate: (words: string[]) => Promise<void>;
  generating: boolean;
  error: string | null;
}

export function GenerateForm({ onGenerate, generating, error }: GenerateFormProps) {
  const [input, setInput] = useState('');
  const [words, setWords] = useState<string[]>([]);

  const addWord = () => {
    const trimmed = input.trim();
    if (trimmed && !words.includes(trimmed)) {
      setWords((prev) => [...prev, trimmed]);
    }
    setInput('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addWord();
    }
    if (e.key === 'Backspace' && !input && words.length > 0) {
      setWords((prev) => prev.slice(0, -1));
    }
  };

  const handleGenerate = async () => {
    if (input.trim()) addWord();
    if (words.length === 0 && !input.trim()) return;
    const finalWords = input.trim() ? [...words, input.trim()] : words;
    await onGenerate(finalWords);
    setWords([]);
    setInput('');
  };

  return (
    <Box>
      {/* Word input */}
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 0.5,
          p: '10px 12px',
          border: '1.5px solid rgba(249,168,212,0.45)',
          borderRadius: '10px',
          minHeight: 48,
          cursor: 'text',
          mb: 1.5,
          bgcolor: '#FFF8FC',
          transition: 'border-color 0.18s',
          '&:focus-within': { borderColor: '#F472B6' },
        }}
        onClick={() => document.getElementById('word-input')?.focus()}
      >
        {words.map((w) => (
          <Chip
            key={w}
            label={w}
            size="small"
            onDelete={() => setWords((p) => p.filter((x) => x !== w))}
          />
        ))}
        <TextField
          id="word-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={words.length === 0 ? 'Type a word…' : ''}
          variant="standard"
          size="small"
          sx={{
            flexGrow: 1,
            minWidth: 90,
            '& .MuiInput-root': {
              fontFamily: '"Nunito", sans-serif',
              fontWeight: 600,
              fontSize: '0.85rem',
              color: '#5E2F6C',
              '&:before, &:after': { display: 'none' },
            },
            '& input': { p: 0.25 },
            '& input::placeholder': { color: '#C2709A', opacity: 1 },
          }}
          slotProps={{ input: { disableUnderline: true } }}
        />
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 1.5, fontSize: '0.75rem', py: 0.5, borderRadius: '9px' }}>
          {error}
        </Alert>
      )}

      <Button
        fullWidth
        variant="contained"
        onClick={handleGenerate}
        disabled={generating || (words.length === 0 && !input.trim())}
        startIcon={
          generating
            ? <CircularProgress size={13} color="inherit" />
            : <AutoAwesomeIcon sx={{ fontSize: 14 }} />
        }
        sx={{ borderRadius: '9px', py: '8px' }}
      >
        {generating ? 'Generating…' : 'Generate Cards'}
      </Button>

      {words.length > 0 && (
        <Typography sx={{
          mt: 1, textAlign: 'center',
          fontSize: '0.67rem', color: 'text.secondary',
          fontFamily: '"Nunito", sans-serif',
        }}>
          {words.length} word{words.length > 1 ? 's' : ''} queued
        </Typography>
      )}
    </Box>
  );
}