'use client';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import PushPinIcon from '@mui/icons-material/PushPin';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import {
  Box,
  Button,
  CircularProgress,
  FormControlLabel,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { AddCardsSection } from '@/components/AddCards';
import { AddExistingCardsDialog } from '@/components/AddExistingCardsDialog';
import { Loading } from '@/components/Loading';
import { PdfImportModal } from '@/components/PdfImportModal';
import { StyledDialog } from '@/components/StyledDialog';
import { useAuth } from '@/contexts/AuthContext';
import { useDecks } from '@/hooks/useDecks';
import { useGenerateFlashcards } from '@/hooks/useGenerateFlashcards';
import { dbCopyCardsIntoDeck, dbInsertCards } from '@/lib/supabase';
import type { Flashcard, GeneratedCard, MainViewMode } from '@/types/flashcard';

export function CreateDeckDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { palette } = useTheme();
  const { brand, surfaces } = palette;

  const { createDeck, pinDeck } = useDecks();
  const { user } = useAuth();
  const router = useRouter();
  const { generating, error, generate } = useGenerateFlashcards();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [input, setInput] = useState('');
  const [words, setWords] = useState<string[]>([]);
  const [pinToHome, setPinToHome] = useState(false);
  const [mainViewMode, setMainViewMode] = useState<MainViewMode>('hiragana');
  const [creating, setCreating] = useState(false);
  const [createdDeckId, setCreatedDeckId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pdfOpen, setPdfOpen] = useState(false);

  const busy = creating || generating;

  const reset = () => {
    setName('');
    setDescription('');
    setInput('');
    setWords([]);
    setPinToHome(false);
    setMainViewMode('hiragana');
    setCreating(false);
    setCreatedDeckId(null);
  };

  const handleCreate = async () => {
    if (!name.trim() || busy) return;
    setCreating(true);
    try {
      const deck = await createDeck(name.trim(), description.trim() || undefined);
      if (pinToHome) await pinDeck(deck.id, true);
      const finalWords = input.trim() ? [...words, input.trim()] : words;
      if (finalWords.length > 0) {
        const generated = await generate(finalWords, deck.id, mainViewMode);
        await dbInsertCards(
          deck.id,
          generated.map((card) => ({ ...card, deckId: deck.id })),
        );
      }
      reset();
      onClose();
      router.push(`/deck/${deck.id}`);
    } finally {
      setCreating(false);
    }
  };

  const navigateToDeck = (deckId: string) => {
    reset();
    onClose();
    router.push(`/deck/${deckId}`);
  };

  const handleAddExisting = async () => {
    if (!name.trim() || busy) return;
    setCreating(true);
    try {
      const deck = await createDeck(name.trim(), description.trim() || undefined);
      if (pinToHome) await pinDeck(deck.id, true);
      setCreatedDeckId(deck.id);
      setPickerOpen(true);
    } finally {
      setCreating(false);
    }
  };

  const handleImportPdf = async () => {
    if (!name.trim() || busy) return;
    setCreating(true);
    try {
      const deck = await createDeck(name.trim(), description.trim() || undefined);
      if (pinToHome) await pinDeck(deck.id, true);
      setCreatedDeckId(deck.id);
      setPdfOpen(true);
    } finally {
      setCreating(false);
    }
  };

  const handlePdfImportAddCards = async (cards: GeneratedCard[]) => {
    if (!createdDeckId) return;
    await dbInsertCards(
      createdDeckId,
      cards.map((card) => ({
        deckId: createdDeckId,
        word: card.word,
        reading: card.reading,
        meaning: card.meaning,
        image_query: card.image_query,
        example_jp: card.example_jp,
        example_en: card.example_en,
        mainViewMode,
        cardType: card.card_type,
        jlptLevel: card.jlpt_level ?? undefined,
      })),
    );
    setPdfOpen(false);
    navigateToDeck(createdDeckId);
  };

  const handlePickerConfirm = async (cards: Flashcard[]) => {
    if (!createdDeckId) return;
    await dbCopyCardsIntoDeck(createdDeckId, cards);
    setPickerOpen(false);
    navigateToDeck(createdDeckId);
  };

  const canGenerate = words.length > 0 || input.trim().length > 0;

  return (
    <>
      <StyledDialog
        open={open}
        onClose={busy ? () => {} : onClose}
        title="New Deck"
        subtitle="Give your deck a name to get started"
        closeDisabled={busy}
        actions={
          <>
            <Button
              onClick={onClose}
              disabled={busy}
              sx={{ color: 'text.secondary', textTransform: 'none' }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!name.trim() || busy}
              variant="contained"
              startIcon={
                creating ? (
                  <CircularProgress size={13} color="inherit" />
                ) : canGenerate ? (
                  <AutoAwesomeIcon sx={{ fontSize: 14 }} />
                ) : undefined
              }
              sx={{
                bgcolor: brand[700],
                color: '#fff',
                textTransform: 'none',
                borderRadius: 6,
                px: 2.5,
                '&:hover': { bgcolor: brand[800] },
                '&:disabled': { bgcolor: alpha(brand[700], 0.2), color: alpha('#fff', 0.5) },
              }}
            >
              {creating ? 'Creating…' : 'Create'}
            </Button>
          </>
        }
      >
        {generating ? (
          <Loading message="Generating cards…" />
        ) : (
          <>
            <TextField
              label="Deck Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !canGenerate) void handleCreate();
              }}
              fullWidth
              autoFocus
              disabled={busy}
              sx={{ mb: 2 }}
            />
            <TextField
              label="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              fullWidth
              multiline
              rows={2}
              disabled={busy}
              sx={{ mb: 2 }}
            />

            {/* Pin toggle */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                mb: 2.5,
                px: 1.5,
                py: 1,
                borderRadius: 3,
                border: `1.5px solid ${pinToHome ? alpha(brand[400], 0.55) : alpha(brand[300], 0.3)}`,
                bgcolor: pinToHome ? alpha(brand[50], 0.8) : 'transparent',
                transition: 'all 0.18s ease',
                cursor: 'pointer',
              }}
              onClick={() => setPinToHome((v) => !v)}
            >
              {pinToHome ? (
                <PushPinIcon sx={{ fontSize: '1rem', color: brand[600], flexShrink: 0 }} />
              ) : (
                <PushPinOutlinedIcon
                  sx={{ fontSize: '1rem', color: alpha(brand[500], 0.55), flexShrink: 0 }}
                />
              )}
              <Box sx={{ flexGrow: 1 }}>
                <Typography
                  sx={{
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    color: pinToHome ? brand[700] : 'text.secondary',
                    lineHeight: 1.2,
                  }}
                >
                  Pin to home
                </Typography>
                <Typography sx={{ fontSize: '0.68rem', color: 'text.secondary' }}>
                  Show this deck on your home page
                </Typography>
              </Box>
              <FormControlLabel
                control={
                  <Switch
                    size="small"
                    checked={pinToHome}
                    onChange={(e) => {
                      e.stopPropagation();
                      setPinToHome(e.target.checked);
                    }}
                    sx={{
                      '& .MuiSwitch-switchBase.Mui-checked': { color: brand[600] },
                      '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                        bgcolor: brand[400],
                      },
                    }}
                  />
                }
                label=""
                sx={{ m: 0 }}
                onClick={(e) => e.stopPropagation()}
              />
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
              <Box sx={{ flexGrow: 1, height: '1px', bgcolor: alpha(brand[300], 0.3) }} />
              <Typography
                sx={{
                  fontSize: '0.65rem',
                  fontWeight: 800,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: alpha(brand[700], 0.7),
                }}
              >
                add cards (optional)
              </Typography>
              <Box sx={{ flexGrow: 1, height: '1px', bgcolor: alpha(brand[300], 0.3) }} />
            </Box>

            <AddCardsSection
              words={words}
              onWordsChange={setWords}
              input={input}
              onInputChange={setInput}
              disabled={busy}
              error={error}
              mainViewMode={mainViewMode}
              onMainViewModeChange={setMainViewMode}
              onAddExisting={handleAddExisting}
              onImportPdf={handleImportPdf}
              containerSx={{
                bgcolor: surfaces.input,
                border: `1.5px solid ${alpha(brand[300], 0.35)}`,
                borderRadius: '14px',
                p: 2,
                mb: 2,
              }}
              titleColor={brand[500]}
            />
          </>
        )}
      </StyledDialog>

      <AddExistingCardsDialog
        open={pickerOpen}
        onClose={() => {
          setPickerOpen(false);
          if (createdDeckId) navigateToDeck(createdDeckId);
        }}
        targetDeckId={createdDeckId ?? ''}
        userId={user?.id ?? ''}
        onConfirm={handlePickerConfirm}
      />
      <PdfImportModal
        open={pdfOpen}
        onClose={() => {
          setPdfOpen(false);
          if (createdDeckId) navigateToDeck(createdDeckId);
        }}
        onAddCards={handlePdfImportAddCards}
      />
    </>
  );
}
