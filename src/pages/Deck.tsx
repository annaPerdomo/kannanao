'use client';
import { useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Stack,
  Divider,
  Chip,
  IconButton,
  Grid,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import StyleIcon from '@mui/icons-material/Style';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import { GenerateForm } from '@/components/GenerateForm';
import { ImageCard } from '@/components/ImageCard';
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

export function Deck({ deckId, onBack, onStudy, onPractice }: DeckProps) {
  const { decks, updateDeckCount } = useDecks();
  const deck = decks.find((d) => d.id === deckId);

  const handleCountChange = useCallback(
    (count: number) => updateDeckCount(deckId, count),
    [deckId, updateDeckCount],
  );

  const { cards, addCards, deleteCard } = useCards(deckId, handleCountChange);
  const { generating, error, generate } = useGenerateFlashcards();

  const handleGenerate = async (words: string[]) => {
    const generated = await generate(words, deckId);
    addCards(generated.map((card) => ({ ...card, deckId })));
  };

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
    <Box sx={{ maxWidth: 1100, mx: 'auto', px: { xs: 2, sm: 4 }, py: 4 }}>
      {/* Top bar */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 4, p: 3, borderRadius: 3, bgcolor: '#FFF2F8', border: '1px solid rgba(249,168,212,0.45)', boxShadow: '0 18px 36px rgba(249,168,212,0.12)' }}>
        <IconButton onClick={onBack} size="small">
          <ArrowBackIcon fontSize="small" />
        </IconButton>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h4" sx={{ lineHeight: 1.1, color: '#BE185D' }}>{deck.name}</Typography>
          {deck.description && (
            <Typography variant="body2" color="text.secondary">{deck.description}</Typography>
          )}
        </Box>
        <Chip label={`${cards.length} card${cards.length !== 1 ? 's' : ''}`} size="small" />
      </Box>

      <Grid container spacing={4}>
        {/* Left column — generate + actions */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Box
            sx={{
              border: '1px solid rgba(249,168,212,0.45)',
              borderRadius: 3,
              p: 3,
              bgcolor: '#FFF3F9',
              mb: 3,
              boxShadow: '0 12px 24px rgba(249,168,212,0.12)',
            }}
          >
            <Typography variant="caption" sx={{ color: 'primary.main', letterSpacing: '0.12em', display: 'block', mb: 2 }}>
              GENERATE CARDS
            </Typography>
            <GenerateForm onGenerate={handleGenerate} generating={generating} error={error} />
          </Box>

          {/* Study & Practice actions */}
          <Box
            sx={{
              border: '1px solid rgba(249,168,212,0.45)',
              borderRadius: 3,
              p: 3,
              bgcolor: '#FFF3F9',
            }}
          >
            <Typography variant="caption" sx={{ color: 'primary.main', letterSpacing: '0.12em', display: 'block', mb: 2 }}>
              STUDY &amp; PRACTICE
            </Typography>
            <Stack spacing={1.5}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<StyleIcon />}
                onClick={onStudy}
                disabled={cards.length === 0}
              >
                Flashcards
              </Button>

              <Divider />

              <Typography variant="caption" sx={{ color: 'text.secondary', letterSpacing: '0.08em' }}>
                PRACTICE MODES
              </Typography>

              {(['match', 'fill', 'recall'] as PracticeMode[]).map((mode) => (
                <Button
                  key={mode}
                  fullWidth
                  variant="outlined"
                  startIcon={<SportsEsportsIcon />}
                  onClick={() => onPractice(mode)}
                  disabled={practiceDisabled}
                  size="small"
                  sx={{ justifyContent: 'flex-start', textTransform: 'uppercase', fontSize: '0.7rem' }}
                >
                  {mode === 'match' ? 'Match JP ↔ EN' : mode === 'fill' ? 'Fill in the Blank' : 'Recall Typing'}
                </Button>
              ))}

              {practiceDisabled && (
                <Typography variant="caption" color="text.secondary">
                  Add at least 2 cards to unlock practice modes.
                </Typography>
              )}
            </Stack>
          </Box>
        </Grid>

        {/* Right column — card list */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Typography variant="caption" sx={{ color: 'primary.main', letterSpacing: '0.12em', display: 'block', mb: 2 }}>
            CARDS IN DECK
          </Typography>
          {cards.length === 0 ? (
            <Box
              sx={{
                border: '1px dashed rgba(249,168,212,0.35)',
                borderRadius: 3,
                p: 6,
                textAlign: 'center',
                bgcolor: '#FFF4FB',
                boxShadow: '0 12px 24px rgba(249,168,212,0.1)',
              }}
            >
              <Typography color="text.secondary">
                No cards yet — generate some from the panel on the left.
              </Typography>
            </Box>
          ) : (
            <Stack spacing={1}>
              {cards.map((card) => (
                <ImageCard key={card.id} card={card} onDelete={deleteCard} />
              ))}
            </Stack>
          )}
        </Grid>
      </Grid>
    </Box>
  );
}
