'use client';
import {
  CardContent,
  Typography,
  IconButton,
  Box,
  Chip,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import type { Deck } from '@/types/deck';

interface DeckCardProps {
  deck: Deck;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
}

// Randomly pick a cute emoji per deck (deterministic based on id)
const KAWAII_ICONS = ['🌸', '🐱', '✨', '🌷', '🍡', '🎀', '🐰', '🌙', '🍓', '🦋'];
function pickIcon(id: string) {
  let n = 0;
  for (let i = 0; i < id.length; i++) n += id.charCodeAt(i);
  return KAWAII_ICONS[n % KAWAII_ICONS.length];
}

// Pastel card-back colors for the stacked layers
const STACK_COLORS = [
  'linear-gradient(135deg, #fce4f3, #f9c8e8)',
  'linear-gradient(135deg, #f9c8e8, #f5a8dc)',
];

export function DeckCard({ deck, onOpen, onDelete }: DeckCardProps) {
  const icon = pickIcon(deck.id);
  const shouldShowDescription = Boolean(deck.description && deck.description !== deck.name);
  return (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        // Extra bottom padding to show the stacked card layers beneath
        pb: '14px',
        cursor: 'pointer',
        // Lift the whole stack on hover
        transition: 'transform 0.25s cubic-bezier(.34,1.56,.64,1)',
        '&:hover': {
          transform: 'translateY(-6px)',
        },
        // Fan out bottom layers on hover
        '&:hover .stack-layer-1': {
          transform: 'rotate(-5deg) translateY(6px)',
        },
        '&:hover .stack-layer-2': {
          transform: 'rotate(5deg) translateY(10px)',
        },
      }}
    >
      {/* Stacked card layer 2 (bottom-most) */}
      <Box
        className="stack-layer-2"
        sx={{
          position: 'absolute',
          bottom: 0,
          left: '6px',
          right: '6px',
          height: '88%',
          borderRadius: '24px',
          background: STACK_COLORS[1],
          border: '2px solid rgba(249,168,212,0.5)',
          boxShadow: '0 6px 18px rgba(249,168,212,0.18)',
          transition: 'transform 0.3s cubic-bezier(.34,1.56,.64,1)',
          zIndex: 1,
        }}
      />

      {/* Stacked card layer 1 (middle) */}
      <Box
        className="stack-layer-1"
        sx={{
          position: 'absolute',
          bottom: '5px',
          left: '3px',
          right: '3px',
          height: '92%',
          borderRadius: '26px',
          background: STACK_COLORS[0],
          border: '2px solid rgba(249,168,212,0.55)',
          boxShadow: '0 8px 22px rgba(249,168,212,0.18)',
          transition: 'transform 0.3s cubic-bezier(.34,1.56,.64,1)',
          zIndex: 2,
          // Cute dotted pattern on back cards
          backgroundImage:
            'radial-gradient(circle, rgba(249,168,212,0.35) 1.5px, transparent 1.5px)',
          backgroundSize: '16px 16px',
        }}
      />

      {/* Top (front) card */}
      <Box
        onClick={() => onOpen(deck.id)}
        sx={{
          position: 'relative',
          zIndex: 3,
          borderRadius: '28px',
          background: 'linear-gradient(160deg, #fff5fb 0%, #ffeaf5 60%, #fce7f3 100%)',
          border: '2px solid rgba(249,168,212,0.6)',
          boxShadow:
            '0 12px 32px rgba(249,168,212,0.22), inset 0 1px 0 rgba(255,255,255,0.9)',
          overflow: 'hidden',
          // Sparkle dots decoration in the corner
          '&::before': {
            content: '"✦"',
            position: 'absolute',
            top: '12px',
            right: '16px',
            fontSize: '1rem',
            color: 'rgba(249,168,212,0.55)',
            pointerEvents: 'none',
          },
          '&::after': {
            content: '"✦"',
            position: 'absolute',
            bottom: '42px',
            left: '14px',
            fontSize: '0.6rem',
            color: 'rgba(196,181,253,0.6)',
            pointerEvents: 'none',
          },
        }}
      >
        <CardContent sx={{ p: 3, pb: '12px !important' }}>
          {/* Kawaii icon badge */}
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #fce7f3, #ede9fe)',
              border: '2.5px solid rgba(249,168,212,0.45)',
              fontSize: '1.9rem',
              mb: 1.5,
              boxShadow: '0 4px 12px rgba(249,168,212,0.25)',
              // Wobble on card hover
              transition: 'transform 0.35s cubic-bezier(.34,1.56,.64,1)',
              '.MuiBox-root:hover &': {
                transform: 'rotate(-8deg) scale(1.12)',
              },
            }}
          >
            {icon}
          </Box>

          <Typography
            variant="h5"
            sx={{
              color: 'text.primary',
              mb: 0.4,
              lineHeight: 1.25,
              fontWeight: 800,
              letterSpacing: '-0.01em',
            }}
          >
            {deck.name}
          </Typography>

          {shouldShowDescription && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mb: 1.5, lineHeight: 1.5 }}
            >
              {deck.description}
            </Typography>
          )}

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
            <Chip
              label={`${deck.cardCount} card${deck.cardCount !== 1 ? 's' : ''} 🌟`}
              size="small"
              sx={{
                background: 'linear-gradient(90deg, #fce7f3, #ede9fe)',
                border: '1.5px solid rgba(249,168,212,0.5)',
                fontWeight: 700,
                color: '#be185d',
                fontSize: '0.78rem',
              }}
            />
          </Box>
        </CardContent>

        {/* Bottom bar with delete */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'flex-end',
            px: 1.5,
            pb: 1.5,
          }}
        >
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(deck.id);
            }}
            aria-label="Delete deck"
            sx={{
              color: 'rgba(249,168,212,0.7)',
              '&:hover': {
                color: '#ec4899',
                backgroundColor: 'rgba(249,168,212,0.15)',
                transform: 'scale(1.1)',
              },
              transition: 'all 0.2s ease',
            }}
          >
            <DeleteOutlineIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>
    </Box>
  );
}