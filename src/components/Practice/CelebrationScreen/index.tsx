'use client';
import { Box, Button, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

import FuriganaText from '@/components/FuriganaText';
import { useQuestHandoff } from '@/contexts/QuestHandoffContext';
import { useShopCtx } from '@/contexts/ShopContext';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { CELEBRATION_THEMES } from '@/hooks/useShop';

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
export {
  CELEB_PARTICLE_BG,
  CELEBRATION_KEY_TO_THEME,
  pickPraise,
  PRAISE_GOOD,
  PRAISE_GREAT,
  PRAISE_PERFECT,
} from './constants';

/** Optional daily-chest reward shown on the celebration screen. */
export interface CelebrationChest {
  /** Golden for a perfect clear, wooden otherwise. */
  variant: 'gold' | 'wood';
  /** XP the chest holds (shown after it opens). */
  xp: number;
  /** Called once when the student taps to open — parent awards + persists. */
  onOpen: () => void;
}

export interface CelebrationScreenProps {
  /** Main phrase. May contain `{kanji|reading}` furigana markup — rendered with
   *  ruby readings so learners of any level can read it. */
  heading: string;
  /** Optional English translation of `heading`, shown just beneath it. */
  headingEn?: string;
  subheading: string;
  extra?: string;
  mode: PracticeMode;
  /** When set, a tappable daily chest appears above the exit button. */
  chest?: CelebrationChest;
  /** Exit button label (defaults to the translated "Back to Deck"). */
  exitLabel?: string;
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

/**
 * The daily chest on the celebration screen. Closed until tapped; opening awards
 * the XP (via the parent's onOpen) and reveals the reward. Golden for a perfect
 * clear. The shimmy/burst is skipped when the user prefers reduced motion.
 */
function ChestReward({ chest, textColor }: { chest: CelebrationChest; textColor: string }) {
  const t = useTranslations('Practice.celebration');
  const [opened, setOpened] = useState(false);
  const reducedMotion = useReducedMotion();
  const gold = chest.variant === 'gold';
  const glow = gold ? '#F5C518' : '#C08A4A';

  const open = () => {
    if (opened) return;
    setOpened(true);
    chest.onOpen();
  };

  return (
    <Box sx={{ mt: 2.5, animation: 'fadeUp 0.5s 0.66s ease both' }}>
      <Box
        role="button"
        tabIndex={opened ? -1 : 0}
        aria-label={opened ? t('chestOpenedAria', { xp: chest.xp }) : t('openChestAria')}
        onClick={open}
        onKeyDown={(e) => {
          if (!opened && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            open();
          }
        }}
        sx={{
          display: 'inline-flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 0.5,
          cursor: opened ? 'default' : 'pointer',
          userSelect: 'none',
        }}
      >
        <Box
          sx={{
            fontSize: '3.4rem',
            lineHeight: 1,
            filter: `drop-shadow(0 4px 14px ${alpha(glow, 0.6)})`,
            transition: 'transform 0.2s',
            ...(reducedMotion
              ? {}
              : opened
                ? {
                    animation: 'chestBurst 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    '@keyframes chestBurst': {
                      '0%': { transform: 'scale(0.6) rotate(-8deg)' },
                      '60%': { transform: 'scale(1.25) rotate(6deg)' },
                      '100%': { transform: 'scale(1) rotate(0deg)' },
                    },
                  }
                : {
                    animation: 'chestWiggle 1.4s ease-in-out infinite',
                    '@keyframes chestWiggle': {
                      '0%, 100%': { transform: 'rotate(-4deg)' },
                      '50%': { transform: 'rotate(4deg)' },
                    },
                  }),
          }}
          aria-hidden
        >
          {opened ? '🎉' : gold ? '🧰' : '🎁'}
        </Box>
        <Typography sx={{ fontWeight: 800, fontSize: '0.95rem', color: textColor }}>
          {opened
            ? t('chestReward', { xp: chest.xp })
            : gold
              ? t('goldenChestTap')
              : t('dailyChestTap')}
        </Typography>
      </Box>
    </Box>
  );
}

export function CelebrationScreen({
  heading,
  headingEn,
  subheading,
  extra,
  mode,
  chest,
  exitLabel,
  onExit,
}: CelebrationScreenProps) {
  const tCommon = useTranslations('Practice.common');
  // In a quest the exit button becomes the one step forward.
  const handoff = useQuestHandoff();
  const resolvedExitLabel = handoff?.label ?? exitLabel ?? tCommon('backToDeck');
  const { equipped } = useShopCtx();
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
          borderRadius: (theme) => theme.radii.lg,
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

        {chest && <ChestReward chest={chest} textColor={cfg.textColor} />}

        <Box sx={{ mt: 3, animation: 'fadeUp 0.5s 0.72s ease both' }}>
          <Button
            onClick={handoff ? handoff.onNext : onExit}
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
            {resolvedExitLabel}
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
