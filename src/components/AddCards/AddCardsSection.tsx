'use client';
import { Box, Button, Typography, Alert, ToggleButtonGroup, ToggleButton } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { AddCardOptionButtons } from './AddCardOptionButtons';
import { WordChipInput } from '@/components/WordChipInput';
import type { SxProps, Theme } from '@mui/material/styles';

interface AddCardsSectionProps {
  words: string[];
  onWordsChange: (words: string[]) => void;
  input: string;
  onInputChange: (input: string) => void;
  disabled?: boolean;
  error?: string | null;
  mainViewMode: 'hiragana' | 'kanji';
  onMainViewModeChange: (mode: 'hiragana' | 'kanji') => void;
  onGenerate?: (words: string[], mainViewMode: 'hiragana' | 'kanji') => Promise<void>;
  onAddExisting: () => void;
  onImportPdf: () => void;
  containerSx?: SxProps<Theme>;
  title?: string;
  titleColor?: string;
  generateButtonLabel?: string;
}

export function AddCardsSection({
  words,
  onWordsChange,
  input,
  onInputChange,
  disabled = false,
  error = null,
  mainViewMode,
  onMainViewModeChange,
  onGenerate,
  onAddExisting,
  onImportPdf,
  containerSx,
  title = 'Generate with AI',
  titleColor = '#EC4899',
  generateButtonLabel = 'Generate Cards',
}: AddCardsSectionProps) {
  const canGenerate = words.length > 0 || input.trim().length > 0;

  const handleGenerate = async () => {
    if (!onGenerate) return;
    const finalWords = input.trim() ? [...words, input.trim()] : words;
    if (finalWords.length === 0) return;
    await onGenerate(finalWords, mainViewMode);
  };

  const defaultContainerSx: SxProps<Theme> = {
    bgcolor: '#FFF8FC',
    border: '1.5px solid rgba(249,168,212,0.35)',
    borderRadius: '14px',
    p: 2,
    mb: 2,
  };

  const mergedContainerSx: SxProps<Theme> = containerSx ? ([defaultContainerSx, containerSx] as SxProps<Theme>) : defaultContainerSx;

  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <Typography
          sx={{
            fontSize: '0.65rem',
            fontWeight: 700,
            color: 'text.secondary',
            fontFamily: '"Nunito", sans-serif',
            flexShrink: 0,
          }}
        >
          Main display mode:
        </Typography>
        <ToggleButtonGroup
          value={mainViewMode}
          exclusive
          size="small"
          onChange={(_, v) => { if (v) onMainViewModeChange(v); }}
          disabled={disabled}
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

      <Box
        sx={mergedContainerSx}
      >
        <Typography
          sx={{
            fontSize: '0.6rem',
            fontWeight: 800,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: titleColor,
            fontFamily: '"Nunito", sans-serif',
            mb: 1.25,
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
          }}
        >
          {title}
        </Typography>

        <WordChipInput
          words={words}
          onWordsChange={onWordsChange}
          input={input}
          onInputChange={onInputChange}
          disabled={disabled}
          inputId="add-cards-word-input"
        />

        {error && (
          <Alert severity="error" sx={{ mb: 1.25, fontSize: '0.73rem', py: 0.4, borderRadius: '9px' }}>
            {error}
          </Alert>
        )}

        {onGenerate ? (
          <Button
            fullWidth
            variant="contained"
            onClick={handleGenerate}
            disabled={disabled || !canGenerate}
            startIcon={<AutoAwesomeIcon sx={{ fontSize: 14 }} />}
            sx={{
              borderRadius: '10px',
              py: '9px',
              fontFamily: '"Nunito", sans-serif',
              fontWeight: 800,
              fontSize: '0.82rem',
              letterSpacing: '0.02em',
              textTransform: 'none',
              background: !disabled && canGenerate
                ? 'linear-gradient(135deg, #F472B6 0%, #EC4899 50%, #A855F7 100%)'
                : undefined,
              boxShadow: !disabled && canGenerate
                ? '0 4px 14px rgba(236,72,153,0.35)'
                : undefined,
              '&:hover': {
                boxShadow: !disabled ? '0 6px 20px rgba(236,72,153,0.45)' : undefined,
              },
            }}
          >
            {generateButtonLabel}
          </Button>
        ) : null}

        {words.length > 0 && !disabled && (
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

      <AddCardOptionButtons disabled={disabled} onAddExisting={onAddExisting} onImportPdf={onImportPdf} />
    </>
  );
}
