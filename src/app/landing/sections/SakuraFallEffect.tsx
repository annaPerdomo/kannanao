'use client';

import Box from '@mui/material/Box';

const FALL_PETALS = [
  { id: 0,  left: '4%',  size: 14, dur: 10.5, delay: 0,   anim: 'sakuraFall-l', opacity: 0.50 },
  { id: 1,  left: '12%', size: 11, dur: 12.0, delay: 1.8, anim: 'sakuraFall-r', opacity: 0.40 },
  { id: 2,  left: '21%', size: 16, dur: 9.2,  delay: 3.5, anim: 'sakuraFall-c', opacity: 0.55 },
  { id: 3,  left: '30%', size: 12, dur: 11.5, delay: 0.7, anim: 'sakuraFall-l', opacity: 0.45 },
  { id: 4,  left: '39%', size: 15, dur: 10.0, delay: 4.2, anim: 'sakuraFall-r', opacity: 0.50 },
  { id: 5,  left: '48%', size: 11, dur: 13.0, delay: 2.1, anim: 'sakuraFall-c', opacity: 0.38 },
  { id: 6,  left: '56%', size: 15, dur: 9.8,  delay: 5.5, anim: 'sakuraFall-l', opacity: 0.48 },
  { id: 7,  left: '64%', size: 13, dur: 11.2, delay: 1.3, anim: 'sakuraFall-r', opacity: 0.52 },
  { id: 8,  left: '72%', size: 17, dur: 10.5, delay: 3.0, anim: 'sakuraFall-c', opacity: 0.42 },
  { id: 9,  left: '80%', size: 12, dur: 12.5, delay: 6.0, anim: 'sakuraFall-l', opacity: 0.46 },
  { id: 10, left: '88%', size: 14, dur: 9.5,  delay: 2.8, anim: 'sakuraFall-r', opacity: 0.50 },
  { id: 11, left: '95%', size: 11, dur: 11.8, delay: 4.8, anim: 'sakuraFall-c', opacity: 0.38 },
  { id: 12, left: '17%', size: 13, dur: 10.2, delay: 7.5, anim: 'sakuraFall-r', opacity: 0.44 },
  { id: 13, left: '43%', size: 15, dur: 11.0, delay: 8.2, anim: 'sakuraFall-l', opacity: 0.50 },
  { id: 14, left: '69%', size: 12, dur: 9.0,  delay: 7.0, anim: 'sakuraFall-c', opacity: 0.42 },
];

export function SakuraFallEffect() {
  return (
    <Box sx={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 0 }}>
      {FALL_PETALS.map(p => (
        <Box key={p.id} component="span" sx={{
          position: 'absolute', top: '-60px', left: p.left,
          fontSize: `${p.size}px`, lineHeight: 1,
          opacity: p.opacity, display: 'block', userSelect: 'none',
          animation: `${p.anim} ${p.dur}s ${p.delay}s ease-in-out infinite`,
          willChange: 'transform, opacity',
        }}>
          🌸
        </Box>
      ))}
    </Box>
  );
}
