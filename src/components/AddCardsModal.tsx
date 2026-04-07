'use client';
import { useState, type KeyboardEvent } from 'react';
import {
  Dialog,
  DialogContent,
  Box,
  TextField,
  Chip,
  Button,
  Typography,
  CircularProgress,
  Alert,
  IconButton,
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import LibraryAddIcon from '@mui/icons-material/LibraryAdd';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import CloseIcon from '@mui/icons-material/Close';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

interface AddCardsModalProps {
  open: boolean;
  onClose: () => void;
  onGenerate: (words: string[]) => Promise<void>;
  generating: boolean;
  error: string | null;
  onAddExisting: () => void;
  onImportPdf: () => void;
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

      <DialogContent sx={{ px: 2.5, pt: 2.5, pb: 2.5 }}>
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

          {/* Word chip input */}
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 0.5,
              p: '9px 11px',
              border: '1.5px solid',
              borderColor: generating ? 'rgba(249,168,212,0.3)' : 'rgba(249,168,212,0.5)',
              borderRadius: '10px',
              minHeight: 46,
              cursor: generating ? 'default' : 'text',
              mb: 1.25,
              bgcolor: generating ? 'rgba(255,255,255,0.5)' : '#FFFFFF',
              transition: 'border-color 0.18s, background-color 0.18s',
              '&:focus-within': {
                borderColor: generating ? 'rgba(249,168,212,0.3)' : '#F472B6',
                boxShadow: generating ? 'none' : '0 0 0 3px rgba(244,114,182,0.1)',
              },
            }}
            onClick={() => !generating && document.getElementById('modal-word-input')?.focus()}
          >
            {words.map((w) => (
              <Chip
                key={w}
                label={w}
                size="small"
                onDelete={generating ? undefined : () => setWords((p) => p.filter((x) => x !== w))}
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
              id="modal-word-input"
              value={input}
              onChange={(e) => !generating && setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={words.length === 0 ? 'Type words or phrases, press Enter…' : ''}
              variant="standard"
              size="small"
              disabled={generating}
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
            startIcon={
              generating ? (
                <CircularProgress size={13} color="inherit" />
              ) : (
                <AutoAwesomeIcon sx={{ fontSize: 14 }} />
              )
            }
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
            {generating ? 'Generating your cards…' : 'Generate Cards'}
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

        {/* "or" divider */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
          <Box sx={{ flexGrow: 1, height: '1px', bgcolor: 'rgba(249,168,212,0.3)' }} />
          <Typography
            sx={{
              fontSize: '0.65rem',
              fontWeight: 800,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'rgba(194,112,154,0.6)',
              fontFamily: '"Nunito", sans-serif',
            }}
          >
            or
          </Typography>
          <Box sx={{ flexGrow: 1, height: '1px', bgcolor: 'rgba(249,168,212,0.3)' }} />
        </Box>

        {/* Alternative options */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Box
            component="button"
            onClick={!generating ? onAddExisting : undefined}
            disabled={generating}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              p: '12px 14px',
              border: '1.5px solid rgba(249,168,212,0.35)',
              borderRadius: '12px',
              bgcolor: '#FFFFFF',
              cursor: generating ? 'default' : 'pointer',
              textAlign: 'left',
              width: '100%',
              transition: 'all 0.15s ease',
              opacity: generating ? 0.45 : 1,
              '&:hover:not(:disabled)': {
                borderColor: '#F472B6',
                bgcolor: '#FFF8FC',
                boxShadow: '0 2px 10px rgba(249,168,212,0.2)',
              },
            }}
          >
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: '10px',
                bgcolor: '#FCE7F3',
                border: '1px solid rgba(244,114,182,0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <LibraryAddIcon sx={{ fontSize: 17, color: '#EC4899' }} />
            </Box>
            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
              <Typography
                sx={{
                  fontSize: '0.8rem',
                  fontWeight: 800,
                  color: '#9D174D',
                  fontFamily: '"Nunito", sans-serif',
                  lineHeight: 1.2,
                }}
              >
                Add Existing Cards
              </Typography>
              <Typography
                sx={{
                  fontSize: '0.68rem',
                  color: '#C2709A',
                  fontFamily: '"Nunito", sans-serif',
                  fontWeight: 500,
                  mt: 0.2,
                }}
              >
                Copy from your other decks
              </Typography>
            </Box>
            <ChevronRightIcon sx={{ fontSize: 16, color: 'rgba(194,112,154,0.5)', flexShrink: 0 }} />
          </Box>

          <Box
            component="button"
            onClick={!generating ? onImportPdf : undefined}
            disabled={generating}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              p: '12px 14px',
              border: '1.5px solid rgba(249,168,212,0.35)',
              borderRadius: '12px',
              bgcolor: '#FFFFFF',
              cursor: generating ? 'default' : 'pointer',
              textAlign: 'left',
              width: '100%',
              transition: 'all 0.15s ease',
              opacity: generating ? 0.45 : 1,
              '&:hover:not(:disabled)': {
                borderColor: '#F472B6',
                bgcolor: '#FFF8FC',
                boxShadow: '0 2px 10px rgba(249,168,212,0.2)',
              },
            }}
          >
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: '10px',
                bgcolor: '#F3E8FF',
                border: '1px solid rgba(196,181,253,0.45)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <PictureAsPdfIcon sx={{ fontSize: 17, color: '#9333EA' }} />
            </Box>
            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
              <Typography
                sx={{
                  fontSize: '0.8rem',
                  fontWeight: 800,
                  color: '#9D174D',
                  fontFamily: '"Nunito", sans-serif',
                  lineHeight: 1.2,
                }}
              >
                Import from PDF
              </Typography>
              <Typography
                sx={{
                  fontSize: '0.68rem',
                  color: '#C2709A',
                  fontFamily: '"Nunito", sans-serif',
                  fontWeight: 500,
                  mt: 0.2,
                }}
              >
                Extract vocabulary from a document
              </Typography>
            </Box>
            <ChevronRightIcon sx={{ fontSize: 16, color: 'rgba(194,112,154,0.5)', flexShrink: 0 }} />
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
