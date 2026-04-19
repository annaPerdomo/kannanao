'use client';
import { useMemo } from 'react';
import { Box, Typography, Button } from '@mui/material';
import { useShop, CELEBRATION_THEMES } from '@/hooks/useShop';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type PracticeMode = 'match' | 'fill' | 'recall';
type CelebTheme = 'confetti' | 'fireworks' | 'stars' | 'bubbles' | 'emojiRain';

export interface CelebrationScreenProps {
  heading: string;
  subheading: string;
  extra?: string;
  mode: PracticeMode;
  onExit: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Colour palettes
// ─────────────────────────────────────────────────────────────────────────────

const CONFETTI_COLORS = [
  '#ff6b9d', '#ff9f43', '#ffd32a', '#0be881', '#18dcff',
  '#a29bfe', '#fd79a8', '#fdcb6e', '#55efc4', '#74b9ff',
];

const FIREWORK_COLORS = [
  '#ff0080', '#00ffff', '#ff9900', '#00ff41',
  '#ff3366', '#ffcc00', '#cc00ff', '#ff6600',
];

const BUBBLE_COLORS = [
  'rgba(255,182,193,0.55)',
  'rgba(173,216,230,0.55)',
  'rgba(221,160,221,0.55)',
  'rgba(144,238,144,0.55)',
  'rgba(255,255,180,0.65)',
  'rgba(230,230,250,0.65)',
];

const MODE_EMOJIS: Record<PracticeMode, string[]> = {
  recall: ['🌟', '✨', '💫', '⭐', '🎯', '🏆'],
  fill:   ['✏️', '📝', '🌸', '💐', '✨', '🎨'],
  match:  ['🎯', '🎊', '🎉', '🎈', '⭐', '🔗'],
};

// ─────────────────────────────────────────────────────────────────────────────
// Theme configs
// ─────────────────────────────────────────────────────────────────────────────

interface ThemeConfig {
  bg: string;
  emoji: string;
  cardBg: string;
  cardBorder: string;
  textColor: string;
  subTextColor: string;
  btnBg: string;
  btnText: string;
}

const THEME_CONFIGS: Record<CelebTheme, ThemeConfig> = {
  confetti: {
    bg: 'radial-gradient(ellipse at 60% 30%, #3d1e6e 0%, #1a0a3e 55%, #0d0624 100%)',
    emoji: '🎊',
    cardBg: 'rgba(255,255,255,0.09)',
    cardBorder: 'rgba(255,255,255,0.2)',
    textColor: '#ffffff',
    subTextColor: 'rgba(255,255,255,0.72)',
    btnBg: '#ff6b9d',
    btnText: '#fff',
  },
  fireworks: {
    bg: 'radial-gradient(ellipse at 50% 60%, #001233 0%, #000d1f 60%, #000508 100%)',
    emoji: '🎆',
    cardBg: 'rgba(255,255,255,0.07)',
    cardBorder: 'rgba(255,255,255,0.14)',
    textColor: '#ffffff',
    subTextColor: 'rgba(255,255,255,0.68)',
    btnBg: '#00e5ff',
    btnText: '#001233',
  },
  stars: {
    bg: 'linear-gradient(160deg, #0d0d2b 0%, #0d1b4b 50%, #1a2a6c 100%)',
    emoji: '⭐',
    cardBg: 'rgba(255,255,255,0.09)',
    cardBorder: 'rgba(255,215,0,0.28)',
    textColor: '#ffffff',
    subTextColor: 'rgba(255,255,255,0.72)',
    btnBg: '#ffd700',
    btnText: '#1a1000',
  },
  bubbles: {
    bg: 'linear-gradient(135deg, #c8e6fa 0%, #e8d5f5 55%, #fde8f0 100%)',
    emoji: '🎈',
    cardBg: 'rgba(255,255,255,0.72)',
    cardBorder: 'rgba(255,255,255,0.92)',
    textColor: '#2d1b69',
    subTextColor: 'rgba(45,27,105,0.65)',
    btnBg: '#7c3aed',
    btnText: '#fff',
  },
  emojiRain: {
    bg: 'linear-gradient(145deg, #1a0533 0%, #3d0f6e 35%, #6b1a8a 70%, #a63a6e 100%)',
    emoji: '🌟',
    cardBg: 'rgba(255,255,255,0.09)',
    cardBorder: 'rgba(255,255,255,0.2)',
    textColor: '#ffffff',
    subTextColor: 'rgba(255,255,255,0.72)',
    btnBg: '#ff6e40',
    btnText: '#fff',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Particle components
// Each uses CSS custom properties (--var) set inline so a single @keyframes
// definition covers all particles while still giving per-particle values.
// ─────────────────────────────────────────────────────────────────────────────

function ConfettiParticles({ colors }: { colors?: string[] }) {
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
              '0%':   { transform: 'translateY(0) translateX(0) rotate(0deg)', opacity: 1 },
              '50%':  { transform: 'translateY(52vh) translateX(var(--wb)) rotate(calc(var(--re) / 2))' },
              '90%':  { opacity: 0.6 },
              '100%': { transform: 'translateY(115vh) translateX(0) rotate(var(--re))', opacity: 0 },
            },
          }}
        />
      ))}
    </>
  );
}

function FireworkParticles({ colors }: { colors?: string[] }) {
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
            burstId: burst.id,
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
      {/* Expanding rings */}
      {bursts.flatMap((burst) =>
        [0, 1, 2].map((ring) => (
          <Box
            key={`ring-${burst.id}-${ring}`}
            sx={{
              position: 'absolute',
              left: `${burst.x}%`,
              top: `${burst.y}%`,
              width:  `${52 + ring * 38}px`,
              height: `${52 + ring * 38}px`,
              borderRadius: '50%',
              border: `2.5px solid ${burst.color}`,
              transform: 'translate(-50%, -50%) scale(0)',
              pointerEvents: 'none',
              animation: `fwRing 3s ${burst.delay + ring * 0.13}s ease-out infinite`,
              '@keyframes fwRing': {
                '0%':   { transform: 'translate(-50%, -50%) scale(0)', opacity: 1 },
                '30%':  { transform: 'translate(-50%, -50%) scale(1)', opacity: 0 },
                '100%': { transform: 'translate(-50%, -50%) scale(1)', opacity: 0 },
              },
            }}
          />
        )),
      )}
      {/* Flying sparks */}
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
              '0%':   { transform: 'translate(-50%, -50%) scale(1.6)', opacity: 1 },
              '28%':  { transform: 'translate(calc(-50% + var(--dx)), calc(-50% + var(--dy))) scale(0)', opacity: 0 },
              '100%': { transform: 'translate(calc(-50% + var(--dx)), calc(-50% + var(--dy))) scale(0)', opacity: 0 },
            },
          }}
        />
      ))}
    </>
  );
}

function StarParticles() {
  const stars = useMemo(
    () =>
      Array.from({ length: 42 }, (_, i) => ({
        id: i,
        left: `${(i / 42) * 97 + (i % 5) * 0.8}%`,
        top:  `${(i / 42) * 95 + (i % 7) * 0.6}%`,
        size: `${13 + (i % 5) * 6}px`,
        delay: `${(i * 0.09) % 2.4}s`,
        dur:   `${0.85 + (i % 4) * 0.32}s`,
        isGold: i % 4 !== 3,
      })),
    [],
  );

  const shooters = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => ({
        id: i,
        left: `${8 + i * 13}%`,
        top:  `${4 + (i % 3) * 12}%`,
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
              '0%':   { transform: 'scale(0.25) rotate(-20deg)', opacity: 0.15 },
              '55%':  { transform: 'scale(1.4) rotate(12deg)',   opacity: 1   },
              '100%': { transform: 'scale(0.9) rotate(-6deg)',   opacity: 0.55 },
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
              '0%':   { transform: 'translate(0, 0) scale(0)', opacity: 0 },
              '18%':  { opacity: 1, transform: 'translate(calc(var(--dx) * 0.2), calc(var(--dy) * 0.2)) scale(1)' },
              '78%':  { opacity: 0.8 },
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

function BubbleParticles({ colors }: { colors?: string[] }) {
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
              '0%':   { transform: 'translateY(0) translateX(0) scale(1)', opacity: 0 },
              '8%':   { opacity: 0.85 },
              '50%':  { transform: 'translateY(-52vh) translateX(var(--wb)) scale(0.88)' },
              '92%':  { opacity: 0.4 },
              '100%': { transform: 'translateY(-115vh) translateX(0) scale(0.45)', opacity: 0 },
            },
          }}
        />
      ))}
    </>
  );
}

function EmojiRainParticles({ mode, emojis }: { mode: PracticeMode; emojis?: string[] }) {
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
              '0%':   { transform: 'translateY(0) rotate(0deg)',            opacity: 0 },
              '7%':   { opacity: 1 },
              '85%':  { opacity: 0.9 },
              '100%': { transform: 'translateY(118vh) rotate(var(--re))',   opacity: 0 },
            },
          }}
        >
          {p.emoji}
        </Box>
      ))}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

const ALL_THEMES: CelebTheme[] = ['confetti', 'fireworks', 'stars', 'bubbles', 'emojiRain'];

export const CELEBRATION_KEY_TO_THEME: Record<string, CelebTheme> = {
  celeb_hearts:       'bubbles',
  celeb_stars:        'stars',
  celeb_bunnies:      'emojiRain',
  celeb_rainbow:      'confetti',
  celeb_sparkle_pink: 'emojiRain',
  celeb_galaxy:       'fireworks',
};

// Background gradient per particle type — used by the shop preview modal
export const CELEB_PARTICLE_BG: Record<string, string> = {
  confetti:  'radial-gradient(ellipse at 60% 30%, #3d1e6e 0%, #1a0a3e 55%, #0d0624 100%)',
  fireworks: 'radial-gradient(ellipse at 50% 60%, #001233 0%, #000d1f 60%, #000508 100%)',
  stars:     'linear-gradient(160deg, #0d0d2b 0%, #0d1b4b 50%, #1a2a6c 100%)',
  bubbles:   'linear-gradient(135deg, #c8e6fa 0%, #e8d5f5 55%, #fde8f0 100%)',
  emojiRain: 'linear-gradient(145deg, #1a0533 0%, #3d0f6e 35%, #6b1a8a 70%, #a63a6e 100%)',
};

/** Renders the correct particle layer for a shop celebration item key. */
export function CelebParticleStage({ itemKey }: { itemKey: string }) {
  const celebData = CELEBRATION_THEMES[itemKey];
  const particleType: CelebTheme = CELEBRATION_KEY_TO_THEME[itemKey] ?? 'emojiRain';
  return (
    <>
      {particleType === 'confetti'  && <ConfettiParticles  colors={celebData?.colors} />}
      {particleType === 'fireworks' && <FireworkParticles  colors={celebData?.colors} />}
      {particleType === 'stars'     && <StarParticles />}
      {particleType === 'bubbles'   && <BubbleParticles    colors={celebData?.colors} />}
      {particleType === 'emojiRain' && <EmojiRainParticles mode="recall" emojis={celebData?.emojis} />}
    </>
  );
}

export function CelebrationScreen({
  heading,
  subheading,
  extra,
  mode,
  onExit,
}: CelebrationScreenProps) {
  const { equipped } = useShop();

  // Stable random fallback — picked once on mount
  const randomTheme = useMemo<CelebTheme>(
    () => ALL_THEMES[Math.floor(Math.random() * ALL_THEMES.length)],
    [],
  );

  const equippedKey = equipped['celebration'];
  const theme: CelebTheme = (equippedKey ? CELEBRATION_KEY_TO_THEME[equippedKey] : undefined) ?? randomTheme;
  const celebData = equippedKey ? CELEBRATION_THEMES[equippedKey] : undefined;

  const cfg = THEME_CONFIGS[theme];

  return (
    <Box
      sx={{
        position: 'relative',
        overflow: 'hidden',
        minHeight: 500,
        borderRadius: 4,
        background: cfg.bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: { xs: 3, sm: 5 },
      }}
    >
      {/* ── Particle layer ── */}
      {theme === 'confetti'  && <ConfettiParticles  colors={celebData?.colors} />}
      {theme === 'fireworks' && <FireworkParticles  colors={celebData?.colors} />}
      {theme === 'stars'     && <StarParticles />}
      {theme === 'bubbles'   && <BubbleParticles    colors={celebData?.colors} />}
      {theme === 'emojiRain' && <EmojiRainParticles mode={mode} emojis={celebData?.emojis} />}

      {/* ── Central card ── */}
      <Box
        sx={{
          position: 'relative',
          zIndex: 10,
          textAlign: 'center',
          px: { xs: 3, sm: 5 },
          py: 4,
          borderRadius: '28px',
          background: cfg.cardBg,
          backdropFilter: 'blur(22px)',
          WebkitBackdropFilter: 'blur(22px)',
          border: `1.5px solid ${cfg.cardBorder}`,
          maxWidth: 420,
          width: '100%',
          animation: 'cardPop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
          '@keyframes cardPop': {
            from: { transform: 'scale(0.18) translateY(40px)', opacity: 0 },
            to:   { transform: 'scale(1)    translateY(0)',    opacity: 1 },
          },
        }}
      >
        {/* Big emoji */}
        <Box
          sx={{
            fontSize: '5rem',
            lineHeight: 1,
            mb: 1,
            animation: 'bigBounce 0.85s cubic-bezier(0.34, 1.56, 0.64, 1) 0.25s both',
            '@keyframes bigBounce': {
              from: { transform: 'scale(0) rotate(-25deg)', opacity: 0 },
              to:   { transform: 'scale(1) rotate(0deg)',   opacity: 1 },
            },
          }}
        >
          {cfg.emoji}
        </Box>

        {/* Heading */}
        <Typography
          sx={{
            fontSize: { xs: '1.7rem', sm: '2.1rem' },
            fontWeight: 900,
            color: cfg.textColor,
            textShadow: '0 2px 14px rgba(0,0,0,0.3)',
            fontFamily: '"Nunito", "DM Sans", sans-serif',
            lineHeight: 1.2,
            mb: 0.75,
            animation: 'fadeUp 0.5s 0.38s ease both',
            '@keyframes fadeUp': {
              from: { transform: 'translateY(14px)', opacity: 0 },
              to:   { transform: 'translateY(0)',    opacity: 1 },
            },
          }}
        >
          {heading}
        </Typography>

        {/* Subheading (score / pairs) */}
        <Typography
          sx={{
            fontSize: '1.05rem',
            color: cfg.subTextColor,
            fontFamily: '"DM Sans", sans-serif',
            mb: extra ? 0.5 : 0,
            animation: 'fadeUp 0.5s 0.5s ease both',
          }}
        >
          {subheading}
        </Typography>

        {/* Extra line — streak / time */}
        {extra && (
          <Typography
            sx={{
              fontSize: '1rem',
              fontWeight: 700,
              color: cfg.textColor,
              fontFamily: '"DM Sans", sans-serif',
              animation: 'fadeUp 0.5s 0.6s ease both',
            }}
          >
            {extra}
          </Typography>
        )}

        {/* Wiggling star row */}
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center', gap: 0.5 }}>
          {['⭐', '✨', '⭐', '✨', '⭐'].map((s, i) => (
            <Box
              key={i}
              component="span"
              sx={{
                fontSize: '1.2rem',
                display: 'inline-block',
                animation: `starWiggle 1.3s ${i * 0.15}s ease-in-out infinite alternate`,
                '@keyframes starWiggle': {
                  from: { transform: 'translateY(0)    rotate(-10deg)' },
                  to:   { transform: 'translateY(-8px) rotate(10deg)' },
                },
              }}
            >
              {s}
            </Box>
          ))}
        </Box>

        {/* Back to Deck button */}
        <Box
          sx={{
            mt: 3,
            animation: 'fadeUp 0.5s 0.72s ease both',
          }}
        >
          <Button
            onClick={onExit}
            size="large"
            sx={{
              bgcolor: cfg.btnBg,
              color: cfg.btnText,
              fontWeight: 800,
              fontSize: '1rem',
              px: 4,
              py: 1.25,
              borderRadius: 3,
              boxShadow: `0 4px 20px ${cfg.btnBg}55`,
              '&:hover': {
                bgcolor: cfg.btnBg,
                filter: 'brightness(1.1)',
                transform: 'scale(1.06)',
                boxShadow: `0 6px 28px ${cfg.btnBg}77`,
              },
              transition: 'transform 0.15s, filter 0.15s, box-shadow 0.15s',
            }}
          >
            Back to Deck
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
