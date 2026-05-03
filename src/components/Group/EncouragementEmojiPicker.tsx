'use client';
import Box from '@mui/material/Box';
import Popover from '@mui/material/Popover';
import { alpha, useTheme } from '@mui/material/styles';
import EmojiPicker, { type EmojiClickData, Theme } from 'emoji-picker-react';
import { useState } from 'react';

interface EncouragementEmojiPickerProps {
  value: string;
  onChange: (emoji: string) => void;
}

export function EncouragementEmojiPicker({ value, onChange }: EncouragementEmojiPickerProps) {
  const theme = useTheme();
  const { brand, accent } = theme.palette;
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  return (
    <>
      <Box
        role="button"
        tabIndex={0}
        aria-label="Choose emoji"
        onClick={(e) => setAnchorEl(e.currentTarget)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') setAnchorEl(e.currentTarget);
        }}
        sx={{
          width: 38,
          height: 38,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          border: `2px solid ${brand[400]}`,
          bgcolor: alpha(brand[100], 0.6),
          fontSize: '1.2rem',
          transition: 'all 0.15s ease',
          '&:hover': { bgcolor: alpha(brand[200], 0.7), transform: 'scale(1.1)' },
        }}
      >
        {value}
      </Box>
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
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
              onChange(data.emoji);
              setAnchorEl(null);
            }}
            lazyLoadEmojis
          />
        </Box>
      </Popover>
    </>
  );
}
