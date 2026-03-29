'use client';
import { useState } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Button,
  LinearProgress,
  Chip,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import { Flashcard } from '@/components/Flashcard';
import { useCards } from '@/hooks/useCards';

interface StudyProps {
  deckId: string;
  onBack: () => void;
}

export function Study({ deckId, onBack }: StudyProps) {
  const { cards } = useCards(deckId);
  const [index, setIndex] = useState(0);
  const card = cards[index];

  if (cards.length === 0) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Button startIcon={<ArrowBackIcon />} onClick={onBack}>Back to Deck</Button>
        <Typography color="text.secondary" sx={{ mt: 3 }}>No cards in this deck yet.</Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        px: 2,
        py: 6,
        bgcolor: '#FFF5FB',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          display: 'flex',
          alignItems: 'center',
          px: 3,
          py: 1.5,
          backdropFilter: 'blur(12px)',
          bgcolor: 'rgba(255, 241, 250, 0.95)',
          borderBottom: '1px solid rgba(249,168,212,0.35)',
          zIndex: 10,
        }}
      >
        <IconButton onClick={onBack} size="small">
          <ArrowBackIosNewIcon fontSize="small" />
        </IconButton>
        <Box sx={{ flexGrow: 1, mx: 2 }}>
          <LinearProgress
            variant="determinate"
            value={((index + 1) / cards.length) * 100}
            sx={{
              height: 2,
              borderRadius: 1,
              bgcolor: 'rgba(200,169,126,0.1)',
              '& .MuiLinearProgress-bar': { bgcolor: 'primary.main' },
            }}
          />
        </Box>
        <Chip label={`${index + 1} / ${cards.length}`} size="small" />
      </Box>

      {/* Card */}
      <Box sx={{ mt: 4 }}>
        {card && <Flashcard card={card} width={340} height={240} />}
      </Box>

      {/* Navigation */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          mt: 4,
        }}
      >
        <IconButton
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          disabled={index === 0}
          sx={{
            border: '1px solid rgba(249,168,212,0.45)',
            bgcolor: '#FFF3F9',
            '&:not(:disabled):hover': { borderColor: '#EC4899' },
          }}
        >
          <ArrowBackIcon />
        </IconButton>

        <Typography variant="caption" color="text.secondary" sx={{ letterSpacing: '0.08em' }}>
          TAP CARD TO FLIP
        </Typography>

        <IconButton
          onClick={() => setIndex((i) => Math.min(cards.length - 1, i + 1))}
          disabled={index === cards.length - 1}
          sx={{
            border: '1px solid rgba(249,168,212,0.45)',
            bgcolor: '#FFF3F9',
            '&:not(:disabled):hover': { borderColor: '#EC4899' },
          }}
        >
          <ArrowForwardIcon />
        </IconButton>
      </Box>

      {index === cards.length - 1 && (
        <Button variant="outlined" onClick={onBack} sx={{ mt: 3 }}>
          Finish Session
        </Button>
      )}
    </Box>
  );
}
