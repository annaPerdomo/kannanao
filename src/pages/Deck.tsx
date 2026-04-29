'use client';

import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { Box, Button, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { useCallback, useState } from 'react';

import { AddCardsModal } from '@/components/AddCards';
import { AddExistingCardsDialog } from '@/components/AddExistingCardsDialog';
import { DeckHeader, Label, PracticeHero } from '@/components/Deck';
import { ImageCard } from '@/components/ImageCard';
import { Loading } from '@/components/Loading';
import { PdfImportModal } from '@/components/PdfImportModal';
import { ReviewCardsDialog } from '@/components/ReviewCardsDialog';
import { ShareEmbedDialog } from '@/components/ShareEmbedDialog';
import { useAuth } from '@/contexts/AuthContext';
import { useCards } from '@/hooks/useCards';
import { useDecks } from '@/hooks/useDecks';
import { useGenerateFlashcards } from '@/hooks/useGenerateFlashcards';
import { encodeUnsplashUrl, fetchImage, triggerUnsplashDownload } from '@/services/api';
import { LAYOUT } from '@/theme';
import type { PracticeMode } from '@/types/app';
import type { Flashcard, GeneratedCard } from '@/types/flashcard';

interface DeckProps {
  deckId: string;
  onBack: () => void;
  onStudy: () => void;
  onPractice: (mode: PracticeMode) => void;
}

export default function Deck({ deckId, onBack, onStudy, onPractice }: DeckProps) {
  const { user } = useAuth();
  const {
    decks,
    loading: decksLoading,
    updateDeckCount,
    renameDeck,
    pinDeck,
    setDeckPublic,
    updateDeckEmoji,
  } = useDecks();
  const deck = decks.find((d) => d.id === deckId);

  const [pdfImportOpen, setPdfImportOpen] = useState(false);
  const [addCardsOpen, setAddCardsOpen] = useState(false);
  const [embedOpen, setEmbedOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pendingMainViewMode, setPendingMainViewMode] = useState<'hiragana' | 'kanji'>('hiragana');
  const [reviewCards, setReviewCards] = useState<
    (Omit<Flashcard, 'id' | 'deckId'> & { image_query: string })[]
  >([]);
  const [reviewOpen, setReviewOpen] = useState(false);

  const handleCountChange = useCallback(
    (count: number) => updateDeckCount(deckId, count),
    [deckId, updateDeckCount],
  );

  const {
    cards,
    addCards,
    deleteCard,
    loading: cardsLoading,
    updateCard,
    copyExistingCards,
  } = useCards(deckId, handleCountChange);
  const { generating, error, generate } = useGenerateFlashcards();

  const handleGenerate = async (words: string[], mainViewMode: 'hiragana' | 'kanji') => {
    const generated = await generate(words, deckId, mainViewMode);
    setAddCardsOpen(false);
    setReviewCards(generated as typeof reviewCards);
    setReviewOpen(true);
  };

  const handlePdfCards = async (extracted: GeneratedCard[]) => {
    const withImages = await Promise.all(
      extracted.map(async (card) => {
        const result = await fetchImage(card.image_query).catch(() => null);
        if (result) triggerUnsplashDownload(result.downloadLocation);
        return {
          ...card,
          imageUrl: result ? encodeUnsplashUrl(result) : undefined,
          mainViewMode: pendingMainViewMode,
          cardType: card.card_type,
          jlptLevel: card.jlpt_level ?? undefined,
        };
      }),
    );
    setPdfImportOpen(false);
    setReviewCards(withImages);
    setReviewOpen(true);
  };

  if (decksLoading || cardsLoading) {
    return (
      <Box
        sx={{ maxWidth: LAYOUT.contentMaxWidth, mx: 'auto', px: { xs: 1.5, sm: 2, lg: 3 }, py: 4 }}
      >
        <Loading message="Loading cards…" />
      </Box>
    );
  }

  if (!deck) {
    return (
      <Box sx={{ p: 4 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={onBack}>
          Back
        </Button>
        <Typography color="error" sx={{ mt: 2 }}>
          Deck not found.
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        maxWidth: LAYOUT.contentMaxWidth,
        mx: 'auto',
        px: { xs: 1.5, sm: 2, lg: 3 },
        py: { xs: 3, sm: 4 },
      }}
    >
      <Box sx={{ maxWidth: LAYOUT.headerMaxWidth, mx: 'auto' }}>
        <DeckHeader
          deck={deck}
          cardCount={cards.length}
          onBack={onBack}
          onRename={renameDeck}
          onPin={pinDeck}
          onEmbedOpen={() => setEmbedOpen(true)}
          onEmojiChange={updateDeckEmoji}
        />

        <PracticeHero cardCount={cards.length} onStudy={onStudy} onPractice={onPractice} />
      </Box>

      {/* ── CARDS ── */}
      <Box>
        <Box
          sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}
        >
          <Label>Cards in Deck</Label>
          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon sx={{ fontSize: 15 }} />}
            onClick={() => setAddCardsOpen(true)}
            sx={{
              borderRadius: '9px',
              px: 2,
              py: '5px',
              fontSize: '0.76rem',
              textTransform: 'none',
              fontWeight: 700,
              mb: 1.5,
            }}
          >
            Add Cards
          </Button>
        </Box>

        {cards.length === 0 ? (
          <Box
            sx={{
              border: (theme) => `1.5px dashed ${alpha(theme.palette.brand[300], 0.4)}`,
              borderRadius: '14px',
              p: 6,
              textAlign: 'center',
              bgcolor: 'rgba(255,255,255,0.6)',
            }}
          >
            <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
              No cards yet —{' '}
              <Box
                component="span"
                onClick={() => setAddCardsOpen(true)}
                sx={{
                  color: 'primary.main',
                  fontWeight: 700,
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  textUnderlineOffset: 2,
                }}
              >
                add some
              </Box>{' '}
              to get started.
            </Typography>
          </Box>
        ) : (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: 'repeat(2, 1fr)',
                sm: 'repeat(3, 1fr)',
                md: 'repeat(4, 1fr)',
                lg: 'repeat(5, 1fr)',
              },
              gap: 1.5,
            }}
          >
            {cards.map((card) => (
              <ImageCard key={card.id} card={card} onDelete={deleteCard} onUpdate={updateCard} />
            ))}
          </Box>
        )}
      </Box>

      <AddCardsModal
        open={addCardsOpen}
        onClose={() => setAddCardsOpen(false)}
        onGenerate={handleGenerate}
        generating={generating}
        error={error}
        onAddExisting={(mainViewMode) => {
          setPendingMainViewMode(mainViewMode);
          setAddCardsOpen(false);
          setPickerOpen(true);
        }}
        onImportPdf={(mainViewMode) => {
          setPendingMainViewMode(mainViewMode);
          setAddCardsOpen(false);
          setPdfImportOpen(true);
        }}
      />

      <AddExistingCardsDialog
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        targetDeckId={deckId}
        userId={user?.id ?? ''}
        onConfirm={(cards) =>
          copyExistingCards(cards.map((c) => ({ ...c, mainViewMode: pendingMainViewMode })))
        }
      />

      <PdfImportModal
        open={pdfImportOpen}
        onClose={() => setPdfImportOpen(false)}
        onAddCards={handlePdfCards}
      />

      <ReviewCardsDialog
        open={reviewOpen}
        cards={reviewCards}
        onClose={() => setReviewOpen(false)}
        onConfirm={(confirmed) => {
          addCards(confirmed.map((c) => ({ ...c, deckId })));
          setReviewOpen(false);
          setReviewCards([]);
        }}
      />

      <ShareEmbedDialog
        open={embedOpen}
        onClose={() => setEmbedOpen(false)}
        deckId={deckId}
        deckName={deck.name}
        isPublic={deck.isPublic ?? false}
        onPublicChange={(val) => setDeckPublic(deckId, val)}
      />
    </Box>
  );
}
