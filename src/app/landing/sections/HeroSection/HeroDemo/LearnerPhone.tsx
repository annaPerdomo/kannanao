'use client';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import LinearProgress from '@mui/material/LinearProgress';
import { alpha } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';

import { Flashcard } from '@/components/Flashcard';
import { pink, purple } from '@/theme';

import {
  CAMERA,
  DEMO_CARDS,
  type DemoStage,
  PHONE,
  PHONE_BODY_H,
  PHONE_CARD_SCALE,
  PHONE_CARD_W,
} from './constants';
import { SentenceBuilderDemo } from './SentenceBuilderDemo';
import { floatingSurfaceShadow, frameTagSx } from './styles';

const SAKURA = DEMO_CARDS[0];

interface LearnerPhoneProps {
  stage: DemoStage;
  entered: boolean;
  answered: boolean;
}

/**
 * Depth, orientation and size in one transform. `phoneExtraYaw` turns the handset
 * further than the window behind it — same camera, just an object at its own
 * angle, which is what makes the tilt legible on a surface this narrow.
 */
const placement = (scale: number, entered: boolean) =>
  [
    `translate3d(0, ${entered ? 0 : 28}px, ${CAMERA.phoneZ}px)`,
    `rotateY(${CAMERA.phoneExtraYaw}deg)`,
    `scale(${scale})`,
  ].join(' ');

/**
 * The learner side: the real study flashcard (it flips on tap and speaks on the
 * 🔊), handing off to a Sentence Builder round once the deck is full.
 */
export function LearnerPhone({ stage, entered, answered }: LearnerPhoneProps) {
  const t = useTranslations('Landing.hero');
  const practicing = stage === 'practice';

  return (
    <Box
      // Faded out, not unmounted, so without this the study card's 🔊 is tabbable
      // (and audible) while the phone is still off-scene.
      inert={!entered}
      // The stage's direct child, so this one transform is the phone's whole
      // placement in camera space. Pivoting on the centre keeps the extra yaw
      // from swinging the handset sideways.
      sx={{
        position: 'absolute',
        top: { lg: PHONE.lg.top, xl: PHONE.xl.top },
        left: { lg: PHONE.lg.left, xl: PHONE.xl.left },
        zIndex: 2,
        transformOrigin: 'center center',
        opacity: entered ? 1 : 0,
        transform: {
          lg: placement(PHONE.lg.scale, entered),
          xl: placement(PHONE.xl.scale, entered),
        },
        transition: 'opacity 0.55s ease, transform 0.55s cubic-bezier(0.16,1,0.3,1)',
        '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
        // Kept 3D so the corner tag below rides this same camera. The handset's
        // own `overflow: hidden` flattens its interior, which is what keeps the
        // card art from z-fighting.
        transformStyle: 'preserve-3d',
      }}
    >
      <Box sx={{ position: 'relative', transformStyle: 'preserve-3d' }}>
        <Box
          sx={{
            borderRadius: '30px',
            border: `7px solid ${purple[900]}`,
            overflow: 'hidden',
            bgcolor: alpha('#fff', 0.97),
            boxShadow: floatingSurfaceShadow('phone'),
            width: PHONE_CARD_W + 30,
          }}
        >
          <Box sx={{ px: 1, pt: 0.75, pb: 1.25 }}>
            {/* Speaker notch */}
            <Box
              sx={{
                mx: 'auto',
                mb: 0.75,
                width: 56,
                height: 12,
                borderRadius: 99,
                bgcolor: alpha(purple[900], 0.9),
              }}
            />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5, px: 0.25 }}>
              <Typography
                sx={{
                  flexGrow: 1,
                  fontSize: '0.62rem',
                  fontWeight: 800,
                  color: purple[700],
                  lineHeight: 1.1,
                }}
              >
                {practicing ? `🫧 ${t('demoPracticeMode')}` : `🌸 ${t('tags.dailyReview')}`}
              </Typography>
              <Chip
                label={practicing ? '5 / 12' : '3 / 12'}
                size="small"
                sx={{
                  height: 17,
                  fontSize: '0.58rem',
                  fontWeight: 700,
                  color: pink[700],
                  bgcolor: alpha(pink[100], 0.7),
                }}
              />
            </Box>
            <LinearProgress
              variant="determinate"
              value={practicing ? 42 : 25}
              sx={{
                height: 4,
                borderRadius: 99,
                mb: 1,
                bgcolor: alpha(pink[300], 0.25),
                '& .MuiLinearProgress-bar': {
                  borderRadius: 99,
                  transition: 'transform 0.8s cubic-bezier(0.16,1,0.3,1)',
                  background: `linear-gradient(90deg, ${pink[300]} 0%, ${purple[400]} 100%)`,
                },
              }}
            />
            {/* Both screens live in the same fixed-height slot so the handset
              never resizes as the story advances. */}
            <Box
              sx={{ width: PHONE_CARD_W, height: PHONE_BODY_H, mx: 'auto', position: 'relative' }}
            >
              <Box
                // The two screens are stacked, so the one that faded out is
                // still under the pointer and in the tab order.
                inert={practicing}
                sx={{
                  position: 'absolute',
                  inset: 0,
                  opacity: practicing ? 0 : 1,
                  pointerEvents: practicing ? 'none' : 'auto',
                  transition: 'opacity 0.5s ease',
                }}
              >
                <Box sx={{ transform: `scale(${PHONE_CARD_SCALE})`, transformOrigin: 'top left' }}>
                  <Flashcard card={SAKURA} width={250} height={410} />
                </Box>
              </Box>
              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  opacity: practicing ? 1 : 0,
                  pointerEvents: practicing ? 'auto' : 'none',
                  transition: 'opacity 0.5s ease 0.15s',
                }}
              >
                <SentenceBuilderDemo answered={answered} />
              </Box>
            </Box>
          </Box>
        </Box>
        <Chip
          size="small"
          label={t('demoLearnerTag')}
          // Bottom-right is the only clear ground: the handset's upper right
          // overlaps the browser window, where a label lands on UI and vanishes.
          sx={{ ...frameTagSx(pink), bottom: -13, right: -22 }}
        />
      </Box>
    </Box>
  );
}
