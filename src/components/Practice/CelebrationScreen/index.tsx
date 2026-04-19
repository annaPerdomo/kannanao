'use client';
import { useMemo } from 'react';
import { Box, Typography, Button } from '@mui/material';
import { useShop, CELEBRATION_THEMES } from '@/hooks/useShop';
import {
  THEME_CONFIGS, ALL_THEMES, CELEBRATION_KEY_TO_THEME,
  type PracticeMode, type CelebTheme,
} from './constants';
import {
  ConfettiParticles, FireworkParticles, StarParticles,
  BubbleParticles, EmojiRainParticles,
} from './Particles';

export type { PracticeMode } from './constants';
export { CELEBRATION_KEY_TO_THEME, CELEB_PARTICLE_BG } from './constants';

export interface CelebrationScreenProps {
  heading: string;
  subheading: string;
  extra?: string;
  mode: PracticeMode;
  onExit: () => void;
}

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

export function CelebrationScreen({ heading, subheading, extra, mode, onExit }: CelebrationScreenProps) {
  const { equipped } = useShop();
  const randomTheme = useMemo<CelebTheme>(() => ALL_THEMES[Math.floor(Math.random() * ALL_THEMES.length)], []);

  const equippedKey = equipped['celebration'];
  const theme: CelebTheme = (equippedKey ? CELEBRATION_KEY_TO_THEME[equippedKey] : undefined) ?? randomTheme;
  const celebData = equippedKey ? CELEBRATION_THEMES[equippedKey] : undefined;
  const cfg = THEME_CONFIGS[theme];

  return (
    <Box
      sx={{
        position: 'relative', overflow: 'hidden', minHeight: 500, borderRadius: 4,
        background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
        p: { xs: 3, sm: 5 },
      }}
    >
      {theme === 'confetti'  && <ConfettiParticles  colors={celebData?.colors} />}
      {theme === 'fireworks' && <FireworkParticles  colors={celebData?.colors} />}
      {theme === 'stars'     && <StarParticles />}
      {theme === 'bubbles'   && <BubbleParticles    colors={celebData?.colors} />}
      {theme === 'emojiRain' && <EmojiRainParticles mode={mode} emojis={celebData?.emojis} />}

      <Box
        sx={{
          position: 'relative', zIndex: 10, textAlign: 'center',
          px: { xs: 3, sm: 5 }, py: 4, borderRadius: '28px',
          background: cfg.cardBg, backdropFilter: 'blur(22px)', WebkitBackdropFilter: 'blur(22px)',
          border: `1.5px solid ${cfg.cardBorder}`, maxWidth: 420, width: '100%',
          animation: 'cardPop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
          '@keyframes cardPop': {
            from: { transform: 'scale(0.18) translateY(40px)', opacity: 0 },
            to: { transform: 'scale(1) translateY(0)', opacity: 1 },
          },
        }}
      >
        <Box sx={{
          fontSize: '5rem', lineHeight: 1, mb: 1,
          animation: 'bigBounce 0.85s cubic-bezier(0.34, 1.56, 0.64, 1) 0.25s both',
          '@keyframes bigBounce': {
            from: { transform: 'scale(0) rotate(-25deg)', opacity: 0 },
            to: { transform: 'scale(1) rotate(0deg)', opacity: 1 },
          },
        }}>
          {cfg.emoji}
        </Box>

        <Typography sx={{
          fontSize: { xs: '1.7rem', sm: '2.1rem' }, fontWeight: 900, color: cfg.textColor,
          textShadow: '0 2px 14px rgba(0,0,0,0.3)', fontFamily: '"Nunito", "DM Sans", sans-serif',
          lineHeight: 1.2, mb: 0.75,
          animation: 'fadeUp 0.5s 0.38s ease both',
          '@keyframes fadeUp': { from: { transform: 'translateY(14px)', opacity: 0 }, to: { transform: 'translateY(0)', opacity: 1 } },
        }}>
          {heading}
        </Typography>

        <Typography sx={{
          fontSize: '1.05rem', color: cfg.subTextColor, fontFamily: '"DM Sans", sans-serif',
          mb: extra ? 0.5 : 0, animation: 'fadeUp 0.5s 0.5s ease both',
        }}>
          {subheading}
        </Typography>

        {extra && (
          <Typography sx={{
            fontSize: '1rem', fontWeight: 700, color: cfg.textColor,
            fontFamily: '"DM Sans", sans-serif', animation: 'fadeUp 0.5s 0.6s ease both',
          }}>
            {extra}
          </Typography>
        )}

        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center', gap: 0.5 }}>
          {['⭐', '✨', '⭐', '✨', '⭐'].map((s, i) => (
            <Box key={i} component="span" sx={{
              fontSize: '1.2rem', display: 'inline-block',
              animation: `starWiggle 1.3s ${i * 0.15}s ease-in-out infinite alternate`,
              '@keyframes starWiggle': {
                from: { transform: 'translateY(0) rotate(-10deg)' },
                to: { transform: 'translateY(-8px) rotate(10deg)' },
              },
            }}>{s}</Box>
          ))}
        </Box>

        <Box sx={{ mt: 3, animation: 'fadeUp 0.5s 0.72s ease both' }}>
          <Button
            onClick={onExit} size="large"
            sx={{
              bgcolor: cfg.btnBg, color: cfg.btnText, fontWeight: 800, fontSize: '1rem',
              px: 4, py: 1.25, borderRadius: 3, boxShadow: `0 4px 20px ${cfg.btnBg}55`,
              '&:hover': { bgcolor: cfg.btnBg, filter: 'brightness(1.1)', transform: 'scale(1.06)', boxShadow: `0 6px 28px ${cfg.btnBg}77` },
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
