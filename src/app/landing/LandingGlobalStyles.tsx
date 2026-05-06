'use client';

import GlobalStyles from '@mui/material/GlobalStyles';
import { useEffect } from 'react';

export default function LandingGlobalStyles() {
  useEffect(() => {
    document.documentElement.style.scrollBehavior = 'smooth';
    return () => {
      document.documentElement.style.scrollBehavior = '';
    };
  }, []);

  return (
    <GlobalStyles
      styles={{
        '@keyframes sakuraFall-l': {
          '0%': { transform: 'translateY(-60px) translateX(0) rotate(0deg)', opacity: '0' },
          '8%': { opacity: '1' },
          '50%': { transform: 'translateY(48vh) translateX(-70px) rotate(340deg)' },
          '92%': { opacity: '0.5' },
          '100%': { transform: 'translateY(105vh) translateX(-20px) rotate(700deg)', opacity: '0' },
        },
        '@keyframes sakuraFall-r': {
          '0%': { transform: 'translateY(-60px) translateX(0) rotate(0deg)', opacity: '0' },
          '8%': { opacity: '1' },
          '50%': { transform: 'translateY(48vh) translateX(70px) rotate(360deg)' },
          '92%': { opacity: '0.5' },
          '100%': { transform: 'translateY(105vh) translateX(20px) rotate(680deg)', opacity: '0' },
        },
        '@keyframes sakuraFall-c': {
          '0%': { transform: 'translateY(-60px) translateX(0) rotate(0deg)', opacity: '0' },
          '8%': { opacity: '1' },
          '30%': { transform: 'translateY(28vh) translateX(35px) rotate(200deg)' },
          '70%': { transform: 'translateY(72vh) translateX(-25px) rotate(500deg)' },
          '92%': { opacity: '0.5' },
          '100%': { transform: 'translateY(105vh) translateX(10px) rotate(680deg)', opacity: '0' },
        },
        '@keyframes cursorBlink': {
          '0%,49%': { opacity: '1' },
          '50%,100%': { opacity: '0' },
        },
        '@keyframes chipPopIn': {
          '0%': { opacity: '0', transform: 'scale(0.7)' },
          '70%': { transform: 'scale(1.05)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        '@keyframes floatUp': {
          '0%': { transform: 'translateY(0) rotate(0deg)', opacity: '0' },
          '20%': { opacity: '1' },
          '80%': { opacity: '1' },
          '100%': { transform: 'translateY(-120px) rotate(8deg)', opacity: '0' },
        },
        '@keyframes gentleBounce': {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        '@keyframes slideInLeft': {
          '0%': { opacity: '0', transform: 'translateX(-24px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        '@keyframes pulseGlow': {
          '0%,100%': { boxShadow: '0 0 0 0 rgba(0,0,0,0.1)' },
          '50%': { boxShadow: '0 0 20px 4px rgba(0,0,0,0.08)' },
        },
        '@keyframes progressFill': {
          '0%': { width: '0%' },
          '100%': { width: 'var(--target-width)' },
        },
      }}
    />
  );
}
