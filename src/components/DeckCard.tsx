'use client';
import { CardContent, Typography, IconButton, Box, Chip } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import IosShareIcon from '@mui/icons-material/IosShare';
import type { Deck } from '@/types/deck';

interface DeckCardProps {
  deck: Deck;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  onShare?: (id: string) => void;
  isOwner?: boolean;
}

const KAWAII_ICONS = ['🌸', '🐱', '✨', '🌷', '🍡', '🎀', '🐰', '🌙', '🍓', '🦋'];
function pickIcon(id: string) {
  let n = 0;
  for (let i = 0; i < id.length; i++) n += id.charCodeAt(i);
  return KAWAII_ICONS[n % KAWAII_ICONS.length];
}

export function DeckCard({ deck, onOpen, onDelete, onShare, isOwner = true }: DeckCardProps) {
  const theme = useTheme();
  const { brand, accent } = theme.palette;
  const icon = pickIcon(deck.id);

  const stackColors = [
    `linear-gradient(135deg, ${alpha(brand[100], 0.9)}, ${alpha(brand[200], 0.8)})`,
    `linear-gradient(135deg, ${alpha(brand[200], 0.8)}, ${alpha(brand[300], 0.6)})`,
  ];

  return (
    <Box
      sx={{
        position: 'relative', width: '100%', pb: '14px', cursor: 'pointer',
        transition: 'transform 0.25s cubic-bezier(.34,1.56,.64,1)',
        '&:hover': { transform: 'translateY(-6px)' },
        '&:hover .stack-layer-1': { transform: 'rotate(-5deg) translateY(6px)' },
        '&:hover .stack-layer-2': { transform: 'rotate(5deg) translateY(10px)' },
      }}
    >
      {/* Stack layer 2 (bottom) */}
      <Box className="stack-layer-2" sx={{
        position: 'absolute', bottom: 0, left: '6px', right: '6px', height: '88%',
        borderRadius: '24px', background: stackColors[1],
        border: `2px solid ${alpha(brand[300], 0.5)}`,
        boxShadow: `0 6px 18px ${alpha(brand[300], 0.18)}`,
        transition: 'transform 0.3s cubic-bezier(.34,1.56,.64,1)', zIndex: 1,
      }} />

      {/* Stack layer 1 (middle) */}
      <Box className="stack-layer-1" sx={{
        position: 'absolute', bottom: '5px', left: '3px', right: '3px', height: '92%',
        borderRadius: '26px', background: stackColors[0],
        border: `2px solid ${alpha(brand[300], 0.55)}`,
        boxShadow: `0 8px 22px ${alpha(brand[300], 0.18)}`,
        transition: 'transform 0.3s cubic-bezier(.34,1.56,.64,1)', zIndex: 2,
        backgroundImage: `radial-gradient(circle, ${alpha(brand[300], 0.35)} 1.5px, transparent 1.5px)`,
        backgroundSize: '16px 16px',
      }} />

      {/* Top (front) card */}
      <Box
        onClick={() => onOpen(deck.id)}
        sx={{
          position: 'relative', zIndex: 3, borderRadius: '28px',
          background: `linear-gradient(160deg, ${brand[50]} 0%, ${alpha(brand[100], 0.6)} 60%, ${brand[100]} 100%)`,
          border: `2px solid ${alpha(brand[300], 0.6)}`,
          boxShadow: `0 12px 32px ${alpha(brand[300], 0.22)}, inset 0 1px 0 rgba(255,255,255,0.9)`,
          overflow: 'hidden',
          '&::before': {
            content: '"✦"', position: 'absolute', top: '12px', right: '16px',
            fontSize: '1rem', color: alpha(brand[300], 0.55), pointerEvents: 'none',
          },
          '&::after': {
            content: '"✦"', position: 'absolute', bottom: '42px', left: '14px',
            fontSize: '0.6rem', color: alpha(accent[300], 0.6), pointerEvents: 'none',
          },
        }}
      >
        <CardContent sx={{ p: 3, pb: '12px !important' }}>
          {/* Icon badge */}
          <Box sx={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 56, height: 56, borderRadius: '50%',
            background: `linear-gradient(135deg, ${brand[100]}, ${accent[100]})`,
            border: `2.5px solid ${alpha(brand[300], 0.45)}`,
            fontSize: '1.9rem', mb: 1.5,
            boxShadow: `0 4px 12px ${alpha(brand[300], 0.25)}`,
            transition: 'transform 0.35s cubic-bezier(.34,1.56,.64,1)',
            '.MuiBox-root:hover &': { transform: 'rotate(-8deg) scale(1.12)' },
          }}>
            {icon}
          </Box>

          <Typography variant="h5" sx={{ color: 'text.primary', mb: 0.4, lineHeight: 1.25, fontWeight: 800, letterSpacing: '-0.01em' }}>
            {deck.name}
          </Typography>

          {deck.description && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, lineHeight: 1.5 }}>
              {deck.description}
            </Typography>
          )}

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1, flexWrap: 'wrap' }}>
            <Chip
              label={`${deck.cardCount} card${deck.cardCount !== 1 ? 's' : ''} 🌟`}
              size="small"
              sx={{
                background: `linear-gradient(90deg, ${brand[100]}, ${accent[100]})`,
                border: `1.5px solid ${alpha(brand[300], 0.5)}`,
                fontWeight: 700, color: brand[700], fontSize: '0.78rem',
              }}
            />
            {deck.isShared && (
              <Chip
                label="Shared with you" size="small"
                sx={{
                  background: `linear-gradient(90deg, ${accent[100]}, ${accent[200]})`,
                  border: `1.5px solid ${alpha(accent[400], 0.5)}`,
                  fontWeight: 600, color: accent[700], fontSize: '0.72rem',
                }}
              />
            )}
          </Box>
        </CardContent>

        {isOwner && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', px: 1.5, pb: 1.5, gap: 0.5 }}>
            <IconButton
              size="small" onClick={(e) => { e.stopPropagation(); onShare?.(deck.id); }} aria-label="Share deck"
              sx={{
                color: alpha(accent[400], 0.7),
                '&:hover': { color: accent[600], backgroundColor: alpha(accent[400], 0.15), transform: 'scale(1.1)' },
                transition: 'all 0.2s ease',
              }}
            >
              <IosShareIcon fontSize="small" />
            </IconButton>
            <IconButton
              size="small" onClick={(e) => { e.stopPropagation(); onDelete(deck.id); }} aria-label="Delete deck"
              sx={{
                color: alpha(brand[300], 0.7),
                '&:hover': { color: brand[500], backgroundColor: alpha(brand[300], 0.15), transform: 'scale(1.1)' },
                transition: 'all 0.2s ease',
              }}
            >
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </Box>
        )}
      </Box>
    </Box>
  );
}
