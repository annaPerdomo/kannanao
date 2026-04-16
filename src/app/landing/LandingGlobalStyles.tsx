'use client';

import { useEffect } from 'react';
import GlobalStyles from '@mui/material/GlobalStyles';

export default function LandingGlobalStyles() {
  useEffect(() => {
    document.documentElement.style.scrollBehavior = 'smooth';
    return () => { document.documentElement.style.scrollBehavior = ''; };
  }, []);

  return (
    <GlobalStyles styles={{
      '@keyframes sakuraFall-l': {
        '0%':   { transform: 'translateY(-60px) translateX(0) rotate(0deg)', opacity: '0' },
        '8%':   { opacity: '1' },
        '50%':  { transform: 'translateY(48vh) translateX(-70px) rotate(340deg)' },
        '92%':  { opacity: '0.5' },
        '100%': { transform: 'translateY(105vh) translateX(-20px) rotate(700deg)', opacity: '0' },
      },
      '@keyframes sakuraFall-r': {
        '0%':   { transform: 'translateY(-60px) translateX(0) rotate(0deg)', opacity: '0' },
        '8%':   { opacity: '1' },
        '50%':  { transform: 'translateY(48vh) translateX(70px) rotate(360deg)' },
        '92%':  { opacity: '0.5' },
        '100%': { transform: 'translateY(105vh) translateX(20px) rotate(680deg)', opacity: '0' },
      },
      '@keyframes sakuraFall-c': {
        '0%':   { transform: 'translateY(-60px) translateX(0) rotate(0deg)', opacity: '0' },
        '8%':   { opacity: '1' },
        '30%':  { transform: 'translateY(28vh) translateX(35px) rotate(200deg)' },
        '70%':  { transform: 'translateY(72vh) translateX(-25px) rotate(500deg)' },
        '92%':  { opacity: '0.5' },
        '100%': { transform: 'translateY(105vh) translateX(10px) rotate(680deg)', opacity: '0' },
      },
      '@keyframes floatKanji': {
        '0%,100%': { transform: 'translateY(0px) rotate(-2deg)' },
        '50%':     { transform: 'translateY(-22px) rotate(2deg)' },
      },
      '@keyframes cursorBlink': {
        '0%,49%': { opacity: '1' },
        '50%,100%': { opacity: '0' },
      },
      '@keyframes chipPopIn': {
        '0%':   { opacity: '0', transform: 'scale(0.7)' },
        '70%':  { transform: 'scale(1.05)' },
        '100%': { opacity: '1', transform: 'scale(1)' },
      },
    }} />
  );
}
