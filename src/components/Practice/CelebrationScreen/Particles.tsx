'use client';
import { Box } from '@mui/material';
import { useMemo } from 'react';

import {
  BUBBLE_COLORS,
  CONFETTI_COLORS,
  FIREWORK_COLORS,
  HEART_COLORS,
  MODE_EMOJIS,
  type PracticeMode,
  SPARKLE_COLORS,
} from './constants';

export function ConfettiParticles({ colors }: { colors?: string[] }) {
  const palette = colors ?? CONFETTI_COLORS;
  const pieces = useMemo(
    () =>
      Array.from({ length: 58 }, (_, i) => ({
        id: i,
        left: `${((i / 58) * 100 + (i % 7) * 2.5) % 100}%`,
        delay: `${(i * 0.055) % 2}s`,
        duration: `${1.8 + (i % 6) * 0.22}s`,
        size: `${8 + (i % 5) * 3}px`,
        color: palette[i % palette.length],
        isCircle: i % 3 === 0,
        rotateEnd: `${(i % 2 === 0 ? 1 : -1) * (360 + (i % 5) * 120)}deg`,
        wobble: `${(i % 2 === 0 ? 1 : -1) * (8 + (i % 6) * 7)}px`,
      })),
    [palette],
  );

  return (
    <>
      {pieces.map((p) => (
        <Box
          key={p.id}
          style={{ '--re': p.rotateEnd, '--wb': p.wobble } as React.CSSProperties}
          sx={{
            position: 'absolute',
            left: p.left,
            top: '-22px',
            width: p.size,
            height: p.size,
            bgcolor: p.color,
            borderRadius: p.isCircle ? '50%' : '2px',
            pointerEvents: 'none',
            animation: `confettiFall ${p.duration} ${p.delay} ease-in infinite`,
            '@keyframes confettiFall': {
              '0%': { transform: 'translateY(0) translateX(0) rotate(0deg)', opacity: 1 },
              '50%': {
                transform: 'translateY(52vh) translateX(var(--wb)) rotate(calc(var(--re) / 2))',
              },
              '90%': { opacity: 0.6 },
              '100%': {
                transform: 'translateY(115vh) translateX(0) rotate(var(--re))',
                opacity: 0,
              },
            },
          }}
        />
      ))}
    </>
  );
}

export function FireworkParticles({ colors }: { colors?: string[] }) {
  const palette = colors ?? FIREWORK_COLORS;
  const bursts = useMemo(
    () =>
      Array.from({ length: 5 }, (_, i) => ({
        id: i,
        x: [18, 72, 42, 80, 14][i],
        y: [18, 14, 52, 44, 68][i],
        delay: i * 0.38,
        color: palette[i % palette.length],
      })),
    [palette],
  );

  const sparks = useMemo(
    () =>
      bursts.flatMap((burst) =>
        Array.from({ length: 12 }, (_, j) => {
          const angle = (j / 12) * Math.PI * 2;
          const dist = 65 + (j % 3) * 18;
          return {
            id: `${burst.id}-${j}`,
            x: burst.x,
            y: burst.y,
            color: burst.color,
            dx: Math.round(Math.cos(angle) * dist),
            dy: Math.round(Math.sin(angle) * dist),
            delay: burst.delay + 0.04,
          };
        }),
      ),
    [bursts],
  );

  return (
    <>
      {bursts.flatMap((burst) =>
        [0, 1, 2].map((ring) => (
          <Box
            key={`ring-${burst.id}-${ring}`}
            sx={{
              position: 'absolute',
              left: `${burst.x}%`,
              top: `${burst.y}%`,
              width: `${52 + ring * 38}px`,
              height: `${52 + ring * 38}px`,
              borderRadius: '50%',
              border: `2.5px solid ${burst.color}`,
              transform: 'translate(-50%, -50%) scale(0)',
              pointerEvents: 'none',
              animation: `fwRing 3s ${burst.delay + ring * 0.13}s ease-out infinite`,
              '@keyframes fwRing': {
                '0%': { transform: 'translate(-50%, -50%) scale(0)', opacity: 1 },
                '30%': { transform: 'translate(-50%, -50%) scale(1)', opacity: 0 },
                '100%': { transform: 'translate(-50%, -50%) scale(1)', opacity: 0 },
              },
            }}
          />
        )),
      )}
      {sparks.map((s) => (
        <Box
          key={`spark-${s.id}`}
          style={{ '--dx': `${s.dx}px`, '--dy': `${s.dy}px` } as React.CSSProperties}
          sx={{
            position: 'absolute',
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: 7,
            height: 7,
            borderRadius: '50%',
            bgcolor: s.color,
            pointerEvents: 'none',
            animation: `fwSpark 3s ${s.delay}s ease-out infinite`,
            '@keyframes fwSpark': {
              '0%': { transform: 'translate(-50%, -50%) scale(1.6)', opacity: 1 },
              '28%': {
                transform: 'translate(calc(-50% + var(--dx)), calc(-50% + var(--dy))) scale(0)',
                opacity: 0,
              },
              '100%': {
                transform: 'translate(calc(-50% + var(--dx)), calc(-50% + var(--dy))) scale(0)',
                opacity: 0,
              },
            },
          }}
        />
      ))}
    </>
  );
}

export function StarParticles() {
  const stars = useMemo(
    () =>
      Array.from({ length: 42 }, (_, i) => ({
        id: i,
        left: `${(i / 42) * 97 + (i % 5) * 0.8}%`,
        top: `${(i / 42) * 95 + (i % 7) * 0.6}%`,
        size: `${13 + (i % 5) * 6}px`,
        delay: `${(i * 0.09) % 2.4}s`,
        dur: `${0.85 + (i % 4) * 0.32}s`,
        isGold: i % 4 !== 3,
      })),
    [],
  );

  const shooters = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => ({
        id: i,
        left: `${8 + i * 13}%`,
        top: `${4 + (i % 3) * 12}%`,
        dx: `${90 + i * 18}px`,
        dy: `${35 + i * 12}px`,
        delay: `${0.2 + i * 0.45}s`,
      })),
    [],
  );

  return (
    <>
      {stars.map((s) => (
        <Box
          key={s.id}
          sx={{
            position: 'absolute',
            left: s.left,
            top: s.top,
            fontSize: s.size,
            lineHeight: 1,
            pointerEvents: 'none',
            animation: `starPulse ${s.dur} ${s.delay} ease-in-out infinite alternate`,
            '@keyframes starPulse': {
              '0%': { transform: 'scale(0.25) rotate(-20deg)', opacity: 0.15 },
              '55%': { transform: 'scale(1.4) rotate(12deg)', opacity: 1 },
              '100%': { transform: 'scale(0.9) rotate(-6deg)', opacity: 0.55 },
            },
          }}
        >
          {s.isGold ? '⭐' : '✨'}
        </Box>
      ))}
      {shooters.map((s) => (
        <Box
          key={`sh-${s.id}`}
          style={{ '--dx': s.dx, '--dy': s.dy } as React.CSSProperties}
          sx={{
            position: 'absolute',
            left: s.left,
            top: s.top,
            fontSize: '1.1rem',
            pointerEvents: 'none',
            animation: `shootStar 2s ${s.delay}s ease-in-out infinite`,
            '@keyframes shootStar': {
              '0%': { transform: 'translate(0, 0) scale(0)', opacity: 0 },
              '18%': {
                opacity: 1,
                transform: 'translate(calc(var(--dx) * 0.2), calc(var(--dy) * 0.2)) scale(1)',
              },
              '78%': { opacity: 0.8 },
              '100%': { transform: 'translate(var(--dx), var(--dy)) scale(0.2)', opacity: 0 },
            },
          }}
        >
          💫
        </Box>
      ))}
    </>
  );
}

export function BubbleParticles({ colors }: { colors?: string[] }) {
  const palette = colors ?? BUBBLE_COLORS;
  const bubbles = useMemo(
    () =>
      Array.from({ length: 24 }, (_, i) => ({
        id: i,
        left: `${4 + (i / 24) * 92 + (i % 5) * 0.8}%`,
        size: `${22 + (i % 5) * 13}px`,
        delay: `${(i * 0.16) % 2.8}s`,
        dur: `${2.8 + (i % 5) * 0.45}s`,
        color: palette[i % palette.length],
        wobble: `${(i % 2 === 0 ? 1 : -1) * (12 + (i % 5) * 9)}px`,
      })),
    [palette],
  );

  return (
    <>
      {bubbles.map((b) => (
        <Box
          key={b.id}
          style={{ '--wb': b.wobble } as React.CSSProperties}
          sx={{
            position: 'absolute',
            left: b.left,
            bottom: '-35px',
            width: b.size,
            height: b.size,
            borderRadius: '50%',
            bgcolor: b.color,
            border: '1.5px solid rgba(255,255,255,0.85)',
            pointerEvents: 'none',
            animation: `bubbleRise ${b.dur} ${b.delay} ease-in infinite`,
            '@keyframes bubbleRise': {
              '0%': { transform: 'translateY(0) translateX(0) scale(1)', opacity: 0 },
              '8%': { opacity: 0.85 },
              '50%': { transform: 'translateY(-52vh) translateX(var(--wb)) scale(0.88)' },
              '92%': { opacity: 0.4 },
              '100%': { transform: 'translateY(-115vh) translateX(0) scale(0.45)', opacity: 0 },
            },
          }}
        />
      ))}
    </>
  );
}

export function EmojiRainParticles({ mode, emojis }: { mode: PracticeMode; emojis?: string[] }) {
  const emojiSet = emojis ?? MODE_EMOJIS[mode];
  const pieces = useMemo(
    () =>
      Array.from({ length: 30 }, (_, i) => ({
        id: i,
        left: `${((i / 30) * 100 + (i % 6) * 1.2) % 100}%`,
        delay: `${(i * 0.1) % 2.6}s`,
        dur: `${2.2 + (i % 5) * 0.38}s`,
        size: `${20 + (i % 4) * 8}px`,
        emoji: emojiSet[i % emojiSet.length],
        rotateEnd: `${(i % 2 === 0 ? 1 : -1) * (80 + (i % 4) * 50)}deg`,
      })),
    [emojiSet],
  );

  return (
    <>
      {pieces.map((p) => (
        <Box
          key={p.id}
          style={{ '--re': p.rotateEnd } as React.CSSProperties}
          sx={{
            position: 'absolute',
            left: p.left,
            top: '-32px',
            fontSize: p.size,
            lineHeight: 1,
            pointerEvents: 'none',
            animation: `emojiDrift ${p.dur} ${p.delay} ease-in infinite`,
            '@keyframes emojiDrift': {
              '0%': { transform: 'translateY(0) rotate(0deg)', opacity: 0 },
              '7%': { opacity: 1 },
              '85%': { opacity: 0.9 },
              '100%': { transform: 'translateY(118vh) rotate(var(--re))', opacity: 0 },
            },
          }}
        >
          {p.emoji}
        </Box>
      ))}
    </>
  );
}

export function HeartParticles({ colors }: { colors?: string[] }) {
  const palette = colors ?? HEART_COLORS;
  const hearts = useMemo(
    () =>
      Array.from({ length: 40 }, (_, i) => ({
        id: i,
        left: `${((i / 40) * 100 + (i % 7) * 2) % 100}%`,
        delay: `${(i * 0.08) % 2.5}s`,
        dur: `${2.5 + (i % 5) * 0.4}s`,
        size: `${18 + (i % 6) * 8}px`,
        color: palette[i % palette.length],
        wobble: `${(i % 2 === 0 ? 1 : -1) * (15 + (i % 5) * 10)}px`,
        rotateEnd: `${(i % 2 === 0 ? 1 : -1) * (20 + (i % 4) * 15)}deg`,
        useEmoji: i % 3 === 0,
        emoji: ['💖', '💗', '💕', '❤️', '💝', '💓', '💞', '🩷'][i % 8],
      })),
    [palette],
  );

  return (
    <>
      {hearts.map((h) => (
        <Box
          key={h.id}
          style={{ '--wb': h.wobble, '--re': h.rotateEnd } as React.CSSProperties}
          sx={{
            position: 'absolute',
            left: h.left,
            top: '-30px',
            pointerEvents: 'none',
            animation: `heartFall ${h.dur} ${h.delay} ease-in infinite`,
            '@keyframes heartFall': {
              '0%': { transform: 'translateY(0) translateX(0) rotate(0deg) scale(0)', opacity: 0 },
              '5%': {
                transform: 'translateY(2vh) translateX(0) rotate(0deg) scale(1.2)',
                opacity: 1,
              },
              '10%': {
                transform:
                  'translateY(5vh) translateX(calc(var(--wb) * 0.3)) rotate(calc(var(--re) * 0.2)) scale(1)',
              },
              '50%': {
                transform: 'translateY(50vh) translateX(var(--wb)) rotate(calc(var(--re) * 0.6))',
                opacity: 0.9,
              },
              '85%': { opacity: 0.5 },
              '100%': {
                transform:
                  'translateY(110vh) translateX(calc(var(--wb) * -0.5)) rotate(var(--re)) scale(0.6)',
                opacity: 0,
              },
            },
          }}
        >
          {h.useEmoji ? (
            <Box sx={{ fontSize: h.size, lineHeight: 1 }}>{h.emoji}</Box>
          ) : (
            <Box
              sx={{
                width: h.size,
                height: h.size,
                position: 'relative',
                animation: `heartPulse ${0.8 + (h.id % 3) * 0.2}s ease-in-out infinite alternate`,
                '@keyframes heartPulse': {
                  '0%': { transform: 'scale(0.85)' },
                  '100%': { transform: 'scale(1.1)' },
                },
                '&::before, &::after': {
                  content: '""',
                  position: 'absolute',
                  width: h.size,
                  height: h.size,
                  borderRadius: '50%',
                  bgcolor: h.color,
                },
                '&::before': {
                  top: '-50%',
                  left: 0,
                },
                '&::after': {
                  top: 0,
                  left: '50%',
                },
                bgcolor: h.color,
                transform: 'rotate(-45deg)',
                transformOrigin: 'center center',
                filter: `drop-shadow(0 0 ${4 + (h.id % 3) * 2}px ${h.color}80)`,
              }}
            />
          )}
        </Box>
      ))}
    </>
  );
}

export function BunnyParticles() {
  const bunnies = useMemo(
    () =>
      Array.from({ length: 24 }, (_, i) => {
        const emojis = ['🐰', '🐇', '🌸', '🥕', '🌷', '💐', '🎀', '🍡'];
        return {
          id: i,
          left: `${((i / 24) * 100 + (i % 5) * 3) % 100}%`,
          delay: `${(i * 0.14) % 3}s`,
          dur: `${3 + (i % 4) * 0.5}s`,
          size: `${22 + (i % 5) * 8}px`,
          emoji: emojis[i % emojis.length],
          isBunny: i % 3 === 0,
          hopHeight: `${30 + (i % 4) * 15}px`,
          wobble: `${(i % 2 === 0 ? 1 : -1) * (20 + (i % 4) * 12)}px`,
        };
      }),
    [],
  );

  return (
    <>
      {bunnies.map((b) => (
        <Box
          key={b.id}
          style={{ '--hop': b.hopHeight, '--wb': b.wobble } as React.CSSProperties}
          sx={{
            position: 'absolute',
            left: b.left,
            top: '-40px',
            fontSize: b.size,
            lineHeight: 1,
            pointerEvents: 'none',
            animation: b.isBunny
              ? `bunnyHopFall ${b.dur} ${b.delay} ease-in-out infinite`
              : `bunnyDrift ${b.dur} ${b.delay} ease-in infinite`,
            '@keyframes bunnyHopFall': {
              '0%': { transform: 'translateY(0) translateX(0) scaleX(1)', opacity: 0 },
              '5%': { opacity: 1 },
              '15%': { transform: 'translateY(12vh) translateX(calc(var(--wb) * 0.2)) scaleX(1)' },
              '20%': {
                transform:
                  'translateY(calc(12vh - var(--hop))) translateX(calc(var(--wb) * 0.3)) scaleX(-1)',
              },
              '25%': { transform: 'translateY(25vh) translateX(calc(var(--wb) * 0.5)) scaleX(-1)' },
              '30%': {
                transform:
                  'translateY(calc(25vh - var(--hop))) translateX(calc(var(--wb) * 0.6)) scaleX(1)',
              },
              '40%': { transform: 'translateY(40vh) translateX(calc(var(--wb) * 0.7)) scaleX(1)' },
              '45%': {
                transform: 'translateY(calc(40vh - var(--hop))) translateX(var(--wb)) scaleX(-1)',
              },
              '55%': { transform: 'translateY(55vh) translateX(calc(var(--wb) * 0.8)) scaleX(-1)' },
              '60%': {
                transform:
                  'translateY(calc(55vh - var(--hop) * 0.7)) translateX(calc(var(--wb) * 0.6)) scaleX(1)',
              },
              '75%': {
                transform: 'translateY(75vh) translateX(calc(var(--wb) * 0.3)) scaleX(1)',
                opacity: 0.8,
              },
              '100%': { transform: 'translateY(115vh) translateX(0) scaleX(-1)', opacity: 0 },
            },
            '@keyframes bunnyDrift': {
              '0%': { transform: 'translateY(0) translateX(0) rotate(0deg)', opacity: 0 },
              '7%': { opacity: 1 },
              '50%': { transform: 'translateY(55vh) translateX(var(--wb)) rotate(15deg)' },
              '85%': { opacity: 0.7 },
              '100%': {
                transform: 'translateY(115vh) translateX(calc(var(--wb) * -0.5)) rotate(-10deg)',
                opacity: 0,
              },
            },
          }}
        >
          {b.emoji}
        </Box>
      ))}
    </>
  );
}

export function SparkleParticles({ colors }: { colors?: string[] }) {
  const palette = colors ?? SPARKLE_COLORS;
  const particles = useMemo(
    () =>
      Array.from({ length: 50 }, (_, i) => {
        const isEmoji = i % 4 === 0;
        const emojis = ['✨', '💖', '🌸', '🦩', '💅', '💎', '🩷', '⭐'];
        return {
          id: i,
          left: `${(i / 50) * 100}%`,
          top: `${(i * 7.3) % 100}%`,
          delay: `${(i * 0.07) % 2.5}s`,
          dur: `${1.2 + (i % 5) * 0.35}s`,
          size: isEmoji ? `${16 + (i % 4) * 6}px` : `${4 + (i % 4) * 3}px`,
          color: palette[i % palette.length],
          isEmoji,
          emoji: emojis[i % emojis.length],
          dx: `${(i % 2 === 0 ? 1 : -1) * (10 + (i % 5) * 8)}px`,
        };
      }),
    [palette],
  );

  return (
    <>
      {particles.map((p) => (
        <Box
          key={p.id}
          style={{ '--dx': p.dx } as React.CSSProperties}
          sx={{
            position: 'absolute',
            left: p.left,
            top: p.top,
            pointerEvents: 'none',
            animation: `sparkleGlow ${p.dur} ${p.delay} ease-in-out infinite`,
            '@keyframes sparkleGlow': {
              '0%': { transform: 'translateX(0) scale(0)', opacity: 0 },
              '20%': { transform: 'translateX(calc(var(--dx) * 0.3)) scale(1.4)', opacity: 1 },
              '50%': { transform: 'translateX(var(--dx)) scale(0.8)', opacity: 0.9 },
              '80%': { transform: 'translateX(calc(var(--dx) * 0.5)) scale(1.2)', opacity: 0.6 },
              '100%': { transform: 'translateX(0) scale(0)', opacity: 0 },
            },
          }}
        >
          {p.isEmoji ? (
            <Box sx={{ fontSize: p.size, lineHeight: 1 }}>{p.emoji}</Box>
          ) : (
            <Box
              sx={{
                width: p.size,
                height: p.size,
                borderRadius: '50%',
                bgcolor: p.color,
                boxShadow: `0 0 ${6 + (p.id % 3) * 4}px ${p.color}, 0 0 ${12 + (p.id % 3) * 6}px ${p.color}60`,
              }}
            />
          )}
        </Box>
      ))}
    </>
  );
}
