'use client';
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  Alert,
  IconButton,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { AddCardsSection } from './AddCardsSection';
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

  const handleClose = () => {
    if (generating) return;
    onClose();
  };

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
        <AddCardsSection
          words={words}
          onWordsChange={setWords}
          input={input}
          onInputChange={setInput}
          disabled={generating}
          error={error}
          mainViewMode={mainViewMode}
          onMainViewModeChange={setMainViewMode}
          onGenerate={async (finalWords, mode) => await onGenerate(finalWords, mode)}
          onAddExisting={() => onAddExisting(mainViewMode)}
          onImportPdf={() => onImportPdf(mainViewMode)}
          containerSx={{
            bgcolor: '#FFF8FC',
            border: '1.5px solid rgba(249,168,212,0.35)',
            borderRadius: '14px',
            p: 2,
            mb: 2,
          }}
          titleColor="#EC4899"
        />
      </DialogContent>
    </Dialog>
  );
}
