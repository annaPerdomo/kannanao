'use client';

import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import Popover from '@mui/material/Popover';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTranslations } from 'next-intl';

import { STICKERS, stickerSrc } from '@/lib/stickers';

interface StickerPickerProps {
  anchorEl: HTMLElement | null;
  onClose: () => void;
  /** Called with the sticker id — the caller sends it as its own message */
  onSelect: (id: string) => void;
}

function StickerGrid({ onSelect, onClose }: Pick<StickerPickerProps, 'onSelect' | 'onClose'>) {
  const { palette } = useTheme();
  const { brand } = palette;
  const t = useTranslations('Messages.stickerPicker');
  const tNames = useTranslations('Messages.stickerNames');

  return (
    <Box sx={{ p: 1.5, bgcolor: alpha(brand[50], 0.6) }}>
      <Typography sx={{ fontWeight: 800, fontSize: '0.8rem', color: brand[700], px: 0.5, pb: 1 }}>
        {t('title')}
      </Typography>
      {/* A FIXED height, not maxHeight: the desktop popover is anchored by its
          bottom edge, so MUI positions it from whatever the panel measures at
          open time. With an elastic height the not-yet-loaded artwork measured
          near zero, MUI placed the panel too low, and it then grew off the
          bottom of the screen as the images arrived. */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(4, 1fr)', sm: 'repeat(6, 1fr)' },
          gap: 0.5,
          height: { xs: 300, sm: 340 },
          overflowY: 'auto',
        }}
      >
        {STICKERS.map((sticker) => {
          const name = tNames(sticker.id);
          return (
            <Box
              key={sticker.id}
              component="button"
              type="button"
              onClick={() => {
                onSelect(sticker.id);
                onClose();
              }}
              aria-label={name}
              // Doubles as a hint for the keyword you can type instead
              title={`${name} · :${sticker.id}:`}
              sx={{
                border: 'none',
                background: 'none',
                p: 0.5,
                borderRadius: 2,
                cursor: 'pointer',
                lineHeight: 0,
                // Holds each cell's space before its artwork loads, so the
                // grid never reflows (and never lies about its height)
                aspectRatio: '1 / 1',
                transition: 'transform 0.12s ease, background-color 0.12s ease',
                '&:hover, &:focus-visible': {
                  bgcolor: alpha(brand[200], 0.5),
                  transform: 'scale(1.08)',
                },
              }}
            >
              <Box
                component="img"
                src={stickerSrc(sticker.id)}
                alt=""
                loading="lazy"
                decoding="async"
                width={64}
                height={64}
                sx={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
              />
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

/** Grid of Tango stickers. Bottom sheet on phones, popover on desktop —
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
        <StickerGrid onSelect={onSelect} onClose={onClose} />
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
      <StickerGrid onSelect={onSelect} onClose={onClose} />
    </Popover>
  );
}
