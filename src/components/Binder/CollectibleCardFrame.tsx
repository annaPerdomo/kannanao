'use client';
import Box from '@mui/material/Box';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import type { KeyboardEvent, ReactNode } from 'react';

import { HOLO_SHEEN } from './styles';

interface CollectibleCardFrameProps {
  label: string;
  onOpen: () => void;
  frame: string;
  glow: string;
  unlocked: boolean;
  sheen?: boolean;
  faceBg?: string;
  lockedIcon: string;
  lockedContent: ReactNode;
  children: ReactNode;
}

export function CollectibleCardFrame({
  label,
  onOpen,
  frame,
  glow,
  unlocked,
  sheen = false,
  faceBg,
  lockedIcon,
  lockedContent,
  children,
}: CollectibleCardFrameProps) {
  const { brand, accent } = useTheme().palette;
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onOpen();
    }
  };

  return (
    <Box
      role="button"
      tabIndex={0}
      aria-label={label}
      onClick={onOpen}
      onKeyDown={onKeyDown}
      sx={{
        position: 'relative',
        aspectRatio: '5 / 7',
        borderRadius: '14px',
        p: '4px',
        cursor: 'pointer',
        background: unlocked ? frame : alpha(brand[200], 0.5),
        boxShadow: unlocked ? `0 4px 14px rgba(0,0,0,0.14), 0 1px 4px ${alpha(glow, 0.3)}` : 'none',
        transition: 'transform 0.2s cubic-bezier(.34,1.56,.64,1), box-shadow 0.2s ease',
        '&:hover, &:focus-visible': { transform: 'translateY(-4px)', outline: 'none' },
        '&:focus-visible': { boxShadow: `0 0 0 3px ${alpha(accent[500], 0.5)}` },
      }}
    >
      {unlocked && sheen && (
        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            inset: 0,
            borderRadius: '14px',
            background: HOLO_SHEEN,
            opacity: 0.5,
            pointerEvents: 'none',
            mixBlendMode: 'screen',
            zIndex: 2,
          }}
        />
      )}
      {unlocked ? (
        <Box
          sx={{
            height: '100%',
            borderRadius: '10px',
            bgcolor: faceBg ?? brand[50],
            border: '2px solid rgba(255,255,255,0.88)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {children}
        </Box>
      ) : (
        <Box
          sx={{
            height: '100%',
            borderRadius: '10px',
            backgroundImage: `radial-gradient(circle at 50% 50%, ${alpha(brand[500], 0.55)} 0%, ${alpha(brand[800], 0.55)} 100%), radial-gradient(circle, ${alpha('#fff', 0.1)} 1.5px, transparent 1.5px)`,
            backgroundSize: 'auto, 14px 14px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 0.5,
            px: 0.75,
            textAlign: 'center',
            color: alpha('#fff', 0.9),
          }}
        >
          <Typography sx={{ fontSize: '1.6rem', lineHeight: 1 }} aria-hidden>
            {lockedIcon}
          </Typography>
          {lockedContent}
        </Box>
      )}
    </Box>
  );
}
