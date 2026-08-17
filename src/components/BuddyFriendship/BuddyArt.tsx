'use client';

import Box from '@mui/material/Box';
import { alpha } from '@mui/material/styles';

import { BUDDY_ART, buddyShopSrc } from '@/lib/buddies';

interface BuddyArtProps {
  buddyKey: string;
  size: number;
}

export function BuddyArt({ buddyKey, size }: BuddyArtProps) {
  const art = BUDDY_ART[buddyKey];
  if (!art) return null;

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        width: '100%',
        py: 1,
        borderRadius: 3,
        background: `radial-gradient(ellipse at 50% 100%, ${alpha(art.accent, 0.22)} 0%, ${alpha(art.bg, 0.6)} 70%)`,
      }}
    >
      <Box
        component="img"
        src={buddyShopSrc(buddyKey)}
        alt=""
        sx={{ width: size, height: 'auto', objectFit: 'contain' }}
      />
    </Box>
  );
}
