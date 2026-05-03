'use client';

import Box from '@mui/material/Box';
import Popover from '@mui/material/Popover';
import { alpha, useTheme } from '@mui/material/styles';
import EmojiPicker, { type EmojiClickData, Theme } from 'emoji-picker-react';

interface EmojiPickerPopoverProps {
  anchorEl: HTMLElement | null;
  onClose: () => void;
  onSelect: (emoji: string) => void;
  onRemove?: () => void;
}

export function EmojiPickerPopover({
  anchorEl,
  onClose,
  onSelect,
  onRemove,
}: EmojiPickerPopoverProps) {
  const { brand, accent } = useTheme().palette;

  return (
    <Popover
      open={Boolean(anchorEl)}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      transformOrigin={{ vertical: 'top', horizontal: 'center' }}
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
            onSelect(data.emoji);
            onClose();
          }}
          lazyLoadEmojis
        />
      </Box>
      {onRemove && (
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
              onRemove();
              onClose();
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
            Remove emoji
          </Box>
        </Box>
      )}
    </Popover>
  );
}
