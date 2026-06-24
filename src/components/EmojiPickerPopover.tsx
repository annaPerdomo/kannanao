'use client';

import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import Popover from '@mui/material/Popover';
import { alpha, useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';

import EmojiPicker, { type EmojiClickData, Theme } from '@/components/LazyEmojiPicker';

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
  const theme = useTheme();
  const { brand, accent } = theme.palette;
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const pickerStyles = {
    '--epr-bg-color': brand[50],
    '--epr-category-label-bg-color': brand[100],
    '--epr-hover-bg-color': alpha(brand[300], 0.25),
    '--epr-focus-bg-color': alpha(brand[300], 0.35),
    '--epr-highlight-color': brand[400],
    '--epr-search-border-color': alpha(brand[400], 0.4),
    '--epr-header-overlay-color': brand[50],
    '--epr-category-icon-active-color': accent[500],
    '--epr-search-input-bg-color': '#fff',
    // The library leaves the search input at the UA default (~13px). On iOS
    // Safari, focusing any input under 16px auto-zooms the whole viewport,
    // which blows the picker up and forces a pinch to zoom back out. Pin the
    // input to 16px to suppress that focus zoom (the 40px input fits it fine).
    '& input': { fontSize: '16px' },
  };

  const removeButton = onRemove && (
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
  );

  if (isMobile) {
    return (
      <Drawer
        anchor="bottom"
        open={Boolean(anchorEl)}
        onClose={onClose}
        PaperProps={{
          sx: {
            borderRadius: '16px 16px 0 0',
            overflow: 'hidden',
          },
        }}
      >
        <Box sx={{ ...pickerStyles, '--epr-emoji-size': '22px' }}>
          <EmojiPicker
            theme={Theme.LIGHT}
            onEmojiClick={(data: EmojiClickData) => {
              onSelect(data.emoji);
              onClose();
            }}
            lazyLoadEmojis
            width="100%"
            height={340}
          />
        </Box>
        {removeButton}
      </Drawer>
    );
  }

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
          ...pickerStyles,
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
      {removeButton}
    </Popover>
  );
}
