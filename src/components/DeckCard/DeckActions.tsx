'use client';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import IosShareIcon from '@mui/icons-material/IosShare';
import PushPinIcon from '@mui/icons-material/PushPin';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Popover from '@mui/material/Popover';
import { alpha, useTheme } from '@mui/material/styles';
import Tooltip from '@mui/material/Tooltip';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import EmojiPicker, { type EmojiClickData, Theme } from '@/components/LazyEmojiPicker';
import type { Deck } from '@/types/deck';

export interface DeckActionsProps {
  deck: Deck;
  onDelete: (id: string) => void;
  onShare?: (id: string) => void;
  onPin?: (id: string, pinned: boolean) => void;
  onEmojiChange?: (id: string, emoji: string | null) => void;
  isOwner?: boolean;
  /**
   * `compact` is the collectible card's cramped footer; `roomy` is the home
   * tile's own row, sized to the 44px touch target the design draws.
   */
  size?: 'compact' | 'roomy';
}

const SIZES = {
  compact: { button: 26, icon: 14, emoji: '13px', radius: '6px', gap: 0.25 },
  roomy: { button: 32, icon: 16, emoji: '15px', radius: '9px', gap: 0.5 },
} as const;

/**
 * The four things you can do to a deck without opening it: change its emoji,
 * pin it home, share it, delete it. Shared between the collectible card and
 * the flat home tile so the emoji picker's popover state isn't duplicated.
 */
export function DeckActions({
  deck,
  onDelete,
  onShare,
  onPin,
  onEmojiChange,
  isOwner = true,
  size = 'compact',
}: DeckActionsProps) {
  const t = useTranslations('Deck.deckCard');
  const theme = useTheme();
  const { brand, accent } = theme.palette;
  const [emojiAnchor, setEmojiAnchor] = useState<HTMLElement | null>(null);
  const s = SIZES[size];

  /** Shared chrome for all four buttons; `active` marks a toggled-on state. */
  const buttonSx = (active = false) => ({
    width: s.button,
    height: s.button,
    color: active ? brand[600] : brand[500],
    bgcolor: active ? alpha(brand[200], 0.6) : 'transparent',
    border: `1px solid ${alpha(brand[400], active ? 0.6 : 0.35)}`,
    borderRadius: s.radius,
    '&:hover': {
      color: brand[700],
      bgcolor: alpha(brand[200], 0.7),
      borderColor: alpha(brand[500], 0.6),
    },
  });

  return (
    <Box
      sx={{ display: 'flex', gap: s.gap, justifyContent: 'center' }}
      onClick={(e) => e.stopPropagation()}
    >
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
              sx={{ ...buttonSx(), fontSize: s.emoji }}
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
                    '&:hover': { bgcolor: alpha(brand[100], 0.6), borderColor: brand[400] },
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
            sx={buttonSx(deck.pinned)}
          >
            {deck.pinned ? (
              <PushPinIcon sx={{ fontSize: s.icon }} />
            ) : (
              <PushPinOutlinedIcon sx={{ fontSize: s.icon }} />
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
            sx={{ ...buttonSx(deck.isPublic), position: 'relative' }}
          >
            <IosShareIcon sx={{ fontSize: s.icon }} />
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
                  bgcolor: 'success.main',
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
              ...buttonSx(),
              '&:hover': {
                color: theme.palette.error.main,
                bgcolor: alpha(theme.palette.error.main, 0.08),
                borderColor: alpha(theme.palette.error.main, 0.5),
              },
            }}
          >
            <DeleteOutlineIcon sx={{ fontSize: s.icon }} />
          </IconButton>
        </Tooltip>
      )}
    </Box>
  );
}
