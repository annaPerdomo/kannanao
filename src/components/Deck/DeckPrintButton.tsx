'use client';
import PrintIcon from '@mui/icons-material/Print';
import Button from '@mui/material/Button';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

import { handoutPlanDeck } from '@/components/HandoutPage/printHandout';
import type { Deck } from '@/types/deck';
import type { Flashcard } from '@/types/flashcard';

const ReferenceSheetsDialog = dynamic(
  () =>
    import('@/components/MaterialsBuilder/ReferenceSheetsDialog').then(
      (m) => m.ReferenceSheetsDialog,
    ),
  { ssr: false },
);

interface DeckPrintButtonProps {
  deck: Deck;
  cards: Flashcard[];
}

export function DeckPrintButton({ deck, cards }: DeckPrintButtonProps) {
  const t = useTranslations('Deck.deckPage');
  const [open, setOpen] = useState(false);
  // Mounted on first open and kept, so closing still plays the dialog's exit.
  const [mounted, setMounted] = useState(false);

  const plan = useMemo(
    () => ({ decks: [handoutPlanDeck({ deckName: deck.name, emoji: deck.emoji, cards })] }),
    [deck.name, deck.emoji, cards],
  );

  return (
    <>
      <Button
        variant="outlined"
        size="small"
        startIcon={<PrintIcon sx={{ fontSize: 15 }} />}
        onClick={() => {
          setMounted(true);
          setOpen(true);
        }}
        sx={{
          borderRadius: '9px',
          px: 2,
          py: '5px',
          fontSize: '0.76rem',
          textTransform: 'none',
          fontWeight: 700,
        }}
      >
        {t('printButton')}
      </Button>
      {mounted && <ReferenceSheetsDialog open={open} onClose={() => setOpen(false)} plan={plan} />}
    </>
  );
}
