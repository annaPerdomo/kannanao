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
  const CARD_FRAME = `linear-gradient(145deg, ${brand[100]} 0%, ${brand[300]} 25%, ${brand[50]} 50%, ${brand[400]} 75%, ${brand[100]} 100%)`;

  return (
    <Box
      sx={{
        position: 'relative', width: '100%', pb: '16px', cursor: 'pointer',
        transition: 'transform 0.25s cubic-bezier(.34,1.56,.64,1)',
        '&:hover': { transform: 'translateY(-8px)' },
        '&:hover .deck-stack-2': { transform: 'rotate(-6deg) translateY(8px)' },
        '&:hover .deck-stack-1': { transform: 'rotate(6deg) translateY(12px)' },
        '&:hover .holo-sheen': { opacity: 1 },
        '&:hover .emoji-art': { transform: 'rotate(-10deg) scale(1.18)' },
      }}
    >
      {/* Card back: bottom layer */}
      <Box className="deck-stack-2" sx={{
        position: 'absolute', bottom: 0, left: '8px', right: '8px', height: '88%',
        borderRadius: '14px', background: CARD_FRAME, p: '5px',
        transition: 'transform 0.3s cubic-bezier(.34,1.56,.64,1)', zIndex: 1,
      }}>
        <Box sx={{
          width: '100%', height: '100%', borderRadius: '10px',
          background: `radial-gradient(circle at 50% 50%, ${brand[600]} 0%, ${brand[900]} 100%)`,
          backgroundImage: `radial-gradient(circle at 50% 50%, ${brand[600]} 0%, ${brand[900]} 100%), radial-gradient(circle, ${alpha('#fff', 0.08)} 1.5px, transparent 1.5px)`,
          backgroundSize: 'auto, 16px 16px',
        }} />
      </Box>

      {/* Card back: middle layer */}
      <Box className="deck-stack-1" sx={{
        position: 'absolute', bottom: '6px', left: '4px', right: '4px', height: '92%',
        borderRadius: '14px', background: CARD_FRAME, p: '5px',
        transition: 'transform 0.3s cubic-bezier(.34,1.56,.64,1)', zIndex: 2,
      }}>
        <Box sx={{
          width: '100%', height: '100%', borderRadius: '10px',
          background: `radial-gradient(circle at 50% 40%, ${accent[500]} 0%, ${accent[800]} 100%)`,
        }} />
      </Box>

      {/* Front card */}
      <Box sx={{ position: 'relative', zIndex: 3, background: CARD_FRAME, borderRadius: '14px', p: '5px', boxShadow: `0 8px 28px rgba(0,0,0,0.18), 0 2px 8px ${alpha(brand[400], 0.32)}` }}>
        {/* Holographic sheen */}
        <Box className="holo-sheen" sx={{
          position: 'absolute', inset: 0, borderRadius: '14px',
          background: 'linear-gradient(115deg, transparent 0%, rgba(255,50,180,0.2) 20%, rgba(255,220,50,0.2) 35%, rgba(50,255,150,0.2) 50%, rgba(50,150,255,0.2) 65%, rgba(180,50,255,0.2) 80%, transparent 100%)',
          opacity: 0, transition: 'opacity 0.35s ease',
          pointerEvents: 'none', zIndex: 10, mixBlendMode: 'screen',
        }} />

        {/* Inner card */}
        <Box
          onClick={() => onOpen(deck.id)}
          sx={{
            bgcolor: brand[50], borderRadius: '10px', overflow: 'hidden',
            border: '2px solid rgba(255,255,255,0.9)',
            display: 'flex', flexDirection: 'column',
          }}
        >
          {/* Top bar */}
          <Box sx={{
            px: 2, py: 1,
            background: `linear-gradient(135deg, ${brand[400]} 0%, ${accent[400]} 100%)`,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <Typography sx={{ fontSize: '0.65rem', fontWeight: 900, color: 'white', textTransform: 'uppercase', letterSpacing: '0.08em', textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>
              Card Deck
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: '2px' }}>
              <Typography sx={{ fontSize: '0.5rem', fontWeight: 700, color: 'rgba(255,255,255,0.8)' }}>HP</Typography>
              <Typography sx={{ fontSize: '0.72rem', fontWeight: 900, color: 'white', textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>
                {Math.min(deck.cardCount * 10 + 30, 200)}
              </Typography>
            </Box>
          </Box>

          {/* Art frame */}
          <Box sx={{
            mx: '8px', mt: '6px', borderRadius: '6px', overflow: 'hidden',
            border: '2px solid rgba(0,0,0,0.14)', boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.1)',
            background: `linear-gradient(135deg, ${brand[100]} 0%, ${accent[100]} 50%, ${brand[100]} 100%)`,
            height: 165, display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative',
          }}>
            <Box sx={{ position: 'absolute', top: 8, right: 12, fontSize: '0.65rem', color: alpha(brand[300], 0.6), pointerEvents: 'none' }}>✦</Box>
            <Box sx={{ position: 'absolute', bottom: 8, left: 12, fontSize: '0.5rem', color: alpha(accent[300], 0.7), pointerEvents: 'none' }}>✦</Box>
            <Typography className="emoji-art" sx={{ fontSize: '3.6rem', transition: 'transform 0.35s cubic-bezier(.34,1.56,.64,1)', display: 'block', lineHeight: 1 }}>
              {icon}
            </Typography>
          </Box>

          {/* Name */}
          <Box sx={{ px: 2, pt: 1.5, pb: 0.75, borderBottom: `2.5px solid ${brand[400]}`, minHeight: 64 }}>
            <Typography sx={{ fontWeight: 900, color: '#111', lineHeight: 1.15, fontSize: '1.1rem', letterSpacing: '-0.01em', fontFamily: '"Nunito", sans-serif' }}>
              {deck.name}
            </Typography>
            <Typography sx={{ color: '#777', lineHeight: 1.4, fontSize: '0.7rem', fontStyle: 'italic', mt: '2px', visibility: deck.description ? 'visible' : 'hidden' }}>
              {deck.description || '\u00A0'}
            </Typography>
          </Box>

          {/* Stats */}
          <Box sx={{ px: 2, py: 1.25, display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
            <Chip
              label={`${deck.cardCount} cards ★`}
              size="small"
              sx={{
                background: `linear-gradient(90deg, ${brand[100]}, ${accent[100]})`,
                border: `1.5px solid ${alpha(brand[300], 0.55)}`,
                fontWeight: 800, color: brand[700], fontSize: '0.72rem',
              }}
            />
            {deck.isShared && (
              <Chip
                label="✨ Shared"
                size="small"
                sx={{
                  background: `linear-gradient(90deg, ${accent[100]}, ${accent[200]})`,
                  border: `1.5px solid ${alpha(accent[400], 0.5)}`,
                  fontWeight: 700, color: accent[700], fontSize: '0.72rem',
                }}
              />
            )}
          </Box>

          {/* Footer */}
          <Box sx={{
            px: 2, py: '8px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            borderTop: '1px solid rgba(0,0,0,0.07)',
          }}>
            <Typography sx={{ fontSize: '0.52rem', color: alpha(brand[500], 0.6), fontFamily: '"DM Mono", monospace', letterSpacing: '0.06em' }}>
              CARD DECK
            </Typography>
            {isOwner && (
              <Box sx={{ display: 'flex', gap: 0.25 }} onClick={(e) => e.stopPropagation()}>
                <IconButton size="small" onClick={(e) => { e.stopPropagation(); onShare?.(deck.id); }}
                  sx={{ width: 26, height: 26, color: alpha(accent[400], 0.7), '&:hover': { color: accent[600], bgcolor: alpha(accent[100], 0.5) } }}>
                  <IosShareIcon sx={{ fontSize: 14 }} />
                </IconButton>
                <IconButton size="small" onClick={(e) => { e.stopPropagation(); onDelete(deck.id); }}
                  sx={{ width: 26, height: 26, color: alpha(brand[300], 0.7), '&:hover': { color: brand[500], bgcolor: alpha(brand[100], 0.5) } }}>
                  <DeleteOutlineIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </Box>
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
