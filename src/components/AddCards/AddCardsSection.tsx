'use client';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { Alert, Box, Button, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import { alpha, useTheme } from '@mui/material/styles';
import { useTranslations } from 'next-intl';

import { WordChipInput } from '@/components/WordChipInput';
import type { MainViewMode } from '@/types/flashcard';

import { AddCardOptionButtons } from './AddCardOptionButtons';

interface AddCardsSectionProps {
  words: string[];
  onWordsChange: (words: string[]) => void;
  input: string;
  onInputChange: (input: string) => void;
  disabled?: boolean;
  error?: string | null;
  mainViewMode: MainViewMode;
  onMainViewModeChange: (mode: MainViewMode) => void;
  onGenerate?: (words: string[], mainViewMode: MainViewMode) => Promise<void>;
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
  title,
  titleColor,
  generateButtonLabel,
}: AddCardsSectionProps) {
  const t = useTranslations('Deck.addCardsSection');
  const { palette } = useTheme();
  const { brand, accent } = palette;
  const resolvedTitle = title ?? t('generateWithAi');
  const resolvedGenerateButtonLabel = generateButtonLabel ?? t('generateCards');
  const resolvedTitleColor = titleColor ?? brand[500];
  const canGenerate = words.length > 0 || input.trim().length > 0;

  const handleGenerate = async () => {
    if (!onGenerate) return;
    const finalWords = input.trim() ? [...words, input.trim()] : words;
    if (finalWords.length === 0) return;
    await onGenerate(finalWords, mainViewMode);
  };

  const defaultContainerSx: SxProps<Theme> = {
    bgcolor: alpha(brand[50], 0.85),
    border: `1.5px solid ${alpha(brand[300], 0.35)}`,
    borderRadius: '14px',
    p: 2,
    mb: 2,
  };

  const mergedContainerSx: SxProps<Theme> = containerSx
    ? ([defaultContainerSx, containerSx] as SxProps<Theme>)
    : defaultContainerSx;

  const toggleBtnSx = {
    px: 1.5,
    py: 0.4,
    fontSize: '0.72rem',
    fontWeight: 700,
    textTransform: 'none',
    borderColor: alpha(brand[300], 0.5),
    '&.Mui-selected': {
      bgcolor: alpha(brand[300], 0.25),
      color: brand[700],
      borderColor: alpha(brand[500], 0.5),
    },
  };

  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <Typography
          sx={{
            fontSize: '0.65rem',
            fontWeight: 700,
            color: 'text.secondary',
            flexShrink: 0,
          }}
        >
          {t('mainDisplayMode')}
        </Typography>
        <ToggleButtonGroup
          value={mainViewMode}
          exclusive
          size="small"
          onChange={(_, v) => {
            if (v) onMainViewModeChange(v);
          }}
          disabled={disabled}
          sx={{ ml: 'auto' }}
        >
          <ToggleButton value="hiragana" sx={toggleBtnSx}>
            {t('hiragana')}
          </ToggleButton>
          <ToggleButton value="kanji" sx={toggleBtnSx}>
            {t('kanji')}
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <Box sx={mergedContainerSx}>
        <Typography
          sx={{
            fontSize: '0.6rem',
            fontWeight: 800,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: resolvedTitleColor,
            mb: 1.25,
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
          }}
        >
          {resolvedTitle}
        </Typography>

        <WordChipInput
          words={words}
          onWordsChange={onWordsChange}
          input={input}
          onInputChange={onInputChange}
          disabled={disabled}
          inputId="add-cards-word-input"
        />

        <Typography
          sx={{
            fontSize: '0.68rem',
            color: alpha(brand[700], 0.65),
            fontWeight: 600,
            lineHeight: 1.4,
            mt: -0.5,
            mb: 1.25,
          }}
        >
          {t('inputHint')}
        </Typography>

        {error && (
          <Alert
            severity="error"
            sx={{ mb: 1.25, fontSize: '0.73rem', py: 0.4, borderRadius: '9px' }}
          >
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
              fontWeight: 800,
              fontSize: '0.82rem',
              letterSpacing: '0.02em',
              textTransform: 'none',
              background:
                !disabled && canGenerate
                  ? `linear-gradient(135deg, ${brand[400]} 0%, ${brand[500]} 50%, ${accent[500]} 100%)`
                  : undefined,
              boxShadow:
                !disabled && canGenerate ? `0 4px 14px ${alpha(brand[500], 0.35)}` : undefined,
              '&:hover': {
                boxShadow: !disabled ? `0 6px 20px ${alpha(brand[500], 0.45)}` : undefined,
              },
            }}
          >
            {resolvedGenerateButtonLabel}
          </Button>
        ) : null}

        {words.length > 0 && !disabled && (
          <Typography
            sx={{
              mt: 1,
              textAlign: 'center',
              fontSize: '0.67rem',
              color: alpha(brand[700], 0.6),
              fontWeight: 600,
            }}
          >
            {t('wordsQueued', { count: words.length })}
          </Typography>
        )}
      </Box>

      <AddCardOptionButtons
        disabled={disabled}
        onAddExisting={onAddExisting}
        onImportPdf={onImportPdf}
      />
    </>
  );
}
