'use client';

import AddIcon from '@mui/icons-material/Add';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import { alpha } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';

import { DeckHeader, Label } from '@/components/Deck';
import { Flashcard } from '@/components/Flashcard';
import { APP_DOMAIN } from '@/lib/brand';
import { pink, purple } from '@/theme';
import type { Deck } from '@/types/deck';

import { AddCardsOverlay } from './AddCardsOverlay';
import {
  CARD_H,
  CARD_W,
  CHROME_H,
  DEMO_CARDS,
  type DemoStage,
  DESK_CROP_H,
  DESK_W,
  FRAME_SCALE,
  FRAME_W,
} from './constants';
import { floatingSurfaceShadow, frameTagSx } from './styles';

interface EducatorFrameProps {
  stage: DemoStage;
  frame: number;
  cardsIn: number;
}

const noop = () => {};
const asyncNoop = async () => {};

const scaledH = (logical: number) => ({
  lg: logical * FRAME_SCALE.lg,
  xl: logical * FRAME_SCALE.xl,
});

/**
 * The deck page's own header, toolbar and card grid inside a browser window,
 * with the Add Cards dialog playing on top. Real components, so the demo
 * inherits every future change — but non-interactive: the edit/settings
 * affordances are visible and must not open app dialogs here.
 */
export function EducatorFrame({ stage, frame, cardsIn }: EducatorFrameProps) {
  const t = useTranslations('Landing.hero');
  const tDeck = useTranslations('Deck.deckPage');

  const cardCount = stage === 'typing' || stage === 'generating' ? 0 : DEMO_CARDS.length;
  const demoDeck: Deck = {
    id: 'demo-deck',
    name: t('demoDeckName'),
    createdAt: 0,
    cardCount,
    ownerId: 'demo',
    emoji: '🌸',
    pinned: true,
    readingPractice: true,
    position: 0,
  };

  return (
    <Box sx={{ position: 'absolute', top: 0, right: 0, zIndex: 1, transformStyle: 'preserve-3d' }}>
      <Box
        sx={{
          width: { lg: FRAME_W.lg, xl: FRAME_W.xl },
          borderRadius: 4,
          overflow: 'hidden',
          border: `1px solid ${alpha('#fff', 0.8)}`,
          bgcolor: alpha('#fff', 0.88),
          boxShadow: floatingSurfaceShadow('window'),
          backdropFilter: 'blur(14px)',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            px: 1.75,
            height: CHROME_H,
            borderBottom: `1px solid ${alpha(purple[300], 0.25)}`,
          }}
        >
          <Box sx={{ display: 'flex', gap: 0.6 }}>
            {['#FF5F57', '#FEBC2E', '#28C840'].map((dot) => (
              <Box
                key={dot}
                sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: dot, opacity: 0.85 }}
              />
            ))}
          </Box>
          <Typography
            sx={{
              flexGrow: 1,
              textAlign: 'center',
              fontSize: '0.66rem',
              fontWeight: 600,
              color: alpha(purple[700], 0.65),
              bgcolor: alpha(purple[100], 0.5),
              borderRadius: 99,
              py: 0.4,
              mr: 4.5,
            }}
          >
            {APP_DOMAIN}/deck/level-2
          </Typography>
        </Box>

        <Box
          sx={{
            height: scaledH(DESK_CROP_H),
            overflow: 'hidden',
            position: 'relative',
            bgcolor: alpha(pink[50], 0.8),
          }}
        >
          <Box
            sx={{
              width: DESK_W,
              // Dead by default; the card grid opts itself back in below.
              // Keyboard access is cut separately — this only stops the mouse.
              pointerEvents: 'none',
              transform: {
                lg: `scale(${FRAME_SCALE.lg})`,
                xl: `scale(${FRAME_SCALE.xl})`,
              },
              transformOrigin: 'top left',
              px: 3,
              pt: 3.5,
            }}
          >
            {/* inert, not just pointerEvents: none. These are real app controls,
                so without it a keyboard user tabs into the landing page's fake
                back/rename/settings/pin — Enter on rename swaps in a live
                TextField, Enter on the emoji button pulls the lazy picker chunk
                down. DeckHeader's own readOnly would hide the affordances, which
                is the look this frame exists to show. */}
            <Box inert>
              <DeckHeader
                deck={demoDeck}
                cardCount={cardCount}
                onBack={noop}
                onRename={asyncNoop}
                onPin={noop}
                onSettingsOpen={noop}
                onEmojiChange={noop}
              />
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  mb: 2,
                }}
              >
                <Label>{tDeck('cardsInDeckLabel', { count: cardCount })}</Label>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<AddIcon sx={{ fontSize: 17 }} />}
                  sx={{
                    borderRadius: '10px',
                    px: 2.25,
                    py: '7px',
                    fontSize: '0.86rem',
                    textTransform: 'none',
                    fontWeight: 700,
                  }}
                >
                  {tDeck('addCardsButton')}
                </Button>
              </Box>
            </Box>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: `repeat(auto-fill, ${CARD_W}px)`,
                justifyContent: 'space-between',
                gap: 2,
                // The one live region: cards flip and speak, as in the app.
                pointerEvents: 'auto',
              }}
            >
              {DEMO_CARDS.map((card, i) => (
                <Box key={card.id} sx={{ position: 'relative' }}>
                  {/* Empty slot under each card — the deck reads as "waiting for
                      cards" instead of a blank panel while the dialog is open. */}
                  <Box
                    sx={{
                      position: 'absolute',
                      inset: 0,
                      borderRadius: '18px',
                      border: `2px dashed ${alpha(purple[300], 0.5)}`,
                      bgcolor: alpha(pink[100], 0.28),
                      opacity: cardsIn > i ? 0 : 1,
                      transition: 'opacity 0.35s ease',
                    }}
                  />
                  <Box
                    inert={cardsIn <= i}
                    sx={{
                      opacity: cardsIn > i ? 1 : 0,
                      // A card that has not landed is invisible but still on top
                      // of its slot — its 🔊 would speak a card nobody can see.
                      pointerEvents: cardsIn > i ? 'auto' : 'none',
                      transform:
                        cardsIn > i ? 'translateY(0) scale(1)' : 'translateY(16px) scale(0.94)',
                      transition:
                        'opacity 0.45s ease, transform 0.45s cubic-bezier(0.34,1.56,0.64,1)',
                    }}
                  >
                    <Flashcard card={card} width={CARD_W} height={CARD_H} />
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>

          <AddCardsOverlay stage={stage} frame={frame} />
        </Box>
      </Box>
      <Chip
        size="small"
        label={t('demoEducatorTag')}
        sx={{ ...frameTagSx(purple), top: -13, left: -13 }}
      />
    </Box>
  );
}
