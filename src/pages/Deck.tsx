'use client';
import { useCallback, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Stack,
  Divider,
  Chip,
  IconButton,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import StyleIcon from '@mui/icons-material/Style';
import LayersIcon from '@mui/icons-material/Layers';
import EditNoteIcon from '@mui/icons-material/EditNote';
import KeyboardIcon from '@mui/icons-material/Keyboard';
import LibraryAddIcon from '@mui/icons-material/LibraryAdd';
import { GenerateForm } from '@/components/GenerateForm';
import { ImageCard } from '@/components/ImageCard';
import { Loading } from '@/components/Loading';
import { AddExistingCardsDialog } from '@/components/AddExistingCardsDialog';
import { useDecks } from '@/hooks/useDecks';
import { useCards } from '@/hooks/useCards';
import { useGenerateFlashcards } from '@/hooks/useGenerateFlashcards';
import type { PracticeMode } from '@/types/app';

interface DeckProps {
  deckId: string;
  onBack: () => void;
  onStudy: () => void;
  onPractice: (mode: PracticeMode) => void;
}

const practiceConfig: { mode: PracticeMode; label: string; icon: React.ReactNode }[] = [
  { mode: 'match',  label: 'Match JP ↔ EN',    icon: <LayersIcon sx={{ fontSize: 15 }} /> },
  { mode: 'fill',   label: 'Fill in the Blank', icon: <EditNoteIcon sx={{ fontSize: 15 }} /> },
  { mode: 'recall', label: 'Recall Typing',     icon: <KeyboardIcon sx={{ fontSize: 15 }} /> },
];

/* ── Shared sidebar panel ── */
function SidePanel({ children }: { children: React.ReactNode }) {
  return (
    <Box sx={{
      border: '1.5px solid rgba(249,168,212,0.32)',
      borderRadius: '14px',
      p: '18px 20px',
      bgcolor: '#FFFFFF',
      boxShadow: '0 2px 10px rgba(249,168,212,0.1)',
    }}>
      {children}
    </Box>
  );
}

/* ── Eyebrow label ── */
function Label({ children }: { children: React.ReactNode }) {
  return (
    <Typography sx={{
      display: 'block',
      mb: 1.5,
      fontSize: '0.6rem',
      fontWeight: 800,
      letterSpacing: '0.16em',
      textTransform: 'uppercase',
      color: '#EC4899',
      fontFamily: '"Nunito", sans-serif',
    }}>
      {children}
    </Typography>
  );
}

export function Deck({ deckId, onBack, onStudy, onPractice }: DeckProps) {
  const { decks, loading: decksLoading, updateDeckCount } = useDecks();
  const deck = decks.find((d) => d.id === deckId);

  const [pickerOpen, setPickerOpen] = useState(false);

  const handleCountChange = useCallback(
    (count: number) => updateDeckCount(deckId, count),
    [deckId, updateDeckCount],
  );

  const { cards, addCards, deleteCard, loading: cardsLoading, updateCard, copyExistingCards } = useCards(deckId, handleCountChange);
  const { generating, error, generate } = useGenerateFlashcards();

  const handleGenerate = async (words: string[]) => {
    const generated = await generate(words, deckId);
    addCards(generated.map((card) => ({ ...card, deckId })));
  };

  if (decksLoading || cardsLoading) {
    return (
      <Box sx={{ maxWidth: 1200, mx: 'auto', px: { xs: 2, sm: 4 }, py: 4 }}>
        <Loading message="Loading cards…" />
      </Box>
    );
  }

  if (!deck) {
    return (
      <Box sx={{ p: 4 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={onBack}>Back</Button>
        <Typography color="error" sx={{ mt: 2 }}>Deck not found.</Typography>
      </Box>
    );
  }

  const practiceDisabled = cards.length < 2;

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', px: { xs: 2, sm: 4 }, py: { xs: 3, sm: 4 } }}>

      {/* ── DECK HEADER ── */}
      <Box sx={{
        position: 'relative',
        mb: 3,
        borderRadius: '16px',
        overflow: 'hidden',
        bgcolor: '#FFFFFF',
        border: '1.5px solid rgba(249,168,212,0.35)',
        boxShadow: '0 2px 12px rgba(249,168,212,0.12)',
      }}>
        {/* Gradient accent strip along left edge */}
        <Box sx={{
          position: 'absolute',
          left: 0, top: 0, bottom: 0,
          width: 4,
          background: 'linear-gradient(180deg, #FBCFE8 0%, #F472B6 50%, #C4B5FD 100%)',
          borderRadius: '16px 0 0 16px',
        }} />

        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          px: { xs: 2.5, sm: 3 },
          pl: { xs: 3.5, sm: 4 },
          py: { xs: 2, sm: 2.5 },
        }}>
          <IconButton
            onClick={onBack}
            size="small"
            sx={{
              border: '1.5px solid rgba(249,168,212,0.45)',
              borderRadius: '9px',
              width: 32,
              height: 32,
              flexShrink: 0,
              color: '#BE185D',
              '&:hover': { bgcolor: '#FFF0F8', borderColor: '#F472B6' },
            }}
          >
            <ArrowBackIcon sx={{ fontSize: 15 }} />
          </IconButton>

          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography variant="h4" sx={{ color: '#9D174D', lineHeight: 1.1 }}>
              {deck.name}
            </Typography>
            {deck.description && (
              <Typography variant="body2" sx={{ color: '#C2709A', mt: 0.25 }}>
                {deck.description}
              </Typography>
            )}
          </Box>

          <Chip
            label={`${cards.length} card${cards.length !== 1 ? 's' : ''}`}
            size="small"
            sx={{
              borderRadius: '8px',
              bgcolor: '#FFF0F8',
              border: '1.5px solid rgba(244,114,182,0.4)',
              color: '#BE185D',
              fontWeight: 800,
              fontSize: '0.7rem',
              flexShrink: 0,
            }}
          />
        </Box>
      </Box>

      {/* ── MAIN LAYOUT ── */}
      <Box sx={{
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        gap: 2.5,
        alignItems: 'flex-start',
      }}>

        {/* LEFT SIDEBAR */}
        <Box sx={{
          width: { xs: '100%', md: 248 },
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}>

          {/* Study & Practice panel */}
          <SidePanel>
            <Label>Study &amp; Practice</Label>
            <Stack spacing={1}>
              <Button
                fullWidth
                variant="contained"
                startIcon={<StyleIcon sx={{ fontSize: 15 }} />}
                onClick={onStudy}
                disabled={cards.length === 0}
                sx={{ borderRadius: '9px', justifyContent: 'flex-start', px: 2, py: '8px' }}
              >
                Flashcards
              </Button>

              <Divider />

              <Typography sx={{
                fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.12em',
                textTransform: 'uppercase', color: 'text.secondary',
                fontFamily: '"Nunito", sans-serif', pt: 0.25,
              }}>
                Practice Modes
              </Typography>

              {practiceConfig.map(({ mode, label, icon }) => (
                <Button
                  key={mode}
                  fullWidth
                  variant="outlined"
                  startIcon={icon}
                  onClick={() => onPractice(mode)}
                  disabled={practiceDisabled}
                  size="small"
                  sx={{
                    borderRadius: '9px',
                    justifyContent: 'flex-start',
                    px: 2,
                    py: '6px',
                    fontSize: '0.76rem',
                    letterSpacing: '0.01em',
                    textTransform: 'none',
                    fontWeight: 700,
                  }}
                >
                  {label}
                </Button>
              ))}

              {practiceDisabled && (
                <Typography sx={{
                  fontSize: '0.68rem',
                  color: 'text.secondary',
                  lineHeight: 1.5,
                  fontFamily: '"Nunito", sans-serif',
                  pt: 0.25,
                }}>
                  Add at least 2 cards to unlock practice modes.
                </Typography>
              )}
            </Stack>
          </SidePanel>

          {/* Add Cards panel */}
          <SidePanel>
            <Label>Add Cards</Label>
            <GenerateForm onGenerate={handleGenerate} generating={generating} error={error} />
            <Divider sx={{ my: 1.5, borderColor: 'rgba(249,168,212,0.3)' }} />
            <Button
              fullWidth
              variant="outlined"
              startIcon={<LibraryAddIcon sx={{ fontSize: 15 }} />}
              onClick={() => setPickerOpen(true)}
              size="small"
              sx={{
                borderRadius: '9px',
                justifyContent: 'flex-start',
                px: 2,
                py: '6px',
                fontSize: '0.76rem',
                letterSpacing: '0.01em',
                textTransform: 'none',
                fontWeight: 700,
              }}
            >
              Add Existing Cards
            </Button>
          </SidePanel>
        </Box>

        {/* RIGHT: Card grid */}
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Label>Cards in Deck</Label>

          {cards.length === 0 ? (
            <Box sx={{
              border: '1.5px dashed rgba(249,168,212,0.4)',
              borderRadius: '14px',
              p: 6,
              textAlign: 'center',
              bgcolor: 'rgba(255,255,255,0.6)',
            }}>
              <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                No cards yet — generate some from the panel on the left.
              </Typography>
            </Box>
          ) : (
            <Box sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: 'repeat(2, 1fr)',
                sm: 'repeat(3, 1fr)',
                lg: 'repeat(4, 1fr)',
              },
              gap: 1.75,
            }}>
              {cards.map((card) => (
                <ImageCard key={card.id} card={card} onDelete={deleteCard} onUpdate={updateCard}/>
              ))}
            </Box>
          )}
        </Box>
      </Box>

      {/* ── Add Existing Cards dialog ── */}
      <AddExistingCardsDialog
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        targetDeckId={deckId}
        onConfirm={copyExistingCards}
      />
    </Box>
  );
}