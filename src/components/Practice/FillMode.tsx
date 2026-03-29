'use client';
import { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  LinearProgress,
  Chip,
  Stack,
} from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import type { Flashcard } from '@/types/flashcard';

interface FillModeProps {
  cards: Flashcard[];
  onExit: () => void;
}

function maskWord(sentence: string, word: string): string {
  return sentence.replace(word, '＿'.repeat(word.length));
}

export function FillMode({ cards, onExit }: FillModeProps) {
  const pool = useMemo(() => [...cards].sort(() => Math.random() - 0.5), [cards]);
  const [index, setIndex] = useState(0);
  const [input, setInput] = useState('');
  const [result, setResult] = useState<'correct' | 'wrong' | null>(null);
  const [score, setScore] = useState(0);

  const card = pool[index];
  const done = index >= pool.length;

  const check = () => {
    const correct = input.trim() === card.word || input.trim() === card.reading;
    setResult(correct ? 'correct' : 'wrong');
    if (correct) setScore((s) => s + 1);
  };

  const next = () => {
    setIndex((i) => i + 1);
    setInput('');
    setResult(null);
  };

  if (done) {
    return (
      <Box sx={{ textAlign: 'center', py: 6 }}>
        <CheckIcon sx={{ fontSize: 56, color: 'success.main', mb: 2 }} />
        <Typography variant="h4" sx={{ mb: 1 }}>Complete!</Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          {score} / {pool.length} correct
        </Typography>
        <Button variant="outlined" onClick={onExit}>Back to Deck</Button>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5">Fill in the Blank</Typography>
        <Chip label={`${index + 1} / ${pool.length}`} />
      </Box>

      <LinearProgress
        variant="determinate"
        value={(index / pool.length) * 100}
        sx={{ mb: 4, height: 12, borderRadius: 6, bgcolor: '#FAD2E6', '& .MuiLinearProgress-bar': { bgcolor: 'primary.main' } }}
      />

      <Box
        sx={{
          border: '1px solid rgba(249,168,212,0.45)',
          borderRadius: 3,
          p: 3,
          mb: 3,
          bgcolor: '#FFF2F8',
          boxShadow: '0 8px 24px rgba(249,168,212,0.12)',
        }}
      >
        <Typography variant="caption" sx={{ color: 'primary.main', letterSpacing: '0.12em', display: 'block', mb: 2 }}>
          FILL IN THE BLANK
        </Typography>

        <Typography
          sx={{
            fontFamily: '"Noto Serif JP", serif',
            fontSize: '1.3rem',
            color: 'text.primary',
            mb: 1,
            lineHeight: 1.8,
          }}
        >
          {result ? card.example_jp : maskWord(card.example_jp, card.word)}
        </Typography>

        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
          {card.example_en}
        </Typography>

        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 1 }}>
          Meaning: {card.meaning}
        </Typography>
      </Box>

      {result ? (
        <Box
          sx={{
            p: 2,
            borderRadius: 3,
            border: '1px solid',
            borderColor: result === 'correct' ? 'success.main' : 'error.main',
            bgcolor: result === 'correct' ? 'rgba(126,184,154,0.12)' : 'rgba(255,209,220,0.18)',
            mb: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
          }}
        >
          {result === 'correct' ? (
            <CheckIcon sx={{ color: 'success.main' }} />
          ) : (
            <CloseIcon sx={{ color: 'error.main' }} />
          )}
          <Box>
            <Typography variant="body2" color={result === 'correct' ? 'success.main' : 'error.main'}>
              {result === 'correct' ? 'Correct!' : `Incorrect — answer: ${card.word} (${card.reading})`}
            </Typography>
          </Box>
        </Box>
      ) : null}

      <Stack direction="row" spacing={1.5} alignItems="flex-end">
        <TextField
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !result) check(); }}
          label="Your answer"
          placeholder="Word or reading…"
          disabled={!!result}
          fullWidth
          size="small"
          autoFocus
        />
        {!result ? (
          <Button
            variant="contained"
            onClick={check}
            disabled={!input.trim()}
            sx={{ bgcolor: 'primary.main', color: '#0F0E0C', '&:hover': { bgcolor: 'primary.light' }, flexShrink: 0 }}
          >
            Check
          </Button>
        ) : (
          <Button
            variant="outlined"
            onClick={next}
            sx={{ flexShrink: 0 }}
          >
            Next
          </Button>
        )}
      </Stack>
    </Box>
  );
}
