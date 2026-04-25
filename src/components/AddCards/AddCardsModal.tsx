'use client';
import Box from '@mui/material/Box';
import { alpha, useTheme } from '@mui/material/styles';
import { useState } from 'react';

import { Loading } from '@/components/Loading';
import { StyledDialog } from '@/components/StyledDialog';

import { AddCardsSection } from './AddCardsSection';

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
  const { palette } = useTheme();
  const { brand } = palette;
  const [input, setInput] = useState('');
  const [words, setWords] = useState<string[]>([]);
  const [mainViewMode, setMainViewMode] = useState<'hiragana' | 'kanji'>('hiragana');

  const handleClose = () => {
    if (generating) return;
    onClose();
  };

  return (
    <StyledDialog
      open={open}
      onClose={handleClose}
      title="✨ Add Cards"
      subtitle="Generate, copy, or import new flashcards"
      closeDisabled={generating}
    >
      <Box sx={{ position: 'relative' }}>
        {generating && (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              zIndex: 10,
              bgcolor: alpha(brand[50], 0.92),
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
            bgcolor: alpha(brand[50], 0.7),
            border: `1.5px solid ${alpha(brand[300], 0.35)}`,
            borderRadius: '14px',
            p: 2,
            mb: 2,
          }}
          titleColor={brand[500]}
        />
      </Box>
    </StyledDialog>
  );
}
