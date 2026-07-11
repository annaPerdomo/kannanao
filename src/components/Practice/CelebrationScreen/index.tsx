'use client';
import { Box, Button, Typography } from '@mui/material';
import { useMemo } from 'react';

import FuriganaText from '@/components/FuriganaText';
import { CELEBRATION_THEMES, useShop } from '@/hooks/useShop';

import {
  ALL_THEMES,
  CELEBRATION_KEY_TO_THEME,
  type CelebTheme,
  type PracticeMode,
  THEME_CONFIGS,
} from './constants';
import {
  BubbleParticles,
  BunnyParticles,
  ConfettiParticles,
  EmojiRainParticles,
  FireworkParticles,
  HeartParticles,
  SparkleParticles,
  StarParticles,
} from './Particles';

export type { PracticeMode, Praise } from './constants';
export { CELEB_PARTICLE_BG, CELEBRATION_KEY_TO_THEME, pickPraise } from './constants';

export interface CelebrationScreenProps {
  /** Main phrase. May contain `{kanji|reading}` furigana markup — rendered with
   *  ruby readings so learners of any level can read it. */
  heading: string;
  /** Optional English translation of `heading`, shown just beneath it. */
  headingEn?: string;
  subheading: string;
  extra?: string;
  mode: PracticeMode;
  onExit: () => void;
}

function RenderParticles({
  theme,
  celebData,
  mode,
}: {
  theme: CelebTheme;
  celebData?: { colors: string[]; emojis: string[] };
  mode: PracticeMode;
}) {
  switch (theme) {
    case 'hearts':
      return <HeartParticles colors={celebData?.colors} />;
    case 'bunnies':
      return <BunnyParticles />;
    case 'sparkle':
      return <SparkleParticles colors={celebData?.colors} />;
    case 'confetti':
      return <ConfettiParticles colors={celebData?.colors} />;
    case 'fireworks':
      return <FireworkParticles colors={celebData?.colors} />;
    case 'stars':
      return <StarParticles />;
    case 'bubbles':
      return <BubbleParticles colors={celebData?.colors} />;
    case 'emojiRain':
      return <EmojiRainParticles mode={mode} emojis={celebData?.emojis} />;
    default:
      return <ConfettiParticles colors={celebData?.colors} />;
  }
}

export function CelebParticleStage({ itemKey }: { itemKey: string }) {
  const celebData = CELEBRATION_THEMES[itemKey];
  const particleType: CelebTheme = CELEBRATION_KEY_TO_THEME[itemKey] ?? 'emojiRain';
  return <RenderParticles theme={particleType} celebData={celebData} mode="recall" />;
}

export function CelebrationScreen({
  heading,
  headingEn,
  subheading,
  extra,
  mode,
  onExit,
}: CelebrationScreenProps) {
  const { equipped } = useShop();
  const randomTheme = useMemo<CelebTheme>(
    () => ALL_THEMES[Math.floor(Math.random() * ALL_THEMES.length)],
    [],
  );

  const equippedKey = equipped['celebration'];
  const theme: CelebTheme =
    (equippedKey ? CELEBRATION_KEY_TO_THEME[equippedKey] : undefined) ?? randomTheme;
  const celebData = equippedKey ? CELEBRATION_THEMES[equippedKey] : undefined;
  const cfg = THEME_CONFIGS[theme] ?? THEME_CONFIGS.confetti;

  return (
    <Box
      sx={{
        position: 'fixed',
        inset: 0,
        zIndex: 1400,
        overflow: 'hidden',
        background: cfg.bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: { xs: 2, sm: 5 },
        animation: 'celebFadeIn 0.4s ease-out',
        '@keyframes celebFadeIn': {
          from: { opacity: 0 },
          to: { opacity: 1 },
        },
      }}
    >
      <RenderParticles theme={theme} celebData={celebData} mode={mode} />

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
            to: { transform: 'scale(1) translateY(0)', opacity: 1 },
          },
        }}
      >
        <Box
          sx={{
            fontSize: '5rem',
            lineHeight: 1,
            mb: 1,
            animation: 'bigBounce 0.85s cubic-bezier(0.34, 1.56, 0.64, 1) 0.25s both',
            '@keyframes bigBounce': {
              from: { transform: 'scale(0) rotate(-25deg)', opacity: 0 },
              to: { transform: 'scale(1) rotate(0deg)', opacity: 1 },
            },
          }}
        >
          {cfg.emoji}
        </Box>

        <Typography
          component="div"
          sx={{
            fontFamily: (t) => t.fonts.jp,
            fontSize: { xs: '1.9rem', sm: '2.3rem' },
            fontWeight: 900,
            color: cfg.textColor,
            textShadow: '0 2px 14px rgba(0,0,0,0.3)',
            lineHeight: 1.25,
            mb: headingEn ? 0.25 : 0.75,
            animation: 'fadeUp 0.5s 0.38s ease both',
            '& rt': { fontWeight: 700, opacity: 0.85 },
            '@keyframes fadeUp': {
              from: { transform: 'translateY(14px)', opacity: 0 },
              to: { transform: 'translateY(0)', opacity: 1 },
            },
          }}
        >
          <FuriganaText text={heading} showFurigana />
        </Typography>

        {headingEn && (
          <Typography
            sx={{
              fontSize: '1.05rem',
              fontWeight: 700,
              color: cfg.textColor,
              opacity: 0.9,
              mb: 0.6,
              animation: 'fadeUp 0.5s 0.46s ease both',
            }}
          >
            {headingEn}
          </Typography>
        )}

        <Typography
          sx={{
            fontSize: '1.05rem',
            color: cfg.subTextColor,
            mb: extra ? 0.5 : 0,
            animation: 'fadeUp 0.5s 0.5s ease both',
          }}
        >
          {subheading}
        </Typography>

        {extra && (
          <Typography
            sx={{
              fontSize: '1rem',
              fontWeight: 700,
              color: cfg.textColor,
              animation: 'fadeUp 0.5s 0.6s ease both',
            }}
          >
            {extra}
          </Typography>
        )}

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
                  from: { transform: 'translateY(0) rotate(-10deg)' },
                  to: { transform: 'translateY(-8px) rotate(10deg)' },
                },
              }}
            >
              {s}
            </Box>
          ))}
        </Box>

        <Box sx={{ mt: 3, animation: 'fadeUp 0.5s 0.72s ease both' }}>
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
