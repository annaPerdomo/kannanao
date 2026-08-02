'use client';

import Box from '@mui/material/Box';
import { ThemeProvider } from '@mui/material/styles';
import { useLocale } from 'next-intl';
import { useMemo } from 'react';

import { resolveLocale } from '@/i18n/config';
import { createAppTheme } from '@/theme';

import { CAMERA, COLUMN_H, FRAME_W, SHORT_VIEWPORT_SCALE } from './constants';
import { EducatorFrame } from './EducatorFrame';
import { LearnerPhone } from './LearnerPhone';
import { useDemoStage } from './useDemoStage';

export function HeroDemo() {
  const { stage, frame, cardsIn, phoneIn, answered } = useDemoStage();

  // ThemeContext restores a returning visitor's saved scheme from localStorage
  // even signed out, and the real Flashcards/DeckHeader inside read it — so a
  // matcha or galaxy user would get green/indigo product UI inside a hero whose
  // every frame hardcodes pink and purple. Locale is kept: the ja landing's demo
  // needs the Japanese font stack.
  const locale = resolveLocale(useLocale());
  const sakuraTheme = useMemo(() => createAppTheme('sakura', locale), [locale]);

  return (
    <ThemeProvider theme={sakuraTheme}>
      {/* One camera, one plane: `perspective` here, the rotation on the stage
          below, so every surface shares one vanishing point. A rotation per
          surface reads as a pile of independently tilted stickers. Depth below
          the stage is translateZ only. */}
      <Box
        sx={{
          width: { lg: FRAME_W.lg, xl: FRAME_W.xl },
          height: { lg: COLUMN_H.lg, xl: COLUMN_H.xl },
          perspective: `${CAMERA.perspective}px`,
          perspectiveOrigin: CAMERA.origin,
          // Scaling the camera, not the stage: the projection inside is finished
          // before this applies, so short viewports get a smaller demo rather
          // than a differently-angled one.
          transformOrigin: 'top right',
          ...Object.fromEntries(
            SHORT_VIEWPORT_SCALE.map(({ maxHeight, scale }) => [
              `@media (max-height: ${maxHeight}px)`,
              { transform: `scale(${scale})` },
            ]),
          ),
        }}
      >
        <Box
          sx={{
            position: 'relative',
            width: '100%',
            height: '100%',
            transformStyle: 'preserve-3d',
            transform: `rotateX(${CAMERA.tiltX}deg) rotateY(${CAMERA.turnY}deg)`,
          }}
        >
          <EducatorFrame stage={stage} frame={frame} cardsIn={cardsIn} />
          <LearnerPhone stage={stage} entered={phoneIn} answered={answered} />
        </Box>
      </Box>
    </ThemeProvider>
  );
}
