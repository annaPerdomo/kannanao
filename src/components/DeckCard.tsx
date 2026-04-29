'use client';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import IosShareIcon from '@mui/icons-material/IosShare';
import PushPinIcon from '@mui/icons-material/PushPin';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import { Box, IconButton, Popover, Tooltip, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import EmojiPicker, { type EmojiClickData, Theme } from 'emoji-picker-react';
import { useCallback, useState } from 'react';

import { useCardBorder } from '@/contexts/CardBorderContext';
import type { Deck } from '@/types/deck';

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
  const theme = useTheme();
  const { brand, accent } = theme.palette;
  const { borderStyle: equippedBorder } = useCardBorder();
  const hasCustomBorder = equippedBorder && Object.keys(equippedBorder).length > 0;
  const [emojiAnchor, setEmojiAnchor] = useState<HTMLElement | null>(null);
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onOpen(deck.id);
      }
    },
    [onOpen, deck.id],
  );
  const CARD_FRAME = `linear-gradient(145deg, ${brand[100]} 0%, ${brand[300]} 25%, ${brand[50]} 50%, ${brand[400]} 75%, ${brand[100]} 100%)`;

  return (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        pb: '16px',
        cursor: 'pointer',
        transition: 'transform 0.25s cubic-bezier(.34,1.56,.64,1)',
        '&:hover': { transform: 'translateY(-8px)' },
        '&:hover .deck-stack-2': { transform: 'rotate(-6deg) translateY(8px)' },
        '&:hover .deck-stack-1': { transform: 'rotate(6deg) translateY(12px)' },
        '&:hover .holo-sheen': { opacity: 1 },
      }}
    >
      {/* Card back: bottom layer */}
      <Box
        className="deck-stack-2"
        sx={{
          position: 'absolute',
          bottom: 0,
          left: '8px',
          right: '8px',
          height: '88%',
          borderRadius: '14px',
          background: hasCustomBorder ? (equippedBorder.background ?? brand[50]) : CARD_FRAME,
          border: hasCustomBorder ? equippedBorder.border : undefined,
          p: '5px',
          transition: 'transform 0.3s cubic-bezier(.34,1.56,.64,1)',
          zIndex: 1,
        }}
      >
        <Box
          sx={{
            width: '100%',
            height: '100%',
            borderRadius: '10px',
            backgroundImage: `radial-gradient(circle at 50% 50%, ${brand[600]} 0%, ${brand[900]} 100%), radial-gradient(circle, ${alpha('#fff', 0.08)} 1.5px, transparent 1.5px)`,
            backgroundSize: 'auto, 16px 16px',
          }}
        />
      </Box>

      {/* Card back: middle layer */}
      <Box
        className="deck-stack-1"
        sx={{
          position: 'absolute',
          bottom: '6px',
          left: '4px',
          right: '4px',
          height: '92%',
          borderRadius: '14px',
          background: hasCustomBorder ? (equippedBorder.background ?? brand[50]) : CARD_FRAME,
          border: hasCustomBorder ? equippedBorder.border : undefined,
          p: '5px',
          transition: 'transform 0.3s cubic-bezier(.34,1.56,.64,1)',
          zIndex: 2,
        }}
      >
        <Box
          sx={{
            width: '100%',
            height: '100%',
            borderRadius: '10px',
            background: `radial-gradient(circle at 50% 40%, ${accent[500]} 0%, ${accent[800]} 100%)`,
          }}
        />
      </Box>

      {/* Front card */}
      <Box
        sx={{
          position: 'relative',
          zIndex: 3,
          background: hasCustomBorder ? (equippedBorder.background ?? brand[50]) : CARD_FRAME,
          borderRadius: '14px',
          p: '5px',
          border: hasCustomBorder ? equippedBorder.border : undefined,
          boxShadow: hasCustomBorder
            ? equippedBorder.boxShadow
            : `0 6px 24px rgba(0,0,0,0.16), 0 2px 8px ${alpha(brand[400], 0.28)}`,
          transition: 'box-shadow 0.25s ease',
          '&:hover': hasCustomBorder
            ? {}
            : { boxShadow: `0 16px 40px rgba(0,0,0,0.24), 0 4px 12px ${alpha(brand[400], 0.38)}` },
        }}
      >
        {/* Holographic sheen — only on default border */}
        {!hasCustomBorder && (
          <Box
            className="holo-sheen"
            sx={{
              position: 'absolute',
              inset: 0,
              borderRadius: '14px',
              background:
                'linear-gradient(115deg, transparent 0%, rgba(255,50,180,0.2) 20%, rgba(255,220,50,0.2) 35%, rgba(50,255,150,0.2) 50%, rgba(50,150,255,0.2) 65%, rgba(180,50,255,0.2) 80%, transparent 100%)',
              opacity: 0,
              transition: 'opacity 0.35s ease',
              pointerEvents: 'none',
              zIndex: 10,
              mixBlendMode: 'screen',
            }}
          />
        )}

        {/* Inner card */}
        <Box
          role="button"
          tabIndex={0}
          onClick={() => onOpen(deck.id)}
          onKeyDown={handleKeyDown}
          aria-label={`Open deck: ${deck.name}`}
          sx={{
            bgcolor: brand[50],
            borderRadius: '10px',
            overflow: 'hidden',
            border: '2px solid rgba(255,255,255,0.88)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Top bar — matches ImageCard */}
          <Box
            sx={{
              px: 1.5,
              py: 0.75,
              background: `linear-gradient(135deg, ${brand[400]} 0%, ${accent[400]} 100%)`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Typography
              sx={{
                fontSize: '0.6rem',
                fontWeight: 900,
                color: 'white',
                textTransform: 'uppercase',
                letterSpacing: '0.07em',
                textShadow: '0 1px 3px rgba(0,0,0,0.3)',
              }}
            >
              Card Deck
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: '2px' }}>
              <Typography
                sx={{
                  fontSize: '0.5rem',
                  fontWeight: 700,
                  color: 'rgba(255,255,255,0.8)',
                  lineHeight: 1,
                }}
              >
                XP
              </Typography>
              <Typography
                sx={{
                  fontSize: '0.68rem',
                  fontWeight: 900,
                  color: 'white',
                  textShadow: '0 1px 3px rgba(0,0,0,0.3)',
                  lineHeight: 1,
                }}
              >
                {deck.cardCount * 10}
              </Typography>
            </Box>
          </Box>

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
              <Box
                component="span"
                sx={{ fontSize: '1.6rem', lineHeight: 1, mb: 0.5 }}
              >
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

          {/* Stats — ability box style matching ImageCard */}
          <Box sx={{ px: 1.5, pt: '8px' }}>
            <Box
              sx={{
                bgcolor: alpha(brand[50], 0.75),
                borderRadius: '6px',
                px: 1.2,
                py: '7px',
                border: `1px solid ${alpha(brand[400], 0.22)}`,
              }}
            >
              <Typography
                sx={{
                  fontSize: '0.54rem',
                  fontWeight: 900,
                  color: brand[500],
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  mb: '3px',
                  fontFamily: (t) => t.fonts.mono,
                }}
              >
                ★ Cards
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography
                  sx={{
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    color: 'text.primary',
                    lineHeight: 1.3,
                  }}
                >
                  {deck.cardCount} cards
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* Footer */}
          <Box
            sx={{
              mt: 'auto',
              px: 1.5,
              py: '8px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Box />
            <Box sx={{ display: 'flex', gap: 0.25 }} onClick={(e) => e.stopPropagation()}>
              {onEmojiChange && (
                <>
                  <Tooltip title={deck.emoji ? 'Change emoji' : 'Add emoji'}>
                    <IconButton
                      size="small"
                      aria-label={deck.emoji ? 'Change deck emoji' : 'Add deck emoji'}
                      onClick={(e) => {
                        e.stopPropagation();
                        setEmojiAnchor(e.currentTarget);
                      }}
                      sx={{
                        width: 26,
                        height: 26,
                        fontSize: '13px',
                        color: brand[500],
                        bgcolor: 'transparent',
                        border: `1px solid ${alpha(brand[400], 0.35)}`,
                        borderRadius: '6px',
                        '&:hover': {
                          color: brand[700],
                          bgcolor: alpha(brand[200], 0.7),
                          borderColor: alpha(brand[500], 0.6),
                        },
                      }}
                    >
                      😀
                    </IconButton>
                  </Tooltip>
                  <Popover
                    open={Boolean(emojiAnchor)}
                    anchorEl={emojiAnchor}
                    onClose={() => setEmojiAnchor(null)}
                    onClick={(e) => e.stopPropagation()}
                    anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
                    transformOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                  >
                    <Box
                      sx={{
                        '--epr-bg-color': brand[50],
                        '--epr-category-label-bg-color': brand[100],
                        '--epr-hover-bg-color': alpha(brand[300], 0.25),
                        '--epr-focus-bg-color': alpha(brand[300], 0.35),
                        '--epr-highlight-color': brand[400],
                        '--epr-search-border-color': alpha(brand[400], 0.4),
                        '--epr-header-overlay-color': brand[50],
                        '--epr-text-color': 'text.primary',
                        '--epr-category-icon-active-color': accent[500],
                        '--epr-search-input-bg-color': '#fff',
                        '--epr-emoji-size': '24px',
                        borderRadius: 3,
                        overflow: 'hidden',
                      }}
                    >
                      <EmojiPicker
                        theme={Theme.LIGHT}
                        onEmojiClick={(data: EmojiClickData) => {
                          onEmojiChange(deck.id, data.emoji);
                          setEmojiAnchor(null);
                        }}
                        lazyLoadEmojis
                      />
                    </Box>
                    {deck.emoji && (
                      <Box
                        sx={{
                          px: 1.5,
                          py: 1,
                          borderTop: `1px solid ${alpha(brand[300], 0.25)}`,
                          display: 'flex',
                          justifyContent: 'center',
                        }}
                      >
                        <Box
                          component="button"
                          onClick={() => {
                            onEmojiChange(deck.id, null);
                            setEmojiAnchor(null);
                          }}
                          sx={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            color: brand[500],
                            background: 'none',
                            border: `1.5px solid ${alpha(brand[400], 0.35)}`,
                            borderRadius: 2,
                            px: 2,
                            py: 0.5,
                            cursor: 'pointer',
                            transition: 'all 0.12s ease',
                            '&:hover': {
                              bgcolor: alpha(brand[100], 0.6),
                              borderColor: brand[400],
                            },
                          }}
                        >
                          Remove emoji
                        </Box>
                      </Box>
                    )}
                  </Popover>
                </>
              )}
              {onPin && (
                <Tooltip title={deck.pinned ? 'Unpin from home' : 'Pin to home'}>
                  <IconButton
                    size="small"
                    aria-label={deck.pinned ? 'Unpin from home' : 'Pin to home'}
                    onClick={(e) => {
                      e.stopPropagation();
                      onPin(deck.id, !deck.pinned);
                    }}
                    sx={{
                      width: 26,
                      height: 26,
                      color: deck.pinned ? brand[600] : brand[500],
                      bgcolor: deck.pinned ? alpha(brand[200], 0.6) : 'transparent',
                      border: `1px solid ${deck.pinned ? alpha(brand[400], 0.6) : alpha(brand[400], 0.35)}`,
                      borderRadius: '6px',
                      '&:hover': {
                        color: brand[700],
                        bgcolor: alpha(brand[200], 0.7),
                        borderColor: alpha(brand[500], 0.6),
                      },
                    }}
                  >
                    {deck.pinned ? (
                      <PushPinIcon sx={{ fontSize: 13 }} />
                    ) : (
                      <PushPinOutlinedIcon sx={{ fontSize: 13 }} />
                    )}
                  </IconButton>
                </Tooltip>
              )}
              {isOwner && onShare && (
                <Tooltip title={deck.isPublic ? 'Shared' : 'Share deck'}>
                  <IconButton
                    size="small"
                    aria-label={deck.isPublic ? 'Shared' : 'Share deck'}
                    onClick={(e) => {
                      e.stopPropagation();
                      onShare(deck.id);
                    }}
                    sx={{
                      position: 'relative',
                      width: 26,
                      height: 26,
                      color: deck.isPublic ? brand[600] : brand[500],
                      bgcolor: deck.isPublic ? alpha(brand[200], 0.6) : 'transparent',
                      border: `1px solid ${deck.isPublic ? alpha(brand[400], 0.6) : alpha(brand[400], 0.35)}`,
                      borderRadius: '6px',
                      '&:hover': {
                        color: brand[700],
                        bgcolor: deck.isPublic ? alpha(brand[200], 0.7) : alpha(brand[100], 0.5),
                        borderColor: alpha(brand[500], 0.6),
                      },
                    }}
                  >
                    <IosShareIcon sx={{ fontSize: 14 }} />
                    {deck.isPublic && (
                      <Box
                        component="span"
                        sx={{
                          position: 'absolute',
                          top: -4,
                          right: -4,
                          width: 12,
                          height: 12,
                          borderRadius: '50%',
                          bgcolor: '#059669',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '8px',
                          color: 'white',
                          fontWeight: 900,
                          lineHeight: 1,
                          border: `1.5px solid ${brand[50]}`,
                        }}
                      >
                        ✓
                      </Box>
                    )}
                  </IconButton>
                </Tooltip>
              )}
              {isOwner && (
                <Tooltip title="Delete deck">
                  <IconButton
                    size="small"
                    aria-label="Delete deck"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(deck.id);
                    }}
                    sx={{
                      width: 26,
                      height: 26,
                      color: brand[500],
                      bgcolor: 'transparent',
                      border: `1px solid ${alpha(brand[400], 0.35)}`,
                      borderRadius: '6px',
                      '&:hover': {
                        color: brand[700],
                        bgcolor: alpha(brand[100], 0.5),
                        borderColor: alpha(brand[500], 0.6),
                      },
                    }}
                  >
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
