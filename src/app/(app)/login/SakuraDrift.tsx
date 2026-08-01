'use client';

import Box from '@mui/material/Box';
import { keyframes } from '@mui/material/styles';

// Wind petals matching the painted ones in /login/background*.webp: soft pink
// ovals blowing from the top-right canopy toward the lower left. Colors are
// sampled from the artwork, not the theme — the backdrop is the same in every
// color scheme.
const drift = keyframes`
  0% { transform: translate3d(0, -8vh, 0); opacity: 0; }
  7% { opacity: var(--petal-o); }
  86% { opacity: var(--petal-o); }
  100% { transform: translate3d(-58vw, 104vh, 0); opacity: 0; }
`;

// Tumble: rotation swing plus foreshortening, like a petal turning in the air.
const flutter = keyframes`
  0%, 100% { transform: rotate(calc(var(--petal-r) - 28deg)) scaleX(1); }
  50% { transform: rotate(calc(var(--petal-r) + 42deg)) scaleX(0.72); }
`;

const TONES = [
  'linear-gradient(135deg, #FDE3EC 0%, #F6AFC9 100%)',
  'linear-gradient(135deg, #FCD8E4 0%, #F29CBB 100%)',
  'linear-gradient(135deg, #FFEDF3 0%, #F8C1D4 100%)',
];

// `left` runs past 100% so petals also enter from the right edge mid-viewport,
// the way wind from the right would carry them. Negative delays start every
// petal mid-flight, so the sky is already alive on first paint.
const PETALS = [
  { id: 0, left: '8%', size: 13, dur: 15, delay: -2, flutter: 3.1, rot: 10, tone: 0, o: 0.75 },
  { id: 1, left: '16%', size: 18, dur: 12, delay: -9, flutter: 2.6, rot: -20, tone: 1, o: 0.85 },
  { id: 2, left: '24%', size: 11, dur: 17, delay: -5, flutter: 3.6, rot: 35, tone: 2, o: 0.6 },
  { id: 3, left: '33%', size: 15, dur: 13, delay: -11, flutter: 2.9, rot: -8, tone: 0, o: 0.8 },
  { id: 4, left: '41%', size: 12, dur: 16, delay: -1, flutter: 3.3, rot: 24, tone: 1, o: 0.65 },
  { id: 5, left: '50%', size: 19, dur: 11, delay: -7, flutter: 2.4, rot: -30, tone: 2, o: 0.9 },
  { id: 6, left: '58%', size: 13, dur: 14, delay: -12, flutter: 3.0, rot: 14, tone: 0, o: 0.7 },
  { id: 7, left: '66%', size: 16, dur: 12.5, delay: -4, flutter: 2.7, rot: -16, tone: 1, o: 0.85 },
  { id: 8, left: '74%', size: 11, dur: 18, delay: -8, flutter: 3.7, rot: 40, tone: 2, o: 0.55 },
  { id: 9, left: '82%', size: 14, dur: 13.5, delay: -0.5, flutter: 2.8, rot: -5, tone: 0, o: 0.8 },
  { id: 10, left: '90%', size: 17, dur: 11.5, delay: -6, flutter: 2.5, rot: 28, tone: 1, o: 0.9 },
  {
    id: 11,
    left: '98%',
    size: 12,
    dur: 16.5,
    delay: -10,
    flutter: 3.4,
    rot: -24,
    tone: 2,
    o: 0.65,
  },
  { id: 12, left: '108%', size: 15, dur: 13, delay: -3, flutter: 2.9, rot: 8, tone: 0, o: 0.8 },
  {
    id: 13,
    left: '118%',
    size: 12,
    dur: 15.5,
    delay: -13,
    flutter: 3.2,
    rot: -35,
    tone: 1,
    o: 0.7,
  },
  { id: 14, left: '128%', size: 18, dur: 12, delay: -7.5, flutter: 2.6, rot: 18, tone: 2, o: 0.85 },
  {
    id: 15,
    left: '138%',
    size: 13,
    dur: 14.5,
    delay: -1.5,
    flutter: 3.0,
    rot: -12,
    tone: 0,
    o: 0.75,
  },
  { id: 16, left: '46%', size: 10, dur: 19, delay: -15, flutter: 3.8, rot: 32, tone: 2, o: 0.5 },
  {
    id: 17,
    left: '86%',
    size: 10,
    dur: 18.5,
    delay: -14,
    flutter: 3.5,
    rot: -28,
    tone: 1,
    o: 0.55,
  },
];

export function SakuraDrift() {
  return (
    <Box
      aria-hidden
      sx={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
        zIndex: 0,
        '@media (prefers-reduced-motion: reduce)': { display: 'none' },
      }}
    >
      {PETALS.map((p) => (
        <Box
          key={p.id}
          component="span"
          style={{ '--petal-o': p.o } as React.CSSProperties}
          sx={{
            position: 'absolute',
            top: 0,
            left: p.left,
            display: 'block',
            opacity: 0,
            animation: `${drift} ${p.dur}s ${p.delay}s linear infinite`,
            willChange: 'transform, opacity',
          }}
        >
          <Box
            component="span"
            style={{ '--petal-r': `${p.rot}deg` } as React.CSSProperties}
            sx={{
              display: 'block',
              width: p.size,
              height: Math.round(p.size * 0.62),
              borderRadius: '62% 38% 58% 42% / 55% 62% 38% 45%',
              background: TONES[p.tone],
              boxShadow: '0 0 6px rgba(243,158,192,0.35)',
              animation: `${flutter} ${p.flutter}s ease-in-out infinite`,
            }}
          />
        </Box>
      ))}
    </Box>
  );
}
