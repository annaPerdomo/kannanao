'use client';
import Box from '@mui/material/Box';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';

/** Six-sided medal outline, shared by the badge's rim and its face. */
const HEXAGON = 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)';

/**
 * Where each decorative sparkle sits, and how big it is. All on the outboard
 * side — the badge's other edge is up against the XP copy, and a sparkle there
 * reads as punctuation on the number beside it.
 */
const SPARKLES = [
  { top: '-2%', right: '-12%', size: '0.85rem' },
  { top: '38%', right: '-16%', size: '0.6rem' },
  { bottom: '20%', right: '-6%', size: '0.7rem' },
] as const;

interface LevelBadgeProps {
  level: number;
  /** Rendered size in px. Defaults to the home dashboard's 96px. */
  size?: number;
}

/**
 * The hexagonal level medal on the home XP card — a gradient rim around a
 * darker face carrying the level number, with two ribbon tails and a few
 * sparkles. Purely decorative: the level is also stated in the card's text, so
 * this is hidden from assistive tech.
 */
export function LevelBadge({ level, size = 96 }: LevelBadgeProps) {
  const { brand, accent } = useTheme().palette;

  return (
    <Box
      aria-hidden
      sx={{
        position: 'relative',
        width: size,
        height: size * 1.18,
        flexShrink: 0,
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      {/* Ribbon tails, tucked behind the medal */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 0,
          display: 'flex',
          gap: `${size * 0.16}px`,
        }}
      >
        {[-1, 1].map((dir) => (
          <Box
            key={dir}
            sx={{
              width: size * 0.2,
              height: size * 0.36,
              transform: `rotate(${dir * 8}deg)`,
              background: `linear-gradient(180deg, ${accent[400]} 0%, ${accent[600]} 100%)`,
              clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 72%, 0 100%)',
            }}
          />
        ))}
      </Box>

      {/* Medal: gradient rim wrapping a darker face */}
      <Box
        sx={{
          position: 'relative',
          width: size,
          height: size,
          p: `${Math.round(size * 0.06)}px`,
          clipPath: HEXAGON,
          background: `linear-gradient(160deg, ${brand[200]} 0%, ${brand[400]} 100%)`,
          filter: `drop-shadow(0 6px 14px ${alpha(brand[500], 0.45)})`,
        }}
      >
        <Box
          sx={{
            width: '100%',
            height: '100%',
            clipPath: HEXAGON,
            background: `linear-gradient(160deg, ${brand[500]} 0%, ${brand[700]} 55%, ${accent[600]} 100%)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Typography
            sx={{
              fontSize: size * 0.36,
              fontWeight: 900,
              lineHeight: 1,
              color: '#fff',
              textShadow: '0 2px 6px rgba(0,0,0,0.35)',
            }}
          >
            {level}
          </Typography>
        </Box>
      </Box>

      {SPARKLES.map(({ size: fontSize, ...position }, i) => (
        <Box
          key={i}
          component="span"
          sx={{
            position: 'absolute',
            ...position,
            fontSize,
            lineHeight: 1,
            color: i % 2 === 0 ? accent[300] : brand[300],
          }}
        >
          ✦
        </Box>
      ))}
    </Box>
  );
}
