'use client';
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  Box,
  Button,
  Typography,
  Alert,
  IconButton,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CloseIcon from '@mui/icons-material/Close';
import { WordChipInput } from '@/components/WordChipInput';
import { OrDivider, AddCardOptionButtons } from '@/components/AddCardOptionButtons';
import { Loading } from '@/components/Loading';

interface AddCardsModalProps {
  open: boolean;
  onClose: () => void;
  onGenerate: (words: string[], mainViewMode: 'hiragana' | 'kanji') => Promise<void>;
  generating: boolean;
  error: string | null;
  onAddExisting: (mainViewMode: 'hiragana' | 'kanji') => void;
  onImportPdf: (mainViewMode: 'hiragana' | 'kanji') => void;
}

export function AddCardsModal({
  open,
  onClose,
  onGenerate,
  generating,
  error,
  onAddExisting,
  onImportPdf,
}: AddCardsModalProps) {
  const [input, setInput] = useState('');
  const [words, setWords] = useState<string[]>([]);
  const [mainViewMode, setMainViewMode] = useState<'hiragana' | 'kanji'>('hiragana');

  const handleGenerate = async () => {
    const finalWords = input.trim() ? [...words, input.trim()] : words;
    if (finalWords.length === 0) return;
    await onGenerate(finalWords, mainViewMode);
    setWords([]);
    setInput('');
  };

  const handleClose = () => {
    if (generating) return;
    onClose();
  };

  const canGenerate = words.length > 0 || input.trim().length > 0;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="xs"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            bgcolor: '#FFFBFE',
            backgroundImage: 'none',
            border: '1.5px solid rgba(249,168,212,0.4)',
            boxShadow: '0 20px 60px rgba(236,72,153,0.14), 0 4px 16px rgba(249,168,212,0.2)',
            borderRadius: '20px',
            overflow: 'hidden',
          },
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #FFF0F8 0%, #F3E8FF 100%)',
          borderBottom: '1.5px solid rgba(249,168,212,0.25)',
          px: 3,
          pt: 2.5,
          pb: 2,
          position: 'relative',
        }}
      >
        <IconButton
          size="small"
          onClick={handleClose}
          disabled={generating}
          sx={{
            position: 'absolute',
            top: 14,
            right: 14,
            width: 28,
            height: 28,
            color: 'rgba(190,24,93,0.4)',
            '&:hover': { bgcolor: 'rgba(249,168,212,0.2)', color: '#BE185D' },
            '&.Mui-disabled': { opacity: 0.25 },
          }}
        >
          <CloseIcon sx={{ fontSize: 15 }} />
        </IconButton>

        <Typography
          sx={{
            fontSize: '1.15rem',
            fontWeight: 900,
            color: '#9D174D',
            fontFamily: '"Nunito", sans-serif',
            lineHeight: 1.2,
            mb: 0.4,
          }}
        >
          ✨ Add Cards
        </Typography>
        <Typography
          sx={{
            fontSize: '0.75rem',
            color: '#C2709A',
            fontFamily: '"Nunito", sans-serif',
            fontWeight: 600,
          }}
        >
          Generate, copy, or import new flashcards
        </Typography>
      </Box>

      <DialogContent sx={{ px: 2.5, pt: 2.5, pb: 2.5, position: 'relative' }}>
        {generating && (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              zIndex: 10,
              bgcolor: 'rgba(255,251,254,0.92)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '0 0 20px 20px',
            }}
          >
            <Loading message="Generating cards…" />
          </Box>
        )}
        {/* Main view mode — applies to all add methods */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, color: '#C2709A', fontFamily: '"Nunito", sans-serif', flexShrink: 0 }}>
            Main display mode:
          </Typography>
          <ToggleButtonGroup
            value={mainViewMode}
            exclusive
            size="small"
            onChange={(_, v) => { if (v) setMainViewMode(v); }}
            disabled={generating}
            sx={{ ml: 'auto' }}
          >
            <ToggleButton
              value="hiragana"
              sx={{
                px: 1.5, py: 0.4, fontSize: '0.72rem', fontWeight: 700,
                fontFamily: '"Nunito", sans-serif', textTransform: 'none',
                borderColor: 'rgba(249,168,212,0.5)',
                '&.Mui-selected': { bgcolor: 'rgba(249,168,212,0.25)', color: '#BE185D', borderColor: 'rgba(236,72,153,0.5)' },
              }}
            >
              ひ Hiragana
            </ToggleButton>
            <ToggleButton
              value="kanji"
              sx={{
                px: 1.5, py: 0.4, fontSize: '0.72rem', fontWeight: 700,
                fontFamily: '"Nunito", sans-serif', textTransform: 'none',
                borderColor: 'rgba(249,168,212,0.5)',
                '&.Mui-selected': { bgcolor: 'rgba(249,168,212,0.25)', color: '#BE185D', borderColor: 'rgba(236,72,153,0.5)' },
              }}
            >
              漢 Kanji
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {/* Generate section */}
        <Box
          sx={{
            bgcolor: '#FFF8FC',
            border: '1.5px solid rgba(249,168,212,0.35)',
            borderRadius: '14px',
            p: 2,
            mb: 2,
          }}
        >
          <Typography
            sx={{
              fontSize: '0.6rem',
              fontWeight: 800,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: '#EC4899',
              fontFamily: '"Nunito", sans-serif',
              mb: 1.25,
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
            }}
          >
            Generate with AI
          </Typography>

          <WordChipInput
            words={words}
            onWordsChange={setWords}
            input={input}
            onInputChange={setInput}
            disabled={generating}
            inputId="modal-word-input"
          />

          {error && (
            <Alert
              severity="error"
              sx={{ mb: 1.25, fontSize: '0.73rem', py: 0.4, borderRadius: '9px' }}
            >
              {error}
            </Alert>
          )}

          <Button
            fullWidth
            variant="contained"
            onClick={handleGenerate}
            disabled={generating || !canGenerate}
            startIcon={<AutoAwesomeIcon sx={{ fontSize: 14 }} />}
            sx={{
              borderRadius: '10px',
              py: '9px',
              fontFamily: '"Nunito", sans-serif',
              fontWeight: 800,
              fontSize: '0.82rem',
              letterSpacing: '0.02em',
              textTransform: 'none',
              background: canGenerate && !generating
                ? 'linear-gradient(135deg, #F472B6 0%, #EC4899 50%, #A855F7 100%)'
                : undefined,
              boxShadow: canGenerate && !generating
                ? '0 4px 14px rgba(236,72,153,0.35)'
                : undefined,
              '&:hover': {
                boxShadow: '0 6px 20px rgba(236,72,153,0.45)',
              },
            }}
          >
            Generate Cards
          </Button>

          {words.length > 0 && !generating && (
            <Typography
              sx={{
                mt: 1,
                textAlign: 'center',
                fontSize: '0.67rem',
                color: '#C2709A',
                fontFamily: '"Nunito", sans-serif',
                fontWeight: 600,
              }}
            >
              {words.length} word{words.length > 1 ? 's' : ''} queued
            </Typography>
          )}
        </Box>

        <OrDivider />

        <AddCardOptionButtons
          disabled={generating}
          onAddExisting={() => onAddExisting(mainViewMode)}
          onImportPdf={() => onImportPdf(mainViewMode)}
        />
      </DialogContent>
    </Dialog>
  );
}
