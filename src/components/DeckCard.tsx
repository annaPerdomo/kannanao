'use client';
import { useState } from 'react';
import { Typography, IconButton, Box, Popover, Tooltip } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import IosShareIcon from '@mui/icons-material/IosShare';
import PushPinIcon from '@mui/icons-material/PushPin';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import EmojiEmotionsOutlinedIcon from '@mui/icons-material/EmojiEmotionsOutlined';
import EmojiPicker, { type EmojiClickData, Theme } from 'emoji-picker-react';
import type { Deck } from '@/types/deck';
import { FONT_MONO } from '@/theme';

interface DeckCardProps {
  deck: Deck;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  onShare?: (id: string) => void;
  onEditEmoji?: (id: string, emoji: string) => void;
  onPin?: (id: string, pinned: boolean) => void;
  isOwner?: boolean;
}

export function DeckCard({ deck, onOpen, onDelete, onShare, onEditEmoji, onPin, isOwner = true }: DeckCardProps) {
  const theme = useTheme();
  const { brand, accent } = theme.palette;
  const [emojiAnchor, setEmojiAnchor] = useState<HTMLElement | null>(null);
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
        '&:hover .card-actions': { opacity: 1 },
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
      <Box sx={{
        position: 'relative', zIndex: 3, background: CARD_FRAME, borderRadius: '14px', p: '5px',
        boxShadow: `0 6px 24px rgba(0,0,0,0.16), 0 2px 8px ${alpha(brand[400], 0.28)}`,
        transition: 'box-shadow 0.25s ease',
        '&:hover': { boxShadow: `0 16px 40px rgba(0,0,0,0.24), 0 4px 12px ${alpha(brand[400], 0.38)}` },
      }}>
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
            border: '2px solid rgba(255,255,255,0.88)',
            display: 'flex', flexDirection: 'column',
          }}
        >
          {/* Top bar */}
          <Box sx={{
            px: 1.5, py: 0.75,
            background: `linear-gradient(135deg, ${brand[400]} 0%, ${accent[400]} 100%)`,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <Box sx={{ display: 'flex', gap: 0.7, alignItems: 'center' }}>
              <Typography sx={{ fontSize: '0.6rem', fontWeight: 900, color: 'white', textTransform: 'uppercase', letterSpacing: '0.07em', textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>
                Card Deck
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: '2px' }}>
              <Typography sx={{ fontSize: '0.5rem', fontWeight: 700, color: 'rgba(255,255,255,0.8)', lineHeight: 1 }}>XP</Typography>
              <Typography sx={{ fontSize: '0.68rem', fontWeight: 900, color: 'white', textShadow: '0 1px 3px rgba(0,0,0,0.3)', lineHeight: 1 }}>
                {deck.cardCount * 10}
              </Typography>
            </Box>
          </Box>

          {/* Art frame */}
          <Box sx={{
            mx: '8px', mt: '6px', borderRadius: '6px', overflow: 'hidden',
            border: '2px solid rgba(0,0,0,0.14)', boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.1)',
            background: `linear-gradient(135deg, ${brand[100]} 0%, ${accent[100]} 50%, ${brand[100]} 100%)`,
            height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative',
          }}>
            <Box sx={{ position: 'absolute', top: 8, right: 12, fontSize: '0.65rem', color: alpha(brand[300], 0.6), pointerEvents: 'none' }}>✦</Box>
            <Box sx={{ position: 'absolute', bottom: 8, left: 12, fontSize: '0.5rem', color: alpha(accent[300], 0.7), pointerEvents: 'none' }}>✦</Box>
            <Box
              className="emoji-art"
              sx={{
                fontSize: '3.6rem', lineHeight: 1, display: 'block',
                transition: 'transform 0.35s cubic-bezier(.34,1.56,.64,1)',
                userSelect: 'none',
              }}
            >
              {deck.emoji}
            </Box>
          </Box>

          {/* Name */}
          <Box sx={{ px: 1.5, pt: '9px', pb: '7px', borderBottom: `2px solid ${brand[400]}` }}>
            <Typography sx={{ fontWeight: 900, color: '#111', lineHeight: 1.15, fontSize: '1.05rem', letterSpacing: '-0.01em' }}>
              {deck.name}
            </Typography>
            {deck.description && (
              <Typography sx={{ color: '#777', lineHeight: 1.3, fontSize: '0.65rem', fontStyle: 'italic', mt: '2px' }}>
                {deck.description}
              </Typography>
            )}
          </Box>

          {/* Stats — ability box style matching ImageCard */}
          <Box sx={{ px: 1.5, pt: '8px', pb: '10px' }}>
            <Box sx={{
              bgcolor: alpha(brand[50], 0.75),
              borderRadius: '6px', px: 1.2, py: '7px',
              border: `1px solid ${alpha(brand[400], 0.22)}`,
            }}>
              <Typography sx={{ fontSize: '0.54rem', fontWeight: 900, color: brand[500], letterSpacing: '0.12em', textTransform: 'uppercase', mb: '3px', fontFamily: FONT_MONO }}>
                ★ Cards
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: '#1A1A1A', lineHeight: 1.3 }}>
                  {deck.cardCount} cards in this deck
                </Typography>
                {deck.isShared && (
                  <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: accent[600] }}>
                    · ✨ Shared
                  </Typography>
                )}
              </Box>
            </Box>
          </Box>

          {/* Footer */}
          <Box sx={{
            mt: 'auto', px: 1.5, py: '8px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            borderTop: `1px solid ${alpha(brand[300], 0.25)}`,
          }}>
            <Typography sx={{ fontSize: '0.52rem', color: alpha(brand[500], 0.6), fontFamily: FONT_MONO, letterSpacing: '0.06em' }}>
              CARD DECK
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.25 }} onClick={(e) => e.stopPropagation()}>
              {isOwner && onEditEmoji && (
                <>
                  <Tooltip title="Change emoji">
                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); setEmojiAnchor(e.currentTarget); }}
                      sx={{
                        width: 26, height: 26,
                        color: accent[500], bgcolor: 'transparent',
                        border: `1px solid ${alpha(accent[400], 0.35)}`,
                        borderRadius: '6px',
                        '&:hover': { color: accent[700], bgcolor: alpha(accent[100], 0.5), borderColor: alpha(accent[500], 0.6) },
                      }}>
                      <EmojiEmotionsOutlinedIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  </Tooltip>
                  <Popover
                    open={Boolean(emojiAnchor)}
                    anchorEl={emojiAnchor}
                    onClose={() => setEmojiAnchor(null)}
                    anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
                    transformOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Box sx={{
                      '--epr-bg-color': brand[50],
                      '--epr-category-label-bg-color': brand[100],
                      '--epr-hover-bg-color': alpha(brand[300], 0.25),
                      '--epr-focus-bg-color': alpha(brand[300], 0.35),
                      '--epr-highlight-color': brand[400],
                      '--epr-search-border-color': alpha(brand[400], 0.4),
                      '--epr-header-overlay-color': brand[50],
                      '--epr-category-icon-active-color': accent[500],
                      '--epr-search-input-bg-color': '#fff',
                      '--epr-emoji-size': '24px',
                      borderRadius: 3, overflow: 'hidden',
                    }}>
                      <EmojiPicker
                        theme={Theme.LIGHT}
                        onEmojiClick={(data: EmojiClickData) => {
                          onEditEmoji(deck.id, data.emoji);
                          setEmojiAnchor(null);
                        }}
                        lazyLoadEmojis
                      />
                    </Box>
                  </Popover>
                </>
              )}
              {onPin && (
                <Tooltip title={deck.pinned ? 'Unpin from home' : 'Pin to home'}>
                  <IconButton size="small" onClick={(e) => { e.stopPropagation(); onPin(deck.id, !deck.pinned); }}
                    sx={{
                      width: 26, height: 26,
                      color: deck.pinned ? brand[600] : brand[500],
                      bgcolor: deck.pinned ? alpha(brand[200], 0.6) : 'transparent',
                      border: `1px solid ${deck.pinned ? alpha(brand[400], 0.6) : alpha(brand[400], 0.35)}`,
                      borderRadius: '6px',
                      '&:hover': { color: brand[700], bgcolor: alpha(brand[200], 0.7), borderColor: alpha(brand[500], 0.6) },
                    }}>
                    {deck.pinned ? <PushPinIcon sx={{ fontSize: 13 }} /> : <PushPinOutlinedIcon sx={{ fontSize: 13 }} />}
                  </IconButton>
                </Tooltip>
              )}
              {isOwner && onShare && (
                <Tooltip title="Share deck">
                  <IconButton size="small" onClick={(e) => { e.stopPropagation(); onShare(deck.id); }}
                    sx={{
                      width: 26, height: 26,
                      color: brand[500], bgcolor: 'transparent',
                      border: `1px solid ${alpha(brand[400], 0.35)}`,
                      borderRadius: '6px',
                      '&:hover': { color: brand[700], bgcolor: alpha(brand[100], 0.5), borderColor: alpha(brand[500], 0.6) },
                    }}>
                    <IosShareIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </Tooltip>
              )}
              {isOwner && (
                <Tooltip title="Delete deck">
                  <IconButton size="small" onClick={(e) => { e.stopPropagation(); onDelete(deck.id); }}
                    sx={{
                      width: 26, height: 26,
                      color: brand[500], bgcolor: 'transparent',
                      border: `1px solid ${alpha(brand[400], 0.35)}`,
                      borderRadius: '6px',
                      '&:hover': { color: brand[700], bgcolor: alpha(brand[100], 0.5), borderColor: alpha(brand[500], 0.6) },
                    }}>
                    <DeleteOutlineIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
