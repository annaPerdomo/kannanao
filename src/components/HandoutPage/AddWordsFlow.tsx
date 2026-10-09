'use client';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { AddCardsModal } from '@/components/AddCards';
import { AddExistingCardsDialog } from '@/components/AddExistingCardsDialog';
import { PdfImportModal } from '@/components/PdfImportModal';
import { type PendingCard, ReviewCardsDialog } from '@/components/ReviewCardsDialog';
import { useAuth } from '@/contexts/AuthContext';
import { useCardReview } from '@/hooks/useCardReview';
import { useGenerateFlashcards } from '@/hooks/useGenerateFlashcards';
import { planCardsToGenerated, quizletCardsToPending } from '@/lib/lessonAi';
import { keptCards, type QuizletImportSet } from '@/lib/quizlet';
import { reuseThenFetch } from '@/services/cardPipeline';
import type { Flashcard, GeneratedCard, JlptLevel, MainViewMode } from '@/types/flashcard';
import type { LessonPlanResponse } from '@/types/lessonPlan';

import type { AddWordsSource } from './AddWordsMenu';
import { AiWordsDialog, type AiWordsMode } from './AiWordsDialog';
import type { ToastSeverity } from './constants';
import { QuizletWordsDialog } from './QuizletWordsDialog';

interface AddWordsFlowProps {
  activeSource: AddWordsSource | null;
  onClose: () => void;
  groupId: string;
  deckId: string;
  defaultLevel: JlptLevel;
  defaultGoal?: string;
  onAdd: (cards: PendingCard[]) => Promise<boolean>;
  onCopy: (cards: Flashcard[]) => Promise<boolean>;
  /** The warm-up note has no slot in ReviewCardsDialog, so it surfaces as a page toast instead. */
  onInfo: (message: string, severity?: ToastSeverity) => void;
}

export function AddWordsFlow({
  activeSource,
  onClose,
  groupId,
  deckId,
  defaultLevel,
  defaultGoal,
  onAdd,
  onCopy,
  onInfo,
}: AddWordsFlowProps) {
  const t = useTranslations('Materials.handoutPage.aiWords');
  const { user } = useAuth();
  const { generating, error, generate, regenerate } = useGenerateFlashcards();
  const review = useCardReview();
  const [mainViewMode, setMainViewMode] = useState<MainViewMode>('hiragana');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pdfOpen, setPdfOpen] = useState(false);
  const [aiMode, setAiMode] = useState<AiWordsMode | null>(null);
  const [quizletOpen, setQuizletOpen] = useState(false);

  useEffect(() => {
    if (activeSource === 'decks') setPickerOpen(true);
    if (activeSource === 'pdf') setPdfOpen(true);
    if (activeSource === 'topic' || activeSource === 'text') setAiMode(activeSource);
    if (activeSource === 'quizlet') setQuizletOpen(true);
  }, [activeSource]);

  const listOpen = activeSource === 'list' || activeSource === 'type';

  const handleGenerate = async (words: string[], mode: MainViewMode) => {
    setMainViewMode(mode);
    const generated = await generate(words, deckId, mode);
    onClose();
    review.review(generated);
  };

  const handlePdfCards = async (extracted: GeneratedCard[]) => {
    const cards = await reuseThenFetch(extracted, deckId, mainViewMode);
    setPdfOpen(false);
    onClose();
    review.review(cards);
  };

  const handleAiResult = async (result: LessonPlanResponse) => {
    setAiMode(null);
    onClose();
    if (result.warmUp && result.warmUp.length > 0) {
      onInfo(t('warmUpNote', { count: result.warmUp.length }), 'info');
    }
    const deck = result.plan.decks[0];
    if (!deck) return;
    const generated = planCardsToGenerated(deck.cards);
    const cards = await reuseThenFetch(generated, deckId, deck.mainViewMode);
    review.review(cards);
  };

  const handleQuizletPick = (set: QuizletImportSet) => {
    setQuizletOpen(false);
    onClose();
    review.review(quizletCardsToPending(keptCards(set)));
  };

  return (
    <>
      <AddCardsModal
        open={listOpen}
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
        onClose={() => {
          setPickerOpen(false);
          onClose();
        }}
        targetDeckId={deckId}
        userId={user?.id ?? ''}
        onConfirm={async (cards) => {
          await onCopy(cards.map((c) => ({ ...c, mainViewMode })));
        }}
      />
      <PdfImportModal
        open={pdfOpen}
        onClose={() => {
          setPdfOpen(false);
          onClose();
        }}
        onAddCards={handlePdfCards}
      />
      <AiWordsDialog
        open={aiMode != null}
        mode={aiMode ?? 'topic'}
        onClose={() => {
          setAiMode(null);
          onClose();
        }}
        groupId={groupId}
        defaultLevel={defaultLevel}
        defaultGoal={defaultGoal}
        onResult={(result) => void handleAiResult(result)}
      />
      <QuizletWordsDialog
        open={quizletOpen}
        onClose={() => {
          setQuizletOpen(false);
          onClose();
        }}
        groupId={groupId}
        onPick={handleQuizletPick}
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
