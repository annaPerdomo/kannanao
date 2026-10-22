'use client';

import Box from '@mui/material/Box';
import { alpha, useTheme } from '@mui/material/styles';

import { useStickerName } from '@/hooks/useStickerName';
import { type StickerSet, stickerSrc } from '@/lib/stickers';

interface StickerGridProps {
  set: StickerSet;
  locked: boolean;
  onSelect: (id: string) => void;
}

const CELL_SX = {
  p: 0.5,
  borderRadius: 2,
  lineHeight: 0,
  // Holds each cell's space before its artwork loads, so the grid never
  // reflows (and never lies about its height)
  aspectRatio: '1 / 1',
} as const;

const IMG_SX = { width: '100%', height: '100%', objectFit: 'contain', display: 'block' } as const;

export function StickerGrid({ set, locked, onSelect }: StickerGridProps) {
  const { brand } = useTheme().palette;
  const stickerName = useStickerName();

  return (
    <Box
      aria-hidden={locked || undefined}
      sx={{
        flex: 1,
        minHeight: 0,
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(4, 1fr)', sm: 'repeat(6, 1fr)' },
        alignContent: 'start',
        gap: 0.5,
        overflowY: 'auto',
        ...(locked && { filter: 'grayscale(1)', opacity: 0.45 }),
      }}
    >
      {set.stickers.map((sticker) => {
        const img = (
          <Box
            component="img"
            src={stickerSrc(sticker.id)}
            alt=""
            loading="lazy"
            decoding="async"
            width={64}
            height={64}
            sx={IMG_SX}
          />
        );
        if (locked) {
          return (
            <Box key={sticker.id} sx={CELL_SX}>
              {img}
            </Box>
          );
        }
        const name = stickerName(sticker);
        return (
          <Box
            key={sticker.id}
            component="button"
            type="button"
            onClick={() => onSelect(sticker.id)}
            aria-label={name}
            // Doubles as a hint for the keyword you can type instead
            title={`${name} · :${sticker.id}:`}
            sx={{
              ...CELL_SX,
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              transition: 'transform 0.12s ease, background-color 0.12s ease',
              '&:hover, &:focus-visible': {
                bgcolor: alpha(brand[200], 0.5),
                transform: 'scale(1.08)',
              },
            }}
          >
            {img}
          </Box>
        );
      })}
    </Box>
  );
}
