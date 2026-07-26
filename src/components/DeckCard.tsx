'use client';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import IosShareIcon from '@mui/icons-material/IosShare';
import PushPinIcon from '@mui/icons-material/PushPin';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import { Box, IconButton, Popover, Tooltip, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { CardFrame, CardStatBox, CardTopBar } from '@/components/CardFrame';
import EmojiPicker, { type EmojiClickData, Theme } from '@/components/LazyEmojiPicker';
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
  const t = useTranslations('Deck.deckCard');
  const theme = useTheme();
  const { brand, accent } = theme.palette;
  const [emojiAnchor, setEmojiAnchor] = useState<HTMLElement | null>(null);

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
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Box />
        <Box sx={{ display: 'flex', gap: 0.25 }} onClick={(e) => e.stopPropagation()}>
          {onEmojiChange && (
            <>
              <Tooltip title={deck.emoji ? t('changeEmojiTooltip') : t('addEmojiTooltip')}>
                <IconButton
                  size="small"
                  aria-label={deck.emoji ? t('changeDeckEmojiAria') : t('addDeckEmojiAria')}
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
                      {t('removeEmoji')}
                    </Box>
                  </Box>
                )}
              </Popover>
            </>
          )}
          {onPin && (
            <Tooltip title={deck.pinned ? t('unpinFromHome') : t('pinToHome')}>
              <IconButton
                size="small"
                aria-label={deck.pinned ? t('unpinFromHome') : t('pinToHome')}
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
            <Tooltip title={deck.isPublic ? t('shared') : t('shareDeck')}>
              <IconButton
                size="small"
                aria-label={deck.isPublic ? t('shared') : t('shareDeck')}
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
            <Tooltip title={t('deleteDeck')}>
              <IconButton
                size="small"
                aria-label={t('deleteDeck')}
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
    </CardFrame>
  );
}
