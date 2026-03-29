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
  Stack,
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
      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1, letterSpacing: '0.1em' }}>
        ADD WORDS TO GENERATE
      </Typography>

      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 0.75,
          p: 1.5,
          border: '1px solid',
          borderColor: '#F9A8D4',
          borderRadius: 3,
          minHeight: 56,
          cursor: 'text',
          mb: 2,
          bgcolor: '#FFF2F8',
          '&:focus-within': { borderColor: '#EC4899' },
          transition: 'border-color 0.2s, background-color 0.2s',
        }}
        onClick={() => document.getElementById('word-input')?.focus()}
      >
        {words.map((w) => (
          <Chip key={w} label={w} size="small" onDelete={() => setWords((p) => p.filter((x) => x !== w))} />
        ))}
        <TextField
          id="word-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={words.length === 0 ? 'Type a word, press Enter…' : ''}
          variant="standard"
          size="small"
          sx={{
            flexGrow: 1,
            minWidth: 120,
            '& .MuiInput-root': {
              fontFamily: '"DM Mono", monospace',
              fontSize: '0.875rem',
              '&:before, &:after': { display: 'none' },
            },
            '& input': { p: 0.5 },
          }}
          slotProps={{ input: { disableUnderline: true } }}
        />
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2, fontFamily: '"DM Mono", monospace', fontSize: '0.8rem' }}>
          {error}
        </Alert>
      )}

      <Stack direction="row" spacing={1} alignItems="center">
        <Button
          variant="contained"
          onClick={handleGenerate}
          disabled={generating || (words.length === 0 && !input.trim())}
          startIcon={generating ? <CircularProgress size={14} color="inherit" /> : <AutoAwesomeIcon sx={{ fontSize: 16 }} />}
          sx={{
            bgcolor: 'primary.main',
            color: '#0F0E0C',
            '&:hover': { bgcolor: 'primary.light' },
            '&:disabled': { bgcolor: 'rgba(200,169,126,0.2)', color: 'text.secondary' },
          }}
        >
          {generating ? 'Generating…' : 'Generate Cards'}
        </Button>
        {words.length > 0 && (
          <Typography variant="caption" color="text.secondary">
            {words.length} word{words.length > 1 ? 's' : ''} queued
          </Typography>
        )}
      </Stack>
    </Box>
  );
}
