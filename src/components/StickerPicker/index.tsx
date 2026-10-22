'use client';

import Drawer from '@mui/material/Drawer';
import Popover from '@mui/material/Popover';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';

import { StickerPanel } from './StickerPanel';

interface StickerPickerProps {
  anchorEl: HTMLElement | null;
  onClose: () => void;
  /** Called with the sticker id — the caller sends it as its own message */
  onSelect: (id: string) => void;
}

/** Buddy sticker sets. Bottom sheet on phones, popover on desktop —
 * same split as EmojiPickerPopover so both pickers feel identical. */
export function StickerPicker({ anchorEl, onClose, onSelect }: StickerPickerProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  if (isMobile) {
    return (
      <Drawer
        anchor="bottom"
        open={Boolean(anchorEl)}
        onClose={onClose}
        slotProps={{ paper: { sx: { borderRadius: '16px 16px 0 0', overflow: 'hidden' } } }}
      >
        <StickerPanel onSelect={onSelect} onClose={onClose} />
      </Drawer>
    );
  }

  return (
    <Popover
      open={Boolean(anchorEl)}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
      transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      slotProps={{ paper: { sx: { borderRadius: 3, width: 360 } } }}
    >
      <StickerPanel onSelect={onSelect} onClose={onClose} />
    </Popover>
  );
}
