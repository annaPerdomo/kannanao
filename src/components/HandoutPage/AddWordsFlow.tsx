'use client';
import { useState } from 'react';

import { AddCardsModal } from '@/components/AddCards';
import { AddExistingCardsDialog } from '@/components/AddExistingCardsDialog';
import { PdfImportModal } from '@/components/PdfImportModal';
import { type PendingCard, ReviewCardsDialog } from '@/components/ReviewCardsDialog';
import { useAuth } from '@/contexts/AuthContext';
import { useCardReview } from '@/hooks/useCardReview';
import { useGenerateFlashcards } from '@/hooks/useGenerateFlashcards';
import { reuseThenFetch } from '@/services/cardPipeline';
import type { Flashcard, GeneratedCard, MainViewMode } from '@/types/flashcard';

interface AddWordsFlowProps {
  open: boolean;
  onClose: () => void;
  deckId: string;
  onAdd: (cards: PendingCard[]) => Promise<boolean>;
  onCopy: (cards: Flashcard[]) => Promise<boolean>;
}

export function AddWordsFlow({ open, onClose, deckId, onAdd, onCopy }: AddWordsFlowProps) {
  const { user } = useAuth();
  const { generating, error, generate, regenerate } = useGenerateFlashcards();
  const review = useCardReview();
  const [mainViewMode, setMainViewMode] = useState<MainViewMode>('hiragana');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pdfOpen, setPdfOpen] = useState(false);

  const handleGenerate = async (words: string[], mode: MainViewMode) => {
    setMainViewMode(mode);
    const generated = await generate(words, deckId, mode);
    onClose();
    review.review(generated);
  };

  const handlePdfCards = async (extracted: GeneratedCard[]) => {
    const cards = await reuseThenFetch(extracted, deckId, mainViewMode);
    setPdfOpen(false);
    review.review(cards);
  };

  return (
    <>
      <AddCardsModal
        open={open}
        onClose={onClose}
        onGenerate={handleGenerate}
        generating={generating}
        error={error}
        onAddExisting={(mode) => {
          setMainViewMode(mode);
          onClose();
          setPickerOpen(true);
        }}
        onImportPdf={(mode) => {
          setMainViewMode(mode);
          onClose();
          setPdfOpen(true);
        }}
      />
      <AddExistingCardsDialog
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        targetDeckId={deckId}
        userId={user?.id ?? ''}
        onConfirm={async (cards) => {
          await onCopy(cards.map((c) => ({ ...c, mainViewMode })));
        }}
      />
      <PdfImportModal
        open={pdfOpen}
        onClose={() => setPdfOpen(false)}
        onAddCards={handlePdfCards}
      />
      <ReviewCardsDialog
        open={review.open}
        cards={review.cards}
        onClose={review.close}
        onRegenerate={(words, instruction) => regenerate(words, instruction, deckId, mainViewMode)}
        onConfirm={(confirmed) => {
          void onAdd(confirmed);
          review.clear();
        }}
      />
    </>
  );
}
