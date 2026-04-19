'use client';

import Box from '@mui/material/Box';

export function Blob({
  color, size, top, left, right, bottom, opacity = 0.3, blur = 70, pulse = false,
}: {
  color: string; size: number; top?: string | number; left?: string | number;
  right?: string | number; bottom?: string | number; opacity?: number; blur?: number; pulse?: boolean;
}) {
  return (
    <Box sx={{
      position: 'absolute', width: size, height: size, borderRadius: '50%',
      background: color, opacity, filter: `blur(${blur}px)`,
      top, left, right, bottom, pointerEvents: 'none',
      ...(pulse ? {
        '@keyframes blobPulse': {
          '0%,100%': { transform: 'scale(1)', opacity },
          '50%': { transform: 'scale(1.14)', opacity: Math.min(opacity * 1.5, 0.9) },
        },
        animation: 'blobPulse 7s ease-in-out infinite',
      } : {}),
    }} />
  );
}
