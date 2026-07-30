'use client';

import type { DragEndEvent } from '@dnd-kit/core';
import {
  closestCenter,
  DndContext,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { arrayMove, rectSortingStrategy, SortableContext } from '@dnd-kit/sortable';
import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckIcon from '@mui/icons-material/Check';
import SwapVertIcon from '@mui/icons-material/SwapVert';
import { Box, Button, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';

import { AddCardsModal } from '@/components/AddCards';
import { AddExistingCardsDialog } from '@/components/AddExistingCardsDialog';
import { BestQuizLine, DeckHeader, Label, PracticeHero } from '@/components/Deck';
import { ImageCard } from '@/components/ImageCard';
import { Loading } from '@/components/Loading';
import { PdfImportModal } from '@/components/PdfImportModal';
import { ReorderBanner } from '@/components/ReorderBanner';
import { ReviewCardsDialog } from '@/components/ReviewCardsDialog';
import { ShareEmbedDialog } from '@/components/ShareEmbedDialog';
import { SortableImageCard } from '@/components/SortableImageCard';
import { useAuth } from '@/contexts/AuthContext';
import { useCardReview } from '@/hooks/useCardReview';
import { useCards } from '@/hooks/useCards';
import { useDecks } from '@/hooks/useDecks';
import { useGenerateFlashcards } from '@/hooks/useGenerateFlashcards';
import { withImages } from '@/services/cardPipeline';
import { LAYOUT } from '@/theme';
import type { PracticeMode } from '@/types/app';
import type { GeneratedCard, MainViewMode } from '@/types/flashcard';

interface DeckProps {
  deckId: string;
  onBack: () => void;
  onStudy: () => void;
  onPractice: (mode: PracticeMode) => void;
}

export default function Deck({ deckId, onBack, onStudy, onPractice }: DeckProps) {
  const t = useTranslations('Deck.deckPage');
  const tCommon = useTranslations('Common');
  const theme = useTheme();
  const { accent } = theme.palette;
  const { user, isMemberAccount } = useAuth();
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
  const [pendingMainViewMode, setPendingMainViewMode] = useState<MainViewMode>('hiragana');
  const [reordering, setReordering] = useState(false);
  const review = useCardReview();

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
    reorderCards,
  } = useCards(deckId, handleCountChange);
  const { generating, error, generate } = useGenerateFlashcards();

  const canReorder = !isMemberAccount && cards.length > 1;
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  );

  const handleCardDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIndex = cards.findIndex((c) => c.id === active.id);
      const newIndex = cards.findIndex((c) => c.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;
      reorderCards(arrayMove(cards, oldIndex, newIndex));
    },
    [cards, reorderCards],
  );

  const handleGenerate = async (words: string[], mainViewMode: MainViewMode) => {
    const generated = await generate(words, deckId, mainViewMode);
    setAddCardsOpen(false);
    review.review(generated);
  };

  const handlePdfCards = async (extracted: GeneratedCard[]) => {
    const cards = await withImages(extracted, deckId, pendingMainViewMode);
    setPdfImportOpen(false);
    review.review(cards);
  };

  if (decksLoading || cardsLoading) {
    return (
      <Box
        sx={{ maxWidth: LAYOUT.contentMaxWidth, mx: 'auto', px: { xs: 1.5, sm: 2, lg: 3 }, py: 4 }}
      >
        <Loading message={t('loadingCards')} />
      </Box>
    );
  }

  if (!deck) {
    return (
      <Box sx={{ p: 4 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={onBack}>
          {tCommon('back')}
        </Button>
        <Typography color="error" sx={{ mt: 2 }}>
          {t('deckNotFound')}
        </Typography>
      </Box>
    );
  }

  const cardGrid = (
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
        <ImageCard
          key={card.id}
          card={card}
          onDelete={deleteCard}
          onUpdate={updateCard}
          readOnly={isMemberAccount}
        />
      ))}
    </Box>
  );

  const sortableCardGrid = (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleCardDragEnd}>
      <SortableContext items={cards.map((c) => c.id)} strategy={rectSortingStrategy}>
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
            <SortableImageCard
              key={card.id}
              card={card}
              onDelete={deleteCard}
              onUpdate={updateCard}
            />
          ))}
        </Box>
      </SortableContext>
    </DndContext>
  );

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
          readOnly={isMemberAccount}
        />

        <PracticeHero cardCount={cards.length} onStudy={onStudy} onPractice={onPractice} />

        {cards.length > 0 && <BestQuizLine deckId={deckId} />}
      </Box>

      {/* ── CARDS ── */}
      <Box>
        <Box
          sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}
        >
          <Label>{t('cardsInDeckLabel')}</Label>
          <Box sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
            {canReorder && (
              <Button
                variant={reordering ? 'contained' : 'outlined'}
                size="small"
                startIcon={
                  reordering ? (
                    <CheckIcon sx={{ fontSize: 15 }} />
                  ) : (
                    <SwapVertIcon sx={{ fontSize: 15 }} />
                  )
                }
                onClick={() => setReordering((v) => !v)}
                sx={{
                  borderRadius: '9px',
                  px: 2,
                  py: '5px',
                  fontSize: '0.76rem',
                  textTransform: 'none',
                  fontWeight: 700,
                  ...(reordering
                    ? {
                        background: `linear-gradient(135deg, ${accent[400]}, ${accent[500]})`,
                        '&:hover': {
                          background: `linear-gradient(135deg, ${accent[500]}, ${accent[600]})`,
                        },
                      }
                    : {
                        borderColor: alpha(accent[400], 0.5),
                        color: accent[600],
                        '&:hover': {
                          borderColor: accent[500],
                          bgcolor: alpha(accent[100], 0.5),
                        },
                      }),
                }}
              >
                {reordering ? tCommon('done') : t('reorderButton')}
              </Button>
            )}
            {!isMemberAccount && !reordering && (
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
                }}
              >
                {t('addCardsButton')}
              </Button>
            )}
          </Box>
        </Box>

        {reordering && <ReorderBanner label={t('reorderBannerLabel')} />}

        {cards.length === 0 ? (
          <Box
            sx={{
              border: (t) => `1.5px dashed ${alpha(t.palette.brand[300], 0.4)}`,
              borderRadius: '14px',
              p: 6,
              textAlign: 'center',
              bgcolor: 'rgba(255,255,255,0.6)',
            }}
          >
            <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
              {isMemberAccount
                ? t('noCardsMemberMessage')
                : t.rich('noCardsOwnerMessage', {
                    link: (chunks) => (
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
                        {chunks}
                      </Box>
                    ),
                  })}
            </Typography>
          </Box>
        ) : reordering ? (
          sortableCardGrid
        ) : (
          cardGrid
        )}
      </Box>

      {!isMemberAccount && (
        <>
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
        </>
      )}

      <ReviewCardsDialog
        open={review.open}
        cards={review.cards}
        onClose={review.close}
        onConfirm={(confirmed) => {
          addCards(confirmed.map((c) => ({ ...c, deckId })));
          review.clear();
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
