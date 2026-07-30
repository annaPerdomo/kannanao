'use client';

import Box from '@mui/material/Box';
import { alpha, keyframes } from '@mui/material/styles';

import { BUDDY_ART, buddyShopSrc, DEFAULT_BUDDY_KEY } from '@/lib/buddies';

const wobbleFloat = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
`;

export function BuddyCardPreview({ buddyKey }: { buddyKey: string }) {
  const art = BUDDY_ART[buddyKey] ?? BUDDY_ART[DEFAULT_BUDDY_KEY];

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        position: 'relative',
        background: `radial-gradient(ellipse at 50% 90%, ${alpha(art.accent, 0.22)} 0%, ${art.bg} 65%)`,
        overflow: 'hidden',
      }}
    >
      {[...Array(6)].map((_, i) => (
        <Box
          key={i}
          sx={{
            position: 'absolute',
            width: 4 + (i % 3) * 2,
            height: 4 + (i % 3) * 2,
            borderRadius: '50%',
            bgcolor: alpha(art.accent, 0.25 + (i % 3) * 0.1),
            top: `${12 + ((i * 13) % 55)}%`,
            left: `${8 + ((i * 31) % 84)}%`,
            animation: `${wobbleFloat} ${2 + i * 0.3}s ease-in-out infinite`,
            animationDelay: `${i * 0.2}s`,
          }}
        />
      ))}

      <Box
        component="img"
        src={buddyShopSrc(buddyKey)}
        alt=""
        loading="lazy"
        decoding="async"
        draggable={false}
        sx={{
          position: 'absolute',
          bottom: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          height: '88%',
          maxWidth: '78%',
          objectFit: 'contain',
          objectPosition: 'bottom',
          filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.08))',
        }}
      />
    </Box>
  );
}
