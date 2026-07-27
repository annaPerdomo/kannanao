'use client';
import Box from '@mui/material/Box';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';

import { CardFrame, CardStatBox, CardTopBar } from '@/components/CardFrame';
import type { Deck } from '@/types/deck';

import { DeckActions } from './DeckActions';

export { DeckActions } from './DeckActions';
export { DeckTile } from './DeckTile';

interface DeckCardProps {
  deck: Deck;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  onShare?: (id: string) => void;
  onPin?: (id: string, pinned: boolean) => void;
  onEmojiChange?: (id: string, emoji: string | null) => void;
  isOwner?: boolean;
}

export function DeckCard({
  deck,
  onOpen,
  onDelete,
  onShare,
  onPin,
  onEmojiChange,
  isOwner = true,
}: DeckCardProps) {
  const t = useTranslations('Deck.deckCard');
  const theme = useTheme();
  const { brand } = theme.palette;

  return (
    <CardFrame onOpen={() => onOpen(deck.id)} ariaLabel={t('openDeckAria', { name: deck.name })}>
      <CardTopBar kind={t('cardDeck')} xpLabel={t('xp')} xp={deck.cardCount * 10} />

      {/* Deck name — centered, fixed height for consistency */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          px: 2,
          height: 120,
          borderBottom: `2px solid ${brand[400]}`,
        }}
      >
        {deck.emoji && (
          <Box component="span" sx={{ fontSize: '1.6rem', lineHeight: 1, mb: 0.5 }}>
            {deck.emoji}
          </Box>
        )}
        <Typography
          sx={{
            fontSize: '1.3rem',
            fontWeight: 900,
            color: 'text.primary',
            lineHeight: 1.15,
            textAlign: 'center',
            // Two cards per row on a phone leaves less width than a single long
            // word, and the card face clips its overflow.
            overflowWrap: 'anywhere',
          }}
        >
          {deck.name}
        </Typography>
        {deck.description && (
          <Typography
            sx={{
              fontSize: '0.65rem',
              color: '#888',
              fontStyle: 'italic',
              lineHeight: 1.3,
              mt: 0.5,
              textAlign: 'center',
            }}
          >
            {deck.description}
          </Typography>
        )}
      </Box>

      <CardStatBox label={t('starCards')} value={t('cardsCount', { count: deck.cardCount })} />

      {/* Footer */}
      <Box
        sx={{
          mt: 'auto',
          px: 1.5,
          py: '8px',
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
        }}
      >
        <DeckActions
          deck={deck}
          onDelete={onDelete}
          onShare={onShare}
          onPin={onPin}
          onEmojiChange={onEmojiChange}
          isOwner={isOwner}
        />
      </Box>
    </CardFrame>
  );
}
