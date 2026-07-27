import { keyframes } from '@mui/material';

// --- Ambient motion ---
export const glowPulse = keyframes`
  0%, 100% { opacity: 0.45; transform: translate(-50%, -50%) scale(0.9); }
  50%      { opacity: 0.9;  transform: translate(-50%, -50%) scale(1.12); }
`;

export const shimmer = keyframes`
  0%   { background-position: -300% center; }
  100% { background-position:  300% center; }
`;

export const phraseCycle = keyframes`
  0%    { opacity: 0; transform: translateY(6px); }
  4%    { opacity: 1; transform: translateY(0); }
  13%   { opacity: 1; }
  17%   { opacity: 0; transform: translateY(-4px); }
  100%  { opacity: 0; }
`;

// --- Tango the mascot ---
export const tangoHop = keyframes`
  0%   { transform: translateX(-50%) translateY(0)     scaleX(1)    scaleY(1); }
  12%  { transform: translateX(-50%) translateY(2px)   scaleX(1.08) scaleY(0.9); }
  38%  { transform: translateX(-50%) translateY(-10px) scaleX(0.96) scaleY(1.05); }
  55%  { transform: translateX(-50%) translateY(-11px) scaleX(0.98) scaleY(1.02); }
  78%  { transform: translateX(-50%) translateY(1px)   scaleX(1.07) scaleY(0.9); }
  90%  { transform: translateX(-50%) translateY(0)     scaleX(0.98) scaleY(1.02); }
  100% { transform: translateX(-50%) translateY(0)     scaleX(1)    scaleY(1); }
`;

export const tangoWobble = keyframes`
  0%, 100% { transform: rotate(-3deg); }
  50%      { transform: rotate(3deg); }
`;

export const groundShadow = keyframes`
  0%, 100% { transform: translateX(-50%) scaleX(1);    opacity: 0.3; }
  45%, 60% { transform: translateX(-50%) scaleX(0.62); opacity: 0.14; }
`;

export const blink = keyframes`
  0%, 90%  { transform: scaleY(0); }
  94%, 97% { transform: scaleY(1); }
  100%     { transform: scaleY(0); }
`;

export const tonguePant = keyframes`
  0%, 100% { transform: translateX(-50%) scaleY(1); }
  50%      { transform: translateX(-50%) scaleY(1.18); }
`;

export const dotBounce = keyframes`
  0%, 60%, 100% { transform: translateY(0);    opacity: 0.45; }
  30%           { transform: translateY(-3px); opacity: 1; }
`;

// --- Orbiting sparkles ---
export const orbit0 = keyframes`
  0%   { transform: rotate(0deg)   translateX(76px) scale(1);   opacity: 1; }
  50%  { transform: rotate(180deg) translateX(76px) scale(0.6); opacity: 0.5; }
  100% { transform: rotate(360deg) translateX(76px) scale(1);   opacity: 1; }
`;
export const orbit1 = keyframes`
  0%   { transform: rotate(60deg)  translateX(66px) scale(0.8); opacity: 0.7; }
  50%  { transform: rotate(240deg) translateX(66px) scale(1.1); opacity: 1; }
  100% { transform: rotate(420deg) translateX(66px) scale(0.8); opacity: 0.7; }
`;
export const orbit2 = keyframes`
  0%   { transform: rotate(120deg) translateX(83px) scale(1.1); opacity: 0.9; }
  50%  { transform: rotate(300deg) translateX(83px) scale(0.7); opacity: 0.5; }
  100% { transform: rotate(480deg) translateX(83px) scale(1.1); opacity: 0.9; }
`;
export const orbit3 = keyframes`
  0%   { transform: rotate(200deg) translateX(70px) scale(0.9); opacity: 0.6; }
  50%  { transform: rotate(380deg) translateX(70px) scale(1.2); opacity: 1; }
  100% { transform: rotate(560deg) translateX(70px) scale(0.9); opacity: 0.6; }
`;
export const orbit4 = keyframes`
  0%   { transform: rotate(300deg) translateX(80px) scale(1);   opacity: 0.8; }
  50%  { transform: rotate(480deg) translateX(80px) scale(0.7); opacity: 0.4; }
  100% { transform: rotate(660deg) translateX(80px) scale(1);   opacity: 0.8; }
`;

export const SPARKLES = [
  {
    animation: orbit0,
    duration: '3.2s',
    char: '✦',
    size: 13,
    tone: 'accent' as const,
    toneKey: 400 as const,
  },
  {
    animation: orbit1,
    duration: '2.8s',
    char: '⋆',
    size: 10,
    tone: 'brand' as const,
    toneKey: 300 as const,
  },
  {
    animation: orbit2,
    duration: '3.8s',
    char: '✸',
    size: 14,
    tone: 'brand' as const,
    toneKey: 400 as const,
  },
  {
    animation: orbit3,
    duration: '3s',
    char: '✺',
    size: 11,
    tone: 'accent' as const,
    toneKey: 300 as const,
  },
  {
    animation: orbit4,
    duration: '2.6s',
    char: '✷',
    size: 12,
    tone: 'brand' as const,
    toneKey: 200 as const,
  },
];

/**
 * Cycling speech-bubble flavor text. Kept bilingual and locale-invariant like
 * the greeting in GreetingHero — Tango always speaks Japanese, and the
 * English gloss underneath is a translation aid, not a UI string.
 */
export const PHRASES: Array<{ jp: string; en: string }> = [
  { jp: 'がんばって！', en: 'Keep going!' },
  { jp: 'もうすぐだよ', en: 'Almost there' },
  { jp: '{楽|たの}しく{学|まな}ぼう', en: 'Learn with fun' },
  { jp: 'いい{調子|ちょうし}！', en: "You're on a roll!" },
  { jp: 'ファイト！', en: 'Fight on!' },
  { jp: 'すごい！', en: 'Amazing!' },
];

export const PHRASE_CYCLE_SECONDS = 2.6;

// --- Layout (design pixels at the "sm and up" size; index.tsx scales this
// whole stage down as one unit for xs so every animation above stays correct
// without a second set of keyframe values) ---
export const STAGE_WIDTH = 232;
export const STAGE_HEIGHT = 250;
export const DOG_WIDTH = 116;
export const DOG_ASPECT = 358 / 266;
export const MOBILE_SCALE = 0.8;
