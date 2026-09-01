'use client';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { useCardReview } from '@/hooks/useCardReview';
import { useDecks } from '@/hooks/useDecks';
import { useGenerateFlashcards } from '@/hooks/useGenerateFlashcards';
import { errorMessage } from '@/lib/errorMessage';
import { dbCopyCardsIntoDeck, dbInsertCards } from '@/lib/supabase';
import { reuseThenFetch } from '@/services/cardPipeline';
import type { Flashcard, GeneratedCard, MainViewMode } from '@/types/flashcard';

/**
 * Deck creation plus its four "add cards" doors (generate, PDF, copy existing,
 * none). The AI doors hand off to the same Review Cards step the deck page
 * uses, so a card created here is identical to one created there.
 */
export function useCreateDeckFlow(onClose: () => void) {
  const t = useTranslations('Deck.createDeckDialog');
  const router = useRouter();
  const { createDeck, pinDeck, setDeckReadingPractice } = useDecks();
  const { generating, error: generateError, generate, regenerate } = useGenerateFlashcards();
  const review = useCardReview();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [input, setInput] = useState('');
  const [words, setWords] = useState<string[]>([]);
  const [pinToHome, setPinToHome] = useState(false);
  const [mainViewMode, setMainViewMode] = useState<MainViewMode>('hiragana');
  const [readingPractice, setReadingPracticeState] = useState(false);
  const [readingTouched, setReadingTouched] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createdDeckId, setCreatedDeckId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pdfOpen, setPdfOpen] = useState(false);
  const [flowError, setFlowError] = useState<string | null>(null);

  const busy = creating || generating;
  const canGenerate = words.length > 0 || input.trim().length > 0;

  // A deck whose cards lead with kanji is exactly the deck Reading was built
  // for, so the toggle follows the view choice — until one manual flip, after
  // which it stays where the user put it.
  const changeMainViewMode = (mode: MainViewMode) => {
    setMainViewMode(mode);
    if (!readingTouched) setReadingPracticeState(mode === 'kanji');
  };

  const setReadingPractice = (enabled: boolean) => {
    setReadingTouched(true);
    setReadingPracticeState(enabled);
  };

  /** True while Reading was switched on by the kanji-view choice, not the user. */
  const readingAuto = readingPractice && !readingTouched;

  const reset = () => {
    setName('');
    setDescription('');
    setInput('');
    setWords([]);
    setPinToHome(false);
    setMainViewMode('hiragana');
    setReadingPracticeState(false);
    setReadingTouched(false);
    setCreating(false);
    setCreatedDeckId(null);
    setFlowError(null);
    review.clear();
  };

  const navigateToDeck = (deckId: string) => {
    reset();
    onClose();
    router.push(`/deck/${deckId}`);
  };

  /** Create the deck the "add cards" doors need before they can open. */
  const startDeck = async (): Promise<string | null> => {
    if (busy) return null;
    if (!name.trim()) {
      setFlowError(t('nameRequired'));
      return null;
    }
    setCreating(true);
    setFlowError(null);
    try {
      const deck = await createDeck(name.trim(), description.trim() || undefined);
      if (pinToHome) await pinDeck(deck.id, true);
      if (readingPractice) await setDeckReadingPractice(deck.id, true);
      setCreatedDeckId(deck.id);
      return deck.id;
    } catch (err) {
      setFlowError(errorMessage(err, t('createFailed')));
      return null;
    } finally {
      setCreating(false);
    }
  };

  const handleCreate = async () => {
    const deckId = await startDeck();
    if (!deckId) return;

    const finalWords = input.trim() ? [...words, input.trim()] : words;
    if (finalWords.length === 0) {
      navigateToDeck(deckId);
      return;
    }

    try {
      const generated = await generate(finalWords, deckId, mainViewMode);
      // Hide the create dialog but stay mounted — the review step renders on top.
      onClose();
      review.review(generated);
    } catch {
      // useGenerateFlashcards already surfaced the message; the empty deck stays
      // so the user can retry from the deck page instead of losing their name.
    }
  };

  const handleAddExisting = async () => {
    const deckId = await startDeck();
    if (deckId) setPickerOpen(true);
  };

  const handleImportPdf = async () => {
    const deckId = await startDeck();
    if (deckId) setPdfOpen(true);
  };

  const handlePdfCards = async (extracted: GeneratedCard[]) => {
    if (!createdDeckId) return;
    setCreating(true);
    try {
      const cards = await reuseThenFetch(extracted, createdDeckId, mainViewMode);
      setPdfOpen(false);
      onClose();
      review.review(cards);
    } catch (err) {
      setFlowError(errorMessage(err, t('createFailed')));
    } finally {
      setCreating(false);
    }
  };

  const handleRegenerate = async (words: string[], instruction: string) => {
    if (!createdDeckId) return [];
    return regenerate(words, instruction, createdDeckId, mainViewMode);
  };

  const handleReviewConfirm = async (confirmed: typeof review.cards) => {
    if (!createdDeckId) return;
    const deckId = createdDeckId;
    await dbInsertCards(
      deckId,
      confirmed.map((card) => ({ ...card, deckId })),
    );
    navigateToDeck(deckId);
  };

  const handlePickerConfirm = async (cards: Flashcard[]) => {
    if (!createdDeckId) return;
    await dbCopyCardsIntoDeck(createdDeckId, cards);
    setPickerOpen(false);
    navigateToDeck(createdDeckId);
  };

  return {
    // form state
    name,
    setName,
    description,
    setDescription,
    input,
    setInput,
    words,
    setWords,
    pinToHome,
    setPinToHome,
    mainViewMode,
    setMainViewMode: changeMainViewMode,
    readingPractice,
    readingAuto,
    setReadingPractice,
    // flow state
    busy,
    creating,
    generating,
    canGenerate,
    error: flowError ?? generateError,
    createdDeckId,
    pickerOpen,
    setPickerOpen,
    pdfOpen,
    setPdfOpen,
    review,
    // actions
    handleCreate,
    handleRegenerate,
    handleAddExisting,
    handleImportPdf,
    handlePdfCards,
    handleReviewConfirm,
    handlePickerConfirm,
    navigateToDeck,
  };
}
