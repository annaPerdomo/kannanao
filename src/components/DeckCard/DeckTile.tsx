'use client';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';

import type { Deck } from '@/types/deck';

import { DeckActions, type DeckActionsProps } from './DeckActions';

/**
 * A deck tile is a card, so it holds a card's proportions rather than whatever
 * its contents happen to need. Roughly 5:7 — the ratio of the flashcards it
 * stands for; left to size itself a two-line deck came out square.
 */
export const DECK_TILE_MIN_HEIGHT = 236;

interface DeckTileProps extends Omit<DeckActionsProps, 'size'> {
  deck: Deck;
  onOpen: (id: string) => void;
}

/**
 * The home dashboard's deck tile. Flat where the /decks page's DeckCard is a
 * collectible — the dashboard's half-width panel doesn't have the vertical
 * space for that trading-card chrome. Controls are the shared DeckActions
 * component, so a deck behaves identically in both places.
 */
export function DeckTile({ deck, onOpen, ...actions }: DeckTileProps) {
  const t = useTranslations('Deck.deckCard');
  const theme = useTheme();
  const { brand, accent } = theme.palette;

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: DECK_TILE_MIN_HEIGHT,
        borderRadius: (th) => th.radii.card,
        overflow: 'hidden',
        border: `1.5px solid ${alpha(brand[300], 0.3)}`,
        bgcolor: 'background.paper',
        boxShadow: `0 10px 30px ${alpha(brand[400], 0.1)}`,
        transition: 'transform 0.12s ease, border-color 0.12s ease',
        '&:hover': { transform: 'translateY(-2px)', borderColor: brand[400] },
      }}
    >
      <Box
        sx={{
          px: 1.25,
          py: 0.6,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 1,
          background: `linear-gradient(90deg, ${brand[400]}, ${accent[400]})`,
        }}
      >
        <Typography
          noWrap
          sx={{
            fontSize: '0.6rem',
            fontWeight: 900,
            color: 'common.white',
            textTransform: 'uppercase',
            letterSpacing: '0.07em',
          }}
        >
          {t('cardDeck')}
        </Typography>
        <Typography
          sx={{
            fontSize: '0.6rem',
            fontWeight: 900,
            color: 'common.white',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            flexShrink: 0,
          }}
        >
          {t('xp')} {deck.cardCount * 10}
        </Typography>
      </Box>

      <ButtonBase
        onClick={() => onOpen(deck.id)}
        focusRipple
        aria-label={t('openDeckAria', { name: deck.name })}
        sx={{
          flex: 1,
          flexDirection: 'column',
          alignItems: 'stretch',
          justifyContent: 'flex-start',
          px: 1.5,
          pt: 1.5,
          pb: 1,
        }}
      >
        <Box
          sx={{
            flex: 1,
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          {deck.emoji && (
            <Typography component="span" sx={{ fontSize: '1.4rem', lineHeight: 1 }}>
              {deck.emoji}
            </Typography>
          )}
          <Typography
            sx={{
              mt: deck.emoji ? 0.5 : 0,
              fontSize: '0.95rem',
              fontWeight: 800,
              lineHeight: 1.2,
              color: brand[900],
              // Two tiles per row on a phone leaves less width than a single
              // long word, and the tile clips its overflow.
              overflowWrap: 'anywhere',
            }}
          >
            {deck.name}
          </Typography>
          {deck.description && (
            <Typography
              sx={{
                mt: 0.25,
                fontSize: '0.7rem',
                fontStyle: 'italic',
                lineHeight: 1.3,
                color: 'text.secondary',
              }}
            >
              {deck.description}
            </Typography>
          )}
        </Box>

        <Box
          sx={{
            mt: 1.25,
            pt: 1,
            borderTop: `1.5px solid ${alpha(brand[300], 0.35)}`,
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'center',
            gap: 0.5,
          }}
        >
          <Typography sx={{ fontSize: '0.95rem', fontWeight: 800, color: brand[900] }}>
            {deck.cardCount}
          </Typography>
          <Typography
            sx={{
              fontSize: '0.62rem',
              fontWeight: 900,
              letterSpacing: '0.07em',
              textTransform: 'uppercase',
              color: 'text.secondary',
            }}
          >
            {t('cardsLabel')}
          </Typography>
        </Box>
      </ButtonBase>

      <Box sx={{ px: 1.25, pb: 1.25 }}>
        <DeckActions deck={deck} size="roomy" {...actions} />
      </Box>
    </Box>
  );
}
