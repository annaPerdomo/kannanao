import { keyframes } from '@mui/material/styles';

export const idleFloat = keyframes`
  0%, 100% { transform: translateY(0) rotate(-2deg); }
  50% { transform: translateY(-8px) rotate(2deg); }
`;

export const bounce = keyframes`
  0%, 100% { transform: translateY(0) scale(1); }
  20% { transform: translateY(-14px) scale(1.1); }
  40% { transform: translateY(-4px) scale(1); }
  60% { transform: translateY(-10px) scale(1.05); }
  80% { transform: translateY(-2px) scale(1); }
`;

export const wobble = keyframes`
  0%, 100% { transform: rotate(0deg) scale(1); }
  20% { transform: rotate(-8deg) scale(0.95); }
  40% { transform: rotate(8deg) scale(0.95); }
  60% { transform: rotate(-5deg) scale(0.98); }
  80% { transform: rotate(3deg) scale(1); }
`;

export const bubbleIn = keyframes`
  0% { transform: scale(0) translateY(4px); opacity: 0; }
  50% { transform: scale(1.08) translateY(-1px); opacity: 1; }
  100% { transform: scale(1) translateY(0); opacity: 1; }
`;

export const tapWiggle = keyframes`
  0% { transform: scale(1) rotate(0deg); }
  20% { transform: scale(1.15) rotate(-12deg); }
  40% { transform: scale(0.95) rotate(8deg); }
  60% { transform: scale(1.1) rotate(-5deg); }
  80% { transform: scale(1) rotate(3deg); }
  100% { transform: scale(1) rotate(0deg); }
`;

export const heartPop = keyframes`
  0% { transform: scale(0); opacity: 1; }
  50% { transform: scale(1.4); opacity: 0.8; }
  100% { transform: scale(0.3) translateY(-22px); opacity: 0; }
`;

export const sparkleFloat = keyframes`
  0% { transform: scale(0) translateY(0); opacity: 1; }
  100% { transform: scale(1) translateY(-20px); opacity: 0; }
`;

export const chipPop = keyframes`
  0% { transform: scale(1); }
  40% { transform: scale(1.35); }
  100% { transform: scale(1); }
`;

export const heartLand = keyframes`
  0% { transform: translateY(-46px) scale(0.6); opacity: 0; }
  25% { opacity: 1; }
  70% { transform: translateY(-8px) scale(1.25); opacity: 1; }
  100% { transform: translateY(0) scale(0.5); opacity: 0; }
`;

export const awardLineIn = keyframes`
  0% { transform: translateY(8px) scale(0.92); opacity: 0; }
  12% { transform: translateY(0) scale(1); opacity: 1; }
  82% { transform: translateY(0) scale(1); opacity: 1; }
  100% { transform: translateY(-6px) scale(1); opacity: 0; }
`;

export const awardFade = keyframes`
  0% { opacity: 0; }
  12%, 82% { opacity: 1; }
  100% { opacity: 0; }
`;

// Fades a pre-painted layer: animating box-shadow instead repaints the blur on
// every frame, on every page, for as long as the app is open.
export const glowPulse = keyframes`
  0%, 100% { opacity: 0; }
  50% { opacity: 1; }
`;
