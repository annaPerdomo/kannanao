'use client';
import TuneIcon from '@mui/icons-material/Tune';
import { Box, Button, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useTranslations } from 'next-intl';

import { ShareEmbedSection } from '@/components/ShareEmbedDialog';
import { StyledDialog } from '@/components/StyledDialog';

import { ReadingPracticeRow } from './ReadingPracticeRow';

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
}

/**
 * Everything a deck's owner can switch on or off, in one place: which practice
 * modes are open to learners, and whether the deck is shared publicly.
 */
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
}: DeckSettingsDialogProps) {
  const t = useTranslations('Deck.settingsDialog');
  const tCommon = useTranslations('Common');
  const { brand } = useTheme().palette;

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
