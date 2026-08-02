'use client';
import TuneIcon from '@mui/icons-material/Tune';
import { Box, Button, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { ShareEmbedSection } from '@/components/ShareEmbedDialog';
import { StyledDialog } from '@/components/StyledDialog';
import { useDeckImages } from '@/hooks/useDeckImages';
import type { Flashcard, MainViewMode } from '@/types/flashcard';

import { CardPicturesRow } from './CardPicturesRow';
import { CardViewModeRow } from './CardViewModeRow';
import { ReadingPracticeRow } from './ReadingPracticeRow';

export { CardPicturesDialog } from './CardPicturesDialog';
export { CardPicturesRow } from './CardPicturesRow';
export { CardViewModeRow } from './CardViewModeRow';
export { ReadingPracticeRow } from './ReadingPracticeRow';

interface DeckSettingsDialogProps {
  open: boolean;
  onClose: () => void;
  deckId: string;
  deckName: string;
  isPublic: boolean;
  onPublicChange: (isPublic: boolean) => void;
  readingUnlocked: boolean;
  /** Cards in this deck that Reading could ask. */
  readingCardCount: number;
  onReadingChange: (enabled: boolean) => void;
  /** The mode every card shares, or null when the deck mixes modes. */
  cardViewMode: MainViewMode | null;
  cards: Flashcard[];
  onCardViewModeChange: (mode: MainViewMode) => Promise<void>;
  onUpdateCard: (id: string, patch: Partial<Flashcard>) => Promise<Flashcard | null>;
  /** Hands the freshly pictured cards over for a look once a fill finds some. */
  onImagesFilled?: (filled: Flashcard[]) => void;
}

/** Everything a deck's owner can switch on or off, in one place. */
export function DeckSettingsDialog({
  open,
  onClose,
  deckId,
  deckName,
  isPublic,
  onPublicChange,
  readingUnlocked,
  readingCardCount,
  onReadingChange,
  cardViewMode,
  cards,
  onCardViewModeChange,
  onUpdateCard,
  onImagesFilled,
}: DeckSettingsDialogProps) {
  const t = useTranslations('Deck.settingsDialog');
  const tCommon = useTranslations('Common');
  const { brand } = useTheme().palette;
  const images = useDeckImages(cards, onUpdateCard, onImagesFilled);

  // The run outlives the dialog — closing it mid-fill doesn't unmount this
  // component — so a reopen would otherwise still show the last run's alert.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) images.reset();
  }

  const sectionLabel = (text: string) => (
    <Typography
      sx={{
        fontSize: '0.7rem',
        fontWeight: 800,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: 'text.secondary',
        mb: 1,
      }}
    >
      {text}
    </Typography>
  );

  return (
    <StyledDialog
      open={open}
      onClose={onClose}
      title={t('title')}
      subtitle={deckName}
      icon={<TuneIcon sx={{ color: brand[600], fontSize: 20 }} />}
      maxWidth="sm"
      actions={
        <Button
          onClick={onClose}
          sx={{ color: 'text.secondary', textTransform: 'none', fontWeight: 700 }}
        >
          {tCommon('done')}
        </Button>
      }
    >
      <Box sx={{ mb: 3 }}>
        {sectionLabel(t('cardsSection'))}
        <CardViewModeRow
          value={cardViewMode}
          cardCount={cards.length}
          onChange={onCardViewModeChange}
        />
        <CardPicturesRow
          cards={images.pickable}
          selectedIds={images.selectedIds}
          selectedCount={images.selectedCount}
          missingCount={images.missingCount}
          filling={images.filling}
          result={images.result}
          error={images.error}
          onToggle={images.toggle}
          onSelectAll={images.selectAll}
          onSelectNone={images.selectNone}
          onFill={images.fetchSelectedImages}
        />
      </Box>

      <Box sx={{ mb: 3 }}>
        {sectionLabel(t('practiceSection'))}
        <ReadingPracticeRow
          unlocked={readingUnlocked}
          cardCount={readingCardCount}
          onToggle={onReadingChange}
        />
      </Box>

      <Box>
        {sectionLabel(t('sharingSection'))}
        <ShareEmbedSection
          deckId={deckId}
          deckName={deckName}
          isPublic={isPublic}
          onPublicChange={onPublicChange}
        />
      </Box>
    </StyledDialog>
  );
}
