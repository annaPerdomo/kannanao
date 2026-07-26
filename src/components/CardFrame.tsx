'use client';
import Box from '@mui/material/Box';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useCallback } from 'react';

import { useCardBorder } from '@/contexts/CardBorderContext';

/**
 * The gradient banner across the top of a card face: what kind of card this is
 * on the left, its XP worth on the right.
 */
export function CardTopBar({ kind, xpLabel, xp }: { kind: string; xpLabel: string; xp: number }) {
  const { brand, accent } = useTheme().palette;
  return (
    <Box
      sx={{
        px: 1.5,
        py: 0.75,
        background: `linear-gradient(135deg, ${brand[400]} 0%, ${accent[400]} 100%)`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 0.75,
      }}
    >
      <Typography
        noWrap
        sx={{
          fontSize: '0.6rem',
          fontWeight: 900,
          color: 'white',
          textTransform: 'uppercase',
          letterSpacing: '0.07em',
          textShadow: '0 1px 3px rgba(0,0,0,0.3)',
        }}
      >
        {kind}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: '2px', flexShrink: 0 }}>
        <Typography
          sx={{
            fontSize: '0.5rem',
            fontWeight: 700,
            color: 'rgba(255,255,255,0.8)',
            lineHeight: 1,
          }}
        >
          {xpLabel}
        </Typography>
        <Typography
          sx={{
            fontSize: '0.68rem',
            fontWeight: 900,
            color: 'white',
            textShadow: '0 1px 3px rgba(0,0,0,0.3)',
            lineHeight: 1,
          }}
        >
          {xp}
        </Typography>
      </Box>
    </Box>
  );
}

/** The "ability box" strip under a card's title — a small caps label over a value. */
export function CardStatBox({ label, value }: { label: string; value: string }) {
  const { brand } = useTheme().palette;
  return (
    <Box sx={{ px: 1.5, pt: '8px' }}>
      <Box
        sx={{
          bgcolor: alpha(brand[50], 0.75),
          borderRadius: '6px',
          px: 1.2,
          py: '7px',
          border: `1px solid ${alpha(brand[400], 0.22)}`,
        }}
      >
        <Typography
          sx={{
            fontSize: '0.54rem',
            fontWeight: 900,
            color: brand[500],
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            mb: '3px',
            fontFamily: (t) => t.fonts.mono,
          }}
        >
          {label}
        </Typography>
        <Typography
          sx={{ fontSize: '0.78rem', fontWeight: 700, color: 'text.primary', lineHeight: 1.3 }}
        >
          {value}
        </Typography>
      </Box>
    </Box>
  );
}

interface CardFrameProps {
  /** Fired on click and on Enter/Space. */
  onOpen: () => void;
  /** Accessible name for the card's activation target. */
  ariaLabel: string;
  /** Card face content — rendered inside the frame's inner surface. */
  children: React.ReactNode;
}

/**
 * The trading-card chrome shared by every "collectible" tile on the dashboard:
 * two rotated card backs peeking out from behind, a metallic frame, a
 * holographic sheen on hover, and the inner surface the face is drawn on.
 *
 * The frame honours the border skin equipped in the Shop
 * (see CardBorderContext) — when one is equipped the holo sheen is suppressed so
 * the purchased look isn't washed out.
 *
 * Consumers own everything inside: DeckCard draws a deck face, SpeechCard draws
 * a speech face. Keeping the chrome here is what lets the two read as the same
 * physical object on the home screen.
 */
export function CardFrame({ onOpen, ariaLabel, children }: CardFrameProps) {
  const theme = useTheme();
  const { brand, accent } = theme.palette;
  const { borderStyle: equippedBorder } = useCardBorder();
  const hasCustomBorder = equippedBorder && Object.keys(equippedBorder).length > 0;

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onOpen();
      }
    },
    [onOpen],
  );

  const CARD_FRAME = `linear-gradient(145deg, ${brand[100]} 0%, ${brand[300]} 25%, ${brand[50]} 50%, ${brand[400]} 75%, ${brand[100]} 100%)`;

  return (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        pb: '16px',
        cursor: 'pointer',
        transition: 'transform 0.25s cubic-bezier(.34,1.56,.64,1)',
        '&:hover': { transform: 'translateY(-8px)' },
        '&:hover .deck-stack-2': { transform: 'rotate(-6deg) translateY(8px)' },
        '&:hover .deck-stack-1': { transform: 'rotate(6deg) translateY(12px)' },
        '&:hover .holo-sheen': { opacity: 1 },
      }}
    >
      {/* Card back: bottom layer */}
      <Box
        className="deck-stack-2"
        sx={{
          position: 'absolute',
          bottom: 0,
          left: '8px',
          right: '8px',
          height: '88%',
          borderRadius: '14px',
          background: hasCustomBorder ? (equippedBorder.background ?? brand[50]) : CARD_FRAME,
          border: hasCustomBorder ? equippedBorder.border : undefined,
          p: '5px',
          transition: 'transform 0.3s cubic-bezier(.34,1.56,.64,1)',
          zIndex: 1,
        }}
      >
        <Box
          sx={{
            width: '100%',
            height: '100%',
            borderRadius: '10px',
            backgroundImage: `radial-gradient(circle at 50% 50%, ${brand[600]} 0%, ${brand[900]} 100%), radial-gradient(circle, ${alpha('#fff', 0.08)} 1.5px, transparent 1.5px)`,
            backgroundSize: 'auto, 16px 16px',
          }}
        />
      </Box>

      {/* Card back: middle layer */}
      <Box
        className="deck-stack-1"
        sx={{
          position: 'absolute',
          bottom: '6px',
          left: '4px',
          right: '4px',
          height: '92%',
          borderRadius: '14px',
          background: hasCustomBorder ? (equippedBorder.background ?? brand[50]) : CARD_FRAME,
          border: hasCustomBorder ? equippedBorder.border : undefined,
          p: '5px',
          transition: 'transform 0.3s cubic-bezier(.34,1.56,.64,1)',
          zIndex: 2,
        }}
      >
        <Box
          sx={{
            width: '100%',
            height: '100%',
            borderRadius: '10px',
            background: `radial-gradient(circle at 50% 40%, ${accent[500]} 0%, ${accent[800]} 100%)`,
          }}
        />
      </Box>

      {/* Front card */}
      <Box
        sx={{
          position: 'relative',
          zIndex: 3,
          background: hasCustomBorder ? (equippedBorder.background ?? brand[50]) : CARD_FRAME,
          borderRadius: '14px',
          p: '5px',
          border: hasCustomBorder ? equippedBorder.border : undefined,
          boxShadow: hasCustomBorder
            ? equippedBorder.boxShadow
            : `0 6px 24px rgba(0,0,0,0.16), 0 2px 8px ${alpha(brand[400], 0.28)}`,
          transition: 'box-shadow 0.25s ease',
          '&:hover': hasCustomBorder
            ? {}
            : { boxShadow: `0 16px 40px rgba(0,0,0,0.24), 0 4px 12px ${alpha(brand[400], 0.38)}` },
        }}
      >
        {/* Holographic sheen — only on default border */}
        {!hasCustomBorder && (
          <Box
            className="holo-sheen"
            sx={{
              position: 'absolute',
              inset: 0,
              borderRadius: '14px',
              background:
                'linear-gradient(115deg, transparent 0%, rgba(255,50,180,0.2) 20%, rgba(255,220,50,0.2) 35%, rgba(50,255,150,0.2) 50%, rgba(50,150,255,0.2) 65%, rgba(180,50,255,0.2) 80%, transparent 100%)',
              opacity: 0,
              transition: 'opacity 0.35s ease',
              pointerEvents: 'none',
              zIndex: 10,
              mixBlendMode: 'screen',
            }}
          />
        )}

        {/* Inner card */}
        <Box
          role="button"
          tabIndex={0}
          onClick={onOpen}
          onKeyDown={handleKeyDown}
          aria-label={ariaLabel}
          sx={{
            bgcolor: brand[50],
            borderRadius: '10px',
            overflow: 'hidden',
            border: '2px solid rgba(255,255,255,0.88)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
}
